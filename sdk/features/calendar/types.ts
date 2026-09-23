/**
 * Calendar feature — types.
 *
 * Mirrors the backend tables the calendar lanes own:
 *   tenant_calendar_sources → CalendarSource
 *   tenant_meetings         → Meeting
 *   tenant_meeting_reminders→ MeetingReminder
 *
 * Column names are kept snake_case exactly as the rows come back, so nothing
 * has to be re-mapped in two places.
 */

export type CalendarProvider = 'google' | 'microsoft' | 'internal';

/** Channels a meeting reminder can go out on (the four dispatchers the engine has). */
export type ReminderChannel = 'whatsapp' | 'email' | 'linkedin' | 'voice';

export type ReminderStatus = 'scheduled' | 'sent' | 'skipped' | 'failed' | 'cancelled';

export type MeetingStatus = 'confirmed' | 'tentative' | 'cancelled';

/** How the attendee was matched to a lead. `null` = no lead matched. */
export type MatchConfidence = 'email' | 'phone' | 'linkedin' | null;

/** One calendar Mr LAD reads meetings from. */
export interface CalendarSource {
  id: string;
  provider: CalendarProvider;
  /** social_email_accounts.id for google/microsoft; null for the internal source. */
  account_id: string | null;
  /** Provider calendar id ('primary'); null for internal. */
  calendar_id: string | null;
  label: string | null;
  is_active: boolean;
  sync_window_days: number;
  last_synced_at: string | null;
  last_error: string | null;
  created_at?: string;
  updated_at?: string;
  /** Which mailbox this calendar belongs to, when the backend can name it. */
  account_email?: string | null;
  /** False when the stored OAuth account has no calendar scope — the account must be reconnected. */
  has_calendar_scope?: boolean;
}

/**
 * A connected mailbox as a possible calendar.
 *
 * Lane A serves these either as `GET /api/calendar/accounts` or as an
 * `accounts` key on `GET /api/calendar/sources`; `listCalendarAccounts`
 * reads whichever answers.
 */
export interface CalendarAccount {
  accountId: string | null;
  provider: CalendarProvider;
  email: string | null;
  /** The account can send mail but cannot read its calendar until it is reconnected. */
  hasCalendarScope: boolean;
  status?: string | null;
  /** Set once this account already has a source row, so the UI does not offer to add it twice. */
  sourceId?: string | null;
}

export interface MeetingAttendee {
  email?: string | null;
  name?: string | null;
  responseStatus?: string | null;
}

/** One calendar event inside the sync window. */
export interface Meeting {
  id: string;
  source_id: string;
  external_id: string;
  title: string | null;
  description?: string | null;
  location?: string | null;
  meeting_url?: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone?: string | null;
  organizer_email?: string | null;
  attendees: MeetingAttendee[];
  status: MeetingStatus;
  lead_id: string | null;
  campaign_id?: string | null;
  match_confidence: MatchConfidence;
  /** Display-only, when the backend can resolve the matched lead's name. */
  lead_name?: string | null;
  /** Some backends inline the planned reminders with the meeting; the panel uses them when present. */
  reminders?: MeetingReminder[];
}

/** One planned (or already sent) reminder for a meeting. */
export interface MeetingReminder {
  id: string;
  meeting_id: string;
  campaign_id?: string | null;
  step_id?: string | null;
  channel: ReminderChannel;
  /** Minutes BEFORE the meeting starts. */
  offset_minutes: number;
  send_at: string;
  status: ReminderStatus;
  body?: string | null;
  template_key?: string | null;
  skip_reason?: string | null;
  error?: string | null;
  sent_at?: string | null;
  attempts?: number;
}

export interface SaveCalendarSourceInput {
  /** Present when editing an existing source; absent creates one. */
  id?: string;
  provider?: CalendarProvider;
  account_id?: string | null;
  calendar_id?: string | null;
  label?: string | null;
  is_active?: boolean;
  sync_window_days?: number;
}

export interface SyncResult {
  synced?: number;
  cancelled?: number;
  last_synced_at?: string | null;
  last_error?: string | null;
}

export interface MeetingsQuery {
  from?: string;
  to?: string;
  sourceId?: string;
}

export interface RemindersQuery {
  meetingId?: string;
  status?: ReminderStatus;
}

