/**
 * React-query hooks for LAD-Email-Comms broadcast endpoints.
 *
 * Surface - what the EmailChannelView needs:
 *   useConnectedEmailAccounts()       - populates the "From" selector
 *   useBroadcastRuns(limit?, offset?) - Sent folder list
 *   useBroadcastRun(id)               - detail view; auto-polls if not-yet-terminal
 *   useSendBroadcast()                - Compose submit
 *
 * All hooks rely on the global QueryClient configured in providers.tsx
 * (staleTime 60s, gcTime 5min, retry 1).
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

// ── Shared types - mirror LAD-Email-Comms api/schemas/* ─────────────────────

export type EmailProvider = 'google' | 'microsoft' | 'custom_smtp';
export type AccountStatus = 'active' | 'inactive' | 'error' | 'expired';

export interface ConnectedAccount {
  id: string;
  provider: EmailProvider;
  email: string;
  display_name: string | null;
  status: AccountStatus;
  last_verified_at: string | null;
}

export type BroadcastStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'paused_quota_exceeded'
  | 'cancelled';

export interface BroadcastRunSummary {
  id: string;
  from_email: string;
  subject: string;
  status: BroadcastStatus;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  unsubscribed_skipped_count: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface BroadcastRunDetail extends BroadcastRunSummary {
  body_html: string;
  body_text: string | null;
  error_message: string | null;
}

export interface RecipientPayload {
  email: string;
  name?: string;
  metadata?: Record<string, unknown>;
}

export interface SendBroadcastRequest {
  from_email_account_id: string;
  subject: string;
  body_html: string;
  body_text?: string | null;
  template_id?: string | null;
  // Exactly one of the two: explicit list OR a saved group. Server-side
  // model_validator rejects both-supplied and neither-supplied.
  recipients?: RecipientPayload[];
  group_id?: string;
}

export interface SendBroadcastResponse {
  broadcast_run_id: string;
  status: 'queued';
  recipient_count: number;
}

// ── Internal fetcher ────────────────────────────────────────────────────────

async function jsonFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    ...init,
  });
  if (!res.ok) {
    let message: string;
    try {
      const body = await res.json();
      message = body?.detail || body?.error || `HTTP ${res.status}`;
    } catch {
      message = `HTTP ${res.status}`;
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

// ── Hooks ───────────────────────────────────────────────────────────────────

const QUERY_KEYS = {
  accounts: ['email-comms', 'accounts'] as const,
  runs: (limit: number, offset: number) =>
    ['email-comms', 'runs', { limit, offset }] as const,
  run: (id: string) => ['email-comms', 'run', id] as const,
};

export function useConnectedEmailAccounts() {
  return useQuery({
    queryKey: QUERY_KEYS.accounts,
    queryFn: () =>
      jsonFetch<{ accounts: ConnectedAccount[] }>(
        '/api/email-comms/accounts',
      ).then((d) => d.accounts),
  });
}

export function useBroadcastRuns(limit = 20, offset = 0) {
  return useQuery({
    queryKey: QUERY_KEYS.runs(limit, offset),
    queryFn: () =>
      jsonFetch<{ runs: BroadcastRunSummary[]; next_offset: number | null }>(
        `/api/email-comms/broadcast/runs?limit=${limit}&offset=${offset}`,
      ),
  });
}

/** Detail view of one broadcast. Auto-polls every 3s while the broadcast is
 *  not in a terminal state, so the Sent folder updates progress live. */
export function useBroadcastRun(id: string | null) {
  return useQuery({
    enabled: !!id,
    queryKey: id ? QUERY_KEYS.run(id) : ['email-comms', 'run', 'null'],
    queryFn: () =>
      jsonFetch<BroadcastRunDetail>(
        `/api/email-comms/broadcast/runs/${encodeURIComponent(id as string)}`,
      ),
    refetchInterval: (query) => {
      const data = query.state.data as BroadcastRunDetail | undefined;
      if (!data) return 3000;
      // Poll only while non-terminal.
      const terminal = ['completed', 'failed', 'cancelled'];
      return terminal.includes(data.status) ? false : 3000;
    },
  });
}

