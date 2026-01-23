'use client';
import React from 'react';
import { Box, Typography, Paper, Stack, Divider } from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  Email,
  Schedule,
  CheckCircle,
  Send,
  Phone,
  WhatsApp,
  Instagram,
  PersonSearch,
} from '@mui/icons-material';
import { StepDefinition } from '@/types/campaign';
import { useOnboardingStore } from '@/store/onboardingStore';
import PlatformReorder from './PlatformReorder';
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
const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'linkedin':
      return <LinkedInIcon sx={{ fontSize: 20 }} />;
    case 'email':
      return <Email sx={{ fontSize: 20 }} />;
    case 'whatsapp':
      return <WhatsApp sx={{ fontSize: 20 }} />;
    case 'voice':
      return <Phone sx={{ fontSize: 20 }} />;
    case 'instagram':
      return <Instagram sx={{ fontSize: 20 }} />;
    case 'delay':
      return <Schedule sx={{ fontSize: 20 }} />;
    case 'condition':
      return <CheckCircle sx={{ fontSize: 20 }} />;
    case 'leads':
      return <PersonSearch sx={{ fontSize: 20 }} />;
    default:
      return <Send sx={{ fontSize: 20 }} />;
  }
};
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
    <Paper
      key={step.type}
      draggable
      onDragStart={(e) => handleDragStart(e, step.type)}
      onClick={() => handleClick(step)}
      sx={{
        p: 2,
        cursor: 'pointer',
        border: '1px solid #E2E8F0',
        borderRadius: '12px',
        bgcolor: '#FFFFFF',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          borderColor: categoryColor,
          boxShadow: `0 4px 12px ${categoryColor}25`,
          transform: 'translateY(-2px)',
        },
        '&:active': {
          cursor: 'grabbing',
        },
      }}
    >
      <Stack direction="row" spacing={1.5} alignItems="center">
        <Box
          sx={{
            width: 32,
            height: 32,
            borderRadius: '6px',
            bgcolor: categoryColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFFFFF',
          }}
        >
          {getIcon(step.icon)}
        </Box>
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
            {step.label}
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B', fontSize: '11px' }}>
            {step.description}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  );
  return (
    <Box
      sx={{
        width: '100%',
        height: '100%',
        bgcolor: '#F8FAFC',
        overflowY: 'auto',
        p: 2,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1E293B' }}>
        Step Library
      </Typography>
      {/* Platform Reorder Section */}
      <Box sx={{ mb: 3, mx: -2, mt: -1 }}>
        <PlatformReorder />
      </Box>
      <Divider sx={{ my: 3, borderColor: '#E2E8F0' }} />
      <Typography variant="body2" sx={{ fontWeight: 600, mb: 2, color: '#475569' }}>
        Add Steps
      </Typography>
      {/* Lead Generation Steps */}
      {leadsSteps.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Lead Generation
          </Typography>
          <Stack spacing={1}>
            {leadsSteps.map((step) => renderStepCard(step, '#6366F1'))}
          </Stack>
        </Box>
      )}
      {linkedinSteps.length > 0 && (
        <>
          <Divider sx={{ my: 3, borderColor: '#E2E8F0' }} />
              <Box sx={{ mb: 4 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              LinkedIn
            </Typography>
            <Stack spacing={1}>
              {linkedinSteps.map((step) => renderStepCard(step, '#0077B5'))}
            </Stack>
          </Box>
        </>
      )}
      {emailSteps.length > 0 && (
        <>
          <Divider sx={{ my: 3, borderColor: '#E2E8F0' }} />
          <Box sx={{ mb: 4 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Email
            </Typography>
            <Stack spacing={1}>
              {emailSteps.map((step) => renderStepCard(step, '#F59E0B'))}
            </Stack>
          </Box>
        </>
      )}
      {whatsappSteps.length > 0 && (
        <>
          <Divider sx={{ my: 3, borderColor: '#E2E8F0' }} />
          <Box sx={{ mb: 4 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              WhatsApp
            </Typography>
            <Stack spacing={1}>
              {whatsappSteps.map((step) => renderStepCard(step, '#25D366'))}
            </Stack>
          </Box>
        </>
      )}
      {voiceSteps.length > 0 && (
        <>
          <Divider sx={{ my: 3, borderColor: '#E2E8F0' }} />
          <Box sx={{ mb: 4 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Voice Agent
            </Typography>
            <Stack spacing={1}>
              {voiceSteps.map((step) => renderStepCard(step, '#8B5CF6'))}
            </Stack>
          </Box>
        </>
      )}
      {instagramSteps.length > 0 && (
        <>
          <Divider sx={{ my: 3, borderColor: '#E2E8F0' }} />
          <Box sx={{ mb: 4 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Instagram
            </Typography>
            <Stack spacing={1}>
              {instagramSteps.map((step) => renderStepCard(step, '#E4405F'))}
            </Stack>
          </Box>
        </>
      )}
      {utilitySteps.length > 0 && (
        <>
          <Divider sx={{ my: 3, borderColor: '#E2E8F0' }} />
          <Box sx={{ mb: 4 }}>
            <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Utility
            </Typography>
            <Stack spacing={1}>
              {utilitySteps.map((step) => renderStepCard(step, '#10B981'))}
            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
}