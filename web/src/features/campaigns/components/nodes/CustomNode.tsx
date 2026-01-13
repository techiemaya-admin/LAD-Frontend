'use client';

import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { Box, Typography, IconButton } from '@mui/material';
import {
  LinkedIn as LinkedInIcon,
  Email,
  Schedule,
  CheckCircle,
  PlayArrow,
  Stop,
  Delete,
  Phone,
  WhatsApp,
  PersonSearch,
} from '@mui/icons-material';
import { useCampaignStore } from '../../store/campaignStore';
import { StepType } from '@/types/campaign';

const getNodeColor = (type: StepType) => {
  if (type === 'start') return { bg: '#10B981', border: '#059669' };
  if (type === 'end') return { bg: '#EF4444', border: '#DC2626' };
  if (type === 'lead_generation') return { bg: '#FBBF24', border: '#F59E0B' }; // Yellow/Amber color
  if (type.includes('linkedin')) return { bg: '#0077B5', border: '#005885' };
  if (type.includes('email')) return { bg: '#F59E0B', border: '#D97706' };
  if (type.includes('whatsapp')) return { bg: '#25D366', border: '#128C7E' };
  if (type.includes('voice')) return { bg: '#8B5CF6', border: '#7C3AED' };
  return { bg: '#7c3aed', border: '#6D28D9' };
};

const getNodeIcon = (type: StepType) => {
  if (type === 'start') return <PlayArrow sx={{ fontSize: 18 }} />;
  if (type === 'end') return <Stop sx={{ fontSize: 18 }} />;
  if (type === 'lead_generation') return <PersonSearch sx={{ fontSize: 18 }} />;
  if (type.includes('linkedin')) return <LinkedInIcon sx={{ fontSize: 18 }} />;
  if (type.includes('email')) return <Email sx={{ fontSize: 18 }} />;
  if (type.includes('whatsapp')) return <WhatsApp sx={{ fontSize: 18 }} />;
  if (type.includes('voice')) return <Phone sx={{ fontSize: 18 }} />;
  if (type === 'delay') return <Schedule sx={{ fontSize: 18 }} />;
  if (type === 'condition') return <CheckCircle sx={{ fontSize: 18 }} />;
  return null;
};

