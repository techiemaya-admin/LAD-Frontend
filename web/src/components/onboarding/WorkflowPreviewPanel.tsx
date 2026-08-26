'use client';
import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Workflow, Play, GitBranch, Zap, ArrowRightLeft, ArrowUpDown, Plus, X, ChevronRight, ChevronLeft, Linkedin, Mail, MessageCircle, Phone, UserPlus, Send, Eye, Wand2 } from 'lucide-react';
import { useOnboardingStore, WorkflowPreviewStep } from '@/store/onboardingStore';
import { StepType } from '@/types/campaign';
import ReactFlow, {
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  Background,
  BackgroundVariant,
  Controls,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { logger } from '@/lib/logger';
import { CustomWorkflowNode } from './workflow/CustomWorkflowNode';
import { createReactFlowNodes, createReactFlowEdges, WorkflowLayout } from './workflow/workflowFlowBuilder';
import LabeledEdge from './workflow/LabeledEdge';
import StepEditor from './workflow/StepEditor';
import { StepInsertMenu, type InsertMenuItem } from './workflow/StepInsertMenu';

const nodeTypes = { custom: CustomWorkflowNode };
const edgeTypes = { labeled: LabeledEdge };

interface WorkflowPreviewPanelProps {
  platforms?: string[];
  platformActions?: Record<string, string[]>;
  templates?: Record<string, string>;
  delays?: string;
  conditions?: string;
  campaignName?: string;
  campaignDays?: string;
  workingDays?: string;
  campaignId?: string | null;
}

const PLATFORMS: any[] = [
  { id: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="w-4 h-4" />, color: '#0077b5', desc: 'Social outreach' },
  { id: 'email',    label: 'Email',    icon: <Mail className="w-4 h-4" />,     color: '#ea4335', desc: 'Direct mailing' },
  { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" />, color: '#25d366', desc: 'Instant messaging' },
  { id: 'voice',    label: 'Voice',    icon: <Phone className="w-4 h-4" />,    color: '#8b5cf6', desc: 'AI Phone calls' },
  { id: 'media',    label: 'AI Media', icon: <Wand2 className="w-4 h-4" />,    color: '#d946ef', desc: 'Generate brand media' },
];

const PLATFORM_ACTIONS: Record<string, any[]> = {
  linkedin: [
    { type: 'linkedin_connect', title: 'Connect', icon: <UserPlus className="w-4 h-4" />, desc: 'Send connection request' },
    { type: 'linkedin_message', title: 'Message', icon: <Send className="w-4 h-4" />, desc: 'Message sent when they accept' },
    { type: 'linkedin_visit',   title: 'Visit',   icon: <Eye className="w-4 h-4" />,  desc: 'View LinkedIn profile' },
  ],
  email: [
    { type: 'email_send', title: 'Send Email', icon: <Mail className="w-4 h-4" />, desc: 'Automated email' },
  ],
  whatsapp: [
    { type: 'whatsapp_send', title: 'WhatsApp', icon: <MessageCircle className="w-4 h-4" />, desc: 'Direct message' },
  ],
  voice: [
    { type: 'voice_agent_call', title: 'AI Call', icon: <Phone className="w-4 h-4" />, desc: 'AI voice interaction' },
  ],
  media: [
    { type: 'media_generation', title: 'Generate Media', icon: <Wand2 className="w-4 h-4" />, desc: 'Brand image/video for outreach' },
  ],
};

/** Inner component with access to ReactFlow hooks */
function FlowInner({
  workflowPreview,
  campaignId,
}: {
  workflowPreview: WorkflowPreviewStep[];
  campaignId?: string | null;
}) {
  const { fitView } = useReactFlow();

  const reactFlowNodes = useMemo(() => createReactFlowNodes(workflowPreview, 'vertical'), [workflowPreview]);
  const reactFlowEdges = useMemo(() => createReactFlowEdges(workflowPreview, 'vertical'), [workflowPreview]);
  const [flowNodes, setNodes, onNodesChange] = useNodesState(reactFlowNodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(reactFlowEdges);

  useEffect(() => { setNodes(reactFlowNodes); }, [reactFlowNodes, setNodes]);
  useEffect(() => { setEdges(reactFlowEdges); }, [reactFlowEdges, setEdges]);

  useEffect(() => {
    const t = setTimeout(() => {
      fitView({ padding: 0.14, duration: 400, minZoom: 0.4, maxZoom: 1 });
    }, 250);
    return () => clearTimeout(t);
  }, [workflowPreview, fitView]);

  const [editingStep, setEditingStep] = useState<WorkflowPreviewStep | null>(null);

  useEffect(() => {
    const handle = (e: CustomEvent) => {
      const step = workflowPreview.find((s) => s.id === e.detail.stepId);
      if (step) setEditingStep(step);
    };
    window.addEventListener('openStepEditor', handle as EventListener);
    return () => window.removeEventListener('openStepEditor', handle as EventListener);
  }, [workflowPreview]);

  // Node input/output "+" (CustomWorkflowNode dispatches 'addWorkflowStepAt')  - 
  // same catalog as the bottom "Add Step" bar, but dropped into the clicked slot.
  const insertWorkflowStep = useOnboardingStore((s) => s.insertWorkflowStep);
  const [insertAt, setInsertAt] = useState<{ anchorId: string; position: 'before' | 'after'; x: number; y: number } | null>(null);
  // The onboarding page mounts this panel more than once (mobile + desktop
  // layouts, only one visible). Without this the hidden copies would answer the
  // same window event and hold a menu open behind the breakpoint.
  const flowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handle = (e: any) => {
      const d = e.detail || {};
      if (!d.anchorId) return;
      if (!flowRef.current?.offsetParent) return; // this copy is not on screen
      setInsertAt({
        anchorId: String(d.anchorId),
        position: d.position === 'before' ? 'before' : 'after',
        x: Number(d.x) || 0,
        y: Number(d.y) || 0,
      });
    };
    window.addEventListener('addWorkflowStepAt', handle);
    return () => window.removeEventListener('addWorkflowStepAt', handle);
  }, []);

  const insertItems: InsertMenuItem[] = insertAt
    ? PLATFORMS.flatMap((p) => (PLATFORM_ACTIONS[p.id] || []).map((a: any) => ({
        key: `${p.id}-${a.type}`,
        label: a.title,
        sub: a.desc,
        group: p.label,
        icon: <span style={{ color: p.color }}>{a.icon}</span>,
        chip: 'bg-gray-100 dark:bg-gray-800',
        onSelect: () => insertWorkflowStep(
          { id: `${a.type}-${Date.now()}`, type: a.type as StepType, title: a.title, description: a.desc, channel: p.id },
          insertAt.anchorId,
          insertAt.position,
        ),
      })))
    : [];

  return (
    <>
      <ReactFlow
        ref={flowRef}
        nodes={flowNodes}
        edges={flowEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
        fitView
        fitViewOptions={{ padding: 0.14, minZoom: 0.4, maxZoom: 1 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.9 }}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        className="bg-gray-50 dark:bg-[#0b1229]" // Replaces style={{ background: '#fafafa' }}
      >
        <Background
          color="currentColor" // Uses current text color for better contrast
          gap={28}
          size={1.2}
          variant={BackgroundVariant.Dots}
          className="text-gray-300 dark:text-gray-700 opacity-50" // Adapts dot color to theme
        />
        <Controls
          showInteractive={false}
          className="!bg-white dark:!bg-[#161d36] !border-gray-200 dark:!border-gray-700 !rounded-[10px] !shadow-md"
        />
      </ReactFlow>
      {insertAt && (
        <StepInsertMenu
          x={insertAt.x} y={insertAt.y} position={insertAt.position}
          items={insertItems} onClose={() => setInsertAt(null)}
          zIndex={60}
        />
      )}
      {editingStep && (
        <StepEditor step={editingStep} onClose={() => setEditingStep(null)} campaignId={campaignId} />
      )}
    </>
  );
}

export default function WorkflowPreviewPanel({
  campaignId,
}: WorkflowPreviewPanelProps = {}) {
  const workflowPreview = useOnboardingStore((s) => s.workflowPreview);
  const addWorkflowStep = useOnboardingStore((s) => s.addWorkflowStep);
  const hasWorkflow = workflowPreview && workflowPreview.length > 0;

  const [pickerState, setPickerState] = useState<'closed' | 'platform' | 'action'>('closed');
  const [selectedPlatform, setSelectedPlatform] = useState<any | null>(null);

  const handleAddStep = (platformId: string, action: any) => {
    const newStep: WorkflowPreviewStep = {
      id: `${action.type}-${Date.now()}`,
      type: action.type as StepType,
      title: action.title,
      description: action.desc,
      channel: platformId as any,
    };
    addWorkflowStep(newStep);
    setPickerState('closed');
    setSelectedPlatform(null);
  };

  // Count branching stats
  const branchCount = hasWorkflow ? (
    (workflowPreview.some(s => s.type === 'linkedin_connect') ? 3 : 0) +
    (workflowPreview.some(s => s.type === 'lead_generation') ? 2 : 0)
  ) : 0;

  return (

  <div className="flex h-full flex-col bg-white dark:bg-[#000724] border-l border-gray-200 dark:border-gray-800">
    {/* ─── HEADER ─── */}
    <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-800 p-[14px_18px]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/20">
            <Workflow className="h-[18px] w-[18px] text-white" />
          </div>
          <div>
            <div className="text-[15px] font-extrabold text-gray-900 dark:text-gray-100 tracking-[-0.02em]">
              Workflow Builder
            </div>
            <div className="mt-0.5 text-[11px] text-gray-400">
              {hasWorkflow
                ? `${workflowPreview.length} steps · ${branchCount} branches`
                : 'Build your automation flow'}
            </div>
          </div>
        </div>

        {/* Status badge */}
        {hasWorkflow && (
          <div className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-500">
            <Zap className="h-3 w-3" />
            Event-Driven
          </div>
        )}
      </div>

      {/* Step pills */}
      {hasWorkflow && (
        <div className="flex gap-1.5 mt-2.5 flex-wrap">
          {workflowPreview.map((step) => {
            const color = step.type.includes('linkedin') || step.type === 'lead_generation' ? '#0a66c2'
              : step.type === 'media_generation' ? '#d946ef'
              : step.type.includes('email') ? '#ea4335'
                : step.type.includes('whatsapp') ? '#25d366'
                  : step.type.includes('voice') ? '#8b5cf6'
                    : step.type === 'delay' ? '#6b7280' : '#6366f1';
            return (
              <div key={step.id} className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                <div className="w-1.5 h-1.5 rounded-full bg-current" />
                {step.title}
              </div>
            );
          })}
          {branchCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-500/10 border border-violet-500/20 text-[11px] font-semibold text-violet-500 dark:text-violet-400 dark:border-violet-500/30">
              <GitBranch className="w-3 h-3" />
              {branchCount} conditions
            </div>
          )}
        </div>
      )}
    </div>

    {/* ─── FLOW CANVAS ─── */}
    <div className="flex-1 min-h-0 relative bg-gray-50 dark:bg-[#0b1229]">
      <ReactFlowProvider>
        <FlowInner workflowPreview={workflowPreview || []} campaignId={campaignId} />
      </ReactFlowProvider>

      {!hasWorkflow && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-[#000724]">
              <Workflow className="h-6 w-6 text-gray-400" />
            </div>
            <div className="text-gray-400 text-[13px] font-medium">Complete checkpoints to<br />generate your workflow</div>
          </div>
        </div>
      )}
    </div>

    {/* ─── BOTTOM BAR ─── */}
    <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#000724] p-[12px_18px] relative z-10">
      <div className="flex items-center justify-between">
        <div className="relative">
          {/* ADD STEP BUTTON */}
          <button
            onClick={() => {
              setPickerState(pickerState === 'closed' ? 'platform' : 'closed');
              setSelectedPlatform(null);
            }}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[13px] font-bold transition-all ${
              pickerState !== 'closed'
                ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900'
                : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-200'
            }`}
          >
            {pickerState === 'closed' ? <Plus size={16} /> : <X size={16} />}
            {pickerState === 'closed' ? 'Add Step' : 'Close'}
          </button>

          {/* POPOVER */}
          {pickerState !== 'closed' && (
            <div className="absolute bottom-[calc(100%+12px)] left-0 w-[280px] bg-white dark:bg-[#161d36] rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl p-3 animate-in fade-in slide-in-from-bottom-2">
              <div className="text-[11px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-1">
                {selectedPlatform ? `${selectedPlatform.label} Actions` : 'Select Platform'}
              </div>

              <div className="grid grid-cols-1 gap-1">
                {!selectedPlatform ? (
                  PLATFORMS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => setSelectedPlatform(p)}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1e2745] transition-colors text-left"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${p.color}15`, color: p.color }}>
                        {p.icon}
                      </div>
                      <div className="flex-1">
                        <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{p.label}</div>
                        <div className="text-[11px] text-gray-400">{p.desc}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-600" />
                    </button>
                  ))
                ) : (
                  <>
                    {PLATFORM_ACTIONS[selectedPlatform.id].map((act) => (
                      <button
                        key={act.type}
                        onClick={() => handleAddStep(selectedPlatform.id, act)}
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-[#1e2745] transition-colors text-left"
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${selectedPlatform.color}15`, color: selectedPlatform.color }}>
                          {act.icon}
                        </div>
                        <div>
                          <div className="text-[13px] font-semibold text-gray-900 dark:text-gray-100">{act.title}</div>
                          <div className="text-[11px] text-gray-400">{selectedPlatform.label}</div>
                        </div>
                      </button>
                    ))}
                    <button
                      onClick={() => setSelectedPlatform(null)}
                      className="mt-2 flex items-center justify-center gap-2 p-2 w-full text-[11px] font-bold text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-[#1e2745] rounded-lg"
                    >
                      <ChevronLeft className="w-3 h-3" /> Back to platforms
                    </button>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* QUICK ACTIONS */}
        <div className="flex items-center gap-3">
          <div className="h-4 w-[1px] bg-gray-200 dark:bg-gray-700" />
          <div className="text-[11px] font-semibold text-gray-400 flex items-center gap-2">
            Quick Actions:
            <span className="text-gray-900 dark:text-gray-200 cursor-help hover:underline">Auto-Optimize</span>
            <span className="text-gray-900 dark:text-gray-200 cursor-help hover:underline">Smart Delay</span>
          </div>
        </div>
      </div>
    </div>
  </div>
  );
}
