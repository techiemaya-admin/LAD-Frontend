/**
 * Campaign Service
 * TypeScript service for campaign API integration
 */

import api from './api';

// ==================== Types ====================

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

export interface CampaignStep {
  id: string;
  campaign_id: string;
  type: StepType;
  order: number;
  title: string;
  description?: string;
  config: StepConfig;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  id: string;
  tenant_id: string;
  name: string;
  status: CampaignStatus;
  created_by: string;
  config: {
    leads_per_day?: number;
    lead_gen_offset?: number;
    last_lead_gen_date?: string;
    [key: string]: any;
  };
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  // Stats (from joins)
  leads_count?: number;
  sent_count?: number;
  delivered_count?: number;
  connected_count?: number;
  replied_count?: number;
  opened_count?: number;
  clicked_count?: number;
  // Steps
  steps?: CampaignStep[];
}

export interface CampaignLead {
  id: string;
  tenant_id: string;
  campaign_id: string;
  lead_id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  linkedin_url?: string;
  company_name?: string;
  title?: string;
  phone?: string;
  lead_data: Record<string, any>;
  status: LeadStatus;
  current_step_order?: number;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignLeadActivity {
  id: string;
  tenant_id: string;
  campaign_lead_id: string;
  step_id?: string;
  step_type: StepType;
  action_type: string;
  status: ActivityStatus;
  channel?: string;
  message_content?: string;
  subject?: string;
  error_message?: string;
  metadata: Record<string, any>;
  executed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  total_leads: number;
  total_sent: number;
  total_delivered: number;
  total_connected: number;
  total_replied: number;
}

export interface CreateCampaignPayload {
  name: string;
  status?: CampaignStatus;
  config?: Record<string, any>;
  steps?: Array<{
    type: StepType;
    order: number;
    title: string;
    description?: string;
    config?: StepConfig;
  }>;
}

export interface CampaignListResponse {
  success: boolean;
  data: Campaign[];
}

export interface CampaignResponse {
  success: boolean;
  data: Campaign;
}

export interface CampaignStatsResponse {
  success: boolean;
  data: CampaignStats;
}

export interface CampaignLeadsResponse {
  success: boolean;
  data: CampaignLead[];
}

export interface CampaignActivitiesResponse {
  success: boolean;
  data: CampaignLeadActivity[];
}

// ==================== Service ====================

class CampaignService {
  /**
   * List all campaigns with stats
   */
  async listCampaigns(params?: {
    search?: string;
    status?: CampaignStatus | 'all';
    limit?: number;
    offset?: number;
  }): Promise<Campaign[]> {
    const response = await api.get<CampaignListResponse>('/campaigns', { params });
    return response.data.data;
  }

