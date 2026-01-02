'use client';

import React, { useCallback, useMemo } from 'react';
import { Linkedin, Mail, MessageCircle, Phone, ArrowRight, Clock, Filter, Play, Square, PersonStanding } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useOnboardingStore } from '@/store/onboardingStore';
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Node,
  Edge,
  Handle,
  Position,
  NodeProps,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { StepType } from '@/types/campaign';

// Custom Node Component
function CustomWorkflowNode({ data, id, selected }: NodeProps) {
  const stepType: StepType = data?.type as StepType || 'linkedin_visit';
  
  const getNodeColor = (type: StepType) => {
    if (type === 'start') return { bg: '#10B981', border: '#059669' };
    if (type === 'end') return { bg: '#EF4444', border: '#DC2626' };
    if (type === 'lead_generation') return { bg: '#FBBF24', border: '#F59E0B' };
    if (type.includes('linkedin')) return { bg: '#0077B5', border: '#005885' };
    if (type.includes('email')) return { bg: '#14B8A6', border: '#0D9488' };
    if (type.includes('whatsapp')) return { bg: '#25D366', border: '#128C7E' };
    if (type.includes('voice')) return { bg: '#8B5CF6', border: '#7C3AED' };
    if (type === 'delay') return { bg: '#F59E0B', border: '#D97706' };
    if (type === 'condition') return { bg: '#A855F7', border: '#9333EA' };
    return { bg: '#7c3aed', border: '#6D28D9' };
  };
  
  const getNodeIcon = (type: StepType) => {
    if (type === 'start') return <Play className="w-4 h-4" />;
    if (type === 'end') return <Square className="w-4 h-4" />;
    if (type === 'lead_generation') return <PersonStanding className="w-4 h-4" />;
    if (type.includes('linkedin')) return <Linkedin className="w-4 h-4" />;
    if (type.includes('email')) return <Mail className="w-4 h-4" />;
    if (type.includes('whatsapp')) return <MessageCircle className="w-4 h-4" />;
    if (type.includes('voice')) return <Phone className="w-4 h-4" />;
    if (type === 'delay') return <Clock className="w-4 h-4" />;
    if (type === 'condition') return <Filter className="w-4 h-4" />;
    return <ArrowRight className="w-4 h-4" />;
  };
  
  const colors = getNodeColor(stepType);
  
  const getPreviewText = () => {
    if (data?.description) return data.description;
    if (data?.message) return data.message.substring(0, 40) + '...';
    if (data?.subject) return data.subject;
    return stepType;
  };
  
  return (
    <div
      className={cn(
        'min-w-[180px] bg-white rounded-[20px] shadow-md transition-all overflow-hidden',
        selected ? 'ring-2 ring-purple-500 shadow-lg' : ''
      )}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.bg }} />
      
      {/* Colored Header */}
      <div
        className="px-4 py-2.5 flex items-center justify-between"
        style={{ backgroundColor: colors.bg }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0 text-white">
          {getNodeIcon(stepType)}
          <span className="text-[13px] font-semibold truncate">{data?.title || stepType}</span>
        </div>
      </div>
      
      {/* White Body */}
      <div className="px-4 py-2.5">
        {stepType === 'condition' && (
          <div>
            <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
              Checking:
            </div>
            <div className="text-[13px] font-semibold text-gray-900">
              {data?.conditionType || 'Condition'}
            </div>
          </div>
        )}
        {stepType === 'delay' && (
          <div>
            <div className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">
              Wait Time:
            </div>
            <div className="text-[13px] font-semibold text-gray-900">
              {data?.title || 'Delay'}
            </div>
          </div>
        )}
        {stepType !== 'delay' && stepType !== 'condition' && stepType !== 'start' && stepType !== 'end' && (
          <div className="text-[11px] text-gray-600 truncate">
            {getPreviewText()}
          </div>
        )}
      </div>
      
      {stepType === 'condition' ? (
        <>
          <Handle type="source" position={Position.BottomLeft} id="false" style={{ background: '#EF4444' }} />
          <Handle type="source" position={Position.BottomRight} id="true" style={{ background: '#10B981' }} />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} style={{ background: colors.bg }} />
      )}
    </div>
  );
}

