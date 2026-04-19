'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { Workflow, Play, GitBranch, Zap, ArrowRightLeft, ArrowUpDown, Plus, X, ChevronRight, ChevronLeft, Linkedin, Mail, MessageCircle, Phone, UserPlus, Send, Eye } from 'lucide-react';
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
];

const PLATFORM_ACTIONS: Record<string, any[]> = {
  linkedin: [
    { type: 'linkedin_connect', title: 'Connect', icon: <UserPlus className="w-4 h-4" />, desc: 'Send connection request' },
    { type: 'linkedin_message', title: 'Message', icon: <Send className="w-4 h-4" />, desc: 'Send follow-up message' },
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
      fitView({ padding: 0.15, duration: 500, minZoom: 0.2, maxZoom: 0.85 });
    }, 300);
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

  return (
    <>
      <ReactFlow
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
        fitViewOptions={{ padding: 0.15, minZoom: 0.2, maxZoom: 0.85 }}
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.6 }}
        attributionPosition="bottom-left"
        proOptions={{ hideAttribution: true }}
        style={{ background: '#fafafa' }}
      >
        <Background
          color="#e5e7eb"
          gap={28}
          size={1.2}
          variant={BackgroundVariant.Dots}
          className="opacity-50"
        />
        <Controls
          showInteractive={false}
          style={{
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid #e5e7eb',
            borderRadius: 10,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
        />
      </ReactFlow>

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
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#fff', borderLeft: '1px solid #f0f0f0' }}>
      {/* ─── HEADER ─── */}
      <div style={{ flexShrink: 0, padding: '14px 18px', borderBottom: '1px solid #f0f0f0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 3px 10px rgba(99,102,241,0.3)',
            }}>
              <Workflow className="w-[18px] h-[18px] text-white" />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#111827', letterSpacing: '-0.02em' }}>
                Workflow Builder
              </div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                {hasWorkflow
                  ? `${workflowPreview.length} steps · ${branchCount} branches`
                  : 'Build your automation flow'}
              </div>
            </div>
          </div>

          {/* Status badge */}
          {hasWorkflow && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20,
              background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)',
              fontSize: 10, fontWeight: 700, color: '#10b981',
            }}>
              <Zap className="w-3 h-3" />
              Event-Driven
            </div>
          )}
        </div>

        {/* Step pills */}
        {hasWorkflow && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            {workflowPreview.map((step) => {
              const color = step.type.includes('linkedin') || step.type === 'lead_generation' ? '#0a66c2'
                : step.type.includes('email') ? '#ea4335'
                  : step.type.includes('whatsapp') ? '#25d366'
                    : step.type.includes('voice') ? '#8b5cf6'
                      : step.type === 'delay' ? '#6b7280' : '#6366f1';
              return (
                <div key={step.id} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '3px 10px', borderRadius: 16,
                  background: `${color}0d`, border: `1px solid ${color}25`,
                  fontSize: 11, fontWeight: 600, color,
                }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: color }} />
                  {step.title}
                </div>
              );
            })}
            {branchCount > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 4,
                padding: '3px 10px', borderRadius: 16,
                background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.2)',
                fontSize: 11, fontWeight: 600, color: '#8b5cf6',
              }}>
                <GitBranch className="w-3 h-3" />
                {branchCount} conditions
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── FLOW CANVAS ─── */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <ReactFlowProvider>
          <FlowInner
            workflowPreview={workflowPreview || []}
            campaignId={campaignId}
          />
        </ReactFlowProvider>

        {/* Empty state */}
        {!hasWorkflow && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'none',
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                width: 52, height: 52, margin: '0 auto 12px',
                borderRadius: 16, background: '#f9fafb',
                border: '2px dashed #d1d5db',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Workflow style={{ width: 24, height: 24, color: '#9ca3af' }} />
              </div>
              <div style={{ color: '#9ca3af', fontSize: 13, fontWeight: 500 }}>
                Complete checkpoints to<br />generate your workflow
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── BOTTOM BAR (Action Toolbox) ─── */}
      <div style={{
        flexShrink: 0,
        padding: '12px 18px',
        borderTop: '1px solid #f0f0f0',
        background: '#fff',
        position: 'relative',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => {
                setPickerState(pickerState === 'closed' ? 'platform' : 'closed');
                setSelectedPlatform(null);
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 16px', borderRadius: 12,
                background: pickerState !== 'closed' ? '#111827' : '#f3f4f6',
                color: pickerState !== 'closed' ? '#fff' : '#111827',
                fontSize: 13, fontWeight: 700,
                border: 'none', cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                boxShadow: pickerState !== 'closed' ? '0 4px 12px rgba(0,0,0,0.15)' : 'none',
              }}
            >
              {pickerState === 'closed' ? <Plus className="w-4 h-4" /> : <X className="w-4 h-4" />}
              {pickerState === 'closed' ? 'Add Step' : 'Close'}
            </button>

            {/* Platform / Action Picker Popover */}
            {pickerState !== 'closed' && (
              <div style={{
                position: 'absolute', bottom: 'calc(100% + 12px)', left: 0,
                width: 280, background: '#fff', borderRadius: 16,
                border: '1px solid #e5e7eb',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)',
                padding: 12, overflow: 'hidden',
                animation: 'mk-slide-up 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, paddingLeft: 4 }}>
                  {selectedPlatform ? `${selectedPlatform.label} Actions` : 'Select Platform'}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 4 }}>
                  {!selectedPlatform ? (
                    PLATFORMS.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => setSelectedPlatform(p)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 10,
                          border: 'none', background: 'transparent',
                          cursor: 'pointer', textAlign: 'left',
                          transition: 'background 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: 32, height: 32, borderRadius: 8,
                          background: p.color + '15', display: 'flex',
                          alignItems: 'center', justifyContent: 'center',
                          color: p.color,
                        }}>
                          {p.icon}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{p.label}</div>
                          <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.desc}</div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </button>
                    ))
                  ) : (
                    <>
                      {PLATFORM_ACTIONS[selectedPlatform.id].map((act) => (
                        <button
                          key={act.type}
                          onClick={() => handleAddStep(selectedPlatform.id, act)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 10,
                            padding: '10px 12px', borderRadius: 10,
                            border: 'none', background: 'transparent',
                            cursor: 'pointer', textAlign: 'left',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.background = '#f9fafb'}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: selectedPlatform.color + '15', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            color: selectedPlatform.color,
                          }}>
                            {act.icon}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{act.title}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>{selectedPlatform.label}</div>
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={() => setSelectedPlatform(null)}
                        style={{
                          marginTop: 8, display: 'flex', alignItems: 'center', gap: 6,
                          justifyContent: 'center', padding: '8px', border: 'none',
                          background: '#f9fafb', borderRadius: 8, color: '#6b7280',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer',
                        }}
                      >
                        <ChevronLeft className="w-3 h-3" /> Back to platforms
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ height: 16, width: 1, background: '#e5e7eb' }} />
            <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              Quick Actions:
              <span style={{ color: '#111827', cursor: 'help' }}>Auto-Optimize</span>
              <span style={{ color: '#111827', cursor: 'help' }}>Smart Delay</span>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes mk-slide-up {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

    </div>
  );
}
