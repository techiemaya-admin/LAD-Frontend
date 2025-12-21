'use client';

import React, { useCallback, useRef } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  NodeTypes,
  BackgroundVariant,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useCampaignStore } from '@/store/campaignStore';
import CustomNode from './nodes/CustomNode';

// Register all node types - React Flow uses the 'type' field from nodes
const nodeTypes: NodeTypes = {
  start: CustomNode,
  end: CustomNode,
  linkedin_visit: CustomNode,
  linkedin_follow: CustomNode,
  linkedin_connect: CustomNode,
  linkedin_message: CustomNode,
  email_send: CustomNode,
  email_followup: CustomNode,
  whatsapp_send: CustomNode,
  voice_agent_call: CustomNode,
  delay: CustomNode,
  condition: CustomNode,
  custom: CustomNode, // Fallback
};

export default function FlowCanvas() {
  const {
    nodes: storeNodes,
    edges: storeEdges,
    addStep,
    updateNodePosition,
    addEdge: addStoreEdge,
    deleteStep,
    selectStep,
    selectedNodeId,
  } = useCampaignStore();

  const [nodes, setNodes, onNodesChange] = useNodesState(storeNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(storeEdges);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Sync store nodes/edges with React Flow state
  React.useEffect(() => {
    setNodes(storeNodes);
  }, [storeNodes, setNodes]);

  React.useEffect(() => {
    setEdges(storeEdges);
  }, [storeEdges, setEdges]);

  // Update store when nodes change
  const onNodesChangeInternal = useCallback(
    (changes: any) => {
      onNodesChange(changes);
      changes.forEach((change: any) => {
        if (change.type === 'position' && change.position) {
          updateNodePosition(change.id, change.position);
        }
        if (change.type === 'select' && change.selected) {
          selectStep(change.id);
        }
        if (change.type === 'select' && !change.selected && selectedNodeId === change.id) {
          selectStep(null);
        }
      });
    },
    [onNodesChange, updateNodePosition, selectStep, selectedNodeId]
  );

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        setEdges((eds) => addEdge(params, eds));
        addStoreEdge(params.source, params.target);
      }
    },
    [setEdges, addStoreEdge]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      const reactFlowBounds = reactFlowWrapper.current?.getBoundingClientRect();
      const stepType = e.dataTransfer.getData('application/reactflow');

      if (!stepType || !reactFlowBounds) {
        return;
      }

      const position = {
        x: e.clientX - reactFlowBounds.left - 100,
        y: e.clientY - reactFlowBounds.top - 50,
      };

      addStep(stepType as any, position);
    },
    [addStep]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: ReactFlowNode) => {
      selectStep(node.id);
    },
    [selectStep]
  );

  return (
    <div
      ref={reactFlowWrapper}
      style={{ width: '100%', height: '100%', background: '#F8F9FE' }}
      onDrop={onDrop}
      onDragOver={onDragOver}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChangeInternal}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
        defaultEdgeOptions={{ animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } }}
      >
        <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            if (node.type === 'start') return '#10B981';
            if (node.type === 'end') return '#EF4444';
            if (node.type?.includes('linkedin') || node.data?.type?.includes('linkedin')) return '#0077B5';
            if (node.type?.includes('email') || node.data?.type?.includes('email')) return '#F59E0B';
            if (node.type?.includes('whatsapp') || node.data?.type?.includes('whatsapp')) return '#25D366';
            if (node.type?.includes('voice') || node.data?.type?.includes('voice')) return '#8B5CF6';
            return '#7c3aed';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
        />
      </ReactFlow>
    </div>
  );
}