// Register custom node types
const nodeTypes = {
  custom: CustomWorkflowNode,
};

interface WorkflowStep {
  platform?: string;
  actions?: string[];
  template?: string;
  delay?: string;
  condition?: string;
}

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
  
  // Debug logging
  console.log('[WorkflowPreviewPanel] Rendered with workflowPreview:', workflowPreview);
  console.log('[WorkflowPreviewPanel] workflowPreview length:', workflowPreview?.length || 0);
  
  // Convert workflow preview steps to React Flow nodes and edges
  const reactFlowNodes: Node[] = useMemo(() => {
    const nodes: Node[] = [];
    
    // Always add Start node
    nodes.push({
      id: 'start',
      type: 'custom',
      position: { x: 250, y: 20 },
      data: {
        title: 'Start',
        type: 'start',
        description: 'Start',
      },
    });
    
    // Add workflow step nodes (if any)
    if (workflowPreview && workflowPreview.length > 0) {
      workflowPreview.forEach((step, idx) => {
        const channelKey = step.channel || 'linkedin';
        const stepType = step.type || '';
        
        nodes.push({
          id: step.id,
          type: 'custom',
          position: { x: 250, y: 140 + idx * 140 },
          data: {
            title: step.title,
            type: step.type,
            description: step.description,
            ...step,
          },
        });
      });
    }
    
    // Always add End node
    const endY = workflowPreview && workflowPreview.length > 0 
      ? 140 + workflowPreview.length * 140 
      : 140;
    
    nodes.push({
      id: 'end',
      type: 'custom',
      position: { x: 250, y: endY },
      data: {
        title: 'End',
        type: 'end',
        description: 'End',
      },
    });
    
    return nodes;
  }, [workflowPreview]);
  
  const reactFlowEdges: Edge[] = useMemo(() => {
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
        style: { stroke: '#94A3B8', strokeWidth: 2 },
      });
      
      // Connect workflow steps
      for (let i = 0; i < workflowPreview.length - 1; i++) {
        edges.push({
          id: `e${workflowPreview[i].id}-${workflowPreview[i + 1].id}`,
          source: workflowPreview[i].id,
          target: workflowPreview[i + 1].id,
          type: 'smoothstep',
          animated: true,
          style: { stroke: '#94A3B8', strokeWidth: 2 },
        });
      }
      
      // Connect last step to End
      edges.push({
        id: `e-${workflowPreview[workflowPreview.length - 1].id}-end`,
        source: workflowPreview[workflowPreview.length - 1].id,
        target: 'end',
        type: 'smoothstep',
        animated: true,
        style: { stroke: '#94A3B8', strokeWidth: 2 },
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
  }, [workflowPreview]);
  
  const [flowNodes, setNodes, onNodesChange] = useNodesState(reactFlowNodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);
  
  // Custom node types
  const nodeTypes = {
    custom: CustomWorkflowNode,
  };

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

  // Always show the React Flow workflow
  return (
    <div className="h-full bg-gray-50 border-l border-gray-200">
      <div className="p-4 border-b border-gray-200 bg-white">
        <h3 className="text-lg font-semibold text-gray-900">Workflow Preview</h3>
        <p className="text-sm text-gray-500 mt-1">
          {hasStoreWorkflow ? 
            `${workflowPreview.length} steps configured` : 
            'Answer questions to build your workflow'
          }
        </p>
      </div>
      <div className="h-[calc(100%-80px)]">
        <ReactFlow
          nodes={reactFlowNodes}
          edges={reactFlowEdges}
          nodeTypes={nodeTypes}
          fitView
          attributionPosition="bottom-left"
          proOptions={{ hideAttribution: true }}
          className="bg-gray-50"
        >
          <Background color="#94a3b8" gap={20} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}
