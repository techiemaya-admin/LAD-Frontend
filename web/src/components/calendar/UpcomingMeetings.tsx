'use client';

/**
 * Upcoming meetings — the next 14 days off every calendar Mr LAD reads, with
 * the reminders planned against each one and why any of them will not go out.
 *
 * Reachable from Settings → Calendars and from a campaign's overview.
 */

import React, { useMemo } from 'react';
import { CalendarDays, Link2, Loader2, UserX, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  offsetLabel,
  skipReasonLabel,
  useCancelReminder,
  useMeetings,
  useReminders,
  type Meeting,
  type MeetingReminder,
  type ReminderChannel,
  type ReminderStatus,
} from '@lad/frontend-features/calendar';

const CHANNEL_LABEL: Record<ReminderChannel, string> = {
  whatsapp: 'WhatsApp',
  email: 'Email',
  linkedin: 'LinkedIn',
  voice: 'Voice call',
};

const STATUS_TINT: Record<ReminderStatus, string> = {
  scheduled: 'bg-sky-50 text-sky-900 border-sky-200 dark:bg-sky-500/10 dark:text-sky-200 dark:border-sky-500/30',
  sent: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30',
  skipped: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30',
  failed: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30',
  cancelled: 'bg-slate-50 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10',
};

const STATUS_WORD: Record<ReminderStatus, string> = {
  scheduled: 'Will send',
  sent: 'Sent',
  skipped: 'Skipped',
  failed: 'Failed',
  cancelled: 'Cancelled',
};