// ── Performance stats (GET /runs/:id/stats) ──────────────────────────────

export interface BroadcastRunStats {
  run_id: string;
  status: string;
  recipient_count: number;
  sent_count: number;
  failed_count: number;
  unsubscribed_skipped_count: number;
  delivery_rate: number;
  total_opens: number;
  unique_opens: number;
  open_rate: number;
  not_opened_count: number;
  proxy_opens: number;
  first_open_at: string | null;
  last_open_at: string | null;
  avg_seconds_to_first_open: number | null;
  median_seconds_to_first_open: number | null;
  repeat_openers_count: number;
  repeat_openers: Array<{
    email: string;
    name: string | null;
    opens: number;
    first_open_at: string | null;
    last_open_at: string | null;
  }>;
  total_clicks: number;
  unique_clickers: number;
  click_rate: number;
  top_links: Array<{ url: string; clicks: number; unique_clickers: number }>;
  opens_by_day: Array<{ day: string; opens: number; unique_opens: number }>;
  failures_by_code: Array<{ error_code: string; count: number }>;
}

/** Engagement stats for one broadcast. Enabled while the detail dialog is
 *  open; refreshes every 30s (opens/clicks trickle in for days). */
export function useBroadcastStats(id: string | null, enabled: boolean) {
  return useQuery({
    enabled: !!id && enabled,
    queryKey: id ? ['email-comms', 'stats', id] : ['email-comms', 'stats', 'null'],
    queryFn: () =>
      jsonFetch<BroadcastRunStats>(
        `/api/email-comms/broadcast/runs/${encodeURIComponent(id as string)}/stats`,
      ),
    refetchInterval: 30_000,
  });
}

/** Lazy-fetch recipients for one broadcast - used for the Sent-row hover
 *  tooltip. `enabled` is the gate (we pass true only when the tooltip opens).
 *  Returns the same shape as GET /runs/:id/recipients. */
export function useBroadcastRecipients(id: string | null, enabled: boolean) {
  return useQuery({
    enabled: !!id && enabled,
    queryKey: id ? ['email-comms', 'recipients', id] : ['email-comms', 'recipients', 'null'],
    queryFn: () =>
      jsonFetch<{
        recipients: Array<{
          id: string;
          recipient_email: string;
          recipient_name: string | null;
          status: string;
          error_code: string | null;
          error_message: string | null;
        }>;
        next_offset: number | null;
      }>(
        `/api/email-comms/broadcast/runs/${encodeURIComponent(id as string)}/recipients?limit=200`,
      ),
    staleTime: 30_000,
  });
}

export function useSendBroadcast() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: SendBroadcastRequest) =>
      jsonFetch<SendBroadcastResponse>('/api/email-comms/broadcast/send', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      // Refresh the Sent folder so the new run shows up immediately.
      qc.invalidateQueries({ queryKey: ['email-comms', 'runs'] });
    },
  });
}

// ── Phase 2 - Groups + contacts ──────────────────────────────────────────

export type EmailChannel = 'gmail' | 'outlook';

