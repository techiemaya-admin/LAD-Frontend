'use client';

/**
 * ConversationFunnelWidget - "Enquiries & Bookings".
 *
 * Shows the conversation funnel (New enquiries → Engaged → In booking → Booked)
 * with drop-off at each step and the overall conversion rate, plus a daily
 * new-conversation volume headline with a spike indicator + mini sparkline.
 * Data: LAD-Master-Agent via useConversationAnalytics (shared with the
 * Re-engage widget - one fetch).
 */
import React from 'react';
import { TrendingUp, TrendingDown, ArrowRight, RefreshCw, Users } from 'lucide-react';

import { WidgetWrapper } from '../WidgetWrapper';
import { useConversationAnalytics } from '../useConversationAnalytics';

const WINDOW_DAYS = 30;

const fmtDay = (iso?: string) => {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00Z' : ''));
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
};

const STEP_COLORS = ['bg-blue-500', 'bg-indigo-500', 'bg-violet-500', 'bg-emerald-500'];

export const ConversationFunnelWidget: React.FC<{ id: string }> = ({ id }) => {
  // Funnel + spike are fast SQL - fetch WITHOUT topics so this renders instantly
  // (and still works if topic extraction / the LLM is unavailable).
  const { data, loading, error, refresh } = useConversationAnalytics(WINDOW_DAYS, false);

  const header = (
    <button
      onClick={refresh}
      title="Refresh"
      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground dark:text-[#E0E0E0]"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );

  return (
    <WidgetWrapper
      id={id}
      title="Enquiries & Bookings"
      icon={<Users className="h-4 w-4" />}
      headerActions={header}
    >
      {error && !data ? (
        <div className="h-full flex flex-col items-center justify-center text-center gap-1 py-6">
          <p className="text-sm text-muted-foreground">Couldn’t load insights</p>
          <p className="text-[11px] text-muted-foreground/70 max-w-[240px]">{error}</p>
          <button onClick={refresh} className="mt-2 text-xs text-blue-600 hover:underline">Try again</button>
        </div>
      ) : loading && !data ? (
        <FunnelSkeleton />
      ) : !data || data.funnel.total === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-center gap-1 py-6">
          <p className="text-sm font-medium dark:text-[#E0E0E0]">No conversations yet</p>
          <p className="text-[11px] text-muted-foreground max-w-[240px]">
            Enquiries from your channels will show up here as a funnel from first message to booking.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {/* The hook KEEPS the previous data when a refresh fails, so without
              this a failed refresh was completely silent: the spinner stopped,
              the numbers did not move, and the user read them as current. The
              full-panel error above only covers a COLD failure (`!data`). */}
          {error && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
              Couldn&apos;t refresh — these figures are from the last successful load,
              not now.
            </p>
          )}
          <FunnelBody data={data} />
        </div>
      )}
    </WidgetWrapper>
  );
};

const FunnelBody: React.FC<{ data: NonNullable<ReturnType<typeof useConversationAnalytics>['data']> }> = ({ data }) => {
  const { funnel, volume_spike, daily_volume } = data;
  const total = funnel.total || 1;
  const spikeUp = volume_spike.pct_change >= 0;

  // sparkline - last 14 days
  const spark = daily_volume.slice(-14);
  const sparkMax = Math.max(1, ...spark.map((p) => p.count));

  return (
    <div className="flex flex-col gap-4">
      {/* Daily volume + spike headline */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground dark:text-slate-300">New conversations</p>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-2xl font-bold font-display dark:text-[#E0E0E0]">{volume_spike.latest}</span>
            <span className="text-[11px] text-muted-foreground">{fmtDay(volume_spike.latest_day)}</span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span
            className={[
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
              volume_spike.is_spike
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
                : spikeUp
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-500/15 dark:text-slate-300',
            ].join(' ')}
          >
            {spikeUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {volume_spike.is_spike ? 'Spike' : `${spikeUp ? '+' : ''}${volume_spike.pct_change}%`}
          </span>
          <span className="text-[10px] text-muted-foreground">vs {volume_spike.trailing_avg}/day avg</span>
        </div>
      </div>

      {/* Sparkline */}
      {spark.length > 1 && (
        <div className="flex items-end gap-[3px] h-8" aria-hidden>
          {spark.map((p, i) => (
            <div
              key={i}
              title={`${fmtDay(p.day)}: ${p.count}`}
              className="flex-1 rounded-sm bg-blue-400/70 dark:bg-blue-500/50 min-h-[2px]"
              style={{ height: `${Math.max(6, (p.count / sparkMax) * 100)}%` }}
            />
          ))}
        </div>
      )}

      {/* Funnel */}
      <div className="flex flex-col gap-2 pt-1 border-t border-gray-100 dark:border-white/5">
        {funnel.steps.map((step, i) => {
          const widthPct = Math.max(6, Math.round((step.count / total) * 100));
          return (
            <div key={step.key}>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground dark:text-[#E0E0E0]/80">{step.label}</span>
                <span className="font-semibold dark:text-[#E0E0E0]">
                  {step.count}
                  {i > 0 && (
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">{step.pct_of_prev}%</span>
                  )}
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                <div className={`h-full rounded-full ${STEP_COLORS[i % STEP_COLORS.length]}`} style={{ width: `${widthPct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-white/5 text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <ArrowRight className="h-3 w-3" />
          Conversion
          <span className="font-bold text-emerald-600 dark:text-emerald-400">{funnel.conversion_rate}%</span>
        </span>
        {funnel.escalated_to_human > 0 && (
          <span className="text-muted-foreground">{funnel.escalated_to_human} to human</span>
        )}
      </div>
    </div>
  );
};

const FunnelSkeleton: React.FC = () => (
  <div className="flex flex-col gap-4 animate-pulse">
    <div className="flex justify-between">
      <div className="h-8 w-24 rounded bg-gray-200 dark:bg-white/10" />
      <div className="h-6 w-16 rounded-full bg-gray-200 dark:bg-white/10" />
    </div>
    <div className="h-8 w-full rounded bg-gray-200 dark:bg-white/10" />
    <div className="space-y-3 pt-1">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-2 w-full rounded-full bg-gray-200 dark:bg-white/10" />
      ))}
    </div>
  </div>
);