  /**
   * Get campaign statistics
   */
  async getCampaignStats(): Promise<CampaignStats> {
    const response = await api.get<CampaignStatsResponse>('/campaigns/stats');
    return response.data.data;
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(id: string): Promise<Campaign> {
    const response = await api.get<CampaignResponse>(`/campaigns/${id}`);
    return response.data.data;
  }

  /**
   * Create a new campaign
   */
  async createCampaign(payload: CreateCampaignPayload): Promise<Campaign> {
    const response = await api.post<CampaignResponse>('/campaigns', payload);
    return response.data.data;
  }

  /**
   * Update campaign
   */
  async updateCampaign(id: string, updates: Partial<CreateCampaignPayload>): Promise<Campaign> {
    const response = await api.patch<CampaignResponse>(`/campaigns/${id}`, updates);
    return response.data.data;
  }

  /**
   * Delete campaign (soft delete)
   */
  async deleteCampaign(id: string): Promise<void> {
    await api.delete(`/campaigns/${id}`);
  }

  /**
   * Get leads for a campaign
   */
  async getCampaignLeads(
    id: string,
    params?: {
      status?: LeadStatus | 'all';
      limit?: number;
      offset?: number;
    }
  ): Promise<CampaignLead[]> {
    const response = await api.get<CampaignLeadsResponse>(`/campaigns/${id}/leads`, { params });
    return response.data.data;
  }

  /**
   * Add leads to campaign
   */
  async addLeadsToCampaign(id: string, leads: Array<Partial<CampaignLead>>): Promise<CampaignLead[]> {
    const response = await api.post<CampaignLeadsResponse>(`/campaigns/${id}/leads`, { leads });
    return response.data.data;
  }

  /**
   * Get activities for a campaign
   */
  async getCampaignActivities(
    id: string,
    params?: {
      status?: ActivityStatus;
      stepType?: StepType;
      limit?: number;
      offset?: number;
    }
  ): Promise<CampaignLeadActivity[]> {
    const response = await api.get<CampaignActivitiesResponse>(`/campaigns/${id}/activities`, { params });
    return response.data.data;
  }

  /**
   * Start/resume a campaign
   */
  async startCampaign(id: string): Promise<Campaign> {
    const response = await api.post<CampaignResponse>(`/campaigns/${id}/start`);
    return response.data.data;
  }

  /**
   * Pause a campaign
   */
  async pauseCampaign(id: string): Promise<Campaign> {
    const response = await api.post<CampaignResponse>(`/campaigns/${id}/pause`);
    return response.data.data;
  }

  /**
   * Stop a campaign
   */
  async stopCampaign(id: string): Promise<Campaign> {
    const response = await api.post<CampaignResponse>(`/campaigns/${id}/stop`);
    return response.data.data;
  }

  /**
   * Get steps for a campaign
   */
  async getCampaignSteps(id: string): Promise<CampaignStep[]> {
    const response = await api.get<{ success: boolean; data: CampaignStep[] }>(`/campaigns/${id}/steps`);
    return response.data.data;
  }

  /**
   * Update campaign steps (workflow builder)
   */
  async updateCampaignSteps(id: string, steps: Array<Partial<CampaignStep>>): Promise<CampaignStep[]> {
    const response = await api.post<{ success: boolean; data: CampaignStep[] }>(`/campaigns/${id}/steps`, { steps });
    return response.data.data;
  }

  /**
   * Get step definitions (UI metadata)
   */
  getStepDefinitions(): Array<{
    type: StepType;
    label: string;
    icon: string;
    description: string;
    category: 'linkedin' | 'email' | 'whatsapp' | 'voice' | 'instagram' | 'utility' | 'leads';
  }> {
    return [
      // LinkedIn
      { type: 'linkedin_visit', label: 'Visit Profile', icon: '👁️', description: 'Visit LinkedIn profile', category: 'linkedin' },
      { type: 'linkedin_follow', label: 'Follow', icon: '➕', description: 'Follow on LinkedIn', category: 'linkedin' },
      { type: 'linkedin_connect', label: 'Connect', icon: '🤝', description: 'Send connection request', category: 'linkedin' },
      { type: 'linkedin_message', label: 'Message', icon: '💬', description: 'Send LinkedIn message', category: 'linkedin' },
      // Email
      { type: 'email_send', label: 'Send Email', icon: '📧', description: 'Send initial email', category: 'email' },
      { type: 'email_followup', label: 'Follow-up', icon: '📬', description: 'Send follow-up email', category: 'email' },
      // WhatsApp
      { type: 'whatsapp_send', label: 'WhatsApp', icon: '📱', description: 'Send WhatsApp message', category: 'whatsapp' },
      // Voice
      { type: 'voice_agent_call', label: 'Voice Call', icon: '☎️', description: 'Make voice call', category: 'voice' },
      // Instagram
      { type: 'instagram_follow', label: 'IG Follow', icon: '📸', description: 'Follow on Instagram', category: 'instagram' },
      { type: 'instagram_dm', label: 'IG DM', icon: '💌', description: 'Send Instagram DM', category: 'instagram' },
      // Utility
      { type: 'lead_generation', label: 'Generate Leads', icon: '🎯', description: 'Auto-generate leads', category: 'leads' },
      { type: 'delay', label: 'Delay', icon: '⏰', description: 'Wait for specified time', category: 'utility' },
      { type: 'condition', label: 'Condition', icon: '🔀', description: 'Conditional branching', category: 'utility' }
    ];
  }
}

export const campaignService = new CampaignService();
