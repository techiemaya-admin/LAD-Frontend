'use client';

/**
 * InstagramActivityWidget - Instagram DM activity.
 *
 * DM thread counts (total / unread) and active connected accounts, derived from
 * GET /api/instagram-conversations/conversations and /accounts (no dedicated
 * analytics endpoint exists). Gated to the instagram channel by DashboardGrid.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Instagram } from 'lucide-react';
import { WidgetWrapper } from '../WidgetWrapper';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

interface IgData {
  /** `null` = that source did not load. NOT the same as "you have none". */
  threads: number | null;
  unread: number | null;
  accounts: number | null;
  /** Human-readable names of the sources that failed, for the degraded note. */
  degraded: string[];
}

const num = (n: number | null) => (n == null ? '—' : n.toLocaleString());
const unreadOf = (c: any): number =>
  Number(c?.unread_count ?? c?.unreadCount ?? c?.unread ?? 0) || 0;

export const InstagramActivityWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, setData] = useState<IgData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cRes, aRes] = await Promise.all([
        fetchWithTenant('/api/instagram-conversations/conversations'),
        fetchWithTenant('/api/instagram-conversations/accounts'),
      ]);
      const cJson = await cRes.json().catch(() => ({}));
      const aJson = await aRes.json().catch(() => ({}));

      // `fetch` does not throw on 4xx/5xx, and an error body is not an array,
      // so every `Array.isArray` branch below used to fall through to []. That
      // published "DM threads 0 · Unread 0 · Accounts 0" as fact for a tenant
      // mid-outage — and because `data` was then set, the error state below
      // could never render. Check the status explicitly.
      if (!cRes.ok && !aRes.ok) {
        throw new Error(
          cJson?.error || aJson?.error || `Request failed (${cRes.status})`,
        );
      }

      // The two sources fail INDEPENDENTLY: threads/unread come from one
      // endpoint, accounts from the other. Keep whichever half loaded rather
      // than reporting "0 accounts" because the conversations call timed out.
      const rows: any[] | null = cRes.ok
        ? (Array.isArray(cJson?.data) ? cJson.data : (Array.isArray(cJson?.conversations) ? cJson.conversations : (Array.isArray(cJson) ? cJson : [])))
        : null;
      const accts: any[] | null = aRes.ok
        ? (Array.isArray(aJson?.accounts) ? aJson.accounts : (Array.isArray(aJson) ? aJson : []))
        : null;
      setData({
        threads: rows ? rows.length : null,
        unread: rows ? rows.filter((r) => unreadOf(r) > 0).length : null,
        accounts: accts
          ? accts.filter((a) => (a?.status ?? 'active') !== 'inactive' && !a?.is_deleted).length
          : null,
        degraded: [
          ...(cRes.ok ? [] : ['DM conversations']),
          ...(aRes.ok ? [] : ['connected accounts']),
        ],
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to load Instagram activity');
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
        { label: 'DM threads', value: data.threads },
        { label: 'Unread', value: data.unread },
        { label: 'Accounts', value: data.accounts },
      ]
    : [];

  return (
    <WidgetWrapper id={id} title="Instagram activity" icon={<Instagram className="h-4 w-4" />} headerActions={header}>
      {error && !data ? (
        <div className="h-full flex flex-col items-center justify-center text-center gap-1 py-8">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load Instagram activity</p>
          <p className="text-[11px] text-muted-foreground/70 max-w-[240px]">{error}</p>
          <button onClick={load} className="mt-2 text-xs text-blue-600 hover:underline">Try again</button>
        </div>
      ) : loading && !data ? (
        <div className="grid grid-cols-3 gap-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 rounded-lg bg-muted/50 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : data && data.threads === 0 && data.accounts === 0 ? (
        // Both counts must be KNOWN zero. When a source failed its count is
        // null, so this first-run message no longer greets a tenant whose
        // Instagram is merely unreachable with "once your Instagram account
        // starts receiving messages".
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm font-medium dark:text-[#E0E0E0]">No Instagram activity yet</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[240px]">DM threads will show up here once your Instagram account starts receiving messages.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-3 gap-2">
            {tiles.map((t) => (
              <div key={t.label} className="bg-muted/40 dark:bg-white/5 rounded-lg px-3 py-2.5">
                <p className="text-[11px] text-muted-foreground">{t.label}</p>
                <p className="text-xl font-medium dark:text-[#E0E0E0]">{num(t.value)}</p>
              </div>
            ))}
          </div>
          {data && data.degraded.length > 0 && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400 leading-snug">
              Couldn&apos;t read {data.degraded.join(' or ')} — the figures shown as
              &quot;—&quot; aren&apos;t zero, they&apos;re unknown.
            </p>
          )}
        </div>
      )}
    </WidgetWrapper>
  );
};
