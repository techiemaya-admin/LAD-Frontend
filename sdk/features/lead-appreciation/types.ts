/**
 * Lead Appreciation feature - TypeScript types.
 *
 * Mirrors LAD_backend/features/lead-appreciation (lead_appreciation_signals
 * rows joined with their watchlist identity). Keep in sync with the SQL in
 * AppreciationRepository.js.
 */

export type AppreciationSignalStatus =
  | 'detected'
  | 'classifying'
  | 'suppressed'
  | 'pending_review'
  | 'approved'
  | 'queued'
  | 'sending'
  | 'sent'
  | 'failed'
  | 'expired'
  | 'held_for_review';

export type AppreciationSignalType =
  | 'promotion'
  | 'new_role'
  | 'work_anniversary'
  | 'award'
  | 'funding_round'
  | 'product_launch'
  | 'publication'
  | 'speaking_engagement'
  | 'company_milestone';

export interface AppreciationSignal {
  id: string;
  tenant_id: string;
  watchlist_id: string;
  campaign_id: string;
  campaign_lead_id: string;
  lead_id: string | null;
  platform: string;
  external_post_id: string;
  post_url: string | null;
  post_excerpt: string | null;
  posted_at: string | null;
  signal_type: AppreciationSignalType | null;
  sensitive_category: string | null;
  match_score: string | number | null;
  status: AppreciationSignalStatus;
  skip_reason: string | null;
  message_text: string | null;
  sent_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  /** Joined from the watchlist row. */
  watch_lead_name: string | null;
  lead_linkedin_url: string | null;
}

export interface ListSignalsParams {
  status?: AppreciationSignalStatus;
  limit?: number;
  offset?: number;
}

export interface AppreciationStatusCount {
  status: AppreciationSignalStatus;
  n: number;
}

export interface ApproveSignalInput {
  signalId: string;
  /** Optional edited message text (max 400 chars). */
  messageText?: string;
}

export interface RejectSignalInput {
  signalId: string;
  /** Also pause all future appreciation for this lead. */
  optOut?: boolean;
}