function formatWhen(startsAt: string, timezone?: string | null): string {
  const d = new Date(startsAt);
  if (Number.isNaN(d.getTime())) return startsAt;
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
      ...(timezone ? { timeZone: timezone } : {}),
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

function attendeeLine(meeting: Meeting): string {
  const who = (meeting.attendees || [])
    .map((a) => a.name || a.email)
    .filter(Boolean) as string[];
  if (who.length === 0) return 'No attendees listed';
  if (who.length <= 2) return who.join(', ');
  return `${who[0]}, ${who[1]} and ${who.length - 2} more`;
}

export interface UpcomingMeetingsProps {
  /** Only meetings on this calendar. */
  sourceId?: string;
  /** Only meetings whose matched lead belongs to this campaign. */
  campaignId?: string;
  /** How far ahead to look. The contract's panel is the next 14 days. */
  days?: number;
  /** Render nothing at all when there is nothing booked (campaign overview). */
  hideWhenEmpty?: boolean;
  className?: string;
}

export const UpcomingMeetings: React.FC<UpcomingMeetingsProps> = ({
  sourceId, campaignId, days = 14, hideWhenEmpty = false, className,
}) => {
  const range = useMemo(() => {
    const from = new Date();
    const to = new Date(from.getTime() + days * 24 * 60 * 60 * 1000);
    return { from: from.toISOString(), to: to.toISOString(), sourceId };
  }, [days, sourceId]);

  const meetingsQ = useMeetings(range);
  const remindersQ = useReminders({});
  const cancelReminder = useCancelReminder();

  const meetings = useMemo(() => {
    const rows = meetingsQ.data;
    if (!rows) return rows;
    const filtered = campaignId ? rows.filter((m) => m.campaign_id === campaignId) : rows;
    return [...filtered].sort((a, b) => (a.starts_at < b.starts_at ? -1 : a.starts_at > b.starts_at ? 1 : 0));
  }, [meetingsQ.data, campaignId]);

  /** meeting id → its reminders, newest offset first. Inlined rows win when the backend sends them. */
  const byMeeting = useMemo(() => {
    const map = new Map<string, MeetingReminder[]>();
    for (const r of remindersQ.data || []) {
      const list = map.get(r.meeting_id) || [];
      list.push(r);
      map.set(r.meeting_id, list);
    }
    for (const list of map.values()) list.sort((a, b) => b.offset_minutes - a.offset_minutes);
    return map;
  }, [remindersQ.data]);

  const remindersFor = (meeting: Meeting): MeetingReminder[] => {
    if (meeting.reminders && meeting.reminders.length > 0) {
      return [...meeting.reminders].sort((a, b) => b.offset_minutes - a.offset_minutes);
    }
    return byMeeting.get(meeting.id) || [];
  };

  // On a campaign's overview an empty calendar is not news — say nothing.
  if (hideWhenEmpty && meetings !== undefined && meetings.length === 0) return null;

  return (
    <Card className={`dark:bg-[#030a21]/60 dark:border-blue-950/40 ${className || ''}`}>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-100 dark:bg-violet-950/40 rounded-lg">
            <CalendarDays className="h-6 w-6 text-violet-600 dark:text-violet-400" />
          </div>
          <div>
            <CardTitle className="dark:text-white">Upcoming meetings</CardTitle>
            <CardDescription className="dark:text-gray-400">
              The next {days} days, and the reminders Mr LAD has planned for them.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {meetingsQ.isLoading && (
          <p className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading your meetings…
          </p>
        )}

        {/* A source that failed is not a source with nothing in it. */}
        {!meetingsQ.isLoading && meetings === undefined && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            We could not read your meetings just now, so this list may be incomplete. Reload the page to try again.
          </p>
        )}

        {meetings?.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Nothing booked in the next {days} days.
          </p>
        )}

        {remindersQ.data === undefined && !remindersQ.isLoading && (meetings?.length || 0) > 0 && (
          <p className="text-sm text-amber-700 dark:text-amber-300">
            We could not read the planned reminders just now.
          </p>
        )}

        {meetings?.map((meeting) => {
          const rows = remindersFor(meeting);
          const cancelled = meeting.status === 'cancelled';
          return (
            <div
              key={meeting.id}
              className="rounded-lg border border-slate-200 p-4 dark:border-blue-950/40 dark:bg-[#061033]/50"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-medium dark:text-white">
                    {meeting.title || 'Untitled meeting'}
                    {cancelled && (
                      <span className="ml-2 rounded-full border border-slate-200 px-2 py-0.5 text-[11px] font-normal text-slate-600 dark:border-white/10 dark:text-slate-300">
                        Cancelled
                      </span>
                    )}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {formatWhen(meeting.starts_at, meeting.timezone)} · {attendeeLine(meeting)}
                  </p>
                  <p className="mt-1 text-xs">
                    {meeting.lead_id ? (
                      <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-300">
                        <Link2 className="h-3.5 w-3.5" />
                        Matched to {meeting.lead_name || 'a lead'}
                        {meeting.match_confidence ? ` by ${meeting.match_confidence}` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                        <UserX className="h-3.5 w-3.5" />
                        No lead matched — Mr LAD cannot message anyone about this one
                      </span>
                    )}
                  </p>
                </div>
                {meeting.meeting_url && (
                  <a
                    href={meeting.meeting_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex shrink-0 items-center gap-1.5 text-xs text-blue-600 hover:underline dark:text-blue-400"
                  >
                    <Video className="h-3.5 w-3.5" /> Join link
                  </a>
                )}
              </div>

              <div className="mt-3 space-y-2">
                {rows.length === 0 ? (
                  <p className="text-xs text-gray-500 dark:text-gray-400">No reminders planned for this meeting.</p>
                ) : rows.map((reminder) => (
                  <div
                    key={reminder.id}
                    className="flex flex-wrap items-center gap-2 text-xs"
                  >
                    <span className={`rounded-full border px-2 py-0.5 font-medium ${STATUS_TINT[reminder.status]}`}>
                      {STATUS_WORD[reminder.status]}
                    </span>
                    <span className="dark:text-gray-300">
                      {CHANNEL_LABEL[reminder.channel]} · {offsetLabel(reminder.offset_minutes)}
                    </span>
                    {reminder.status === 'skipped' && skipReasonLabel(reminder.skip_reason) && (
                      <span className="text-amber-700 dark:text-amber-300">
                        {skipReasonLabel(reminder.skip_reason)}
                      </span>
                    )}
                    {reminder.status === 'failed' && reminder.error && (
                      <span className="text-rose-600 dark:text-rose-400">{reminder.error}</span>
                    )}
                    {reminder.status === 'scheduled' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2 text-xs"
                        onClick={() => cancelReminder.mutate(reminder.id)}
                        disabled={cancelReminder.isPending}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default UpcomingMeetings;
