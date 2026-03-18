import { Node, Edge, MarkerType } from 'reactflow';

export interface WorkflowPreviewStep {
  id: string;
  channel?: string;
  type: string;
  title: string;
  description?: string;
  message?: string;
  leadLimit?: number;
}

export type WorkflowLayout = 'horizontal' | 'vertical';

/* ═══════════════════════════════════════════════════════════════════
   BRANCHING TREE — no separate "condition" nodes.
   Branches come directly out of ACTION nodes, exactly like the mockup.
   ═══════════════════════════════════════════════════════════════════ */

interface TreeNode {
  id: string;
  type: string;
  title: string;
  description?: string;
  /** Multiple outgoing branches (edge labels on the connectors) */
  branches?: TreeBranch[];
}

interface TreeBranch {
  label: string;          // e.g. "Qualified", "Accepted"
  color: string;          // edge color
  child: TreeNode;
}

/* ─── Build the branching tree from linear steps ─── */

function buildBranchingTree(steps: WorkflowPreviewStep[]): TreeNode {
  const hasConnect = steps.some(s => s.type === 'linkedin_connect');
  const hasMessage = steps.some(s => s.type === 'linkedin_message');
  const hasVisit   = steps.some(s => s.type === 'linkedin_visit');
  const hasLeadGen = steps.some(s => s.type === 'lead_generation');

  const leadStep    = steps.find(s => s.type === 'lead_generation');
  const connectStep = steps.find(s => s.type === 'linkedin_connect');
  const messageStep = steps.find(s => s.type === 'linkedin_message');
  const visitStep   = steps.find(s => s.type === 'linkedin_visit');

  // Multi-channel follow-up steps (email, whatsapp, voice)
  const followUpChannelSteps = steps.filter(s =>
    ['email_send', 'whatsapp_send', 'voice_agent_call'].includes(s.type)
  );
  const hasCondition = steps.some(s => s.type === 'wait_for_condition');
  const conditionStep = steps.find(s => s.type === 'wait_for_condition');

  // ── End node factory ──
  const endNode = (id: string): TreeNode => ({
    id, type: 'end', title: 'End', description: '',
  });

  // ── Build multi-channel follow-up tail (condition → channels → end) ──
  function buildFollowUpChannelTail(): TreeNode | null {
    if (!hasCondition || followUpChannelSteps.length === 0) return null;
    const condNode: TreeNode = {
      id: conditionStep?.id || 'condition',
      type: 'delay',
      title: conditionStep?.title || 'Wait for Condition',
      description: conditionStep?.description || 'Trigger condition',
    };
    if (followUpChannelSteps.length === 1) {
      const ch = followUpChannelSteps[0];
      const chNode: TreeNode = {
        id: ch.id, type: ch.type, title: ch.title,
        description: ch.description,
        branches: [{ label: '', color: '#9ca3af', child: endNode(`end-ch-${ch.id}`) }],
      };
      condNode.branches = [{ label: '', color: '#9ca3af', child: chNode }];
    } else {
      condNode.branches = followUpChannelSteps.map(ch => ({
        label: ch.title.replace(/^Send /, '').replace(/ Message$/, ''),
        color: ch.type.includes('email') ? '#ea4335' : ch.type.includes('whatsapp') ? '#25d366' : '#8b5cf6',
        child: {
          id: ch.id, type: ch.type, title: ch.title,
          description: ch.description,
          branches: [{ label: '', color: '#9ca3af', child: endNode(`end-ch-${ch.id}`) }],
        } as TreeNode,
      }));
    }
    return condNode;
  }

  const channelTail = buildFollowUpChannelTail();

  // ── Tag & Exit → End ──
  const tagExitNode: TreeNode = {
    id: 'tag-exit', type: 'tag', title: 'Tag & Exit',
    description: 'Mark as rejected',
    branches: [{ label: '', color: '#9ca3af', child: endNode('end-rejected') }],
  };

  // ── Tag as Unqualified → End ──
  const tagUnqualifiedNode: TreeNode = {
    id: 'tag-unqualified', type: 'tag', title: 'Tag as Unqualified',
    description: '',
    branches: [{ label: '', color: '#9ca3af', child: endNode('end-unqual') }],
  };

  // ── Build the "after accepted" chain depending on what's selected ──
  function buildAcceptedChain(): TreeNode {
    if (hasMessage) {
      const msgNode: TreeNode = {
        id: messageStep?.id || 'followup-msg',
        type: 'linkedin_message',
        title: messageStep?.title || 'Send Follow-up Message',
        description: messageStep?.description || 'Message after connection accepted',
        branches: [{ label: '', color: '#9ca3af', child: channelTail || endNode('end-followup') }],
      };
      return msgNode;
    }
    return channelTail || endNode('end-accepted');
  }

  // ── Build Connection Request node with branches ──
  function buildConnectionNode(): TreeNode {
    const acceptedChild = buildAcceptedChain();
    const softBumpNode: TreeNode = {
      id: 'soft-bump', type: 'linkedin_message',
      title: 'Soft Bump', description: 'Gentle reminder after 7 days',
      branches: [{
        label: '', color: '#9ca3af',
        child: {
          id: 'nurture-list', type: 'delay',
          title: 'Nurture List', description: 'Long-term follow-up',
          branches: [{ label: '', color: '#9ca3af', child: endNode('end-nurture') }],
        },
      }],
    };
    return {
      id: connectStep?.id || 'connect',
      type: 'linkedin_connect',
      title: connectStep?.title || 'Send Connection Request',
      description: connectStep?.description || 'Auto-connect with leads on LinkedIn',
      branches: [
        { label: 'Accepted',       color: '#22c55e', child: acceptedChild },
        { label: 'No Response 7d', color: '#f59e0b', child: softBumpNode },
        { label: 'Rejected',       color: '#ef4444', child: tagExitNode },
      ],
    };
  }

  // ── Build Visit Profile node ──
  function buildVisitNode(): TreeNode {
    return {
      id: visitStep?.id || 'visit',
      type: 'linkedin_visit',
      title: visitStep?.title || 'View Profile',
      description: visitStep?.description || 'Visit their LinkedIn profile',
      branches: [{ label: '', color: '#9ca3af', child: endNode('end-visit') }],
    };
  }

  // ── Lead Search node ──
  const leadSearchNode: TreeNode = {
    id: leadStep?.id || 'lead-gen',
    type: 'lead_generation',
    title: leadStep?.title || 'LinkedIn Lead Search',
    description: `Search ${leadStep?.leadLimit || 20}-50 leads/day`,
  };

  // ── Wire up Lead Search branches based on selected actions ──
  const hasAnyAction = hasConnect || hasMessage || hasVisit;

  if (hasAnyAction) {
    const qualifiedBranches: TreeBranch[] = [];

    if (hasConnect) {
      qualifiedBranches.push({
        label: hasVisit ? 'Connect' : 'Qualified',
        color: '#22c55e',
        child: buildConnectionNode(),
      });
    } else if (hasMessage) {
      // Message only (no connect)
      const msgNode: TreeNode = {
        id: messageStep?.id || 'direct-msg',
        type: 'linkedin_message',
        title: messageStep?.title || 'Send Follow-up Message',
        description: messageStep?.description || 'Direct message to lead',
        branches: [{ label: '', color: '#9ca3af', child: channelTail || endNode('end-msg') }],
      };
      qualifiedBranches.push({
        label: hasVisit ? 'Message' : 'Qualified',
        color: '#22c55e',
        child: msgNode,
      });
    }

    if (hasVisit) {
      qualifiedBranches.push({
        label: 'View Only',
        color: '#3b82f6',
        child: buildVisitNode(),
      });
    }

    // Always add unqualified branch when there are actions
    qualifiedBranches.push({
      label: 'Unqualified',
      color: '#ef4444',
      child: tagUnqualifiedNode,
    });

    leadSearchNode.branches = qualifiedBranches;
  } else {
    // No actions selected yet → just lead search → end
    leadSearchNode.branches = [
      { label: '', color: '#9ca3af', child: endNode('end-main') },
    ];
  }

  // ── Start → Lead Search ──
  const firstStep = hasLeadGen ? leadSearchNode : (steps[0] ? {
    id: steps[0].id,
    type: steps[0].type,
    title: steps[0].title,
    description: steps[0].description,
    branches: [{ label: '', color: '#9ca3af', child: endNode('end-simple') }],
  } as TreeNode : endNode('end-empty'));

  const startNode: TreeNode = {
    id: 'start',
    type: 'start',
    title: 'Start',
    description: 'Campaign begins',
    branches: [{ label: '', color: '#9ca3af', child: firstStep }],
  };

  return startNode;
}

