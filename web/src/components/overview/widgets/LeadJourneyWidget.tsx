'use client';

/**
 * LeadJourneyWidget - "Lead Journey".
 *
 * Lists the tenant's leads across ALL their campaigns that reached one of three
 * milestones, split into tabs:
 *   • Accepted  - LinkedIn connection request accepted
 *   • Responded - the lead replied to the agent
 *   • SAH       - Sales-Accepted Handoff (meeting booked)
 *
 * Data: LAD backend GET /api/campaigns/lead-journey (hybrid CORE + tenant conv DB).
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Users, Linkedin } from 'lucide-react';
import { WidgetWrapper } from '../WidgetWrapper';
import { Button } from '@/components/ui/button';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

interface LeadRow {
  lead_id: string;
  name: string;
  company_name: string | null;
  industry: string | null;
  linkedin_url: string | null;
  campaign_name: string | null;
}
interface LeadJourneyData {
  counts: { accepted: number; responded: number; sah: number };
  accepted: LeadRow[];
  responded: LeadRow[];
  sah: LeadRow[];
}

type TabKey = 'accepted' | 'responded' | 'sah';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'accepted', label: 'Accepted' },
  { key: 'responded', label: 'Responded' },
  { key: 'sah', label: 'Sales Handoff' },
];
const ITEMS_PER_PAGE = 5;

export const LeadJourneyWidget: React.FC<{ id: string }> = ({ id }) => {
  const [data, setData] = useState<LeadJourneyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>('accepted');
  const [page, setPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchWithTenant('/api/campaigns/lead-journey');
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) {
        throw new Error(json?.error || `Request failed (${res.status})`);
      }
      setData({
        counts: json.counts || { accepted: 0, responded: 0, sah: 0 },
        accepted: json.accepted || [],
        responded: json.responded || [],
        sah: json.sah || [],
      });
    } catch (e: any) {
      setError(e?.message || 'Failed to load leads');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setPage(1); }, [tab]);

  const rows = data ? data[tab] : [];
  const totalPages = Math.max(1, Math.ceil(rows.length / ITEMS_PER_PAGE));
  const visible = rows.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const header = (
    <button
      onClick={load}
      title="Refresh"
      className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground dark:text-[#E0E0E0]"
    >
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );

  return (
    <WidgetWrapper id={id} title="Lead Journey" icon={<Users className="h-4 w-4" />} headerActions={header}>
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-3 border-b border-gray-200 dark:border-[#2B7CFF]/20">
        {TABS.map((t) => {
          const count = data?.counts?.[t.key] ?? 0;
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 text-xs font-medium -mb-px border-b-2 transition-colors ${
                active
                  ? 'border-blue-600 text-blue-700 dark:text-[#2B7CFF]'
                  : 'border-transparent text-muted-foreground hover:text-foreground dark:text-[#E0E0E0]/70'
              }`}
            >
              {t.label}
              <span className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                active ? 'bg-blue-100 text-blue-700 dark:bg-[#2B7CFF]/20 dark:text-[#E0E0E0]' : 'bg-muted text-muted-foreground'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Body */}
      {error && !data ? (
        <div className="h-full flex flex-col items-center justify-center text-center gap-1 py-8">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load leads</p>
          <p className="text-[11px] text-muted-foreground/70 max-w-[240px]">{error}</p>
          <button onClick={load} className="mt-2 text-xs text-blue-600 hover:underline">Try again</button>
        </div>
      ) : loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 rounded-xl bg-muted/50 dark:bg-white/5 animate-pulse" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm font-medium dark:text-[#E0E0E0]">
            {tab === 'accepted' ? 'No accepted connections yet'
              : tab === 'responded' ? 'No replies yet'
              : 'No handoffs yet'}
          </p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">
            {tab === 'accepted' ? 'Leads who accept your connection requests will appear here.'
              : tab === 'responded' ? 'Leads who reply to your agent will appear here.'
              : 'Leads who book a meeting (Sales-Accepted Handoff) will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((r) => (
            <div
              key={`${r.lead_id}-${r.campaign_name}`}
              className="flex items-center justify-between rounded-xl border border-border bg-background/50 px-3 py-2.5 transition-all hover:bg-secondary/30"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <p className="font-medium text-sm truncate dark:text-[#E0E0E0]">{r.name || 'Unknown'}</p>
                  {r.linkedin_url && (
                    <a
                      href={r.linkedin_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      title="Open LinkedIn profile"
                      className="text-[#2B7CFF] hover:opacity-80 shrink-0"
                    >
                      <Linkedin className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {[r.company_name, r.industry].filter(Boolean).join(' · ') || '-'}
                </p>
              </div>
              <div className="text-right whitespace-nowrap ml-3 shrink-0 max-w-[45%]">
                <p className="text-xs font-medium truncate dark:text-[#E0E0E0]/90" title={r.campaign_name || ''}>
                  {r.campaign_name || '-'}
                </p>
              </div>
            </div>
          ))}

          {rows.length > ITEMS_PER_PAGE && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {(page - 1) * ITEMS_PER_PAGE + 1}-{Math.min(page * ITEMS_PER_PAGE, rows.length)} of {rows.length}
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
                  Prev
                </Button>
                <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </WidgetWrapper>
  );
};
