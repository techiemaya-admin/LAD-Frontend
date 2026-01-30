'use client';
import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Linkedin,
  Mail,
  MessageSquare,
  Instagram,
  Phone,
  Clock,
  CheckCircle,
  ArrowRight,
  Edit,
  Loader2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useOnboardingStore } from '@/store/onboardingStore';
import { apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';
const getStepIcon = (type: string) => {
  const className = "w-6 h-6";
  if (type.includes('linkedin')) return <Linkedin className={className} />;
  if (type.includes('email')) return <Mail className={className} />;
  if (type.includes('whatsapp')) return <MessageSquare className={className} />;
  if (type.includes('instagram')) return <Instagram className={className} />;
  if (type.includes('voice')) return <Phone className={className} />;
  if (type === 'delay') return <Clock className={className} />;
  if (type === 'condition') return <CheckCircle className={className} />;
  return <ArrowRight className={className} />;
};
const getStepColor = (type: string) => {
  if (type.includes('linkedin')) return '#0077B5';
  if (type.includes('email')) return '#F59E0B';
  if (type.includes('whatsapp')) return '#25D366';
  if (type.includes('instagram')) return '#E4405F';
  if (type.includes('voice')) return '#8B5CF6';
  if (type === 'delay') return '#10B981';
  if (type === 'condition') return '#F59E0B';
  return '#64748B';
};
export default function Screen2AutoWorkflow() {
  const {
    answers,
    autoFlow,
    isGenerating,
    setAutoFlow,
    setIsGenerating,
    setCurrentScreen,
    setManualFlow,
  } = useOnboardingStore();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    generateWorkflow();
  }, []);
  const generateWorkflow = async () => {
    setIsGenerating(true);
    setError(null);
    try {
      const response = await apiPost('/api/workflow/auto-generate', {
        answers,
      }) as { data: { steps: any[]; edges: any[] } };
      const workflow: any = {
        steps: response.data.steps || [],
        edges: response.data.edges || [],
      };
      setAutoFlow(workflow);
      setManualFlow(workflow); // Also set manual flow for editing
    } catch (err: any) {
      logger.error('Failed to generate workflow', err);
      setError(err.message || 'Failed to generate workflow');
      // Fallback: Generate a simple workflow based on answers
      const fallbackWorkflow = generateFallbackWorkflow();
      setAutoFlow(fallbackWorkflow);
      setManualFlow(fallbackWorkflow);
    } finally {
      setIsGenerating(false);
    }
  };
  const generateFallbackWorkflow = () => {
    const steps: any[] = [];
    const edges: any[] = [];
    let stepId = 1;
    const channels = answers.channels || [];
    // Add LinkedIn steps if selected
    if (channels.includes('LinkedIn')) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'linkedin_visit',
        title: 'LinkedIn Profile Visit',
        description: 'Visit the lead\'s LinkedIn profile',
        icon: 'linkedin',
      });
      steps.push({
        id: `step_${stepId++}`,
        type: 'linkedin_follow',
        title: 'LinkedIn Follow',
        description: 'Follow the lead on LinkedIn',
        icon: 'linkedin',
      });
      steps.push({
        id: `step_${stepId++}`,
        type: 'linkedin_connect',
        title: 'Connection Request',
        description: 'Send a connection request with personalized message',
        icon: 'linkedin',
        variables: ['first_name', 'company_name'],
      });
      steps.push({
        id: `step_${stepId++}`,
        type: 'condition',
        title: 'If Connected',
        description: 'Check if connection request was accepted',
        icon: 'condition',
      });
      steps.push({
        id: `step_${stepId++}`,
        type: 'linkedin_message',
        title: 'LinkedIn Message',
        description: 'Send a follow-up message if connected',
        icon: 'linkedin',
        variables: ['first_name', 'company_name'],
      });
    }
    // Add delay
    steps.push({
      id: `step_${stepId++}`,
      type: 'delay',
      title: 'Wait 2 Days',
      description: 'Delay for 2 days before next step',
      icon: 'delay',
    });
    // Add Email fallback if enabled
    if (answers.fallbackLogic?.enabled && channels.includes('Email')) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'email_send',
        title: 'Send Email',
        description: 'Send email as fallback',
        icon: 'email',
        variables: ['first_name', 'email', 'company_name'],
      });
    }
    // Add WhatsApp if selected
    if (channels.includes('WhatsApp')) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'whatsapp_send',
        title: 'Send WhatsApp',
        description: 'Send WhatsApp message',
        icon: 'whatsapp',
        variables: ['first_name', 'phone'],
      });
    }
    // Add Instagram if selected
    if (channels.includes('Instagram')) {
      if (answers.autoposting) {
        steps.push({
          id: `step_${stepId++}`,
          type: 'instagram_autopost',
          title: 'Instagram Auto Post',
          description: 'Automatically post content to Instagram',
          icon: 'instagram',
        });
      }
      if (answers.dmAutomation) {
        steps.push({
          id: `step_${stepId++}`,
          type: 'instagram_dm',
          title: 'Instagram DM',
          description: 'Send direct message on Instagram',
          icon: 'instagram',
          variables: ['first_name', 'instagram_username'],
        });
      }
    }
    // Add Voice Agent if selected
    if (channels.includes('Voice Agent')) {
      steps.push({
        id: `step_${stepId++}`,
        type: 'voice_agent_call',
        title: 'Voice Agent Call',
        description: 'Make a call using voice agent',
        icon: 'voice',
      });
    }
    // Create edges
    for (let i = 0; i < steps.length - 1; i++) {
      edges.push({
        id: `edge_${steps[i].id}_${steps[i + 1].id}`,
        source: steps[i].id,
        target: steps[i + 1].id,
      });
    }
    return { steps, edges };
  };
  const handleSaveWorkflow = async () => {
    if (!autoFlow) return;
    try {
      await apiPost('/api/workflow/save', {
        workflow: autoFlow,
        answers,
      });
      const { completeOnboarding } = useOnboardingStore.getState();
      completeOnboarding();
      // Redirect to campaigns or dashboard
      router.push('/campaigns');
    } catch (error: any) {
      logger.error('Failed to save workflow', error);
      alert('Failed to save workflow. Please try again.');
    }
  };
  const handleEditWorkflow = () => {
    setCurrentScreen(3);
  };
  if (isGenerating) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F8F9FE] gap-6">
        <Loader2 className="w-[60px] h-[60px] text-[#667eea] animate-spin" />
        <h2 className="text-xl font-medium text-[#64748B]">
          Generating your workflow...
        </h2>
        <p className="text-sm text-[#94A3B8]">
          This may take a few seconds
        </p>
      </div>
    );
  }
  if (error && !autoFlow) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#F8F9FE] gap-6 p-6">
        <h2 className="text-xl font-medium text-[#EF4444]">
          Error generating workflow
        </h2>
        <p className="text-sm text-[#64748B]">
          {error}
        </p>
        <Button onClick={generateWorkflow}>
          Retry
        </Button>
      </div>
    );
  }
  return (
    <div className="h-screen flex flex-col bg-[#F8F9FE]">
      {/* Header */}
      <div className="p-6 border-b border-[#E2E8F0] bg-white">
        <h1 className="text-2xl font-semibold text-[#1E293B] mb-2">
          Your Auto-Generated Workflow
        </h1>
        <p className="text-sm text-[#64748B]">
          Based on your requirements, we've created this automation workflow. Review it and make any changes if needed.
        </p>
      </div>
      {/* Workflow Steps */}
      <div className="flex-1 overflow-y-auto p-8 flex flex-col items-center gap-6">
        {autoFlow?.steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <div className="w-full max-w-[800px] p-6 border border-[#E2E8F0] rounded-lg bg-white flex items-center gap-6">
              {/* Step Number */}
              <div className="w-12 h-12 rounded-full bg-[#F1F5F9] flex items-center justify-center font-semibold text-[#1E293B] shrink-0">
                {index + 1}
              </div>
              {/* Step Icon */}
              <div
                className="w-14 h-14 rounded-lg flex items-center justify-center text-white shrink-0"
                style={{ backgroundColor: getStepColor(step.type) }}
              >
                {getStepIcon(step.type)}
              </div>
              {/* Step Info */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-[#1E293B] mb-1">
                  {step.title}
                </h3>
                <p className="text-sm text-[#64748B] mb-2">
                  {step.description}
                </p>
                {step.variables && step.variables.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {step.variables.map((variable: string) => (
                      <Badge
                        key={variable}
                        variant="secondary"
                        className="bg-[#F1F5F9] text-[#1E293B] font-mono text-[11px]"
                      >
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {/* Arrow between steps */}
            {index < (autoFlow?.steps.length || 0) - 1 && (
              <ArrowRight className="text-[#94A3B8] w-8 h-8" />
            )}
          </React.Fragment>
        ))}
      </div>
      {/* Action Buttons */}
      <div className="p-6 border-t border-[#E2E8F0] bg-white flex justify-center gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={handleEditWorkflow}
          className="px-8 py-3 border-[#E2E8F0] text-[#1E293B] hover:border-[#94A3B8] hover:bg-[#F8FAFC]"
        >
          <Edit className="w-4 h-4 mr-2" />
          Edit Workflow
        </Button>
        <Button
          size="lg"
          onClick={handleSaveWorkflow}
          className="px-8 py-3 font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}
        >
          Looks Good → Save Workflow
        </Button>
      </div>
    </div>
  );
}
