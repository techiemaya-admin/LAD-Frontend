'use client';

import React, { useEffect, useState } from 'react';
import { Box, Paper, Typography, Stack, Button, CircularProgress, Chip } from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  Email,
  WhatsApp,
  Instagram,
  Phone,
  Schedule,
  CheckCircle,
  ArrowForward,
  Edit,
} from '@mui/icons-material';
import { useOnboardingStore } from '@/store/onboardingStore';
import { apiPost } from '@/lib/api';
import { useRouter } from 'next/navigation';
import { logger } from '@/lib/logger';

const getStepIcon = (type: string) => {
  if (type.includes('linkedin')) return <LinkedInIcon sx={{ fontSize: 24 }} />;
  if (type.includes('email')) return <Email sx={{ fontSize: 24 }} />;
  if (type.includes('whatsapp')) return <WhatsApp sx={{ fontSize: 24 }} />;
  if (type.includes('instagram')) return <Instagram sx={{ fontSize: 24 }} />;
  if (type.includes('voice')) return <Phone sx={{ fontSize: 24 }} />;
  if (type === 'delay') return <Schedule sx={{ fontSize: 24 }} />;
  if (type === 'condition') return <CheckCircle sx={{ fontSize: 24 }} />;
  return <ArrowForward sx={{ fontSize: 24 }} />;
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
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#F8F9FE',
          gap: 3,
        }}
      >
        <CircularProgress size={60} sx={{ color: '#667eea' }} />
        <Typography variant="h6" sx={{ color: '#64748B' }}>
          Generating your workflow...
        </Typography>
        <Typography variant="body2" sx={{ color: '#94A3B8' }}>
          This may take a few seconds
        </Typography>
      </Box>
    );
  }

  if (error && !autoFlow) {
    return (
      <Box
        sx={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: '#F8F9FE',
          gap: 3,
          p: 3,
        }}
      >
        <Typography variant="h6" sx={{ color: '#EF4444' }}>
          Error generating workflow
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          {error}
        </Typography>
        <Button variant="contained" onClick={generateWorkflow}>
          Retry
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#F8F9FE' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderBottom: '1px solid #E2E8F0',
          bgcolor: '#FFFFFF',
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600, color: '#1E293B', mb: 1 }}>
          Your Auto-Generated Workflow
        </Typography>
        <Typography variant="body2" sx={{ color: '#64748B' }}>
          Based on your requirements, we've created this automation workflow. Review it and make any changes if needed.
        </Typography>
      </Paper>

      {/* Workflow Steps */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 4,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        {autoFlow?.steps.map((step, index) => (
          <React.Fragment key={step.id}>
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                maxWidth: 800,
                p: 3,
                border: '1px solid #E2E8F0',
                borderRadius: 2,
                bgcolor: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                gap: 3,
              }}
            >
              {/* Step Number */}
              <Box
                sx={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  bgcolor: '#F1F5F9',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 600,
                  color: '#1E293B',
                  flexShrink: 0,
                }}
              >
                {index + 1}
              </Box>

              {/* Step Icon */}
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  bgcolor: getStepColor(step.type),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF',
                  flexShrink: 0,
                }}
              >
                {getStepIcon(step.type)}
              </Box>

              {/* Step Info */}
              <Box sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, color: '#1E293B', mb: 0.5 }}>
                  {step.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748B', mb: 1 }}>
                  {step.description}
                </Typography>
                {step.variables && step.variables.length > 0 && (
                  <Stack direction="row" spacing={1} flexWrap="wrap">
                    {step.variables.map((variable: string) => (
                      <Chip
                        key={variable}
                        label={`{{${variable}}}`}
                        size="small"
                        sx={{
                          bgcolor: '#F1F5F9',
                          color: '#1E293B',
                          fontFamily: 'monospace',
                          fontSize: '11px',
                        }}
                      />
                    ))}
                  </Stack>
                )}
              </Box>
            </Paper>

            {/* Arrow between steps */}
            {index < (autoFlow?.steps.length || 0) - 1 && (
              <ArrowForward sx={{ color: '#94A3B8', fontSize: 32 }} />
            )}
          </React.Fragment>
        ))}
      </Box>

      {/* Action Buttons */}
      <Paper
        elevation={0}
        sx={{
          p: 3,
          borderTop: '1px solid #E2E8F0',
          bgcolor: '#FFFFFF',
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
        }}
      >
        <Button
          variant="outlined"
          size="large"
          startIcon={<Edit />}
          onClick={handleEditWorkflow}
          sx={{
            borderColor: '#E2E8F0',
            color: '#1E293B',
            px: 4,
            py: 1.5,
            '&:hover': {
              borderColor: '#94A3B8',
              bgcolor: '#F8FAFC',
            },
          }}
        >
          Edit Workflow
        </Button>
        <Button
          variant="contained"
          size="large"
          onClick={handleSaveWorkflow}
          sx={{
            bgcolor: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5568d3 0%, #6a3d91 100%)',
            },
            px: 4,
            py: 1.5,
            fontWeight: 600,
          }}
        >
          Looks Good → Save Workflow
        </Button>
      </Paper>
    </Box>
  );
}

