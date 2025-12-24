'use client';

import React from 'react';
import { Box, Typography, Paper, Stack, Divider } from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  Email,
  Schedule,
  CheckCircle,
  Visibility,
  PersonAdd,
  Message,
  Send,
  Phone,
  WhatsApp,
  Instagram,
  Search,
  Business,
  People,
  PostAdd,
  Comment,
  AutoAwesome,
  PersonSearch
} from '@mui/icons-material';
import { StepDefinition } from '@/types/campaign';
import { useCampaignStore } from '@/store/campaignStore';

const STEP_DEFINITIONS: StepDefinition[] = [
  {
    type: 'linkedin_visit',
    label: 'Profile Visit',
    icon: 'linkedin',
    description: 'Visit the lead\'s LinkedIn profile',
    category: 'linkedin',
    defaultData: { title: 'LinkedIn Profile Visit' },
  },
  {
    type: 'linkedin_follow',
    label: 'Follow',
    icon: 'linkedin',
    description: 'Follow the lead on LinkedIn',
    category: 'linkedin',
    defaultData: { title: 'LinkedIn Follow' },
  },
  {
    type: 'linkedin_connect',
    label: 'Connection Request',
    icon: 'linkedin',
    description: 'Send a connection request with message',
    category: 'linkedin',
    defaultData: { title: 'LinkedIn Connection Request', message: 'Hi {{first_name}}, I\'d like to connect.' },
  },
  {
    type: 'linkedin_message',
    label: 'LinkedIn Message',
    icon: 'linkedin',
    description: 'Send a message (only if connected)',
    category: 'linkedin',
    defaultData: { title: 'LinkedIn Message', message: 'Hi {{first_name}},...' },
  },
  {
    type: 'linkedin_scrape_profile',
    label: 'Scrape Profile',
    icon: 'linkedin',
    description: 'Scrape LinkedIn profile data',
    category: 'linkedin',
    defaultData: { title: 'Scrape LinkedIn Profile', linkedinScrapeFields: ['name', 'title', 'company', 'location'] },
  },
  {
    type: 'linkedin_company_search',
    label: 'Company Search',
    icon: 'linkedin',
    description: 'Search for company on LinkedIn',
    category: 'linkedin',
    defaultData: { title: 'LinkedIn Company Search', linkedinCompanyName: '{{company_name}}' },
  },
  {
    type: 'linkedin_employee_list',
    label: 'Get Employee List',
    icon: 'linkedin',
    description: 'Get list of employees from company',
    category: 'linkedin',
    defaultData: { title: 'Get Employee List', linkedinCompanyUrl: '' },
  },
  {
    type: 'linkedin_autopost',
    label: 'Auto Post',
    icon: 'linkedin',
    description: 'Automatically post content to LinkedIn',
    category: 'linkedin',
    defaultData: { title: 'LinkedIn Auto Post', linkedinPostContent: '', linkedinPostImageUrl: '' },
  },
  {
    type: 'linkedin_comment_reply',
    label: 'Reply to Comment',
    icon: 'linkedin',
    description: 'Automatically reply to comments on posts',
    category: 'linkedin',
    defaultData: { title: 'Reply to LinkedIn Comment', linkedinCommentText: 'Thanks for your comment!' },
  },
  {
    type: 'email_send',
    label: 'Send Email',
    icon: 'email',
    description: 'Send an email to the lead',
    category: 'email',
    defaultData: { title: 'Send Email', subject: 'Re: {{company_name}}', body: 'Hi {{first_name}},...' },
  },
  {
    type: 'email_followup',
    label: 'Email Follow-up',
    icon: 'email',
    description: 'Send a follow-up email',
    category: 'email',
    defaultData: { title: 'Email Follow-up', subject: 'Re: {{company_name}}', body: 'Hi {{first_name}},...' },
  },
  {
    type: 'whatsapp_send',
    label: 'Send WhatsApp',
    icon: 'whatsapp',
    description: 'Send a WhatsApp message',
    category: 'whatsapp',
    defaultData: { title: 'Send WhatsApp', whatsappMessage: 'Hi {{first_name}},...', whatsappTemplate: '' },
  },
  {
    type: 'voice_agent_call',
    label: 'Voice Agent Call',
    icon: 'voice',
    description: 'Make a call using voice agent',
    category: 'voice',
    defaultData: { title: 'Voice Agent Call', voiceAgentId: '', voiceTemplate: '', voiceContext: '' },
  },
  {
    type: 'instagram_follow',
    label: 'Follow',
    icon: 'instagram',
    description: 'Follow the lead on Instagram',
    category: 'instagram',
    defaultData: { title: 'Instagram Follow', instagramUsername: '{{instagram_username}}' },
  },
  {
    type: 'instagram_like',
    label: 'Like Post',
    icon: 'instagram',
    description: 'Like a specific Instagram post',
    category: 'instagram',
    defaultData: { title: 'Instagram Like', instagramPostUrl: '' },
  },
  {
    type: 'instagram_dm',
    label: 'Send DM',
    icon: 'instagram',
    description: 'Send a direct message on Instagram',
    category: 'instagram',
    defaultData: { title: 'Instagram DM', instagramDmMessage: 'Hi {{first_name}},...' },
  },
  {
    type: 'instagram_autopost',
    label: 'Auto Post',
    icon: 'instagram',
    description: 'Automatically post content to Instagram',
    category: 'instagram',
    defaultData: { title: 'Instagram Auto Post', instagramPostCaption: '', instagramPostImageUrl: '', instagramAutopostSchedule: 'daily' },
  },
  {
    type: 'instagram_comment_reply',
    label: 'Reply to Comment',
    icon: 'instagram',
    description: 'Automatically reply to comments on posts',
    category: 'instagram',
    defaultData: { title: 'Reply to Instagram Comment', instagramCommentText: 'Thanks for your comment!' },
  },
  {
    type: 'instagram_story_view',
    label: 'View Story',
    icon: 'instagram',
    description: 'View Instagram story',
    category: 'instagram',
    defaultData: { title: 'View Instagram Story', instagramUsername: '{{instagram_username}}' },
  },
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

export default function StepLibrary() {
  const addStep = useCampaignStore((state) => state.addStep);

  const handleDragStart = (e: React.DragEvent, stepType: string) => {
    e.dataTransfer.setData('application/reactflow', stepType);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClick = (step: StepDefinition) => {
    // Add step at center of canvas (will be positioned by React Flow)
    addStep(step.type, { x: 400, y: 300 });
  };

  const linkedinSteps = STEP_DEFINITIONS.filter((s) => s.category === 'linkedin');
  const emailSteps = STEP_DEFINITIONS.filter((s) => s.category === 'email');
  const whatsappSteps = STEP_DEFINITIONS.filter((s) => s.category === 'whatsapp');
  const voiceSteps = STEP_DEFINITIONS.filter((s) => s.category === 'voice');
  const instagramSteps = STEP_DEFINITIONS.filter((s) => s.category === 'instagram');
  const leadsSteps = STEP_DEFINITIONS.filter((s) => s.category === 'leads');
  const utilitySteps = STEP_DEFINITIONS.filter((s) => s.category === 'utility');

  return (
    <Box
      sx={{
        width: 280,
        height: '100%',
        bgcolor: '#F8FAFC',
        borderRight: '1px solid #E2E8F0',
        overflowY: 'auto',
        p: 2,
      }}
    >
      <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: '#1E293B' }}>
        Step Library
      </Typography>

      {/* Lead Generation Steps */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Lead Generation
        </Typography>
        <Stack spacing={1}>
          {leadsSteps.map((step) => (
            <Paper
              key={step.type}
              draggable
              onDragStart={(e) => handleDragStart(e, step.type)}
              onClick={() => handleClick(step)}
              sx={{
                p: 2,
                cursor: 'grab',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                bgcolor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: '#6366F1',
                  boxShadow: '0 2px 8px rgba(99, 102, 241, 0.1)',
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
                    bgcolor: '#6366F1',
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
          ))}
        </Stack>
      </Box>

      {/* Divider */}
      <Divider sx={{ my: 3, borderColor: '#E2E8F0' }} />

      {/* LinkedIn Steps */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          LinkedIn
        </Typography>
        <Stack spacing={1}>
          {linkedinSteps.map((step) => (
            <Paper
              key={step.type}
              draggable
              onDragStart={(e) => handleDragStart(e, step.type)}
              onClick={() => handleClick(step)}
              sx={{
                p: 2,
                cursor: 'grab',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                bgcolor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: '#7c3aed',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.15)',
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
                    bgcolor: '#0077B5',
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
          ))}
        </Stack>
      </Box>

      {/* Divider */}
      <Divider sx={{ my: 3, borderColor: '#E2E8F0' }} />

      {/* Email Steps */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Email
        </Typography>
        <Stack spacing={1}>
          {emailSteps.map((step) => (
            <Paper
              key={step.type}
              draggable
              onDragStart={(e) => handleDragStart(e, step.type)}
              onClick={() => handleClick(step)}
              sx={{
                p: 2,
                cursor: 'grab',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                bgcolor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: '#F59E0B',
                  boxShadow: '0 2px 8px rgba(245, 158, 11, 0.1)',
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
                    bgcolor: '#F59E0B',
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
          ))}
        </Stack>
      </Box>

      {/* Divider */}
      <Divider sx={{ my: 3, borderColor: '#E2E8F0' }} />

      {/* WhatsApp Steps */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          WhatsApp
        </Typography>
        <Stack spacing={1}>
          {whatsappSteps.map((step) => (
            <Paper
              key={step.type}
              draggable
              onDragStart={(e) => handleDragStart(e, step.type)}
              onClick={() => handleClick(step)}
              sx={{
                p: 2,
                cursor: 'grab',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                bgcolor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: '#25D366',
                  boxShadow: '0 2px 8px rgba(37, 211, 102, 0.1)',
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
                    bgcolor: '#25D366',
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
          ))}
        </Stack>
      </Box>

      {/* Divider */}
      <Divider sx={{ my: 3, borderColor: '#E2E8F0' }} />

      {/* Voice Agent Steps */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Voice Agent
        </Typography>
        <Stack spacing={1}>
          {voiceSteps.map((step) => (
            <Paper
              key={step.type}
              draggable
              onDragStart={(e) => handleDragStart(e, step.type)}
              onClick={() => handleClick(step)}
              sx={{
                p: 2,
                cursor: 'grab',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                bgcolor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: '#8B5CF6',
                  boxShadow: '0 2px 8px rgba(139, 92, 246, 0.1)',
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
                    bgcolor: '#8B5CF6',
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
          ))}
        </Stack>
      </Box>

      {/* Divider */}
      <Divider sx={{ my: 3, borderColor: '#E2E8F0' }} />

      {/* Instagram Steps */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Instagram
        </Typography>
        <Stack spacing={1}>
          {instagramSteps.map((step) => (
            <Paper
              key={step.type}
              draggable
              onDragStart={(e) => handleDragStart(e, step.type)}
              onClick={() => handleClick(step)}
              sx={{
                p: 2,
                cursor: 'grab',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                bgcolor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: '#E4405F',
                  boxShadow: '0 2px 8px rgba(228, 64, 95, 0.1)',
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
                    bgcolor: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
                    background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)',
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
          ))}
        </Stack>
      </Box>

      {/* Divider */}
      <Divider sx={{ my: 3, borderColor: '#E2E8F0' }} />

      {/* Utility Steps */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="caption" sx={{ color: '#64748B', fontWeight: 700, mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Utility
        </Typography>
        <Stack spacing={1}>
          {utilitySteps.map((step) => (
            <Paper
              key={step.type}
              draggable
              onDragStart={(e) => handleDragStart(e, step.type)}
              onClick={() => handleClick(step)}
              sx={{
                p: 2,
                cursor: 'grab',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                bgcolor: '#FFFFFF',
                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  borderColor: '#10B981',
                  boxShadow: '0 2px 8px rgba(16, 185, 129, 0.1)',
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
                    bgcolor: '#10B981',
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
          ))}
        </Stack>
      </Box>
    </Box>
  );
}

