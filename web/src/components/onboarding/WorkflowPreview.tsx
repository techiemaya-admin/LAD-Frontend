'use client';

import React, { useMemo, useEffect } from 'react';
import { useOnboardingStore } from '@/store/onboardingStore';
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
import { CheckCircle2, Edit, Trash2, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
import TemplateInput from './TemplateInput';

// Register node types (defined outside component to prevent recreation on each render)
const NODE_TYPES: NodeTypes = {
  start: CustomNode,
  end: CustomNode,
  linkedin_visit: CustomNode,
  linkedin_follow: CustomNode,
  linkedin_connect: CustomNode,
  linkedin_message: CustomNode,
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
  delay: CustomNode,
  condition: CustomNode,
  custom: CustomNode,
};

// Accept currentIntentKey as a prop (from parent or global state)
interface WorkflowPreviewProps {
  currentIntentKey?: string;
}

export default function WorkflowPreview({ currentIntentKey }: WorkflowPreviewProps = {}) {
  const router = useRouter();
  const { 
    workflowPreview, 
    channels, 
    setWorkflowPreview, 
    setCurrentScreen,
    setManualFlow,
    completeOnboarding,
    setIsEditMode,
  } = useOnboardingStore();

  // Convert workflowPreview steps to React Flow nodes
  const initialNodes = useMemo(() => {
    if (workflowPreview.length === 0) return [];

    // Add start node
    const nodes: Node[] = [
      {
        id: 'start',
        type: 'start',
        position: { x: 100, y: 50 },
        data: { title: 'Start', type: 'start' },
      },
    ];

    // Add workflow steps as nodes
    workflowPreview.forEach((step, index) => {
      // Remove duplicate title/type from ...step
      const { title, type, ...rest } = step;
      nodes.push({
        id: step.id,
        type: step.type as StepType,
        position: { x: 100, y: 150 + index * 120 },
        data: {
          title: step.title,
          type: step.type,
          description: step.description,
          ...rest,
        },
      });
    });

    // Add end node
    nodes.push({
      id: 'end',
      type: 'end',
      position: { x: 100, y: 150 + workflowPreview.length * 120 },
      data: { title: 'End', type: 'end' },
    });

    return nodes;
  }, [workflowPreview]);

  // Create edges connecting nodes sequentially
  const initialEdges = useMemo(() => {
    if (initialNodes.length <= 1) return [];

    const edges: Edge[] = [];
    for (let i = 0; i < initialNodes.length - 1; i++) {
      edges.push({
        id: `edge-${initialNodes[i].id}-${initialNodes[i + 1].id}`,
        source: initialNodes[i].id,
        target: initialNodes[i + 1].id,
        animated: true,
        style: { stroke: '#7c3aed', strokeWidth: 2 },
      });
    }

    return edges;
  }, [initialNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when workflowPreview changes
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  const connectedChannels = Object.entries(channels)
    .filter(([_, connected]) => connected)
    .map(([channel]) => channel);

  // Find the step that matches the backend's current template intentKey (e.g., 'linkedin_template', 'whatsapp_template')
  let currentTemplateStepIndex: number | null = null;
  if (currentIntentKey && currentIntentKey.endsWith('_template')) {
    const platform = currentIntentKey.replace('_template', '');
    currentTemplateStepIndex = workflowPreview.findIndex((step) => {
      // Map platform to step type
      const typeMap: Record<string, string> = {
        linkedin: 'linkedin_message',
        whatsapp: 'whatsapp_send',
        email: 'email_send',
        voice: 'voice_agent_call',
        instagram: 'instagram_dm',
      };
      const expectedType = typeMap[platform];
      const needsTemplate = step.type === expectedType;
      const hasTemplate = (step as any).template && (step as any).template.length > 0;
      return needsTemplate && !hasTemplate;
    });
    if (currentTemplateStepIndex === -1) currentTemplateStepIndex = null;
  } else {
    // fallback: first missing template
    currentTemplateStepIndex = workflowPreview.findIndex((step) => {
      const needsTemplate = ['linkedin_message', 'email_send', 'whatsapp_send', 'voice_agent_call', 'instagram_dm'].includes(step.type as string);
      const hasTemplate = (step as any).template && (step as any).template.length > 0;
      return needsTemplate && !hasTemplate;
    });
    if (currentTemplateStepIndex === -1) currentTemplateStepIndex = null;
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.push('/onboarding')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Back to AI Assistant"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <h2 className="text-xl font-bold text-gray-900">Workflow Preview</h2>
        </div>
        <p className="text-sm text-gray-500 ml-12">
          Your automation workflow will appear here as we configure it
        </p>
      </div>

      {/* Connected Channels */}
      {connectedChannels.length > 0 && (
        <div className="p-4 bg-white border-b border-gray-200">
          <div className="text-xs font-semibold text-gray-500 uppercase mb-2">
            Connected Channels
          </div>
          <div className="flex flex-wrap gap-2">
            {connectedChannels.map((channel) => (
              <div
                key={channel}
                className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                {channel.charAt(0).toUpperCase() + channel.slice(1)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* React Flow Canvas */}
      <div className="flex-1 relative" style={{ background: '#F8F9FE' }}>
        {workflowPreview.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg
                className="w-8 h-8 text-gray-400"
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No workflow steps yet
            </h3>
            <p className="text-sm text-gray-500 max-w-xs">
              Start answering questions in the chat to see your workflow build in real-time
            </p>
          </div>
        ) : (
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            nodeTypes={NODE_TYPES}
            fitView
            attributionPosition="bottom-left"
            defaultEdgeOptions={{ animated: true, style: { stroke: '#7c3aed', strokeWidth: 2 } }}
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable={false}
            panOnDrag={true}
            zoomOnScroll={true}
            zoomOnPinch={true}
            panOnScroll={false}
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
      {workflowPreview.length > 0 && (
        <div className="p-6 border-t border-gray-200 bg-white space-y-3">
          {/* Show TemplateInput for the step matching backend's current template intentKey */}
          {currentTemplateStepIndex !== null && (
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-700 mb-2">Template required</div>
              <TemplateInput
                label={`Template for ${workflowPreview[currentTemplateStepIndex].title || workflowPreview[currentTemplateStepIndex].type}`}
                placeholder={`Write a ${workflowPreview[currentTemplateStepIndex].channel || workflowPreview[currentTemplateStepIndex].type} message template...`}
                onSubmit={(template) => {
                  // Update the workflowPreview step with template (or mark skipped)
                  const updated = workflowPreview.map((s, i) => {
                    if (i === currentTemplateStepIndex) {
                      return { ...s, template: template === 'Skip' ? '' : template };
                    }
                    return s;
                  });
                  setWorkflowPreview(updated);
                }}
                onSkip={() => {
                  const updated = workflowPreview.map((s, i) => {
                    if (i === currentTemplateStepIndex) {
                      return { ...s, template: '' };
                    }
                    return s;
                  });
                  setWorkflowPreview(updated);
                }}
              />
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear the workflow? This will remove all steps.')) {
                  setWorkflowPreview([]);
                }
              }}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear
            </button>
            <button
              onClick={() => {
                // Convert workflowPreview to manualFlow format
                const flowNodes = workflowPreview.map((step, index) => {
                  const { title, type, ...rest } = step;
                  return {
                    id: step.id,
                    type: step.type,
                    position: { x: 400, y: 150 + index * 150 },
                    data: {
                      title: step.title,
                      type: step.type,
                      description: step.description,
                      ...rest,
                    },
                  };
                });

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
                setIsEditMode(true); // Enable split view mode
              }}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Edit
            </button>
          </div>
          <button
            onClick={async () => {
              try {
                const { apiPost } = await import('@/lib/api');
                await apiPost('/api/workflow/save', {
                  workflow: {
                    nodes: workflowPreview.map((step) => ({
                      id: step.id,
                      type: step.type,
                      data: step,
                    })),
                    edges: [],
                  },
                });
                
                completeOnboarding();
                router.push('/campaigns');
              } catch (error) {
                logger.error('Failed to save workflow', error);
                alert('Failed to save workflow. Please try again.');
              }
            }}
            className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            Complete Setup
          </button>
        </div>
      )}
    </div>
  );
}
