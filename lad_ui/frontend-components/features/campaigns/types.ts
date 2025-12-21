export type StepType = 
  | 'linkedin_visit' 
  | 'linkedin_follow' 
  | 'linkedin_connect' 
  | 'linkedin_message'
  | 'linkedin_scrape_profile'
  | 'linkedin_company_search'
  | 'linkedin_employee_list'
  | 'linkedin_autopost'
  | 'linkedin_comment_reply'
  | 'email_send' 
  | 'email_followup' 
  | 'whatsapp_send'
  | 'voice_agent_call'
  | 'instagram_follow'
  | 'instagram_like'
  | 'instagram_dm'
  | 'instagram_autopost'
  | 'instagram_comment_reply'
  | 'instagram_story_view'
  | 'lead_generation'
  | 'delay' 
  | 'condition' 
  | 'start' 
  | 'end';

export type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed' | 'stopped';

export type LeadStatus = 'pending' | 'active' | 'completed' | 'stopped' | 'error';

export type ActivityStatus = 'pending' | 'sent' | 'delivered' | 'opened' | 'clicked' | 'connected' | 'replied' | 'failed' | 'skipped' | 'error';

export type ConditionType = 
  | 'connected'
  | 'linkedin_replied'
  | 'linkedin_followed'
  | 'opened'
  | 'replied'
  | 'clicked'
  | 'whatsapp_delivered'
  | 'whatsapp_read'
  | 'whatsapp_replied'
  | 'voice_answered'
  | 'voice_not_answered'
  | 'voice_completed'
  | 'voice_busy'
  | 'voice_failed'
  | 'instagram_followed'
  | 'instagram_liked'
  | 'instagram_replied'
  | 'instagram_commented'
  | 'instagram_story_viewed';

export interface StepConfig {
  title?: string;
  message?: string;
  subject?: string;
  body?: string;
  delayHours?: number;
  delayDays?: number;
  delayMinutes?: number;
  conditionType?: ConditionType;
  conditionTrueStep?: string;
  conditionFalseStep?: string;
  whatsappTemplate?: string;
  whatsappMessage?: string;
  voiceAgentId?: string;
  voiceAgentName?: string;
  voiceTemplate?: string;
  voiceContext?: string;
  linkedinCompanyName?: string;
  linkedinCompanyUrl?: string;
  linkedinScrapeFields?: string[];
  linkedinPostContent?: string;
  linkedinPostImageUrl?: string;
  linkedinCommentText?: string;
  instagramUsername?: string;
  instagramPostUrl?: string;
  instagramPostCaption?: string;
  instagramPostImageUrl?: string;
  instagramDmMessage?: string;
  instagramCommentText?: string;
  leadGenerationQuery?: string;
  leadGenerationFilters?: {
    roles?: string[];
    industries?: string[];
    location?: string | string[];
  };
  leadGenerationLimit?: number;
  [key: string]: any;
}

export interface WorkflowStep {
  id: string;
  type: StepType;
  data: StepConfig;
  position?: { x: number; y: number };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  status: CampaignStatus;
  workflow: {
    steps: WorkflowStep[];
    edges: WorkflowEdge[];
  };
  created_at: string;
  updated_at: string;
  user_id: string;
  org_id?: string;
}

export interface Lead {
  id: string;
  campaign_id: string;
  lead_data: Record<string, any>;
  status: LeadStatus;
  current_step_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Activity {
  id: string;
  campaign_id: string;
  lead_id: string;
  step_id: string;
  step_type: StepType;
  status: ActivityStatus;
  error_message?: string;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
}
