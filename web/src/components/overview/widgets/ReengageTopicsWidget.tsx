'use client';

/**
 * ReengageTopicsWidget - "Re-engage by Topic".
 *
 * Surfaces the segments of customers who ASKED ABOUT a topic (e.g. Pilates,
 * Pricing) but did NOT convert, and lets the tenant fire a WhatsApp broadcast
 * to exactly that segment in one click. Each topic's contacts are handed to the
 * existing MessageTemplateSender (template picker + send) as `allMembers`, so
 * "Send to all" targets precisely that segment.
 *
 * Data: LAD-Master-Agent via useConversationAnalytics (shared with the funnel
 * widget - one fetch).
 */
import React, { useMemo, useState } from 'react';
import { Megaphone, RefreshCw, Sparkles, CheckCircle2 } from 'lucide-react';

import MessageTemplateSender from '@/features/community-roi/components/MessageTemplateSender';
import { WidgetWrapper } from '../WidgetWrapper';
import { useConversationAnalytics, TopicSegment } from '../useConversationAnalytics';

const WINDOW_DAYS = 30;

// Map a topic's contacts → the member shape MessageTemplateSender expects.
// We pass ONLY this segment as `allMembers`, so its "Send to all" = this segment.
function toMembers(topic: TopicSegment) {
  return topic.contacts
    .filter((c) => (c.phone || '').trim())
    .map((c) => ({
      id: c.wa_contact_id || c.conversation_id,
      name: c.contact_name || c.phone || 'Customer',
      phone: c.phone,
      whatsapp_phone: c.phone,
    }));
}

export const ReengageTopicsWidget: React.FC<{ id: string }> = ({ id }) => {
  // Topics need the LLM round-trip - fetched separately from the funnel so the
  // funnel stays instant; this widget shows its own skeleton while labels resolve.
  const { data, loading, error, refresh } = useConversationAnalytics(WINDOW_DAYS, true);
  const [active, setActive] = useState<TopicSegment | null>(null);
  const [sent, setSent] = useState<{ topic: string; total: number } | null>(null);
  /** Final broadcast outcome. The optimistic banner above is a CLAIM until this lands. */
  const [outcome, setOutcome] = useState<{ sent: number; failed: number; error?: string } | null>(null);

  const activeMembers = useMemo(() => (active ? toMembers(active) : []), [active]);

  const header = (
    <button
      onClick={refresh}
      title="Refresh"
      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground dark:text-[#E0E0E0]"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );

  const topics = data?.unconverted_topics ?? [];

  return (
    <WidgetWrapper
      id={id}
      title="Re-engage by Topic"
      icon={<Megaphone className="h-4 w-4" />}
      headerActions={header}
    >
      {sent && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Broadcasting to {sent.total} {sent.topic} contact{sent.total === 1 ? '' : 's'}…</span>
        </div>
      )}

      {/* What ACTUALLY happened. The banner above is optimistic — it fires
          before the request — so this is the only thing that can correct it. */}
      {outcome && (
        <div
          className={`mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
            outcome.failed > 0
              ? 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {outcome.error
              ? `Broadcast failed — ${outcome.error}. No messages were sent.`
              : outcome.failed > 0
                ? `Broadcast finished: ${outcome.sent} sent, ${outcome.failed} failed.`
                : `Broadcast finished: ${outcome.sent} sent.`}
          </span>
        </div>
      )}

      {error && !data ? (
        <div className="h-full flex flex-col items-center justify-center text-center gap-1 py-6">
          <p className="text-sm text-muted-foreground">Couldn’t load segments</p>
          <p className="text-[11px] text-muted-foreground/70 max-w-[240px]">{error}</p>
          <button onClick={refresh} className="mt-2 text-xs text-blue-600 hover:underline">Try again</button>
        </div>
      ) : loading && !data ? (
        <TopicsSkeleton />
      ) : topics.length === 0 && data?.topics_degraded ? (
        // The server told us it could not RUN the topic labelling. Without this
        // the same empty list rendered the first-run message below, which
        // asserts the tenant has no unconverted demand — a claim about their
        // customers that we had not established.
        <div className="h-full flex flex-col items-center justify-center text-center gap-1 py-6">
          <p className="text-sm text-muted-foreground">Couldn’t group your enquiries by topic</p>
          <p className="text-[11px] text-muted-foreground/70 max-w-[250px]">
            This isn’t “no segments” — the labelling step was unavailable, so we don’t
            know what your unconverted enquiries were about.
          </p>
          <button onClick={refresh} className="mt-2 text-xs text-blue-600 hover:underline">Try again</button>
        </div>
      ) : topics.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center gap-1 py-6">
          <Sparkles className="h-5 w-5 text-muted-foreground/60" />
          <p className="text-sm font-medium dark:text-[#E0E0E0]">No re-engagement segments</p>
          <p className="text-[11px] text-muted-foreground max-w-[250px]">
            When customers ask about something specific but don’t book, they’ll be grouped here so you can win them back.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* The hook KEEPS the previous data when a refresh fails, so without
              this a failed refresh was completely silent: the spinner stopped,
              the segments did not move, and the user read them as current. The
              full-panel error above only covers a COLD failure (`!data`). */}
          {error && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
              Couldn&apos;t refresh — these segments are from the last successful load,
              not now.
            </p>
          )}
          <p className="text-[11px] text-muted-foreground">
            Asked but didn’t book: message them a tailored offer.
          </p>
          {topics.map((t) => {
            const reachable = toMembers(t).length;
            return (
              <div
                key={t.topic}
                className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 dark:border-white/5 bg-slate-50/50 dark:bg-white/[0.03] px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate text-slate-800 dark:text-[#E0E0E0]">{t.topic}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {t.count} didn’t book
                    {reachable < t.count && <span> · {reachable} on WhatsApp</span>}
                  </p>
                </div>
                <button
                  onClick={() => setActive(t)}
                  disabled={reachable === 0}
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#0B1957] hover:bg-[#081342] dark:bg-blue-600 dark:hover:bg-blue-700 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  <Megaphone className="h-3.5 w-3.5" />
                  Broadcast
                </button>
              </div>
            );
          })}
        </div>
      )}

      {active && (
        <MessageTemplateSender
          memberName=""
          noInteractionCount={0}
          recommendations={[]}
          allMembers={activeMembers}
          onClose={() => setActive(null)}
          onSuccess={(result: {
            broadcasting?: boolean;
            broadcastComplete?: boolean;
            total?: number;
            sent?: number;
            failed?: number;
            error?: string;
          }) => {
            if (result?.broadcasting) {
              setSent({ topic: active.topic, total: result.total ?? activeMembers.length });
              setTimeout(() => setSent(null), 8000);
              return;
            }
            // The send finished. Until this existed the optimistic "Broadcasting
            // to N…" above was the LAST thing the user saw, so a broadcast that
            // failed outright — or half-failed — looked exactly like one that
            // went out.
            if (result?.broadcastComplete) {
              setSent(null);
              setOutcome({
                sent: result.sent ?? 0,
                failed: result.failed ?? 0,
                error: result.error,
              });
              setTimeout(() => setOutcome(null), 12000);
            }
          }}
        />
      )}
    </WidgetWrapper>
  );
};

const TopicsSkeleton: React.FC = () => (
  <div className="flex flex-col gap-2 animate-pulse">
    {[0, 1, 2, 3].map((i) => (
      <div key={i} className="h-12 w-full rounded-lg bg-gray-200 dark:bg-white/10" />
    ))}
  </div>
);
