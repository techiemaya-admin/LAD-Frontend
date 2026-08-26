/**
 * Prospects feature - API functions.
 *
 * All requests flow through the shared apiClient, which targets the app's own
 * /api/* routes in browsers and the backend URL in SSR. The Next.js proxy at
 * /api/prospects/* forwards to LAD-Master-Agent.
 */
import { apiGet, apiDelete, apiPost } from '../../shared/apiClient';
import type {
  ListProspectEventsParams,
  ListProspectsParams,
  ProspectEvent,
  ProspectState,
} from './types';

function buildQuery(params?: object): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') {
      search.append(k, String(v));
    }
  }
  const s = search.toString();
  return s ? `?${s}` : '';
}

/** A page of prospects plus the total count of all matching rows (for pagination). */
export interface ListProspectsResult {
  items: ProspectState[];
  total: number;
}

export async function listProspects(
  params?: ListProspectsParams,
): Promise<ListProspectsResult> {
  const response = await apiGet<ProspectState[]>(
    `/api/prospects${buildQuery(params)}`,
  );
  const items = response.data ?? [];
  // Prefer the server's X-Total-Count; fall back to the page length if the
  // header is missing (older backend) so paging degrades to a single page.
  const header = response.headers?.get('x-total-count');
  const parsed = header != null ? Number(header) : NaN;
  const total = Number.isFinite(parsed) ? parsed : items.length;
  return { items, total };
}

export async function getProspect(id: string): Promise<ProspectState> {
  const response = await apiGet<ProspectState>(`/api/prospects/${id}`);
  return response.data;
}

export async function listProspectEvents(
  id: string,
  params?: ListProspectEventsParams,
): Promise<ProspectEvent[]> {
  const response = await apiGet<ProspectEvent[]>(
    `/api/prospects/${id}/events${buildQuery(params)}`,
  );
  return response.data;
}

/**
 * Soft-delete a prospect ("not a fit"). The Master Agent sets is_deleted = TRUE,
 * so it disappears from every list/detail read but the row is retained for audit.
 */
export async function deleteProspect(
  id: string,
  reason?: string,
): Promise<{ id: string; deleted: boolean; reason?: string | null }> {
  const qs = reason ? `?reason=${encodeURIComponent(reason)}` : '';
  const response = await apiDelete<{ id: string; deleted: boolean; reason?: string | null }>(
    `/api/prospects/${id}${qs}`,
  );
  return response.data;
}

/**
 * On-demand LinkedIn profile enrichment (Option C). Triggers a Unipile
 * profile fetch → company + employment history + warm-path signals. Best-effort;
 * the Master Agent applies the result, so callers refetch the prospect after.
 */
export interface EnrichProspectResult {
  enriched?: boolean;
  skipped?: string;
  company_name?: string | null;
  network_distance?: string | null;
  mutual_connections_count?: number | null;
  experience_throttled?: boolean;
}
export async function enrichProspect(id: string): Promise<EnrichProspectResult> {
  const response = await apiPost<EnrichProspectResult>(`/api/prospects/${id}/enrich`, {});
  return response.data;
}

/** A queued automatic follow-up for a prospect (across channels). */
export interface ProspectFollowup {
  id: string;
  channel: string | null;
  type: string | null;
  stage: string | null;
  scheduled_time: string | null;
  attempt: number | null;
}

export interface ProspectFollowupsResult {
  followups: ProspectFollowup[];
  /**
   * Channels the Master Agent could not read for this prospect
   * (LAD-Master-Agent #16). The LinkedIn lookup is best-effort and degrades to
   * "other channels only" — without this the caller sees a SHORT list and
   * reports it as the whole schedule.
   */
  degradedChannels: string[];
}

/** Upcoming scheduled automatic follow-ups for the prospect. */
export async function getProspectFollowups(id: string): Promise<ProspectFollowupsResult> {
  const response = await apiGet<{
    prospect_id: string;
    followups: ProspectFollowup[];
    degraded_channels?: string[];
  }>(`/api/prospects/${id}/followups`);
  return {
    followups: response.data.followups ?? [],
    degradedChannels: response.data.degraded_channels ?? [],
  };
}

/**
 * Apply a CRM "Take action" to a prospect.
 *   doNotContact: hard-suppress (true) / lift the suppression (false)
 *   quietDays:    pause outreach for N days (must be >= 1)
 *   clearQuiet:   clear an existing pause (quiet_until=NULL)
 *
 * The backend rejects quietDays=0 (422) - "pause for zero days" used to be
 * ambiguous with "clear the pause". Clearing is now this separate flag;
 * quietDays and clearQuiet are mutually exclusive (backend 409s otherwise).
 */
export interface ProspectActionParams {
  doNotContact?: boolean;
  quietDays?: number;
  clearQuiet?: boolean;
}
export interface ProspectActionResult {
  id: string;
  do_not_contact: boolean | null;
  quiet_until: string | null;
}
export async function prospectAction(
  id: string,
  params: ProspectActionParams,
): Promise<ProspectActionResult> {
  const qs = buildQuery({
    do_not_contact: params.doNotContact,
    quiet_days: params.quietDays,
    clear_quiet: params.clearQuiet,
  });
  const response = await apiPost<ProspectActionResult>(`/api/prospects/${id}/action${qs}`, {});
  return response.data;
}
