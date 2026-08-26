'use client';

/**
 * EmailActivityWidget - email channel activity.
 *
 * Connected senders + broadcast send/fail totals across recent runs, plus the
 * latest few broadcasts. Data: GET /api/campaigns/email/connected-senders and
 * GET /api/email-comms/broadcast/runs. Gated to the email channel by
 * DashboardGrid. (Open/reply rates aren't surfaced by the API yet.)
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Mail } from 'lucide-react';
import { WidgetWrapper } from '../WidgetWrapper';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

interface Run {
  subject?: string;
  status?: string;
  recipient_count?: number;
  sent_count?: number;
  failed_count?: number;
}
interface EmailData {
  /** `null` = that source did not load. NOT the same as "you have none". */
  senders: number | null;
  runs: Run[] | null;
  sent: number | null;
  failed: number | null;
  /** Human-readable names of the sources that failed, for the degraded note. */
  degraded: string[];
}

const num = (n: number | null) => (n == null ? '—' : n.toLocaleString());

export const EmailActivityWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, setData] = useState<EmailData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, rRes] = await Promise.all([
        fetchWithTenant('/api/campaigns/email/connected-senders'),
        fetchWithTenant('/api/email-comms/broadcast/runs?limit=100'),
      ]);
      const sJson = await sRes.json().catch(() => ({}));
      const rJson = await rRes.json().catch(() => ({}));

      // `fetch` does not throw on 4xx/5xx, and an error body is not an array,
      // so every `Array.isArray` branch below used to fall through to 0 / [].
      // That published "Senders 0 · Broadcasts 0 · Sent 0 · Failed 0" as fact
      // for a tenant mid-outage — and because `data` was then set, the error
      // state right below could never render. Check the status explicitly.
      if (!sRes.ok && !rRes.ok) {
        throw new Error(
          sJson?.error || rJson?.error || `Request failed (${sRes.status})`,
        );
      }

      // The two sources fail INDEPENDENTLY: senders comes from one endpoint,
      // every send figure from the other. Keep whichever half loaded and say
      // the other is unknown, rather than reporting zero sends because the
      // broadcast history was unreachable.
      const senders = sRes.ok
        ? (Array.isArray(sJson?.data) ? sJson.data.length : (Array.isArray(sJson) ? sJson.length : 0))
        : null;
      const runs: Run[] | null = rRes.ok
        ? (Array.isArray(rJson?.runs) ? rJson.runs : (Array.isArray(rJson) ? rJson : []))
        : null;
      const sent = runs ? runs.reduce((a, r) => a + (r.sent_count || 0), 0) : null;
      const failed = runs ? runs.reduce((a, r) => a + (r.failed_count || 0), 0) : null;
      const degraded = [
        ...(sRes.ok ? [] : ['connected senders']),
        ...(rRes.ok ? [] : ['broadcast history']),
      ];
      setData({ senders, runs, sent, failed, degraded });
    } catch (e: any) {
      setError(e?.message || 'Failed to load email activity');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const header = (
    <button onClick={load} title="Refresh" className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground dark:text-[#E0E0E0]">
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );

  const tiles = data
    ? [
        { label: 'Senders', value: data.senders },
        { label: 'Broadcasts', value: data.runs ? data.runs.length : null },
        { label: 'Sent', value: data.sent },
        { label: 'Failed', value: data.failed },
      ]
    : [];

  return (
    <WidgetWrapper id={id} title="Email activity" icon={<Mail className="h-4 w-4" />} headerActions={header}>
      {error && !data ? (
        <div className="h-full flex flex-col items-center justify-center text-center gap-1 py-8">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load email activity</p>
          <p className="text-[11px] text-muted-foreground/70 max-w-[240px]">{error}</p>
          <button onClick={load} className="mt-2 text-xs text-blue-600 hover:underline">Try again</button>
        </div>
      ) : loading && !data ? (
        <div className="grid grid-cols-2 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-14 rounded-lg bg-muted/50 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-2">
            {tiles.map((t) => (
              <div key={t.label} className="bg-muted/40 dark:bg-white/5 rounded-lg px-3 py-2">
                <p className="text-[11px] text-muted-foreground">{t.label}</p>
                <p className="text-lg font-medium dark:text-[#E0E0E0]">{num(t.value)}</p>
              </div>
            ))}
          </div>
          {data && data.degraded.length > 0 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
              Couldn&apos;t read {data.degraded.join(' or ')} — the figures shown as
              &quot;—&quot; aren&apos;t zero, they&apos;re unknown.
            </p>
          )}
          {data && data.runs && data.runs.length > 0 && (
            <div>
              <p className="text-[11px] text-muted-foreground mb-1.5">Recent broadcasts</p>
              <div className="space-y-1.5">
                {data.runs.slice(0, 3).map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 text-xs">
                    <span className="truncate dark:text-[#E0E0E0]/90">{r.subject || '(no subject)'}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {num(r.sent_count || 0)} sent{r.failed_count ? ` · ${num(r.failed_count)} failed` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </WidgetWrapper>
  );
};
