/**
 * Calendar Feature SDK
 * Calendars Mr LAD reads meetings from, the meetings themselves, and the
 * reminders planned against them.
 *
 * Usage:
 *   import { useMeetings, useReminders } from '@lad/frontend-features/calendar';
 */

export {
  calendarKeys,
  listCalendarSources,
  listCalendarAccounts,
  saveCalendarSource,
  deleteCalendarSource,
  syncCalendarSource,
  listMeetings,
  listReminders,
  cancelReminder,
  replanMeeting,
} from './api';

export {
  useCalendarSources,
  useCalendarAccounts,
  useSaveCalendarSource,
  useDeleteCalendarSource,
  useSyncCalendarSource,
  useMeetings,
  useReminders,
  useCancelReminder,
  useReplanMeeting,
} from './hooks';

export {
  GOOGLE_CALENDAR_SCOPE,
  MICROSOFT_CALENDAR_SCOPE,
  hasCalendarScope,
  REMINDER_OFFSET_MIN,
  REMINDER_OFFSET_MAX,
  REMINDER_OFFSET_LIMIT,
  REMINDER_MERGE_FIELDS,
  validateOffsets,
  offsetLabel,
  skipReasonLabel,
} from './types';

export type {
  CalendarProvider,
  ReminderChannel,
  ReminderStatus,
  MeetingStatus,
  MatchConfidence,
  CalendarSource,
  CalendarAccount,
  MeetingAttendee,
  Meeting,
  MeetingReminder,
  SaveCalendarSourceInput,
  SyncResult,
  MeetingsQuery,
  RemindersQuery,
  CalendarSourceNodeConfig,
  MeetingReminderNodeConfig,
} from './types';
