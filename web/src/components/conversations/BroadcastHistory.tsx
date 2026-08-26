'use client';

/**
 * What has actually been broadcast to a group.
 *
 * A broadcast group has no chat of its own - it fans out to N separate 1:1
 * conversations. So the raw message list for a group is "everything said to
 * these people", which on a live tenant was 36% agent replies and inbound
 * traffic. The API filters that with ?broadcasts_only=true; this component's
 * job is the second half of the problem: one broadcast arrives as N rows, one
 * per recipient, and showing them individually reads as N unrelated messages
 * rather than one send to N people.
 *
 * So rows are collapsed back into sends. Two messages belong to the same send
 * when they share a template AND landed close together in time - the fan-out is
 * a loop over recipients, so it spans seconds, while a genuine re-send of the
 * same template happens minutes or days later and should stay separate.
 */

import { useMemo } from 'react';
import { Megaphone, Users, Loader2 } from 'lucide-react';

export interface GroupMessage {
  id: string;
  content: string;
  created_at: string | null;
  is_outgoing: boolean;
  template_name: string | null;
  sender_name?: string | null;
}

export interface BroadcastSend {
  key: string;
  templateName: string;
  sentAt: Date | null;
  recipientCount: number;
  preview: string;
}

/**
 * Messages within this many ms of each other, on the same template, are one
 * send. A fan-out loops over recipients and completes in seconds; the same
 * template sent again later is a different send and must not merge into it.
 * Generous enough to survive a slow batch, short enough not to swallow a
 * genuine re-send.
 */
const SAME_SEND_WINDOW_MS = 10 * 60 * 1000;

export function groupIntoSends(messages: GroupMessage[]): BroadcastSend[] {
  // Oldest first so a send's timestamp is when it STARTED, not when its last
  // recipient happened to be written.
  const ordered = [...messages]
    .filter((m) => m.template_name)
    .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

  const sends: BroadcastSend[] = [];
  for (const m of ordered) {
    const at = m.created_at ? new Date(m.created_at) : null;
    const last = sends[sends.length - 1];
    const sameTemplate = last && last.templateName === m.template_name;
    const closeInTime =
      last && at && last.sentAt
        ? at.getTime() - last.sentAt.getTime() <= SAME_SEND_WINDOW_MS
        : false;

    if (last && sameTemplate && closeInTime) {
      last.recipientCount += 1;
      continue;
    }
    sends.push({
      key: m.id,
      templateName: m.template_name as string,
      sentAt: at,
      recipientCount: 1,
      // Every recipient of one send gets the same body, so the first is
      // representative. Personalised tokens differ, but the shape does not.
      preview: (m.content || '').trim(),
    });
  }
  // Newest send first - the last thing sent is what people look for.
  return sends.reverse();
}

function whenLabel(d: Date | null): string {
  if (!d) return 'Unknown time';
  return d.toLocaleString(undefined, {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export function BroadcastHistory({
  messages,
  loading,
  error,
}: {
  messages: GroupMessage[];
  loading: boolean;
  error: string | null;
}) {
  const sends = useMemo(() => groupIntoSends(messages), [messages]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading history…
      </div>
    );
  }
  if (error) {
    return <p className="px-5 py-8 text-sm text-red-500 text-center">{error}</p>;
  }
  if (sends.length === 0) {
    return (
      <div className="py-12 text-center px-6">
        <Megaphone className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
        <p className="text-sm text-muted-foreground">Nothing has been broadcast to this group yet.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-border">
      {sends.map((s) => (
        <li key={s.key} className="px-5 py-3">
          <div className="flex items-start gap-2">
            <Megaphone className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <p className="text-sm font-medium truncate">{s.templateName}</p>
                <span className="text-[11px] text-muted-foreground shrink-0">{whenLabel(s.sentAt)}</span>
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Users className="h-3 w-3" />
                {s.recipientCount} recipient{s.recipientCount === 1 ? '' : 's'}
              </p>
              {s.preview && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap">
                  {s.preview}
                </p>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
