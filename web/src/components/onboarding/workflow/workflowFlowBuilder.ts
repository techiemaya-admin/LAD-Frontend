import { Node, Edge, MarkerType } from 'reactflow';
export interface WorkflowPreviewStep {
  id: string;
  channel?: string;
  type: string;
  title: string;
  description?: string;
}
export function createReactFlowNodes(workflowPreview: WorkflowPreviewStep[] | null): Node[] {
  const nodes: Node[] = [];
  // Always add Start node
  nodes.push({
    id: 'start',
    type: 'custom',
    position: { x: 250, y: 20 },
    draggable: true,
    data: {
      title: 'Start',
      type: 'start',
      description: 'Start',
    },
  });
  // Add workflow step nodes (if any)
  if (workflowPreview && workflowPreview.length > 0) {
    workflowPreview.forEach((step, idx) => {
      nodes.push({
        id: step.id,
        type: 'custom',
        position: { x: 250, y: 170 + idx * 160 },
        draggable: true,
        data: {
          ...step,
        },
      });
    });
  }
  // Always add End node
  const endY = workflowPreview && workflowPreview.length > 0 
    ? 170 + workflowPreview.length * 160 
    : 170;
  nodes.push({
    id: 'end',
    type: 'custom',
    position: { x: 250, y: endY },
    draggable: true,
    data: {
      title: 'End',
      type: 'end',
      description: 'End',
    },
  });
  return nodes;
}
export function createReactFlowEdges(workflowPreview: WorkflowPreviewStep[] | null): Edge[] {
  const edges: Edge[] = [];
  // If we have workflow steps, connect them
  if (workflowPreview && workflowPreview.length > 0) {
    // Connect Start to first step
    edges.push({
      id: `e-start-${workflowPreview[0].id}`,
      source: 'start',
      target: workflowPreview[0].id,
      type: 'smoothstep',
      animated: true,
      style: { 
        stroke: 'url(#gradient-green)',
        strokeWidth: 2,
        strokeDasharray: '5,5'
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#10B981',
      },
    });
    // Connect workflow steps
    for (let i = 0; i < workflowPreview.length - 1; i++) {
      edges.push({
        id: `e${workflowPreview[i].id}-${workflowPreview[i + 1].id}`,
        source: workflowPreview[i].id,
        target: workflowPreview[i + 1].id,
        type: 'smoothstep',
        animated: true,
        style: { 
          stroke: '#6366F1',
          strokeWidth: 2,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6366F1',
        },
      });
    }
    // Connect last step to End
    edges.push({
      id: `e-${workflowPreview[workflowPreview.length - 1].id}-end`,
      source: workflowPreview[workflowPreview.length - 1].id,
      target: 'end',
      type: 'smoothstep',
      animated: true,
      style: { 
        stroke: '#10B981',
        strokeWidth: 2,
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#10B981',
      },
    });
  } else {
    // If no workflow steps, connect Start directly to End
    edges.push({
      id: 'e-start-end',
      source: 'start',
      target: 'end',
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#E5E7EB', strokeWidth: 2, strokeDasharray: '5,5' },
    });
  }
  return edges;
}