/**
 * Calendar feature — API functions.
 *
 * Everything goes through the app's own `/api/calendar/*` proxy, which forwards
 * to LAD_backend `/api/calendar/*` with the caller's token. Tenant scoping is
 * applied server-side from that token — never sent from here.
 *
 * Envelope: `{ success, data }` on success, `{ success:false, error, message }`
 * on failure (the shared client turns the latter into an ApiError).
 */
import { apiDelete, apiGet, apiPatch, apiPost } from '../../shared/apiClient';
import { apiErrorStatus } from '../../shared/apiError';
import type {
  CalendarAccount,
  CalendarSource,
  Meeting,
  MeetingReminder,
  MeetingsQuery,
  RemindersQuery,
  SaveCalendarSourceInput,
  SyncResult,
} from './types';

const BASE = '/api/calendar';

interface Envelope<T> {
  success?: boolean;
  data?: T;
}

/** Backends differ on whether the list is the payload or sits under a key — read both. */
function pickList<T>(payload: any, key: string): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && Array.isArray(payload[key])) return payload[key] as T[];
  return [];
}

export const calendarKeys = {
  all: ['calendar'] as const,
  sources: () => [...calendarKeys.all, 'sources'] as const,
  accounts: () => [...calendarKeys.all, 'accounts'] as const,
  meetings: (q?: MeetingsQuery) =>
    [...calendarKeys.all, 'meetings', q?.from ?? '', q?.to ?? '', q?.sourceId ?? ''] as const,
  reminders: (q?: RemindersQuery) =>
    [...calendarKeys.all, 'reminders', q?.meetingId ?? '', q?.status ?? ''] as const,
};

/* ------------------------------------------------------------------ */
/* Sources                                                             */
/* ------------------------------------------------------------------ */

export async function listCalendarSources(): Promise<CalendarSource[]> {
  const res = await apiGet<Envelope<{ sources?: CalendarSource[] }>>(`${BASE}/sources`);
  return pickList<CalendarSource>(res.data?.data ?? res.data, 'sources');
}

/**
 * The connected mailboxes and whether each can read its calendar yet.
 *
 * Lane A may serve these at `/api/calendar/accounts` or hang them off the
 * sources response as `accounts`. Try the dedicated route first and fall back
 * to the sources payload when it is not there, so neither shape breaks the UI.
 */
export async function listCalendarAccounts(): Promise<CalendarAccount[]> {
  try {
    const res = await apiGet<Envelope<{ accounts?: CalendarAccount[] }>>(`${BASE}/accounts`);
    return pickList<CalendarAccount>(res.data?.data ?? res.data, 'accounts');
  } catch (err) {
    const status = apiErrorStatus(err);
    if (status !== 404 && status !== 405) throw err;
  }
  const res = await apiGet<Envelope<{ accounts?: CalendarAccount[] }>>(`${BASE}/sources`);
  return pickList<CalendarAccount>(res.data?.data ?? res.data, 'accounts');
}

export async function saveCalendarSource(input: SaveCalendarSourceInput): Promise<CalendarSource> {
  const { id, ...body } = input;
  const res = id
    ? await apiPatch<Envelope<CalendarSource>>(`${BASE}/sources/${id}`, body)
    : await apiPost<Envelope<CalendarSource>>(`${BASE}/sources`, body);
  return (res.data?.data ?? (res.data as unknown)) as CalendarSource;
}

export async function deleteCalendarSource(id: string): Promise<void> {
  await apiDelete(`${BASE}/sources/${id}`);
}

/** Manual "Sync now". Capped backend-side; may come back with `last_error` set. */
export async function syncCalendarSource(id: string): Promise<SyncResult> {
  const res = await apiPost<Envelope<SyncResult>>(`${BASE}/sources/${id}/sync`, {});
  return (res.data?.data ?? {}) as SyncResult;
}

/* ------------------------------------------------------------------ */
/* Meetings + reminders                                                */
/* ------------------------------------------------------------------ */

export async function listMeetings(q: MeetingsQuery = {}): Promise<Meeting[]> {
  const params: Record<string, string> = {};
  if (q.from) params.from = q.from;
  if (q.to) params.to = q.to;
  if (q.sourceId) params.sourceId = q.sourceId;
  const res = await apiGet<Envelope<{ meetings?: Meeting[] }>>(`${BASE}/meetings`, { params });
  return pickList<Meeting>(res.data?.data ?? res.data, 'meetings');
}

export async function listReminders(q: RemindersQuery = {}): Promise<MeetingReminder[]> {
  const params: Record<string, string> = {};
  if (q.meetingId) params.meetingId = q.meetingId;
  if (q.status) params.status = q.status;
  const res = await apiGet<Envelope<{ reminders?: MeetingReminder[] }>>(`${BASE}/reminders`, { params });
  return pickList<MeetingReminder>(res.data?.data ?? res.data, 'reminders');
}

export async function cancelReminder(id: string): Promise<MeetingReminder | null> {
  const res = await apiPost<Envelope<MeetingReminder>>(`${BASE}/reminders/${id}/cancel`, {});
  return (res.data?.data ?? null) as MeetingReminder | null;
}

/** Admin: re-plan every reminder for a meeting (after it moved). */
export async function replanMeeting(id: string): Promise<MeetingReminder[]> {
  const res = await apiPost<Envelope<{ reminders?: MeetingReminder[] }>>(`${BASE}/meetings/${id}/replan`, {});
  return pickList<MeetingReminder>(res.data?.data ?? res.data, 'reminders');
}