/* ═══════════════════════════════════════════════════════════════════
   LAYOUT — flatten tree into ReactFlow nodes + edges
   ═══════════════════════════════════════════════════════════════════ */

const Y_GAP = 180;   // Vertical gap between rows
const X_GAP = 220;   // Minimum horizontal space per subtree

interface LayoutResult {
  width: number;
  nodes: Node[];
  edges: Edge[];
}

function layoutTree(node: TreeNode, cx: number, y: number): LayoutResult {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  // Add this node at (cx, y)
  nodes.push({
    id: node.id,
    type: 'custom',
    position: { x: cx, y },
    draggable: true,
    data: {
      title: node.title,
      type: node.type,
      description: node.description,
      _layout: 'vertical',
    },
  });

  if (!node.branches || node.branches.length === 0) {
    return { width: X_GAP, nodes, edges };
  }

  // Single unlabeled child → stack vertically centered
  if (node.branches.length === 1 && !node.branches[0].label) {
    const br = node.branches[0];
    const child = layoutTree(br.child, cx, y + Y_GAP);
    edges.push(makeEdge(node.id, br.child.id, '', '#b0b8c4', false));
    nodes.push(...child.nodes);
    edges.push(...child.edges);
    return { width: Math.max(X_GAP, child.width), nodes, edges };
  }

  // Multiple branches → spread horizontally
  const childLayouts: LayoutResult[] = node.branches.map(br =>
    layoutTree(br.child, 0, y + Y_GAP)
  );

  const totalWidth = childLayouts.reduce((s, cl) => s + cl.width, 0);
  const gap = 30;
  const totalWithGaps = totalWidth + (childLayouts.length - 1) * gap;

  let curX = cx - totalWithGaps / 2;

  for (let i = 0; i < node.branches.length; i++) {
    const br = node.branches[i];
    const cl = childLayouts[i];
    const childCX = curX + cl.width / 2;

    // Offset child nodes
    for (const n of cl.nodes) n.position.x += childCX;

    edges.push(makeEdge(node.id, br.child.id, br.label, br.color, !!br.label));
    nodes.push(...cl.nodes);
    edges.push(...cl.edges);

    curX += cl.width + gap;
  }

  return { width: Math.max(X_GAP, totalWithGaps), nodes, edges };
}

