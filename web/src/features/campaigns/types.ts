/**
 * Campaigns Feature - Type Definitions
 */
export type CampaignStatus = 'draft' | 'running' | 'paused' | 'stopped' | 'completed';
export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  created_at: string;
  updated_at: string;
  steps?: any[];
  config?: {
    leads_per_day?: number;
    lead_gen_offset?: number;
    last_lead_gen_date?: string | null;
  };
  leads_per_day?: number;
  leads_count?: number;
  connected_count?: number;
  replied_count?: number;
  [key: string]: any;
}
export interface CampaignStats {
  total: number;
  running: number;
  paused: number;
  stopped: number;
  draft: number;
  completed: number;
}
export interface CampaignLead {
  id: string;
  campaign_id: string;
  lead_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  lead_data?: any;
  custom_fields?: any;
  [key: string]: any;
}