export default function CustomNode({ data, id, selected, type: nodeType }: NodeProps) {
  const { deleteStep, selectedNodeId } = useCampaignStore();
  // Get step type from React Flow node type or data
  const stepType: StepType = (nodeType as StepType) || (data?.type as StepType) || 'linkedin_visit';
  const colors = getNodeColor(stepType);
  const isSelected = selectedNodeId === id;
  


  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this step?')) {
      deleteStep(id);
    }
  };

  const getPreviewText = () => {
    if (data?.message) return data.message.substring(0, 40) + '...';
    if (data?.subject) return data.subject;
    if (data?.whatsappMessage) return data.whatsappMessage.substring(0, 40) + '...';
    if (data?.voiceAgentName) return `${data.voiceAgentName} Call`;
    if (data?.delayDays !== undefined || data?.delayHours !== undefined || data?.delayMinutes !== undefined) {
      const days = data.delayDays || 0;
      const hours = data.delayHours || 0;
      const minutes = data.delayMinutes || 0;
      const parts: string[] = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      return parts.length > 0 ? `Wait ${parts.join(' ')}` : 'Wait';
    }
    if (data?.conditionType) {
      const conditionLabels: Record<string, string> = {
        'connected': 'LinkedIn Connection Accepted',
        'linkedin_replied': 'LinkedIn Message Replied',
        'email_opened': 'Email Opened',
        'email_replied': 'Email Replied',
        'whatsapp_replied': 'WhatsApp Message Replied',
        'replied': 'Replied',
        'opened': 'Opened',
        'clicked': 'Clicked',
        'whatsapp_delivered': 'WhatsApp Delivered',
        'whatsapp_read': 'WhatsApp Read',
        'voice_answered': 'Call Answered',
        'voice_not_answered': 'Call Not Answered',
        'voice_completed': 'Call Completed',
        'voice_busy': 'Line Busy',
        'voice_failed': 'Call Failed',
      };
      return conditionLabels[data.conditionType] || `If ${data.conditionType}`;
    }
    return data?.title || stepType;
  };

  return (
    <Box
      sx={{
        minWidth: 200,
        bgcolor: '#FFFFFF',
        border: `2px solid ${isSelected ? '#7c3aed' : colors.border}`,
        borderRadius: '12px',
        boxShadow: isSelected ? '0 4px 12px rgba(124, 58, 237, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.2s',
        position: 'relative',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.bg }} />

      <Box
        sx={{
          bgcolor: colors.bg,
          color: '#FFFFFF',
          px: 2,
          py: 1,
          borderTopLeftRadius: '10px',
          borderTopRightRadius: '10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 0 }}>
          {getNodeIcon(stepType)}
          <Typography 
            variant="body2" 
            sx={{ 
              fontWeight: 600, 
              fontSize: '12px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
            }}
            title={data?.title || stepType}
          >
            {data?.title || stepType}
          </Typography>
        </Box>
        {stepType !== 'start' && stepType !== 'end' && (
          <IconButton
            size="small"
            onClick={handleDelete}
            sx={{
              color: '#FFFFFF',
              p: 0.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
            }}
          >
            <Delete sx={{ fontSize: 14 }} />
          </IconButton>
        )}
      </Box>

      <Box sx={{ p: stepType === 'delay' || stepType === 'condition' ? 2 : 1.5 }}>
        {stepType === 'condition' && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: '#64748B',
                fontSize: '10px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block',
                mb: 0.5,
              }}
            >
              Checking:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#1E293B',
                fontSize: '13px',
                fontWeight: 600,
                display: 'block',
                lineHeight: 1.4,
              }}
            >
              {(() => {
                // Try to get condition text from getPreviewText first
                const previewText = getPreviewText();
                // If getPreviewText returns something meaningful (not just "condition" or stepType), use it
                if (previewText && previewText !== 'condition' && previewText !== stepType && !previewText.includes('Check:')) {
                  return previewText;
                }
                // Otherwise, try to extract from title if it contains condition info
                if (data?.title && data.title.includes('Check:')) {
                  return data.title.replace('Check: ', '');
                }
                // Fallback to conditionType if available
                if (data?.conditionType) {
                  const conditionLabels: Record<string, string> = {
                    'connected': 'LinkedIn Connection Accepted',
                    'linkedin_replied': 'LinkedIn Message Replied',
                    'email_opened': 'Email Opened',
                    'email_replied': 'Email Replied',
                    'whatsapp_replied': 'WhatsApp Message Replied',
                  };
                  return conditionLabels[data.conditionType] || `If ${data.conditionType}`;
                }
                return 'Condition';
              })()}
            </Typography>
          </Box>
        )}
        {stepType === 'delay' && (
          <Box>
            <Typography
              variant="caption"
              sx={{
                color: '#64748B',
                fontSize: '10px',
                fontWeight: 500,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                display: 'block',
                mb: 0.5,
              }}
            >
              Wait Time:
            </Typography>
            <Typography
              variant="body2"
              sx={{
                color: '#1E293B',
                fontSize: '13px',
                fontWeight: 600,
                display: 'block',
                lineHeight: 1.4,
              }}
            >
              {(() => {
                // Try to get delay text from getPreviewText first
                const previewText = getPreviewText();
                // If getPreviewText returns something meaningful (not just "delay" or stepType), use it
                if (previewText && previewText !== 'delay' && previewText !== stepType && previewText.startsWith('Wait')) {
                  return previewText;
                }
                // Otherwise, try to extract from title if it contains delay info
                if (data?.title && data.title.startsWith('Wait')) {
                  return data.title;
                }
                // Fallback to calculating from delayDays, delayHours, delayMinutes
                if (data?.delayDays !== undefined || data?.delayHours !== undefined || data?.delayMinutes !== undefined) {
                  const days = data.delayDays || 0;
                  const hours = data.delayHours || 0;
                  const minutes = data.delayMinutes || 0;
                  const parts: string[] = [];
                  if (days > 0) parts.push(`${days}d`);
                  if (hours > 0) parts.push(`${hours}h`);
                  if (minutes > 0) parts.push(`${minutes}m`);
                  return parts.length > 0 ? `Wait ${parts.join(' ')}` : 'Wait';
                }
                return 'Delay';
              })()}
            </Typography>
          </Box>
        )}
        {stepType !== 'delay' && stepType !== 'condition' && (
          <Typography
            variant="caption"
            sx={{
              color: '#64748B',
              fontSize: '11px',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {getPreviewText()}
          </Typography>
        )}
      </Box>

      {/* For condition nodes, add two source handles for TRUE/FALSE branches */}
      {stepType === 'condition' ? (
        <>
          <Handle 
            type="source" 
            position={Position.BottomLeft} 
            id="false" 
            style={{ background: '#EF4444' }} 
          />
          <Handle 
            type="source" 
            position={Position.BottomRight} 
            id="true" 
            style={{ background: '#10B981' }} 
          />
        </>
      ) : (
        <Handle type="source" position={Position.Bottom} style={{ background: colors.bg }} />
      )}
    </Box>
  );
}

