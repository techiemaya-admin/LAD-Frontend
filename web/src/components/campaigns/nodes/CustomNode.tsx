'use client';
import React from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import {
  Linkedin,
  Mail,
  Clock,
  CheckCircle,
  Play,
  StopCircle,
  Trash2,
  Phone,
  MessageCircle,
  UserSearch,
} from 'lucide-react';
import { useCampaignStore } from '../../../store/campaignStore';
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
  if (type === 'start') return <Play className="w-[18px] h-[18px]" />;
  if (type === 'end') return <StopCircle className="w-[18px] h-[18px]" />;
  if (type === 'lead_generation') return <UserSearch className="w-[18px] h-[18px]" />;
  if (type.includes('linkedin')) return <Linkedin className="w-[18px] h-[18px]" />;
  if (type.includes('email')) return <Mail className="w-[18px] h-[18px]" />;
  if (type.includes('whatsapp')) return <MessageCircle className="w-[18px] h-[18px]" />;
  if (type.includes('voice')) return <Phone className="w-[18px] h-[18px]" />;
  if (type === 'delay') return <Clock className="w-[18px] h-[18px]" />;
  if (type === 'condition') return <CheckCircle className="w-[18px] h-[18px]" />;
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
    <div
      className="min-w-[200px] bg-white rounded-xl shadow-md transition-all duration-200 relative"
      style={{
        border: `2px solid ${isSelected ? '#7c3aed' : colors.border}`,
        boxShadow: isSelected ? '0 4px 12px rgba(124, 58, 237, 0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: colors.bg }} />
      <div
        className="px-4 py-2 rounded-t-[10px] flex items-center justify-between text-white"
        style={{ backgroundColor: colors.bg }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getNodeIcon(stepType)}
          <span 
            className="font-semibold text-xs overflow-hidden text-ellipsis whitespace-nowrap flex-1"
            title={data?.title || stepType}
          >
            {data?.title || stepType}
          </span>
        </div>
        {stepType !== 'start' && stepType !== 'end' && (
          <button
            onClick={handleDelete}
            className="text-white p-1 hover:bg-white/20 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <div className={stepType === 'delay' || stepType === 'condition' ? 'p-4' : 'p-3'}>
        {stepType === 'condition' && (
          <div>
            <span
              className="text-[#64748B] text-[10px] font-medium uppercase tracking-wide block mb-1"
            >
              Checking:
            </span>
            <p
              className="text-[#1E293B] text-[13px] font-semibold block leading-snug"
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
            </p>
          </div>
        )}
        {stepType === 'delay' && (
          <div>
            <span
              className="text-[#64748B] text-[10px] font-medium uppercase tracking-wide block mb-1"
            >
              Wait Time:
            </span>
            <p
              className="text-[#1E293B] text-[13px] font-semibold block leading-snug"
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
            </p>
          </div>
        )}
        {stepType !== 'delay' && stepType !== 'condition' && (
          <p
            className="text-[#64748B] text-[11px] block overflow-hidden text-ellipsis whitespace-nowrap"
          >
            {getPreviewText()}
          </p>
        )}
      </div>
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
    </div>
  );
}
