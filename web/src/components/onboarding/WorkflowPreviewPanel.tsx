'use client';

import React, { useMemo, useEffect, useCallback, useRef, useState } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useRouter } from 'next/navigation';
import ReactFlow, {
  Node,
  Edge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  BackgroundVariant,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import CustomNode from '../../features/campaigns/components/nodes/CustomNode';
import { StepType } from '@/types/campaign';
import { CheckCircle2, Edit, Trash2, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { apiPost } from '@/lib/api';
import { useToast } from '@/components/ui/app-toaster';

// Register node types - defined outside component for ReactFlow
const nodeTypes: NodeTypes = {
  start: CustomNode,
  end: CustomNode,
  lead_generation: CustomNode,
  linkedin_visit: CustomNode,
  linkedin_follow: CustomNode,
  linkedin_connect: CustomNode,
  linkedin_message: CustomNode,
  linkedin_scrape_profile: CustomNode,
  linkedin_company_search: CustomNode,
  linkedin_employee_list: CustomNode,
  linkedin_autopost: CustomNode,
  linkedin_comment_reply: CustomNode,
  email_send: CustomNode,
  email_followup: CustomNode,
  whatsapp_send: CustomNode,
  voice_agent_call: CustomNode,
  instagram_follow: CustomNode,
  instagram_like: CustomNode,
  instagram_dm: CustomNode,
  instagram_autopost: CustomNode,
  instagram_comment_reply: CustomNode,
  instagram_story_view: CustomNode,
  delay: CustomNode,
  condition: CustomNode,
  custom: CustomNode,
};

export default function WorkflowPreviewPanel() {
  const router = useRouter();
  const { push } = useToast();
  const [showWorkflowInfo, setShowWorkflowInfo] = useState(true);
  const { 
    workflowPreview, 
    channels, 
    setWorkflowPreview,
    setManualFlow,
    setIsEditMode,
    workflowNodes,
    workflowEdges,
    selectedNodeId,
    setSelectedNodeId,
    addWorkflowNode,
    addWorkflowStep,
    addWorkflowEdge,
    completeOnboarding,
    isEditorPanelCollapsed,
    setIsEditorPanelCollapsed,
  } = useOnboardingStore();
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Memoize nodeTypes for ReactFlow
  const memoizedNodeTypes = useMemo(() => nodeTypes, []);

  // Convert workflowNodes to React Flow nodes (prefer workflowNodes over workflowPreview)
  const initialNodes = useMemo(() => {
    // Use workflowNodes if available, otherwise fall back to workflowPreview
    const nodesToUse = workflowNodes.length > 0 ? workflowNodes : workflowPreview;
    
    if (nodesToUse.length === 0) return [];

    const nodes: Node[] = [
      {
        id: 'start',
        type: 'start',
        position: { x: 50, y: 50 },
        data: { title: 'Start', type: 'start' },
      },
    ];

    nodesToUse.forEach((step: any, index: number) => {
      const nodeId = step.id;
      // Merge step.data if it exists, otherwise use step properties directly
      const stepData = step.data || step;
      nodes.push({
        id: nodeId,
        type: (step.type || step.stepType) as StepType,
        position: step.position || { x: 50, y: 150 + index * 100 },
        data: {
          title: step.title || step.name || stepData.title,
          type: step.type || step.stepType,
          description: step.description || stepData.description,
          // Preserve all data properties (delayDays, delayHours, delayMinutes, conditionType, etc.)
          ...stepData,
          // Also include step properties in case they're not in data
          ...step,
        },
        selected: selectedNodeId === nodeId,
        style: selectedNodeId === nodeId 
          ? { 
              border: '2px solid #7c3aed',
              borderRadius: '8px',
              boxShadow: '0 0 0 3px rgba(124, 58, 237, 0.1)',
            }
          : {},
      });
    });

    nodes.push({
      id: 'end',
      type: 'end',
      position: { x: 50, y: 150 + nodesToUse.length * 100 },
      data: { title: 'End', type: 'end' },
    });

    return nodes;
  }, [workflowNodes, workflowPreview, selectedNodeId]);

  // Create edges from workflowEdges or connect nodes sequentially
  const initialEdges = useMemo(() => {
    // Use workflowEdges if available
    if (workflowEdges.length > 0) {
      const edges = workflowEdges.map((edge: any) => ({
        id: edge.id || `edge-${edge.from}-${edge.to}`,
        source: edge.from || edge.source,
        sourceHandle: edge.sourceHandle || null,
        target: edge.to || edge.target,
        animated: true,
        style: { stroke: '#7c3aed', strokeWidth: 2 },
        type: 'smoothstep',
        label: edge.label || null,
        labelStyle: edge.labelStyle || null,
        labelBgStyle: edge.labelBgStyle || null,
      }));
      
      // Ensure start and end are connected if not already in edges
      const hasStartEdge = edges.some(e => e.source === 'start');
      const hasEndEdge = edges.some(e => e.target === 'end');
      const workflowStepNodes = initialNodes.filter(n => n.id !== 'start' && n.id !== 'end');
      
      if (workflowStepNodes.length > 0) {
        if (!hasStartEdge) {
          edges.unshift({
            id: 'edge-start-first',
            source: 'start',
            target: workflowStepNodes[0].id,
            animated: true,
            style: { stroke: '#7c3aed', strokeWidth: 2 },
            type: 'smoothstep',
          });
        }
        if (!hasEndEdge) {
          // Don't auto-create end edge if there are condition nodes (they handle their own branching)
          const hasConditionNode = initialNodes.some(n => n.type === 'condition');
          if (!hasConditionNode) {
            edges.push({
              id: 'edge-last-end',
              source: workflowStepNodes[workflowStepNodes.length - 1].id,
              target: 'end',
              animated: true,
              style: { stroke: '#7c3aed', strokeWidth: 2 },
              type: 'smoothstep',
            });
          }
        }
      }
      
      return edges;
    }

    // Fallback: connect nodes sequentially (including start and end)
    // BUT skip nodes that already have outgoing edges (like condition nodes, delay nodes before conditions)
    if (initialNodes.length <= 1) return [];

    const edges: Edge[] = [];
    for (let i = 0; i < initialNodes.length - 1; i++) {
      const currentNode = initialNodes[i];
      const nextNode = initialNodes[i + 1];
      
      // Skip sequential edge creation for condition nodes - they should only have their explicit branching edges
      if (currentNode.type === 'condition') {
        continue;
      }
      
      // Skip delay nodes if the next node is a condition - delay should connect to condition explicitly
      if (currentNode.type === 'delay' && nextNode.type === 'condition') {
        continue;
      }
      
      // Skip if this node already has outgoing edges defined (check in workflowEdges if available)
      const hasOutgoingEdge = workflowEdges.some((e: any) => 
        (e.from || e.source) === currentNode.id
      );
      if (hasOutgoingEdge) {
        continue;
      }
      
      edges.push({
        id: `edge-${currentNode.id}-${nextNode.id}`,
        source: currentNode.id,
        target: nextNode.id,
        animated: true,
        style: { stroke: '#7c3aed', strokeWidth: 2 },
        type: 'smoothstep',
      });
    }

    return edges;
  }, [initialNodes, workflowEdges]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  
  // Track if we're currently dragging to prevent position resets
  const isDraggingRef = React.useRef(false);
  const lastNodePositionsRef = React.useRef<Record<string, { x: number; y: number }>>({});
  const previousNodeIdsRef = React.useRef<string>('');

  // Update nodes when workflowPreview changes (but not during drag)
  useEffect(() => {
    if (!isDraggingRef.current) {
      // Only update if nodes actually changed (not just position updates)
      const newNodeIds = initialNodes.map(n => n.id).sort().join(',');
      
      if (previousNodeIdsRef.current !== newNodeIds) {
        // Nodes were added/removed, update everything
        setNodes(initialNodes);
        lastNodePositionsRef.current = {};
        initialNodes.forEach(node => {
          if (node.id !== 'start' && node.id !== 'end') {
            lastNodePositionsRef.current[node.id] = node.position;
          }
        });
        previousNodeIdsRef.current = newNodeIds;
      } else {
        // Only update positions for nodes that weren't manually moved
        setNodes((currentNodes) => {
          const updatedNodes = currentNodes.map((currentNode) => {
            const newNode = initialNodes.find(n => n.id === currentNode.id);
            if (!newNode) return currentNode;
            
            // If this node was manually dragged, keep its current position
            const lastPos = lastNodePositionsRef.current[currentNode.id];
            if (lastPos && 
                Math.abs(currentNode.position.x - lastPos.x) > 1 &&
                Math.abs(currentNode.position.y - lastPos.y) > 1) {
              // Node was moved manually, keep current position
              return currentNode;
            }
            
            // Otherwise, use the new position from initialNodes
            return { ...currentNode, position: newNode.position };
          });
          return updatedNodes;
        });
      }
    }
  }, [initialNodes, setNodes, selectedNodeId]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Handle node changes (including position updates when dragging)
  const handleNodesChange = useCallback((changes: any[]) => {
    onNodesChange(changes);
    
    // Track dragging state
    const hasPositionChange = changes.some(c => c.type === 'position');
    if (hasPositionChange) {
      isDraggingRef.current = true;
      // Reset dragging flag after a short delay
      setTimeout(() => {
        isDraggingRef.current = false;
      }, 100);
    }
    
    // Update node positions in store when nodes are dragged
    changes.forEach((change) => {
      if (change.type === 'position' && change.position) {
        const nodeId = change.id;
        const newPosition = change.position;
        
        // Skip start and end nodes (they're auto-generated)
        if (nodeId === 'start' || nodeId === 'end') return;
        
        // Save the new position to our ref
        lastNodePositionsRef.current[nodeId] = newPosition;
        
        // Update the node position in workflowNodes
        const currentNodes = useOnboardingStore.getState().workflowNodes;
        const updatedNodes = currentNodes.map((node: any) => {
          if (node.id === nodeId) {
            return { ...node, position: newPosition };
          }
          return node;
        });
        
        // Update store with new positions immediately
        useOnboardingStore.setState({ workflowNodes: updatedNodes });
      }
    });
  }, [onNodesChange]);

  // Handle node click
  const onNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  // Handle pane click to deselect
  const onPaneClick = () => {
    setSelectedNodeId(null);
  };

  // Handle drag over for drop functionality
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop from Step Library
  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      
      const stepType = e.dataTransfer.getData('application/reactflow') as StepType;
      if (!stepType || !reactFlowWrapper.current) return;

      // Get position relative to React Flow canvas (same as Screen3ManualEditor)
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = {
        x: e.clientX - reactFlowBounds.left - 100,
        y: e.clientY - reactFlowBounds.top - 50,
      };

      // Create new workflow node
      const nodeId = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Get step definition for default data
      const stepDefinitions: Record<string, any> = {
        linkedin_visit: { title: 'LinkedIn Profile Visit' },
        linkedin_follow: { title: 'LinkedIn Follow' },
        linkedin_connect: { title: 'LinkedIn Connection Request', message: 'Hi {{first_name}}, I\'d like to connect.' },
        linkedin_message: { title: 'LinkedIn Message', message: 'Hi {{first_name}}, I noticed...' },
        linkedin_scrape_profile: { title: 'Scrape LinkedIn Profile' },
        linkedin_company_search: { title: 'LinkedIn Company Search' },
        linkedin_employee_list: { title: 'Get Employee List' },
        linkedin_autopost: { title: 'LinkedIn Auto Post' },
        linkedin_comment_reply: { title: 'Reply to LinkedIn Comment' },
        email_send: { title: 'Send Email', subject: 'Re: {{company_name}}', body: 'Hi {{first_name}},...' },
        email_followup: { title: 'Email Follow-up', subject: 'Re: {{company_name}}', body: 'Hi {{first_name}},...' },
        whatsapp_send: { title: 'Send WhatsApp', whatsappMessage: 'Hi {{first_name}},...' },
        voice_agent_call: { title: 'Voice Agent Call' },
        instagram_follow: { title: 'Instagram Follow' },
        instagram_like: { title: 'Instagram Like' },
        instagram_dm: { title: 'Instagram DM', instagramDmMessage: 'Hi {{first_name}},...' },
        instagram_autopost: { title: 'Instagram Auto Post' },
        instagram_comment_reply: { title: 'Reply to Instagram Comment' },
        instagram_story_view: { title: 'View Instagram Story' },
        delay: { title: 'Delay', delayDays: 1, delayHours: 0 },
        condition: { title: 'Condition', conditionType: 'connected' },
      };

      const defaultData = stepDefinitions[stepType] || { title: stepType.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()) };

      // Create workflow node
      const workflowNode = {
        id: nodeId,
        type: stepType,
        title: defaultData.title,
        description: defaultData.description || `${stepType.replace(/_/g, ' ')}`,
        position,
        data: defaultData,
      };

      // Add to workflowNodes (preferred) and workflowPreview (fallback)
      addWorkflowNode(workflowNode);
      
      // Also add to workflowPreview for compatibility
      const previewStep = {
        id: nodeId,
        type: stepType,
        title: defaultData.title,
        description: defaultData.description || `${stepType.replace(/_/g, ' ')}`,
      };
      addWorkflowStep(previewStep);

      // Create edge from last node if exists
      const currentNodes = useOnboardingStore.getState().workflowNodes;
      if (currentNodes.length > 0) {
        const lastNode = currentNodes[currentNodes.length - 1];
        if (lastNode && lastNode.id !== 'end') {
          addWorkflowEdge({
            id: `edge-${lastNode.id}-${nodeId}`,
            from: lastNode.id,
            to: nodeId,
          });
        }
      }
    },
    [addWorkflowNode, addWorkflowStep]
  );

  const connectedChannels = Object.entries(channels)
    .filter(([_, connected]) => connected)
    .map(([channel]) => channel);

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Workflow Preview</h2>
        <p className="text-xs text-gray-500">
          Your automation workflow will appear here
        </p>
      </div>

      {/* Connected Channels */}
      {connectedChannels.length > 0 && (
        <div className="p-3 bg-gray-50 border-b border-gray-200">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Connected Channels
          </div>
          <div className="flex flex-wrap gap-2">
            {connectedChannels.map((channel) => (
              <div
                key={channel}
                className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                {channel.charAt(0).toUpperCase() + channel.slice(1)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Workflow How It Works Info */}
      {(workflowNodes.length > 0 || workflowPreview.length > 0) && (
        <div className="border-b border-gray-200 bg-blue-50">
          <button
            onClick={() => setShowWorkflowInfo(!showWorkflowInfo)}
            className="w-full p-3 flex items-center justify-between hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-semibold text-gray-900">How This Workflow Works</span>
            </div>
            {showWorkflowInfo ? (
              <ChevronUp className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            )}
          </button>
          
          {showWorkflowInfo && (
            <div className="px-3 pb-4 space-y-3">
              <div className="text-xs text-gray-700 leading-relaxed">
                <p className="mb-2">
                  <strong className="text-gray-900">Flow Direction:</strong> The workflow executes from top to bottom, following the purple connecting lines between steps.
                </p>
                
                <div className="mb-2">
                  <strong className="text-gray-900">Delay Nodes:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 ml-2">
                    <li>Shows the wait time (days, hours, minutes) before the next action</li>
                    <li>Example: "Wait 1d 2h 30m" means the system waits 1 day, 2 hours, and 30 minutes</li>
                    <li>Helps space out actions to appear more natural</li>
                  </ul>
                </div>

                <div className="mb-2">
                  <strong className="text-gray-900">Condition Nodes:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 ml-2">
                    <li>Check if a specific event has occurred (e.g., "LinkedIn Connection Accepted")</li>
                    <li>Have <span className="font-semibold text-green-600">two paths</span>: 
                      <span className="text-green-600"> TRUE (right, green)</span> and 
                      <span className="text-red-600"> FALSE (left, red)</span>
                    </li>
                    <li><strong>TRUE path (green):</strong> If condition is met, continue to the next action</li>
                    <li><strong>FALSE path (red):</strong> If condition is not met, skip to the end of the workflow for that lead</li>
                  </ul>
                </div>

                <div>
                  <strong className="text-gray-900">Example Flow:</strong>
                  <ol className="list-decimal list-inside mt-1 space-y-0.5 ml-2">
                    <li>Send LinkedIn connection request</li>
                    <li>Wait for the configured delay time</li>
                    <li>Check if connection was accepted</li>
                    <li>If YES: Send LinkedIn message → Continue workflow</li>
                    <li>If NO: End workflow for that lead</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* React Flow Canvas */}
      <div 
        ref={reactFlowWrapper}
        className="flex-1 relative" 
        style={{ background: '#F8F9FE' }}
      >
        {(workflowNodes.length === 0 && workflowPreview.length === 0) ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-3">
              <svg
                className="w-6 h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900 mb-1">
              No workflow steps yet
            </h3>
            <p className="text-xs text-gray-500 max-w-xs">
              Start answering questions to see your workflow build
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={memoizedNodeTypes}
            fitView
            attributionPosition="bottom-left"
            defaultEdgeOptions={{ animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } }}
            nodesDraggable={true}
            nodesConnectable={false}
            elementsSelectable={true}
            panOnDrag={true}
            panOnScroll={false}
            zoomOnScroll={true}
            zoomOnPinch={true}
            preventScrolling={false}
            selectNodesOnDrag={false}
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            <Controls />
            <MiniMap
              nodeColor={(node) => {
                if (node.type === 'start') return '#10B981';
                if (node.type === 'end') return '#EF4444';
                if (node.type?.includes('linkedin') || node.data?.type?.includes('linkedin'))
                  return '#0077B5';
                if (node.type?.includes('email') || node.data?.type?.includes('email'))
                  return '#F59E0B';
                if (node.type?.includes('whatsapp') || node.data?.type?.includes('whatsapp'))
                  return '#25D366';
                if (node.type?.includes('voice') || node.data?.type?.includes('voice'))
                  return '#8B5CF6';
                if (node.type?.includes('instagram') || node.data?.type?.includes('instagram'))
                  return '#E4405F';
                return '#7c3aed';
              }}
              maskColor="rgba(0, 0, 0, 0.1)"
            />
          </ReactFlow>
        )}
      </div>

      {/* Footer Actions */}
      {(workflowNodes.length > 0 || workflowPreview.length > 0) && (
        <div className="p-4 border-t border-gray-200 bg-white space-y-3">
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear the workflow? This will remove all steps.')) {
                  // Clear both workflowNodes and workflowPreview
                  setWorkflowPreview([]);
                  // Directly update workflowNodes and workflowEdges using store
                  useOnboardingStore.setState({
                    workflowNodes: [],
                    workflowEdges: [],
                  });
                }
              }}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
            <button
              onClick={() => {
                // Toggle the editor panel (Step Library) visibility
                setIsEditorPanelCollapsed(!isEditorPanelCollapsed);
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              {isEditorPanelCollapsed ? 'Show Editor' : 'Hide Editor'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

