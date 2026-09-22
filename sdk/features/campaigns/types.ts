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
  campaign_type?: string;
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
  total_credits_deducted?: number;
  last_credit_update?: string | null;
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
  connections_today?: number;
  connections_yesterday?: number;
  connections_daily_breakdown?: Array<{ date: string; count: number }>;
  linkedin_network_size?: number | null;
  linkedin_rate_limits?: {
    daily?: { max: number; total: number; account_count: number };
    weekly?: { max: number; total: number };
    usage?: { sent_last_7_days: number; daily_breakdown: Array<{ date: string; sent: number }>; weekly_percentage: number | string };
  };
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
    created_at: string;
  };
  overview: {
    total_leads: number;
    active_leads: number;
    completed_leads: number;
    stopped_leads: number;
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
    // Step-specific metrics
    leads_generated?: number;
    connection_requests_sent?: number;
    connection_requests_accepted?: number;
    linkedin_messages_sent?: number;
    linkedin_messages_replied?: number;
    voice_calls_made?: number;
    voice_calls_answered?: number;
    emails_sent?: number;
    emails_opened?: number;
    whatsapp_messages_sent?: number;
    whatsapp_messages_replied?: number;
    errors?: number;
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
  step_analytics?: Array<{
    id: string;
    type: string;
    title: string;
    order: number;
    total_executions: number;
    sent: number;
    delivered: number;
    connected: number;
    replied: number;
    errors: number;
  }>;
}
export interface CampaignLead {
  id: string;
  campaign_id: string;
  lead_id?: string;
  name: string;
  first_name?: string;
  last_name?: string;
  title?: string;
  company?: string;
  email?: string;
  phone?: string;
  linkedin_url?: string;
  enriched_email?: string | null;
  enriched_linkedin_url?: string | null;
  photo_url?: string;
  status: string;
  connected: boolean;
  replied: boolean;
  is_inbound?: boolean;
  apollo_person_id?: string;
  has_sent?: boolean;
  has_connected?: boolean;
  has_replied?: boolean;
  lead_data?: any;
  profile_summary?: string;
  created_at: string;
  updated_at: string;
}

// ====================
// Post performance (auto-post campaigns)
// ====================

/** One published LinkedIn post with LinkedIn's live counters. */
export interface CampaignPostStatsPost {
  post_id: string;
  published_at: string;
  content: string | null;
  share_url: string | null;
  impressions: number | null;   // null = unknown (author is not a connected account)
  reactions: number | null;
  comments: number | null;
  reposts: number | null;
  deleted: boolean;             // no longer exists on LinkedIn
  stats_available: boolean;
}

/** GET /api/campaigns/:id/post-stats — null when the campaign neither schedules nor has published posts. */
export interface CampaignPostStats {
  has_schedule: boolean;
  linkedin_connected: boolean;
  /** The posting profile's audience (null when LinkedIn did not answer). */
  profile: { followers: number | null; connections: number | null } | null;
  schedule: {
    status: string | null;
    frequency: string | null;
    days: string[] | string | null;
    post_time: string | null;
    timezone: string | null;
    run_count: number | null;
    last_run_at: string | null;
    next_run_at: string | null;
    last_error: string | null;
    require_approval: boolean | null;
    approval_channel: string | null;
    approval_status: string | null;
    as_organization: boolean | null;
  } | null;
  totals: {
    posts: number;
    posts_deleted: number;
    impressions: number;
    reactions: number;
    comments: number;
    reposts: number;
    median_impressions: number | null;
    impressions_unknown: number;
  };
  posts: CampaignPostStatsPost[];
  approvals: Record<string, number>;
  /** Connections dated after the first post, minus those won by campaign invitations. */
  network: { since: string; new_connections: number; via_campaign_invites: number; not_from_invites: number } | null;
  fetched_at: string;
}
