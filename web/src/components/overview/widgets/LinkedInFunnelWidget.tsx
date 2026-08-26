'use client';

/**
 * LinkedInFunnelWidget - the outbound LinkedIn funnel.
 *
 * Sent → Accepted → Replied across all campaigns, with accept/reply rates and
 * the account's weekly connection-limit usage. Data: LAD backend
 * GET /api/campaigns/stats (CampaignStats). Gated to the LinkedIn channel by
 * DashboardGrid, so it only renders when a LinkedIn account is connected.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Linkedin } from 'lucide-react';
import { WidgetWrapper } from '../WidgetWrapper';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

interface Stats {
  total_sent?: number;
  total_connected?: number;
  total_replied?: number;
  // GET /api/campaigns/stats -> CampaignCRUDController.getCampaignStats sends
  // `connection_rate` (no avg_ prefix) - a sibling code path, CampaignModel's
  // per-campaign stats method, names the equivalent field `avg_connection_rate`,
  // and this widget was written against that name. Since this endpoint never
  // sends `avg_connection_rate`, the read below always missed and the widget
  // showed "Accept rate 0%" regardless of the real rate.
  connection_rate?: number;
  avg_reply_rate?: number;
  linkedin_network_size?: number | null;
  linkedin_rate_limits?: {
    weekly?: { max?: number; total?: number };
    usage?: { weekly_percentage?: number | string };
  };
}

const pct = (n: number | undefined) => (n == null ? 0 : Math.round(n));
const num = (n: number | undefined) => (n == null ? 0 : n).toLocaleString();

export const LinkedInFunnelWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, setData] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTenant('/api/campaigns/stats');
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || json?.message || `Request failed (${res.status})`);
      setData((json?.data ?? json) as Stats);
    } catch (e: any) {
      setError(e?.message || 'Failed to load LinkedIn stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const header = (
    <button
      onClick={load}
      title="Refresh"
      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground dark:text-[#E0E0E0]"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );

  const sent = data?.total_sent ?? 0;
  const accepted = data?.total_connected ?? 0;
  const replied = data?.total_replied ?? 0;
  const acceptRate = pct(data?.connection_rate);
  const replyRate = pct(data?.avg_reply_rate);
  const weeklyUsed = data?.linkedin_rate_limits?.weekly?.total ?? null;
  const weeklyMax = data?.linkedin_rate_limits?.weekly?.max ?? null;
  const weeklyPctRaw = data?.linkedin_rate_limits?.usage?.weekly_percentage;
  const weeklyPct = weeklyPctRaw == null ? (weeklyMax ? Math.round(((weeklyUsed ?? 0) / weeklyMax) * 100) : null) : Math.round(Number(weeklyPctRaw));

  const steps = [
    { label: 'Sent', value: sent, sub: null as string | null },
    { label: 'Accepted', value: accepted, sub: `${acceptRate}%` },
    { label: 'Replied', value: replied, sub: `${replyRate}%` },
  ];
  const maxVal = Math.max(1, sent, accepted, replied);

  return (
    <WidgetWrapper id={id} title="LinkedIn funnel" icon={<Linkedin className="h-4 w-4" />} headerActions={header}>
      {error && !data ? (
        <div className="h-full flex flex-col items-center justify-center text-center gap-1 py-8">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load LinkedIn stats</p>
          <p className="text-[11px] text-muted-foreground/70 max-w-[240px]">{error}</p>
          <button onClick={load} className="mt-2 text-xs text-blue-600 hover:underline">Try again</button>
        </div>
      ) : loading && !data ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-8 rounded-lg bg-muted/50 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2.5">
            {steps.map((s) => (
              <div key={s.label}>
                <div className="flex items-baseline justify-between mb-1">
                  <span className="text-xs text-muted-foreground dark:text-[#E0E0E0]/70">{s.label}</span>
                  <span className="text-sm font-medium dark:text-[#E0E0E0]">
                    {num(s.value)}
                    {s.sub && <span className="ml-1.5 text-[11px] text-muted-foreground">{s.sub}</span>}
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted dark:bg-white/5 overflow-hidden">
                  <span className="block h-full bg-[#2B7CFF]" style={{ width: `${Math.round((s.value / maxVal) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/40 dark:bg-white/5 rounded-lg px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Accept rate</p>
              <p className="text-lg font-medium dark:text-[#E0E0E0]">{acceptRate}%</p>
            </div>
            <div className="bg-muted/40 dark:bg-white/5 rounded-lg px-3 py-2">
              <p className="text-[11px] text-muted-foreground">Network size</p>
              <p className="text-lg font-medium dark:text-[#E0E0E0]">
                {data?.linkedin_network_size != null ? num(data.linkedin_network_size) : '-'}
              </p>
            </div>
          </div>

          {weeklyPct != null && (
            <div>
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[11px] text-muted-foreground">Weekly connection limit</span>
                <span className="text-[11px] text-muted-foreground">
                  {weeklyUsed != null && weeklyMax != null ? `${num(weeklyUsed)} / ${num(weeklyMax)}` : `${weeklyPct}%`}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted dark:bg-white/5 overflow-hidden">
                <span
                  className={`block h-full ${weeklyPct >= 90 ? 'bg-red-500' : weeklyPct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`}
                  style={{ width: `${Math.min(100, weeklyPct)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </WidgetWrapper>
  );
};
