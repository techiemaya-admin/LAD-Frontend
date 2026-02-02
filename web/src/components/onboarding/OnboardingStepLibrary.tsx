'use client';
import React from 'react';
import {
  Linkedin,
  Mail,
  Clock,
  CheckCircle,
  Send,
  Phone,
  MessageSquare,
  Instagram,
  UserSearch,
} from 'lucide-react';
import { StepDefinition } from '@/types/campaign';
import { useOnboardingStore } from '@/store/onboardingStore';
import PlatformReorder from './PlatformReorder';

const getIcon = (iconName: string) => {
  const className = "w-5 h-5";
  switch (iconName) {
    case 'linkedin':
      return <Linkedin className={className} />;
    case 'email':
      return <Mail className={className} />;
    case 'whatsapp':
      return <MessageSquare className={className} />;
    case 'voice':
      return <Phone className={className} />;
    case 'instagram':
      return <Instagram className={className} />;
    case 'delay':
      return <Clock className={className} />;
    case 'condition':
      return <CheckCircle className={className} />;
    case 'leads':
      return <UserSearch className={className} />;
    default:
      return <Send className={className} />;
  }
};

const STEP_DEFINITIONS: StepDefinition[] = [
  // LinkedIn Actions (as per AI chat workflow)
  {
    type: 'linkedin_visit',
    label: 'Visit LinkedIn Profile',
    icon: 'linkedin',
    description: 'View target profile',
    category: 'linkedin',
    defaultData: { title: 'Visit LinkedIn Profile' },
  },
  {
    type: 'linkedin_follow',
    label: 'Follow LinkedIn Profile',
    icon: 'linkedin',
    description: 'Follow the profile',
    category: 'linkedin',
    defaultData: { title: 'Follow LinkedIn Profile' },
  },
  {
    type: 'linkedin_connect',
    label: 'Send Connection Request',
    icon: 'linkedin',
    description: 'Connect with personalized message',
    category: 'linkedin',
    defaultData: { title: 'Send Connection Request', message: 'Hi {{first_name}}, I\'d like to connect.' },
  },
  {
    type: 'linkedin_message',
    label: 'Send LinkedIn Message',
    icon: 'linkedin',
    description: 'Send personalized message',
    category: 'linkedin',
    defaultData: { title: 'Send LinkedIn Message', message: 'Hi {{first_name}}, I noticed...' },
  },
  // WhatsApp Actions (as per AI chat workflow)
  {
    type: 'whatsapp_broadcast',
    label: 'Send WhatsApp Broadcast',
    icon: 'whatsapp',
    description: 'Send broadcast message',
    category: 'whatsapp',
    defaultData: { title: 'Send WhatsApp Broadcast' },
  },
  {
    type: 'whatsapp_message',
    label: 'Send WhatsApp 1:1 Message',
    icon: 'whatsapp',
    description: 'Send direct message',
    category: 'whatsapp',
    defaultData: { title: 'Send WhatsApp 1:1 Message' },
  },
  {
    type: 'whatsapp_followup',
    label: 'WhatsApp Follow-up',
    icon: 'whatsapp',
    description: 'Send follow-up message',
    category: 'whatsapp',
    defaultData: { title: 'WhatsApp Follow-up' },
  },
  {
    type: 'whatsapp_template',
    label: 'Send WhatsApp Template',
    icon: 'whatsapp',
    description: 'Send template message',
    category: 'whatsapp',
    defaultData: { title: 'Send WhatsApp Template' },
  },
  // Email Actions (as per AI chat workflow)
  {
    type: 'email_send',
    label: 'Send Email',
    icon: 'email',
    description: 'Send email campaign',
    category: 'email',
    defaultData: { title: 'Send Email', subject: 'Re: {{company_name}}', body: 'Hi {{first_name}},...' },
  },
  {
    type: 'email_followup',
    label: 'Send Follow-up Email',
    icon: 'email',
    description: 'Follow up if no response',
    category: 'email',
    defaultData: { title: 'Send Follow-up Email', subject: 'Re: {{company_name}}', body: 'Hi {{first_name}},...' },
  },
  // Voice Actions (as per AI chat workflow)
  {
    type: 'voice_call',
    label: 'Trigger Voice Call',
    icon: 'voice',
    description: 'Initiate automated voice call',
    category: 'voice',
    defaultData: { title: 'Trigger Voice Call' },
  },
  {
    type: 'voice_script',
    label: 'Use Call Script',
    icon: 'voice',
    description: 'Follow predefined call script',
    category: 'voice',
    defaultData: { title: 'Use Call Script' },
  },
  // Utility Actions
  {
    type: 'delay',
    label: 'Delay',
    icon: 'delay',
    description: 'Wait for specified time',
    category: 'utility',
    defaultData: { title: 'Delay', delayDays: 1, delayHours: 0 },
  },
  {
    type: 'lead_generation',
    label: 'Lead Generation',
    icon: 'leads',
    description: 'Generate leads from data source',
    category: 'leads',
    defaultData: { title: 'Lead Generation', leadGenerationQuery: '', leadGenerationLimit: 50 },
  },
  {
    type: 'condition',
    label: 'Condition',
    icon: 'condition',
    description: 'Check condition (if connected/replied)',
    category: 'utility',
    defaultData: { title: 'Condition', conditionType: 'connected' },
  },
];
// Simple toast notification helper
const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-amber-500';
  const toast = document.createElement('div');
  toast.className = `${bgColor} text-white px-4 py-3 rounded-lg shadow-lg fixed bottom-4 right-4 z-50 max-w-sm`;
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3000);
};

