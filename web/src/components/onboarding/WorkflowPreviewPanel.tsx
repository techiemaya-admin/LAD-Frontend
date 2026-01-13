'use client';

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Linkedin, Mail, MessageCircle, Phone, Play, Edit3 } from 'lucide-react';
import { useOnboardingStore, WorkflowPreviewStep } from '@/store/onboardingStore';
import ReactFlow, {
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { logger } from '@/lib/logger';
import { CustomWorkflowNode } from './workflow/CustomWorkflowNode';
import { WorkflowCanvas } from './workflow/WorkflowCanvas';
import { createReactFlowNodes, createReactFlowEdges } from './workflow/workflowFlowBuilder';
import StepEditor from './workflow/StepEditor';

// Register custom node types
const nodeTypes = {
  custom: CustomWorkflowNode,
};

interface WorkflowPreviewPanelProps {
  platforms?: string[];
  platformActions?: Record<string, string[]>;
  templates?: Record<string, string>;
  delays?: string;
  conditions?: string;
  campaignName?: string;
  campaignDays?: string;
  workingDays?: string;
}

const platformIcons: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  whatsapp: <MessageCircle className="w-4 h-4" />,
  voice: <Phone className="w-4 h-4" />,
};

export default function WorkflowPreviewPanel({
  platforms: propsPlatforms,
  platformActions: propsPlatformActions,
  templates: propsTemplates,
  delays: propsDelays,
  conditions: propsConditions,
  campaignName: propsCampaignName,
  campaignDays: propsCampaignDays,
  workingDays: propsWorkingDays,
}: WorkflowPreviewPanelProps = {}) {
  // Read from store if no props provided
  const workflowPreview = useOnboardingStore((state) => state.workflowPreview);
  const workflowNodes = useOnboardingStore((state) => state.workflowNodes);
  const setIsEditorPanelCollapsed = useOnboardingStore((state) => state.setIsEditorPanelCollapsed);
  const setHasRequestedEditor = useOnboardingStore((state) => state.setHasRequestedEditor);
  
  // Debug logging
  logger.debug('Rendered with workflowPreview', { workflowPreview, length: workflowPreview?.length || 0 });
  
  // Convert workflow preview steps to React Flow nodes and edges
  const reactFlowNodes = useMemo(() => createReactFlowNodes(workflowPreview), [workflowPreview]);
  const reactFlowEdges = useMemo(() => createReactFlowEdges(workflowPreview), [workflowPreview]);
  
  const [flowNodes, setNodes, onNodesChange] = useNodesState(reactFlowNodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);
  
  // Sync nodes when reactFlowNodes changes
  React.useEffect(() => {
    setNodes(reactFlowNodes);
  }, [reactFlowNodes, setNodes]);
  
  // Sync edges when reactFlowEdges changes
  React.useEffect(() => {
    setEdges(reactFlowEdges);
  }, [reactFlowEdges, setEdges]);

  // Use props if provided, otherwise extract from store
  const platforms = propsPlatforms || [];
  const platformActions = propsPlatformActions || {};
  const templates = propsTemplates || {};
  const delays = propsDelays;
  const conditions = propsConditions;
  const campaignName = propsCampaignName;
  const campaignDays = propsCampaignDays;
  const workingDays = propsWorkingDays;
  
  // If workflow preview is available in store and no props, render from store
  const hasStoreWorkflow = workflowPreview && workflowPreview.length > 0;
  const hasPropsContent = platforms.length > 0 || delays || conditions || campaignName;
  const hasContent = hasPropsContent || hasStoreWorkflow;

  // State for step editor
  const [editingStep, setEditingStep] = useState<WorkflowPreviewStep | null>(null);
  
  // Listen for openStepEditor events from CustomWorkflowNode
  useEffect(() => {
    const handleOpenEditor = (event: CustomEvent) => {
      const { stepId, stepData } = event.detail;
      // Find the step from workflowPreview
      const step = workflowPreview.find(s => s.id === stepId);
      if (step) {
        setEditingStep(step);
        logger.debug('Opening step editor for', { stepId, step });
      }
    };
    
    window.addEventListener('openStepEditor', handleOpenEditor as EventListener);
    return () => {
      window.removeEventListener('openStepEditor', handleOpenEditor as EventListener);
    };
  }, [workflowPreview]);

  // Handle edit button click - show editor panel instead of full screen
  const handleEditClick = () => {
    setIsEditorPanelCollapsed(false); // Show the editor panel
    setHasRequestedEditor(true); // Track that user wants to edit
    logger.debug('Editor panel opened - showing step library at 30% width');
  };

  // Always show the React Flow workflow
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 border-l border-gray-200 dark:border-gray-700">
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-indigo-500" />
              Workflow Preview
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {hasStoreWorkflow ? 
                `${workflowPreview.length} automated steps configured` : 
                'Answer questions to build your workflow'
              }
            </p>
          </div>
          {hasStoreWorkflow && (
            <button
              onClick={handleEditClick}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 font-medium text-sm"
              title="Edit workflow manually"
            >
              <Edit3 className="w-4 h-4" />
              Edit
            </button>
          )}
        </div>
      </div>
      
      {/* SVG Gradients for edges */}
      <svg width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <linearGradient id="gradient-green" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="gradient-blue" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#6366F1" />
            <stop offset="100%" stopColor="#4F46E5" />
          </linearGradient>
        </defs>
      </svg>
      
      <div className="flex-1 min-h-0">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          nodesDraggable={true}
          nodesConnectable={false}
          elementsSelectable={true}
          fitView
          fitViewOptions={{
            padding: 0.2,
            minZoom: 0.5,
            maxZoom: 1.0,
          }}
          minZoom={0.3}
          maxZoom={1.5}
          defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
          className="bg-transparent"
        >
          <WorkflowCanvas 
            flowNodes={flowNodes}
            flowEdges={flowEdges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={nodeTypes}
            workflowLength={workflowPreview?.length || 0}
          />
        </ReactFlow>
      </div>
      
      {/* Step Editor Modal */}
      {editingStep && (
        <StepEditor
          step={editingStep}
          onClose={() => setEditingStep(null)}
        />
      )}
    </div>
  );
}
