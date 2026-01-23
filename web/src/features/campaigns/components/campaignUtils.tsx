import React from 'react';
import { Box, Tooltip, Chip, Typography } from '@mui/material';
import { LinkedIn as LinkedInIcon, Email, Phone, Visibility, PersonAdd, Message, Send } from '@mui/icons-material';
import type { Campaign, CampaignStatus } from '@/features/campaigns';
// Re-export types from SDK for convenience
export type { Campaign, CampaignStatus } from '@/features/campaigns';
// Channel/Platform configuration with icons and colors
export const PLATFORM_CONFIG = {
  linkedin: {
    name: 'LinkedIn',
    color: '#0077B5',
    bgColor: '#E8F4FC',
  },
  email: {
    name: 'Email',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
  },
  whatsapp: {
    name: 'WhatsApp',
    color: '#25D366',
    bgColor: '#DCFCE7',
  },
  instagram: {
    name: 'Instagram',
    color: '#E4405F',
    bgColor: '#FCE7F3',
  },
  voice: {
    name: 'Voice',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
  },
};
// LinkedIn action types with details
export const LINKEDIN_ACTIONS = {
  linkedin_visit: { name: 'Visit', icon: 'visibility' },
  linkedin_connect: { name: 'Connect', icon: 'person_add' },
  linkedin_message: { name: 'Message', icon: 'message' },
  linkedin_follow: { name: 'Follow', icon: 'person_add' },
};
// Detect channels AND specific actions used in campaign based on steps
export const getChannelsUsed = (campaign: Campaign) => {
  const channels = {
    linkedin: false,
    email: false,
    whatsapp: false,
    instagram: false,
    voice: false,
  };
  if (campaign.steps && Array.isArray(campaign.steps) && campaign.steps.length > 0) {
    campaign.steps.forEach((step: { type?: string; step_type?: string; [key: string]: any }) => {
      const stepType = String(step.type || step.step_type || '').toLowerCase();
      if (stepType.startsWith('linkedin_') || stepType.includes('linkedin')) channels.linkedin = true;
      if (stepType.startsWith('email_') || stepType.includes('email')) channels.email = true;
      if (stepType.startsWith('whatsapp_') || stepType.includes('whatsapp')) channels.whatsapp = true;
      if (stepType.startsWith('instagram_') || stepType.includes('instagram')) channels.instagram = true;
      if (stepType.startsWith('voice_') || stepType === 'voice_agent_call' || stepType.includes('voice')) channels.voice = true;
    });
  }
  return channels;
};
// Get detailed actions breakdown for a campaign
export const getDetailedActions = (campaign: Campaign) => {
  const actions: { type: string; name: string; platform: string; count: number }[] = [];
  const actionCounts: Record<string, number> = {};
  if (campaign.steps && Array.isArray(campaign.steps) && campaign.steps.length > 0) {
    campaign.steps.forEach((step: { type?: string; step_type?: string; [key: string]: any }) => {
      const stepType = String(step.type || step.step_type || '').toLowerCase();
      if (stepType && stepType !== 'start' && stepType !== 'end' && stepType !== 'lead_generation' && stepType !== 'delay' && stepType !== 'condition') {
        actionCounts[stepType] = (actionCounts[stepType] || 0) + 1;
      }
    });
  }
  Object.entries(actionCounts).forEach(([type, count]) => {
    let platform = 'other';
    let name = type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    if (type.startsWith('linkedin_')) {
      platform = 'linkedin';
      name = type.replace('linkedin_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    } else if (type.startsWith('email_')) {
      platform = 'email';
      name = type.replace('email_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    } else if (type.startsWith('whatsapp_')) {
      platform = 'whatsapp';
      name = type.replace('whatsapp_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    } else if (type.startsWith('instagram_')) {
      platform = 'instagram';
      name = type.replace('instagram_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    } else if (type.startsWith('voice_') || type === 'voice_agent_call') {
      platform = 'voice';
      name = type.replace('voice_', '').replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    actions.push({ type, name, platform, count });
  });
  return actions;
};
// Get all channel badges for display
export const getChannelBadges = (campaign: Campaign) => {
  const channels = getChannelsUsed(campaign);
  const badges: { key: string; name: string; color: string; bgColor: string }[] = [];
  if (channels.linkedin) badges.push({ key: 'linkedin', ...PLATFORM_CONFIG.linkedin });
  if (channels.email) badges.push({ key: 'email', ...PLATFORM_CONFIG.email });
  if (channels.whatsapp) badges.push({ key: 'whatsapp', ...PLATFORM_CONFIG.whatsapp });
  if (channels.instagram) badges.push({ key: 'instagram', ...PLATFORM_CONFIG.instagram });
  if (channels.voice) badges.push({ key: 'voice', ...PLATFORM_CONFIG.voice });
  return badges;
};
// Render channel icons with all platforms shown
export const renderChannelIcons = (campaign: Campaign): React.ReactElement => {
  const channels = getChannelsUsed(campaign);
  const icons: React.ReactElement[] = [];
  if (channels.linkedin) {
    icons.push(
      <Tooltip key="linkedin" title="LinkedIn" arrow>
        <Box sx={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: 26, 
          height: 26, 
          borderRadius: '6px',
          bgcolor: '#E8F4FC',
          mr: 0.5
        }}>
          <LinkedInIcon sx={{ fontSize: 16, color: '#0077B5' }} />
        </Box>
      </Tooltip>
    );
  }
  if (channels.email) {
    icons.push(
      <Tooltip key="email" title="Email" arrow>
        <Box sx={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: 26, 
          height: 26, 
          borderRadius: '6px',
          bgcolor: '#FEF3C7',
          mr: 0.5
        }}>
          <Email sx={{ fontSize: 16, color: '#F59E0B' }} />
        </Box>
      </Tooltip>
    );
  }
  if (channels.whatsapp) {
    icons.push(
      <Tooltip key="whatsapp" title="WhatsApp" arrow>
        <Box sx={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: 26, 
          height: 26, 
          borderRadius: '6px',
          bgcolor: '#DCFCE7',
          mr: 0.5
        }}>
          <Box
            component="svg"
            sx={{ width: 16, height: 16, fill: '#25D366' }}
            viewBox="0 0 24 24"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </Box>
        </Box>
      </Tooltip>
    );
  }
  if (channels.instagram) {
    icons.push(
      <Tooltip key="instagram" title="Instagram" arrow>
        <Box sx={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: 26, 
          height: 26, 
          borderRadius: '6px',
          bgcolor: '#FCE7F3',
          mr: 0.5
        }}>
          <Box
            component="svg"
            sx={{ width: 16, height: 16, fill: '#E4405F' }}
            viewBox="0 0 24 24"
          >
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </Box>
        </Box>
      </Tooltip>
    );
  }
  if (channels.voice) {
    icons.push(
      <Tooltip key="voice" title="Voice Agent" arrow>
        <Box sx={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: 26, 
          height: 26, 
          borderRadius: '6px',
          bgcolor: '#EDE9FE',
          mr: 0.5
        }}>
          <Phone sx={{ fontSize: 16, color: '#8B5CF6' }} />
        </Box>
      </Tooltip>
    );
  }
  if (icons.length === 0) {
    // Default to LinkedIn if no channels detected
    icons.push(
      <Tooltip key="linkedin-default" title="LinkedIn" arrow>
        <Box sx={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          width: 26, 
          height: 26, 
          borderRadius: '6px',
          bgcolor: '#E8F4FC',
          mr: 0.5
        }}>
          <LinkedInIcon sx={{ fontSize: 16, color: '#0077B5' }} />
        </Box>
      </Tooltip>
    );
  }
  return <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.25 }}>{icons}</Box>;
};
// Render action chips showing what the campaign does
export const renderActionChips = (campaign: Campaign) => {
  const actions = getDetailedActions(campaign);
  if (actions.length === 0) {
    return <Chip label="No actions" size="small" variant="outlined" sx={{ fontSize: '11px' }} />;
  }
  // Group actions by platform
  const platformActions: Record<string, string[]> = {};
  actions.forEach(action => {
    if (!platformActions[action.platform]) {
      platformActions[action.platform] = [];
    }
    platformActions[action.platform].push(action.name);
  });
  const chips: React.ReactElement[] = [];
  Object.entries(platformActions).forEach(([platform, actionNames]) => {
    const config = PLATFORM_CONFIG[platform as keyof typeof PLATFORM_CONFIG] || { name: platform, color: '#64748B', bgColor: '#F1F5F9' };
    const actionText = actionNames.join(', ');
    chips.push(
      <Tooltip key={platform} title={`${config.name}: ${actionText}`} arrow>
        <Chip
          label={`${config.name} (${actionNames.length})`}
          size="small"
          sx={{
            fontSize: '10px',
            height: '22px',
            bgcolor: config.bgColor,
            color: config.color,
            fontWeight: 600,
            border: `1px solid ${config.color}20`,
            '& .MuiChip-label': { px: 1 }
          }}
        />
      </Tooltip>
    );
  });
  return <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>{chips}</Box>;
};
// Get icon for Connected column - shows primary connection channel
export const getConnectedIcon = (campaign: Campaign) => {
  const channels = getChannelsUsed(campaign);
  // Priority: LinkedIn > Instagram > WhatsApp > Voice > Email
  if (channels.linkedin) {
    return <LinkedInIcon sx={{ fontSize: 18, color: '#0077B5' }} />;
  }
  if (channels.instagram) {
    return (
      <Box
        component="svg"
        sx={{ fontSize: 18, width: 18, height: 18, fill: '#E4405F' }}
        viewBox="0 0 24 24"
      >
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </Box>
    );
  }
  if (channels.whatsapp) {
    return (
      <Box
        component="svg"
        sx={{ fontSize: 18, width: 18, height: 18, fill: '#25D366' }}
        viewBox="0 0 24 24"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </Box>
    );
  }
  if (channels.voice) {
    return <Phone sx={{ fontSize: 18, color: '#8B5CF6' }} />;
  }
  if (channels.email) {
    return <Email sx={{ fontSize: 18, color: '#F59E0B' }} />;
  }
  // Default to LinkedIn if no channels detected
  return <LinkedInIcon sx={{ fontSize: 18, color: '#0077B5' }} />;
};
// Get icon for Replied column - shows primary reply channel
export const getRepliedIcon = (campaign: Campaign) => {
  const channels = getChannelsUsed(campaign);
  // Priority: WhatsApp > Instagram > Voice > Email > LinkedIn Message
  if (channels.whatsapp) {
    return (
      <Box
        component="svg"
        sx={{ fontSize: 18, width: 18, height: 18, fill: '#25D366' }}
        viewBox="0 0 24 24"
      >
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
      </Box>
    );
  }
  if (channels.instagram) {
    return (
      <Box
        component="svg"
        sx={{ fontSize: 18, width: 18, height: 18, fill: '#E4405F' }}
        viewBox="0 0 24 24"
      >
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
      </Box>
    );
  }
  if (channels.voice) {
    return <Phone sx={{ fontSize: 18, color: '#8B5CF6' }} />;
  }
  if (channels.email) {
    return <Email sx={{ fontSize: 18, color: '#F59E0B' }} />;
  }
  // For LinkedIn-only campaigns, show LinkedIn icon for replies
  if (channels.linkedin) {
    return <LinkedInIcon sx={{ fontSize: 18, color: '#0077B5' }} />;
  }
  // Default to Email if no channels detected
  return <Email sx={{ fontSize: 18, color: '#F59E0B' }} />;
};
export const getStatusColor = (status: CampaignStatus): 'success' | 'warning' | 'info' | 'error' | 'default' => {
  switch (status) {
    case 'running': return 'success';
    case 'paused': return 'warning';
    case 'completed': return 'info';
    case 'stopped': return 'error';
    default: return 'default';
  }
};
// Render platform-specific metrics for Connected/Replied/Sent columns
export const renderPlatformMetrics = (campaign: Campaign, metricType: 'connected' | 'replied' | 'sent'): React.ReactElement => {
  const channels = getChannelsUsed(campaign);
  const metrics: React.ReactElement[] = [];
  // Get platform-specific counts from campaign data (if available)
  // These would come from the backend with per-platform breakdown
  const platformData = (campaign as any).platform_metrics || {};
  // Calculate estimated per-platform distribution based on total count
  const totalCount = metricType === 'connected' ? campaign.connected_count :
                     metricType === 'replied' ? campaign.replied_count :
                     campaign.sent_count;
  const activeChannels = Object.entries(channels).filter(([_, isActive]) => isActive);
  const channelCount = activeChannels.length || 1;
  // LinkedIn metrics
  if (channels.linkedin) {
    const count = platformData.linkedin?.[metricType] ?? Math.floor(totalCount / channelCount);
    metrics.push(
      <Tooltip key="linkedin" title={`LinkedIn ${metricType}`} arrow>
        <Box sx={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 0.5,
          bgcolor: '#E8F4FC',
          px: 1,
          py: 0.25,
          borderRadius: '6px',
          border: '1px solid #0077B520'
        }}>
          <LinkedInIcon sx={{ fontSize: 14, color: '#0077B5' }} />
          <Typography variant="body2" sx={{ fontSize: '12px', fontWeight: 600, color: '#0077B5' }}>
            {count}
          </Typography>
        </Box>
      </Tooltip>
    );
  }
  // WhatsApp metrics
  if (channels.whatsapp) {
    const count = platformData.whatsapp?.[metricType] ?? Math.floor(totalCount / channelCount);
    metrics.push(
      <Tooltip key="whatsapp" title={`WhatsApp ${metricType}`} arrow>
        <Box sx={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 0.5,
          bgcolor: '#DCFCE7',
          px: 1,
          py: 0.25,
          borderRadius: '6px',
          border: '1px solid #25D36620'
        }}>
          <Box
            component="svg"
            sx={{ width: 14, height: 14, fill: '#25D366' }}
            viewBox="0 0 24 24"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </Box>
          <Typography variant="body2" sx={{ fontSize: '12px', fontWeight: 600, color: '#25D366' }}>
            {count}
          </Typography>
        </Box>
      </Tooltip>
    );
  }
  // Email metrics
  if (channels.email) {
    const count = platformData.email?.[metricType] ?? Math.floor(totalCount / channelCount);
    metrics.push(
      <Tooltip key="email" title={`Email ${metricType}`} arrow>
        <Box sx={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 0.5,
          bgcolor: '#FEF3C7',
          px: 1,
          py: 0.25,
          borderRadius: '6px',
          border: '1px solid #F59E0B20'
        }}>
          <Email sx={{ fontSize: 14, color: '#F59E0B' }} />
          <Typography variant="body2" sx={{ fontSize: '12px', fontWeight: 600, color: '#F59E0B' }}>
            {count}
          </Typography>
        </Box>
      </Tooltip>
    );
  }
  // Voice metrics
  if (channels.voice) {
    const count = platformData.voice?.[metricType] ?? Math.floor(totalCount / channelCount);
    metrics.push(
      <Tooltip key="voice" title={`Voice ${metricType}`} arrow>
        <Box sx={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 0.5,
          bgcolor: '#EDE9FE',
          px: 1,
          py: 0.25,
          borderRadius: '6px',
          border: '1px solid #8B5CF620'
        }}>
          <Phone sx={{ fontSize: 14, color: '#8B5CF6' }} />
          <Typography variant="body2" sx={{ fontSize: '12px', fontWeight: 600, color: '#8B5CF6' }}>
            {count}
          </Typography>
        </Box>
      </Tooltip>
    );
  }
  // Instagram metrics
  if (channels.instagram) {
    const count = platformData.instagram?.[metricType] ?? Math.floor(totalCount / channelCount);
    metrics.push(
      <Tooltip key="instagram" title={`Instagram ${metricType}`} arrow>
        <Box sx={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: 0.5,
          bgcolor: '#FCE7F3',
          px: 1,
          py: 0.25,
          borderRadius: '6px',
          border: '1px solid #E4405F20'
        }}>
          <Box
            component="svg"
            sx={{ width: 14, height: 14, fill: '#E4405F' }}
            viewBox="0 0 24 24"
          >
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
          </Box>
          <Typography variant="body2" sx={{ fontSize: '12px', fontWeight: 600, color: '#E4405F' }}>
            {count}
          </Typography>
        </Box>
      </Tooltip>
    );
  }
  // If no channels detected, show total with default styling
  if (metrics.length === 0) {
    return (
      <Typography variant="body2" sx={{ fontWeight: 600, color: '#64748B' }}>
        {totalCount}
      </Typography>
    );
  }
  return <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5 }}>{metrics}</Box>;
};
export const getStatusIcon = (status: CampaignStatus) => {
  // This function should return React components, but since this is a utils file,
  // we'll return the icon name and let the component handle rendering
  switch (status) {
    case 'running': return 'play';
    case 'paused': return 'pause';
    case 'stopped': return 'stop';
    case 'completed': return 'check';
    default: return null;
  }
};