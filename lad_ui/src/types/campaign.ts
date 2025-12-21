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

export type ConditionType = 
  | 'connected'           // LinkedIn: if connected
  | 'linkedin_replied'     // LinkedIn: if replied to message
  | 'linkedin_followed'    // LinkedIn: if followed back
  | 'opened'              // Email: if email opened
  | 'replied'             // Email/WhatsApp: if replied
  | 'clicked'             // Email: if link clicked
  | 'whatsapp_delivered'  // WhatsApp: if message delivered
  | 'whatsapp_read'       // WhatsApp: if message read
  | 'whatsapp_replied'    // WhatsApp: if replied
  | 'voice_answered'      // Voice Agent: if call answered
  | 'voice_not_answered'  // Voice Agent: if call not answered
  | 'voice_completed'     // Voice Agent: if call completed
  | 'voice_busy'          // Voice Agent: if line busy
  | 'voice_failed'        // Voice Agent: if call failed
  | 'instagram_followed'  // Instagram: if followed back
  | 'instagram_liked'     // Instagram: if liked post
  | 'instagram_replied'   // Instagram: if replied to DM
  | 'instagram_commented' // Instagram: if commented on post
  | 'instagram_story_viewed'; // Instagram: if viewed story

export interface StepData {
  title: string;
  message?: string;
  subject?: string;
  body?: string;
  delayHours?: number;
  delayDays?: number;
  delayMinutes?: number;
  conditionType?: ConditionType;
  conditionTrueStep?: string;
  conditionFalseStep?: string;
  variables?: Record<string, string>;
  trackingEnabled?: boolean;
  attachments?: string[];
  // WhatsApp fields
  whatsappTemplate?: string;
  whatsappMessage?: string;
  // Voice Agent fields
  voiceAgentId?: string;
  voiceAgentName?: string;
  voiceTemplate?: string;
  voiceContext?: string;
  // LinkedIn additional fields
  linkedinCompanyName?: string;
  linkedinCompanyUrl?: string;
  linkedinScrapeFields?: string[];
  linkedinPostContent?: string;
  linkedinPostImageUrl?: string;
  linkedinCommentText?: string;
  // Instagram fields
  instagramUsername?: string;
  instagramPostUrl?: string;
  instagramPostCaption?: string;
  instagramPostImageUrl?: string;
  instagramStoryImageUrl?: string;
  instagramDmMessage?: string;
  instagramCommentText?: string;
  instagramAutopostSchedule?: string;
  instagramAutopostTime?: string;
  // Lead Generation fields
  leadGenerationQuery?: string;
  leadGenerationFilters?: Record<string, any>;
  leadGenerationLimit?: number;
}

export interface FlowNode {
  id: string;
  type: StepType;
  position: { x: number; y: number };
  data: StepData;
}

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
}

export interface CampaignFlow {
  name: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  selectedNodeId: string | null;
}

export interface StepDefinition {
  type: StepType;
  label: string;
  icon: string;
  description: string;
  category: 'linkedin' | 'email' | 'whatsapp' | 'voice' | 'instagram' | 'utility' | 'leads';
  defaultData: Partial<StepData>;
}