export interface EmailGroupSummary {
  id: string;
  name: string;
  color: string;
  description: string | null;
  channel: EmailChannel;
  member_count: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EmailGroupMember {
  contact_id: string;
  email: string;
  contact_name: string | null;
  company: string | null;
  phone: string | null;
  added_at: string;
}

export interface EmailGroupWithMembers extends EmailGroupSummary {
  members: EmailGroupMember[];
}

export interface EmailContact {
  id: string;
  email: string;
  contact_name: string | null;
  company: string | null;
  phone: string | null;
  created_at: string | null;
  updated_at: string | null;
}

const GROUP_KEYS = {
  list: (channel?: EmailChannel) =>
    ['email-comms', 'groups', channel ?? 'all'] as const,
  one: (id: string) => ['email-comms', 'group', id] as const,
  contacts: (search?: string, limit?: number, offset?: number) =>
    ['email-comms', 'contacts', { search, limit, offset }] as const,
};

/** List broadcast groups, optionally filtered by channel. */
export function useEmailGroups(channel?: EmailChannel) {
  return useQuery({
    queryKey: GROUP_KEYS.list(channel),
    queryFn: () => {
      const qs = channel ? `?channel=${channel}` : '';
      return jsonFetch<{ groups: EmailGroupSummary[] }>(
        `/api/email-comms/groups${qs}`,
      );
    },
  });
}

/** One group with its full member list. */
export function useEmailGroup(id: string | null) {
  return useQuery({
    enabled: !!id,
    queryKey: id ? GROUP_KEYS.one(id) : ['email-comms', 'group', 'null'],
    queryFn: () =>
      jsonFetch<EmailGroupWithMembers>(
        `/api/email-comms/groups/${encodeURIComponent(id as string)}`,
      ),
  });
}

/** Create a group. Invalidates the list on success. */
export function useCreateEmailGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      channel: EmailChannel;
      color?: string;
      description?: string | null;
    }) =>
      jsonFetch<EmailGroupSummary>('/api/email-comms/groups', {
        method: 'POST',
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-comms', 'groups'] });
    },
  });
}

/** Rename / recolor / re-describe an existing group. */
export function useUpdateEmailGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      name?: string;
      color?: string;
      description?: string | null;
    }) =>
      jsonFetch<EmailGroupSummary>(
        `/api/email-comms/groups/${encodeURIComponent(id)}`,
        { method: 'PATCH', body: JSON.stringify(body) },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['email-comms', 'groups'] });
      qc.invalidateQueries({ queryKey: GROUP_KEYS.one(vars.id) });
    },
  });
}

/** Soft-delete a group. 204 → bare fetch (jsonFetch would fail parsing an
 *  empty body). */
export function useDeleteEmailGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/email-comms/groups/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'include',
      }).then((r) => {
        if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`);
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-comms', 'groups'] });
    },
  });
}

/** Bulk-add contacts to a group. Server dedups via ON CONFLICT DO NOTHING;
 *  response tells us how many were newly inserted vs already present. */
export function useAddContactsToGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      contactIds,
    }: {
      groupId: string;
      contactIds: string[];
    }) =>
      jsonFetch<{ added: number; total_members: number }>(
        `/api/email-comms/groups/${encodeURIComponent(groupId)}/contacts`,
        {
          method: 'POST',
          body: JSON.stringify({ contact_ids: contactIds }),
        },
      ),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['email-comms', 'groups'] });
      qc.invalidateQueries({ queryKey: GROUP_KEYS.one(vars.groupId) });
    },
  });
}

/** Remove a single contact from a group. */
export function useRemoveContactFromGroup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      groupId,
      contactId,
    }: {
      groupId: string;
      contactId: string;
    }) =>
      fetch(
        `/api/email-comms/groups/${encodeURIComponent(groupId)}/contacts/${encodeURIComponent(contactId)}`,
        { method: 'DELETE', credentials: 'include' },
      ).then((r) => {
        if (!r.ok && r.status !== 204) throw new Error(`HTTP ${r.status}`);
      }),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['email-comms', 'groups'] });
      qc.invalidateQueries({ queryKey: GROUP_KEYS.one(vars.groupId) });
    },
  });
}

/** Search/list contacts with email addresses - feeds the group-add picker. */
export function useEmailContacts(
  search: string = '',
  limit: number = 100,
  offset: number = 0,
) {
  return useQuery({
    queryKey: GROUP_KEYS.contacts(search, limit, offset),
    queryFn: () => {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      return jsonFetch<{ contacts: EmailContact[]; next_offset: number | null }>(
        `/api/email-comms/contacts?${params.toString()}`,
      );
    },
    staleTime: 30_000,
  });
}
