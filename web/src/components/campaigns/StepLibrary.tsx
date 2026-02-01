'use client';
import React, { useCallback, useMemo } from 'react';
import {
  Linkedin,
  Mail,
  Clock,
  CheckCircle,
  Eye,
  UserPlus,
  MessageSquare,
  Send,
  Phone,
  Instagram,
  Search,
  Building2,
  Users,
  FileText,
  MessageCircle,
  Sparkles,
  UserSearch
} from 'lucide-react';
import { StepDefinition } from '@/types/campaign';
import { useCampaignStore } from '@/features/campaigns';
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
export default function StepLibrary({ onAddStep }: { onAddStep?: (stepType: string) => void }) {
  const addStep = useCampaignStore((state) => state.addStep);
  const handleDragStart = useCallback((e: React.DragEvent, stepType: string) => {
    e.dataTransfer.setData('application/reactflow', stepType);
    e.dataTransfer.effectAllowed = 'move';
  }, []);
  const handleClick = useCallback((step: StepDefinition) => {
    // Add step at center of canvas (will be positioned by React Flow)
    addStep(step.type, { x: 400, y: 300 });
  }, [addStep]);
  const linkedinSteps = useMemo(() => STEP_DEFINITIONS.filter((s) => s.category === 'linkedin'), []);
  const emailSteps = useMemo(() => STEP_DEFINITIONS.filter((s) => s.category === 'email'), []);
  const whatsappSteps = useMemo(() => STEP_DEFINITIONS.filter((s) => s.category === 'whatsapp'), []);
  const voiceSteps = useMemo(() => STEP_DEFINITIONS.filter((s) => s.category === 'voice'), []);
  const instagramSteps = useMemo(() => STEP_DEFINITIONS.filter((s) => s.category === 'instagram'), []);
  const leadsSteps = useMemo(() => STEP_DEFINITIONS.filter((s) => s.category === 'leads'), []);
  const utilitySteps = useMemo(() => STEP_DEFINITIONS.filter((s) => s.category === 'utility'), []);
  return (
    <div className="w-[280px] h-full bg-[#F8FAFC] border-r border-[#E2E8F0] overflow-y-auto p-4">
      <h2 className="text-lg font-semibold mb-6 text-[#1E293B]">
        Step Library
      </h2>
      {/* Lead Generation Steps */}
      <div className="mb-8">
        <span className="text-xs text-[#64748B] font-bold mb-3 block uppercase tracking-wider">
          Lead Generation
        </span>
        <div className="space-y-2">
          {leadsSteps.map((step) => (
            <div
              key={step.type}
              draggable
              onDragStart={(e) => handleDragStart(e, step.type)}
              onClick={() => handleClick(step)}
              className="p-4 cursor-grab border border-[#E2E8F0] rounded-xl bg-white shadow-sm transition-all duration-200 hover:border-[#6366F1] hover:shadow-[0_2px_8px_rgba(99,102,241,0.1)] hover:-translate-y-0.5 active:cursor-grabbing"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#6366F1] flex items-center justify-center text-white">
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
          ))}
        </div>
      </div>
      {/* Divider */}
      <div className="my-6 border-t border-[#E2E8F0]" />
      {/* LinkedIn Steps */}
      <div className="mb-8">
        <span className="text-xs text-[#64748B] font-bold mb-3 block uppercase tracking-wider">
          LinkedIn
        </span>
        <div className="space-y-2">
          {linkedinSteps.map((step) => (
            <div
              key={step.type}
              draggable
              onDragStart={(e) => handleDragStart(e, step.type)}
              onClick={() => handleClick(step)}
              className="p-4 cursor-grab border border-[#E2E8F0] rounded-xl bg-white shadow-sm transition-all duration-200 hover:border-[#7c3aed] hover:shadow-[0_4px_12px_rgba(124,58,237,0.15)] hover:-translate-y-0.5 active:cursor-grabbing"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#0077B5] flex items-center justify-center text-white">
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
          ))}
        </div>
      </div>
      {/* Divider */}
      <div className="my-6 border-t border-[#E2E8F0]" />
      {/* Email Steps */}
      <div className="mb-8">
        <span className="text-xs text-[#64748B] font-bold mb-3 block uppercase tracking-wider">
          Email
        </span>
        <div className="space-y-2">
          {emailSteps.map((step) => (
            <div
              key={step.type}
              draggable
              onDragStart={(e) => handleDragStart(e, step.type)}
              onClick={() => handleClick(step)}
              className="p-4 cursor-grab border border-[#E2E8F0] rounded-xl bg-white shadow-sm transition-all duration-200 hover:border-[#F59E0B] hover:shadow-[0_2px_8px_rgba(245,158,11,0.1)] hover:-translate-y-0.5 active:cursor-grabbing"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#F59E0B] flex items-center justify-center text-white">
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
          ))}
        </div>
      </div>
      {/* Divider */}
      <div className="my-6 border-t border-[#E2E8F0]" />
      {/* WhatsApp Steps */}
      <div className="mb-8">
        <span className="text-xs text-[#64748B] font-bold mb-3 block uppercase tracking-wider">
          WhatsApp
        </span>
        <div className="space-y-2">
          {whatsappSteps.map((step) => (
            <div
              key={step.type}
              draggable
              onDragStart={(e) => handleDragStart(e, step.type)}
              onClick={() => handleClick(step)}
              className="p-4 cursor-grab border border-[#E2E8F0] rounded-xl bg-white shadow-sm transition-all duration-200 hover:border-[#25D366] hover:shadow-[0_2px_8px_rgba(37,211,102,0.1)] hover:-translate-y-0.5 active:cursor-grabbing"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#25D366] flex items-center justify-center text-white">
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
          ))}
        </div>
      </div>
      {/* Divider */}
      <div className="my-6 border-t border-[#E2E8F0]" />
      {/* Voice Agent Steps */}
      <div className="mb-8">
        <span className="text-xs text-[#64748B] font-bold mb-3 block uppercase tracking-wider">
          Voice Agent
        </span>
        <div className="space-y-2">
          {voiceSteps.map((step) => (
            <div
              key={step.type}
              draggable
              onDragStart={(e) => handleDragStart(e, step.type)}
              onClick={() => handleClick(step)}
              className="p-4 cursor-grab border border-[#E2E8F0] rounded-xl bg-white shadow-sm transition-all duration-200 hover:border-[#8B5CF6] hover:shadow-[0_2px_8px_rgba(139,92,246,0.1)] hover:-translate-y-0.5 active:cursor-grabbing"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#8B5CF6] flex items-center justify-center text-white">
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
          ))}
        </div>
      </div>
      {/* Divider */}
      <div className="my-6 border-t border-[#E2E8F0]" />
      {/* Instagram Steps */}
      <div className="mb-8">
        <span className="text-xs text-[#64748B] font-bold mb-3 block uppercase tracking-wider">
          Instagram
        </span>
        <div className="space-y-2">
          {instagramSteps.map((step) => (
            <div
              key={step.type}
              draggable
              onDragStart={(e) => handleDragStart(e, step.type)}
              onClick={() => handleClick(step)}
              className="p-4 cursor-grab border border-[#E2E8F0] rounded-xl bg-white shadow-sm transition-all duration-200 hover:border-[#E4405F] hover:shadow-[0_2px_8px_rgba(228,64,95,0.1)] hover:-translate-y-0.5 active:cursor-grabbing"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md flex items-center justify-center text-white" style={{ background: 'linear-gradient(45deg, #f09433 0%,#e6683c 25%,#dc2743 50%,#cc2366 75%,#bc1888 100%)' }}>
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
          ))}
        </div>
      </div>
      {/* Divider */}
      <div className="my-6 border-t border-[#E2E8F0]" />
      {/* Utility Steps */}
      <div className="mb-8">
        <span className="text-xs text-[#64748B] font-bold mb-3 block uppercase tracking-wider">
          Utility
        </span>
        <div className="space-y-2">
          {utilitySteps.map((step) => (
            <div
              key={step.type}
              draggable
              onDragStart={(e) => handleDragStart(e, step.type)}
              onClick={() => handleClick(step)}
              className="p-4 cursor-grab border border-[#E2E8F0] rounded-xl bg-white shadow-sm transition-all duration-200 hover:border-[#10B981] hover:shadow-[0_2px_8px_rgba(16,185,129,0.1)] hover:-translate-y-0.5 active:cursor-grabbing"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#10B981] flex items-center justify-center text-white">
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
          ))}
        </div>
      </div>
    </div>
  );
}