export default function OnboardingStepLibrary() {
  const { addWorkflowNode, addWorkflowStep, workflowNodes, workflowPreview, addWorkflowEdge } = useOnboardingStore();
  const handleDragStart = (e: React.DragEvent, stepType: string) => {
    e.dataTransfer.setData('application/reactflow', stepType);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleClick = (step: StepDefinition) => {
    // Get the current state to check for existing steps
    const currentState = useOnboardingStore.getState();
    const currentWorkflowPreview = currentState.workflowPreview || [];
    // Check if this exact step type already exists in the workflow
    const existingStep = currentWorkflowPreview.find(s => s.type === step.type);
    if (existingStep) {
      showToast(`"${step.label}" step is already added to the workflow`, 'warning');
      return; // Stop execution - don't add duplicate steps
    }
    // Create workflow node using onboarding store
    const nodeId = `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const position = { x: 200, y: 150 + workflowNodes.length * 120 };
    const workflowNode = {
      id: nodeId,
      type: step.type,
      title: step.defaultData?.title || step.label,
      description: step.description,
      position,
      data: step.defaultData || {},
    };
    // Get current nodes before adding (to find the last node)
    const currentNodes = currentState.workflowNodes;
    const lastNode = currentNodes.length > 0 ? currentNodes[currentNodes.length - 1] : null;
    // Add to workflowNodes (preferred)
    addWorkflowNode(workflowNode);
    // Also add to workflowPreview for compatibility
    const previewStep = {
      id: nodeId,
      type: step.type,
      title: step.defaultData?.title || step.label,
      description: step.description,
    };
    addWorkflowStep(previewStep);
    // Create edge from last node if exists (and it's not the end node)
    if (lastNode && lastNode.id !== 'end' && lastNode.type !== 'end') {
      addWorkflowEdge({
        id: `edge-${lastNode.id}-${nodeId}`,
        from: lastNode.id,
        to: nodeId,
        source: lastNode.id,
        target: nodeId,
      });
    }
    // Show success toast
    showToast(`"${step.label}" added to workflow`, 'success');
  };
  const linkedinSteps = STEP_DEFINITIONS.filter((s) => s.category === 'linkedin');
  const emailSteps = STEP_DEFINITIONS.filter((s) => s.category === 'email');
  const whatsappSteps = STEP_DEFINITIONS.filter((s) => s.category === 'whatsapp');
  const voiceSteps = STEP_DEFINITIONS.filter((s) => s.category === 'voice');
  const instagramSteps = STEP_DEFINITIONS.filter((s) => s.category === 'instagram');
  const leadsSteps = STEP_DEFINITIONS.filter((s) => s.category === 'leads');
  const utilitySteps = STEP_DEFINITIONS.filter((s) => s.category === 'utility');
  const renderStepCard = (step: StepDefinition, categoryColor: string) => (
    <div
      key={step.type}
      draggable
      onDragStart={(e) => handleDragStart(e, step.type)}
      onClick={() => handleClick(step)}
      className="p-4 cursor-pointer border border-[#E2E8F0] rounded-xl bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 active:cursor-grabbing"
      style={{
        borderColor: undefined,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = categoryColor;
        e.currentTarget.style.boxShadow = `0 4px 12px ${categoryColor}25`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#E2E8F0';
        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center text-white"
          style={{ backgroundColor: categoryColor }}
        >
          {getIcon(step.icon)}
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#1E293B]">
            {step.label}
          </p>
          <p className="text-[11px] text-[#64748B]">
            {step.description}
          </p>
        </div>
      </div>
    </div>
  );
  return (
    <div className="w-full h-full bg-[#F8FAFC] overflow-y-auto p-4">
      <h2 className="text-lg font-semibold mb-6 text-[#1E293B]">
        Step Library
      </h2>
      {/* Platform Reorder Section */}
      <div className="mb-6 -mx-4 -mt-2">
        <PlatformReorder />
      </div>
      <div className="my-6 border-t border-[#E2E8F0]" />
      <p className="text-sm font-semibold mb-4 text-[#475569]">
        Add Steps
      </p>
      {/* Lead Generation Steps */}
      {leadsSteps.length > 0 && (
        <div className="mb-8">
          <span className="text-xs text-[#64748B] font-bold mb-3 block uppercase tracking-wider">
            Lead Generation
          </span>
          <div className="space-y-2">
            {leadsSteps.map((step) => renderStepCard(step, '#6366F1'))}
          </div>
        </div>
      )}
      {linkedinSteps.length > 0 && (
        <>
          <div className="my-6 border-t border-[#E2E8F0]" />
          <div className="mb-8">
            <span className="text-xs text-[#64748B] font-bold mb-3 block uppercase tracking-wider">
              LinkedIn
            </span>
            <div className="space-y-2">
              {linkedinSteps.map((step) => renderStepCard(step, '#0077B5'))}
            </div>
          </div>
        </>
      )}
      {emailSteps.length > 0 && (
        <>
          <div className="my-6 border-t border-[#E2E8F0]" />
          <div className="mb-8">
            <span className="text-xs text-[#64748B] font-bold mb-3 block uppercase tracking-wider">
              Email
            </span>
            <div className="space-y-2">
              {emailSteps.map((step) => renderStepCard(step, '#F59E0B'))}
            </div>
          </div>
        </>
      )}
      {whatsappSteps.length > 0 && (
        <>
          <div className="my-6 border-t border-[#E2E8F0]" />
          <div className="mb-8">
            <span className="text-xs text-[#64748B] font-bold mb-3 block uppercase tracking-wider">
              WhatsApp
            </span>
            <div className="space-y-2">
              {whatsappSteps.map((step) => renderStepCard(step, '#25D366'))}
            </div>
          </div>
        </>
      )}
      {voiceSteps.length > 0 && (
        <>
          <div className="my-6 border-t border-[#E2E8F0]" />
          <div className="mb-8">
            <span className="text-xs text-[#64748B] font-bold mb-3 block uppercase tracking-wider">
              Voice Agent
            </span>
            <div className="space-y-2">
              {voiceSteps.map((step) => renderStepCard(step, '#8B5CF6'))}
            </div>
          </div>
        </>
      )}
      {instagramSteps.length > 0 && (
        <>
          <div className="my-6 border-t border-[#E2E8F0]" />
          <div className="mb-8">
            <span className="text-xs text-[#64748B] font-bold mb-3 block uppercase tracking-wider">
              Instagram
            </span>
            <div className="space-y-2">
              {instagramSteps.map((step) => renderStepCard(step, '#E4405F'))}
            </div>
          </div>
        </>
      )}
      {utilitySteps.length > 0 && (
        <>
          <div className="my-6 border-t border-[#E2E8F0]" />
          <div className="mb-8">
            <span className="text-xs text-[#64748B] font-bold mb-3 block uppercase tracking-wider">
              Utility
            </span>
            <div className="space-y-2">
              {utilitySteps.map((step) => renderStepCard(step, '#10B981'))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
