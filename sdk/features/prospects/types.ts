/**
 * Prospects feature - TypeScript types.
 *
 * Mirrors the Pydantic models in LAD-Master-Agent/models/prospect.py and
 * LAD-Master-Agent/models/event.py. Keep these in sync when the Python schema
 * changes.
 */

export type LifecycleStage =
  | 'new'
  | 'engaged'
  | 'qualified'
  | 'sah'
  | 'won'
  | 'lost'
  | 'archived';

export type Channel =
  | 'linkedin'
  | 'whatsapp'
  | 'wapa'
  | 'email'
  | 'voice'
  | 'instagram'
  | 'system';

export type Direction = 'outbound' | 'inbound';

export interface ProspectState {
  id: string;
  tenant_id: string;

  // Cross-DB bridge
  core_lead_id: string | null;

  // Channel handles
  linkedin_url: string | null;
  linkedin_member_urn: string | null;
  email: string | null;
  phone_e164: string | null;
  waba_wa_id: string | null;
  instagram_handle: string | null;

  // Profile
  full_name: string | null;
  headline: string | null;
  company_name: string | null;
  job_title: string | null;
  location: string | null;

  // Lifecycle
  lifecycle_stage: LifecycleStage;

  // Latest activity
  last_channel: Channel | null;
  last_event_type: string | null;
  last_event_at: string | null;
  last_inbound_at: string | null;
  last_outbound_at: string | null;

  // Per-channel rollup
  channel_rollups: Record<string, unknown>;

  // SAH
  sah_at: string | null;
  sah_type: string | null;
  sah_event_id: string | null;

  // ATC hooks (Phase 2)
  quiet_until: string | null;
  do_not_contact: boolean;

  // Soft delete
  is_deleted: boolean;
  deleted_at: string | null;

  // Audit
  created_at: string;
  updated_at: string;
  last_event_seq: number;

  // Fit + enrichment (migration 032) - surfaced to the CRM / Unified Prospect View
  apollo_id?: string | null;
  fit_score?: number | null;
  fit_signals?: Record<string, number>;
  fit_source?: string | null;
  enrichment_status?: string;
  email_verified?: boolean;
  email_confidence?: number | null;
  phone_verified?: boolean;
  phone_confidence?: number | null;

  // Employment history (migration 034) + LinkedIn warm-path signals (migration 035)
  employment_history?: Array<{
    company?: string | null;
    title?: string | null;
    start?: string | null;
    end?: string | null;
    is_current?: boolean;
    location?: string | null;
    description?: string | null;
  }>;
  company_names?: string[];
  profile_enriched_at?: string | null;
  profile_enrichment_source?: string | null;
  network_distance?: string | null;            // FIRST_DEGREE | SECOND_DEGREE | …
  mutual_connections_count?: number | null;     // mutual connections with the prospect
  connections_count?: number | null;
  work_experience_total_count?: number | null;
  experience_throttled?: boolean;
}

export interface ProspectEvent {
  id: string;
  tenant_id: string;
  seq: number;
  prospect_id: string;
  channel: Channel;
  event_type: string;
  direction: Direction | null;
  external_event_id: string | null;
  campaign_id: string | null;
  core_lead_id: string | null;
  channel_resource_id: string | null;
  payload: Record<string, unknown>;
  attributed_cost_usd: number | null;
  occurred_at: string;
  received_at: string;
  created_at: string;
}

export interface ListProspectsParams {
  lifecycle_stage?: LifecycleStage;
  channel?: Channel;
  /** Case-insensitive substring match against name/email/phone/company,
   *  server-side across the whole tenant (not just the current page). */
  search?: string;
  limit?: number;
  offset?: number;
  /** Server-side sort — only fields the backend actually indexes on
   *  prospect_state. Omit for the backend's default (last_event_at desc). */
  sort_by?: 'last_event_at' | 'fit_score' | 'sah_at' | 'created_at';
  sort_dir?: 'asc' | 'desc';
}

export interface ListProspectEventsParams {
  limit?: number;
  before?: string;  // ISO timestamp
}
