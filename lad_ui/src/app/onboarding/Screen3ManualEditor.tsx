'use client';

import React, { useCallback, useEffect, useState, useRef } from 'react';
import { Box, Paper, Button, Typography, Stack } from '@mui/material';
import { Save, X, Visibility, ArrowBack, Undo, Redo } from '@mui/icons-material';
import ReactFlow, {
  Node,
  Edge,
  Connection,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useOnboardingStore } from '@/store/onboardingStore';
import { apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';
import StepLibrary from '@/components/campaigns/StepLibrary';
import StepSettings from '@/components/campaigns/StepSettings';
import CustomNode from '@/components/campaigns/nodes/CustomNode';
import { FlowNode, FlowEdge, StepType } from '@/types/campaign';

// Register node types
const nodeTypes: NodeTypes = {
  start: CustomNode,
  end: CustomNode,
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
  lead_generation: CustomNode,
  delay: CustomNode,
  condition: CustomNode,
};

export default function Screen3ManualEditor() {
  const {
    manualFlow,
    setManualFlow,
    setCurrentScreen,
    selectedNodeId,
    setSelectedNodeId,
    workflowPreview,
    setIsEditMode,
    isEditMode,
    pushToHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useOnboardingStore();
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const isInitializing = useRef(false);
  const isUpdatingFromStore = useRef(false);
  const prevNodesRef = useRef<string>('');
  const prevEdgesRef = useRef<string>('');

  // Initialize manualFlow from workflowPreview if it doesn't exist
  useEffect(() => {
    if (!manualFlow && workflowPreview && workflowPreview.length > 0 && !isInitializing.current) {
      isInitializing.current = true;
      const flowNodes = workflowPreview.map((step, index) => ({
        id: step.id,
        type: step.type,
        position: { x: 400, y: 150 + index * 150 },
        data: {
          title: step.title,
          type: step.type,
          description: step.description,
          ...step,
        },
      }));

      const flowEdges = [];
      for (let i = 0; i < flowNodes.length - 1; i++) {
        flowEdges.push({
          id: `edge-${flowNodes[i].id}-${flowNodes[i + 1].id}`,
          source: flowNodes[i].id,
          target: flowNodes[i + 1].id,
        });
      }

      setManualFlow({
        nodes: flowNodes,
        edges: flowEdges,
      });
    }
  }, [manualFlow, workflowPreview, setManualFlow]);

  // Convert workflow steps to React Flow nodes
  const convertToNodes = (workflow: any): Node[] => {
    if (!workflow) {
      // If no workflow, create from workflowPreview
      if (workflowPreview && workflowPreview.length > 0) {
        const startNode: Node = {
          id: 'start',
          type: 'start',
          position: { x: 400, y: 50 },
          data: { title: 'Start', type: 'start' },
        };

        const stepNodes: Node[] = workflowPreview.map((step, index) => ({
          id: step.id,
          type: step.type as StepType,
          position: { x: 400, y: 150 + index * 150 },
          data: {
            title: step.title,
            type: step.type,
            description: step.description,
            ...step,
          },
        }));

        const endNode: Node = {
          id: 'end',
          type: 'end',
          position: { x: 400, y: 150 + stepNodes.length * 150 },
          data: { title: 'End', type: 'end' },
        };

        return [startNode, ...stepNodes, endNode];
      }
      return [];
    }

    if (!workflow.nodes && !workflow.steps) return [];

    // Handle new format with nodes array
    if (workflow.nodes) {
      const startNode: Node = {
        id: 'start',
        type: 'start',
        position: { x: 400, y: 50 },
        data: { title: 'Start', type: 'start' },
      };

      const stepNodes: Node[] = workflow.nodes.map((node: any) => ({
        id: node.id,
        type: node.type as StepType,
        position: node.position || { x: 400, y: 150 },
        data: node.data || {
          title: node.title || node.type,
          type: node.type,
          ...node,
        },
      }));

      const endNode: Node = {
        id: 'end',
        type: 'end',
        position: { x: 400, y: 150 + stepNodes.length * 150 },
        data: { title: 'End', type: 'end' },
      };

      return [startNode, ...stepNodes, endNode];
    }

    // Handle old format with steps array
    const startNode: Node = {
      id: 'start',
      type: 'start',
      position: { x: 400, y: 50 },
      data: { title: 'Start', type: 'start' },
    };

    const stepNodes: Node[] = workflow.steps.map((step: any, index: number) => ({
      id: step.id,
      type: step.type as StepType,
      position: step.position || { x: 400, y: 150 + index * 150 },
      data: {
        title: step.title,
        ...step.config,
        type: step.type,
      },
    }));

    const endNode: Node = {
      id: 'end',
      type: 'end',
      position: { x: 400, y: 150 + stepNodes.length * 150 },
      data: { title: 'End', type: 'end' },
    };

    return [startNode, ...stepNodes, endNode];
  };

  // Convert workflow edges to React Flow edges
  const convertToEdges = (workflow: any): Edge[] => {
    if (!workflow) {
      // If no workflow, create edges from workflowPreview
      if (workflowPreview && workflowPreview.length > 0) {
        const edges: Edge[] = [];
        edges.push({
          id: 'edge-start-first',
          source: 'start',
          target: workflowPreview[0].id,
          type: 'smoothstep',
          animated: true,
        });
        
        for (let i = 0; i < workflowPreview.length - 1; i++) {
          edges.push({
            id: `edge-${workflowPreview[i].id}-${workflowPreview[i + 1].id}`,
            source: workflowPreview[i].id,
            target: workflowPreview[i + 1].id,
            type: 'smoothstep',
            animated: true,
          });
        }
        
        edges.push({
          id: `edge-last-end`,
          source: workflowPreview[workflowPreview.length - 1].id,
          target: 'end',
          type: 'smoothstep',
          animated: true,
        });
        
        return edges;
      }
      return [];
    }

    if (!workflow.edges) return [];

    return workflow.edges.map((edge: FlowEdge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: true,
    }));
  };

  const [nodes, setNodes, onNodesChange] = useNodesState(
    convertToNodes(manualFlow || null)
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    convertToEdges(manualFlow || null)
  );

  // Sync with store when manualFlow changes (only if not updating from nodes/edges)
  useEffect(() => {
    if (manualFlow && !isUpdatingFromStore.current) {
      isUpdatingFromStore.current = true;
      const newNodes = convertToNodes(manualFlow);
      const newEdges = convertToEdges(manualFlow);
      
      // Check if nodes/edges actually changed
      const nodesKey = JSON.stringify(newNodes.map(n => ({ id: n.id, type: n.type, position: n.position })));
      const edgesKey = JSON.stringify(newEdges.map(e => ({ id: e.id, source: e.source, target: e.target })));
      
      if (nodesKey !== prevNodesRef.current || edgesKey !== prevEdgesRef.current) {
        prevNodesRef.current = nodesKey;
        prevEdgesRef.current = edgesKey;
        
        if (newNodes.length > 0) {
          setNodes(newNodes);
        }
        if (newEdges.length > 0) {
          setEdges(newEdges);
        }
      }
      
      // Reset flag after a short delay
      setTimeout(() => {
        isUpdatingFromStore.current = false;
      }, 100);
    }
  }, [manualFlow, setNodes, setEdges]);

  // Update store when nodes/edges change (only if not updating from store)
  useEffect(() => {
    if (isUpdatingFromStore.current) return; // Skip if we're updating from store
    
    const updatedNodes = nodes
      .filter((n) => n.id !== 'start' && n.id !== 'end')
      .map((node) => ({
        id: node.id,
        type: node.type as StepType,
        position: node.position,
        data: node.data,
      }));

    const updatedEdges = edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
    }));

    // Create keys to check if data actually changed
    const nodesKey = JSON.stringify(updatedNodes.map(n => ({ id: n.id, type: n.type, position: n.position })));
    const edgesKey = JSON.stringify(updatedEdges.map(e => ({ id: e.id, source: e.source, target: e.target })));
    
    // Only update if data actually changed
    if ((nodesKey !== prevNodesRef.current || edgesKey !== prevEdgesRef.current) && (updatedNodes.length > 0 || updatedEdges.length > 0)) {
      prevNodesRef.current = nodesKey;
      prevEdgesRef.current = edgesKey;
      
      // Push current state to history before updating
      if (manualFlow && !isUpdatingFromStore.current) {
        pushToHistory(manualFlow);
      }
      
      isUpdatingFromStore.current = true;
      setManualFlow({
        nodes: updatedNodes,
        edges: updatedEdges,
      });
      
      // Reset flag after a short delay
      setTimeout(() => {
        isUpdatingFromStore.current = false;
      }, 100);
    }
  }, [nodes, edges, setManualFlow, manualFlow, pushToHistory]);

  const onConnect = useCallback(
    (params: Connection) => {
      if (params.source && params.target) {
        // Push to history before adding edge
        if (manualFlow) {
          pushToHistory(manualFlow);
        }
        
        setEdges((eds) => addEdge(params, eds));
        
        // Update store
        // Edge will be added automatically by React Flow
        // The useEffect will sync it to store
      }
    },
    [setEdges, manualFlow, pushToHistory]
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNodeId(node.id);
    },
    [setSelectedNodeId]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, [setSelectedNodeId]);

  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      // Push to history before deleting
      if (manualFlow) {
        pushToHistory(manualFlow);
      }
      
      // Filter out deleted nodes and their edges
      setNodes((nds) => nds.filter((n) => !deleted.find((d) => d.id === n.id) || n.id === 'start' || n.id === 'end'));
      setEdges((eds) => eds.filter((e) => 
        !deleted.find((d) => d.id === e.source || d.id === e.target)
      ));
    },
    [setNodes, setEdges, manualFlow, pushToHistory]
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const stepType = e.dataTransfer.getData('application/reactflow') as StepType;
      if (!stepType) return;

      const reactFlowBounds = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const position = {
        x: e.clientX - reactFlowBounds.left - 100,
        y: e.clientY - reactFlowBounds.top - 50,
      };

      // Push to history before adding node
      if (manualFlow) {
        pushToHistory(manualFlow);
      }

      // Add new node
      const newNode: Node = {
        id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: stepType,
        position,
        data: {
          title: stepType.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
          type: stepType,
        },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes, manualFlow, pushToHistory]
  );

  const handleSave = async () => {
    if (!manualFlow || nodes.length === 0) return;

    setSaving(true);
    try {
      // Convert nodes/edges to workflow format
      const workflowNodes = nodes
        .filter((n) => n.id !== 'start' && n.id !== 'end')
        .map((node) => ({
          id: node.id,
          type: node.type as StepType,
          position: node.position,
          data: node.data,
        }));

      const workflowEdges = edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
      }));

      // Update workflowPreview with the edited workflow
      const { setWorkflowPreview, setCurrentScreen } = useOnboardingStore.getState();
      setWorkflowPreview(
        workflowNodes.map((node) => ({
          id: node.id,
          type: node.type,
          title: node.data.title || node.type,
          description: node.data.description,
          icon: node.data.icon,
          channel: node.data.channel,
        }))
      );

      // Save to backend
      await apiPost('/api/workflow/save', {
        workflow: {
          nodes: workflowNodes,
          edges: workflowEdges,
        },
      });

      // Update workflow preview and exit edit mode
      setIsEditMode(false);
      setCurrentScreen(1);
    } catch (error: any) {
      console.error('Failed to save workflow:', error);
      alert('Failed to save workflow. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditMode(false); // Exit edit mode, go back to 3-panel view
  };

  const handlePreview = () => {
    setIsEditMode(false); // Exit edit mode, go back to 3-panel view
  };

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (canUndo()) {
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (canRedo()) {
          handleRedo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [canUndo, canRedo]);

  const handleUndo = () => {
    if (canUndo()) {
      undo();
    }
  };

  const handleRedo = () => {
    if (canRedo()) {
      redo();
    }
  };

  // Sync manualFlow changes from undo/redo to ReactFlow nodes/edges
  useEffect(() => {
    if (manualFlow && manualFlow.nodes && manualFlow.edges && !isUpdatingFromStore.current) {
      isUpdatingFromStore.current = true;
      
      const convertedNodes = convertToNodes(manualFlow);
      const convertedEdges = manualFlow.edges.map((edge: any) => ({
        id: edge.id || `edge-${edge.source}-${edge.target}`,
        source: edge.source,
        target: edge.target,
        animated: true,
        style: { stroke: '#7c3aed', strokeWidth: 2 },
      }));

      setNodes(convertedNodes);
      setEdges(convertedEdges);
      
      setTimeout(() => {
        isUpdatingFromStore.current = false;
      }, 100);
    }
  }, [manualFlow, setNodes, setEdges]);

  // Full screen editor mode (when Edit is clicked from preview)
  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#F8F9FE' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: '1px solid #E2E8F0',
          bgcolor: '#FFFFFF',
          px: 3,
          py: 2,
          zIndex: 10,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Button
              startIcon={<ArrowBack />}
              onClick={handleCancel}
              sx={{ minWidth: 'auto' }}
            >
              Back
            </Button>
            <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E293B' }}>
              Edit Workflow
            </Typography>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="center">
            <Button
              variant="outlined"
              startIcon={<Undo />}
              onClick={handleUndo}
              disabled={!canUndo()}
              size="small"
              title="Undo (Ctrl+Z)"
            >
              Undo
            </Button>
            <Button
              variant="outlined"
              startIcon={<Redo />}
              onClick={handleRedo}
              disabled={!canRedo()}
              size="small"
              title="Redo (Ctrl+Y)"
            >
              Redo
            </Button>
            <Button
              variant="outlined"
              startIcon={<Visibility />}
              onClick={handlePreview}
            >
              Preview Again
            </Button>
            <Button
              variant="outlined"
              startIcon={<X />}
              onClick={handleCancel}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              disabled={saving}
              sx={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #5568d3 0%, #6a3d91 100%)',
                },
              }}
            >
              {saving ? 'Saving...' : 'Save Workflow (Final)'}
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Main Content - 3 Column Layout */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar - Step Library */}
        <StepLibrary />

        {/* Center - Flow Canvas */}
        <Box sx={{ flex: 1, position: 'relative' }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onNodesDelete={onNodesDelete}
            onDragOver={onDragOver}
            onDrop={onDrop}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
          >
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
            <Controls />
          </ReactFlow>
        </Box>

        {/* Right Sidebar - Step Settings */}
        <StepSettings />
      </Box>
    </Box>
  );
}

