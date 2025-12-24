/**
 * Campaigns Feature - TypeScript Types
 * 
 * All type definitions for the campaigns feature.
 * These types are shared between SDK and web layers.
 */

export type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed' | 'stopped';

export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  leads_count: number;
  sent_count: number;
  delivered_count: number;
  connected_count: number;
  replied_count: number;
  opened_count: number;
  clicked_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  steps?: Array<{ type: string; [key: string]: any }>;
}

export interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  total_leads: number;
  total_sent: number;
  total_delivered: number;
  total_connected: number;
  total_replied: number;
  avg_connection_rate: number;
  avg_reply_rate: number;
  instagram_connection_rate?: number;
  whatsapp_connection_rate?: number;
  voice_agent_connection_rate?: number;
}

export interface CampaignFilters {
  search?: string;
  status?: CampaignStatus | 'all';
}

export interface CreateCampaignRequest {
  name: string;
  status?: CampaignStatus;
  steps?: Array<{ type: string; [key: string]: any }>;
}

export interface UpdateCampaignRequest {
  name?: string;
  status?: CampaignStatus;
  steps?: Array<{ type: string; [key: string]: any }>;
}

export interface CampaignAnalytics {
  campaign: {
    id: string;
    name: string;
    status: string;
  };
  overview: {
    total_leads: number;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    connected: number;
    replied: number;
  };
  metrics: {
    delivery_rate: number;
    open_rate: number;
    click_rate: number;
    connection_rate: number;
    reply_rate: number;
  };
  timeline: Array<{
    date: string;
    sent: number;
    delivered: number;
    opened: number;
    clicked: number;
    connected: number;
    replied: number;
  }>;
}

export interface CampaignLead {
  id: string;
  campaign_id: string;
  name: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  status: string;
  connected: boolean;
  replied: boolean;
  created_at: string;
  updated_at: string;
}