function makeEdge(
  src: string, tgt: string,
  label: string, color: string,
  isBranch: boolean,
): Edge {
  const c = label ? color : '#c4c9d4';
  return {
    id: `e-${src}-${tgt}`,
    source: src, sourceHandle: 'bottom',
    target: tgt, targetHandle: 'top',
    type: label ? 'labeled' : 'smoothstep',
    animated: !label,
    data: { label, color: c },
    style: {
      stroke: c,
      strokeWidth: label ? 2.5 : 2,
      strokeDasharray: label ? undefined : '6,6',
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: c,
      width: 10,
      height: 10,
    },
  };
}

/* ═══════════════════════════════════════════════════════════════════
   PUBLIC API
   ═══════════════════════════════════════════════════════════════════ */

export function createReactFlowNodes(
  workflowPreview: WorkflowPreviewStep[] | null,
  layout: WorkflowLayout = 'vertical',
): Node[] {
  if (!workflowPreview || workflowPreview.length === 0) {
    return [
      {
        id: 'start', type: 'custom', position: { x: 300, y: 40 }, draggable: true,
        data: { title: 'Start', type: 'start', description: 'Campaign begins', _layout: 'vertical' },
      },
      {
        id: 'end', type: 'custom', position: { x: 300, y: 220 }, draggable: true,
        data: { title: 'End', type: 'end', description: 'Campaign ends', _layout: 'vertical' },
      },
    ];
  }

  const tree = buildBranchingTree(workflowPreview);
  return layoutTree(tree, 420, 40).nodes;
}

export function createReactFlowEdges(
  workflowPreview: WorkflowPreviewStep[] | null,
  layout: WorkflowLayout = 'vertical',
): Edge[] {
  if (!workflowPreview || workflowPreview.length === 0) {
    return [{
      id: 'e-start-end',
      source: 'start', sourceHandle: 'bottom',
      target: 'end', targetHandle: 'top',
      type: 'smoothstep', animated: true,
      style: { stroke: '#d1d5db', strokeWidth: 2, strokeDasharray: '8,6' },
    }];
  }

  const tree = buildBranchingTree(workflowPreview);
  return layoutTree(tree, 420, 40).edges;
}