/* ------------------------------------------------------------------ */
/* Calendar scopes — the same strings the backend adds to the OAuth    */
/* scope lists. Used to explain a mailbox that can send but not read.  */
/* ------------------------------------------------------------------ */

export const GOOGLE_CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar.readonly';
export const MICROSOFT_CALENDAR_SCOPE = 'Calendars.Read';

/** Does this stored scope list allow reading the calendar? */
export function hasCalendarScope(provider: CalendarProvider, scopes?: string[] | null): boolean {
  const list = scopes || [];
  if (provider === 'google') return list.some((s) => s === GOOGLE_CALENDAR_SCOPE || s.endsWith('/auth/calendar.readonly') || s.endsWith('/auth/calendar'));
  if (provider === 'microsoft') return list.some((s) => s === MICROSOFT_CALENDAR_SCOPE || /calendars\.read/i.test(s));
  return true;
}

/* ------------------------------------------------------------------ */
/* Builder node config — shared by the two new workflow cards           */
/* ------------------------------------------------------------------ */

/** Config of the `calendar_meetings` source node. */
export interface CalendarSourceNodeConfig {
  source_id?: string;
  window_days?: number;
  title_contains?: string;
  only_with_attendees?: boolean;
}

/** Config of the `meeting_reminder` step node. */
export interface MeetingReminderNodeConfig {
  offsets?: number[];
  channel?: ReminderChannel;
  template?: string;
  voiceConfirmed?: boolean;
  cancel_on_reply?: boolean;
}

/** Offsets are minutes before the meeting: 1–5 of them, 5 minutes to 7 days, no repeats. */
export const REMINDER_OFFSET_MIN = 5;
export const REMINDER_OFFSET_MAX = 7 * 24 * 60;
export const REMINDER_OFFSET_LIMIT = 5;

/** Merge fields a reminder template may use. */
export const REMINDER_MERGE_FIELDS = [
  { token: '{{first_name}}', label: 'First name', sample: 'Aisha' },
  { token: '{{meeting_time}}', label: 'Meeting time', sample: 'Tuesday at 10:00' },
  { token: '{{meeting_link}}', label: 'Meeting link', sample: 'https://meet.example.com/abc-defg' },
  { token: '{{duration}}', label: 'Duration', sample: '30 minutes' },
] as const;

/**
 * What is wrong with a set of offsets, in plain English — or null when they are fine.
 * Shared by the builder card and anything else that saves the node config.
 */
export function validateOffsets(offsets: number[]): string | null {
  if (!Array.isArray(offsets) || offsets.length === 0) return 'Pick at least one time to remind them.';
  if (offsets.length > REMINDER_OFFSET_LIMIT) return `Pick at most ${REMINDER_OFFSET_LIMIT} reminder times.`;
  if (new Set(offsets).size !== offsets.length) return 'Two reminders are set to the same time.';
  for (const m of offsets) {
    if (!Number.isFinite(m) || Math.floor(m) !== m) return 'Reminder times must be whole minutes.';
    if (m < REMINDER_OFFSET_MIN) return 'The earliest a reminder can go out is 5 minutes before the meeting.';
    if (m > REMINDER_OFFSET_MAX) return 'A reminder cannot be more than 7 days before the meeting.';
  }
  return null;
}

/** "1 day before", "3 hours before", "15 minutes before". */
export function offsetLabel(minutes: number): string {
  if (minutes % (24 * 60) === 0) {
    const d = minutes / (24 * 60);
    return `${d} day${d === 1 ? '' : 's'} before`;
  }
  if (minutes % 60 === 0) {
    const h = minutes / 60;
    return `${h} hour${h === 1 ? '' : 's'} before`;
  }
  return `${minutes} minute${minutes === 1 ? '' : 's'} before`;
}

/** Why a reminder was skipped, in words the tenant can act on. */
export function skipReasonLabel(reason?: string | null): string | null {
  switch (reason) {
    case 'too_late': return 'Planned too close to the meeting to send';
    case 'no_lead': return 'No lead matched this meeting';
    case 'channel_not_ready': return 'That channel is not connected yet';
    case 'voice_not_enabled': return 'Voice calls were not confirmed for this step';
    case 'meeting_cancelled': return 'The meeting was cancelled';
    case 'lead_replied': return 'They replied, so it was called off';
    default: return reason || null;
  }
}
