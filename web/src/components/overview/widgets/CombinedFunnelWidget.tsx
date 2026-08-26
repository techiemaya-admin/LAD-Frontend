'use client';

/**
 * CombinedFunnelWidget - one cross-channel lead funnel, with a time filter and
 * drill-down.
 *
 * Stages: New Leads (connection requests sent) → Accepted → Responded →
 * Sales Handoff (SAH), with overall + per-stage conversion and drop-off. The
 * last stage is NOT just a booked meeting: the backend counts a quotation
 * request, contact details exchanged, a meeting booked, or a meeting merely
 * planned. A
 * Week / Month / Quarter / Year selector (default Week) date-windows every
 * stage. Clicking a stage opens a modal listing that stage's leads (name,
 * company, campaign, LinkedIn) for the selected window.
 *
 * Data: GET /api/campaigns/lead-journey?from=&to= - returns counts + the lead
 * lists per stage. Channel-agnostic → always shown.
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RefreshCw, Filter, Linkedin, X, Download } from 'lucide-react';
import { WidgetWrapper } from '../WidgetWrapper';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { csvCell } from '@/lib/csv';

interface LeadRow {
  lead_id: string;
  name: string;
  company_name: string | null;
  industry: string | null;
  linkedin_url: string | null;
  campaign_name: string | null;
  next_followup_at: string | null;
}
type StageKey = 'sent' | 'accepted' | 'responded' | 'sah';
interface FunnelData {
  counts: Record<StageKey, number>;
  lists: Record<StageKey, LeadRow[]>;
  /**
   * Sources the backend could not read for this window (LAD-Backend #661).
   * `conv_signals` means responded/sah are a FLOOR, not a count — the tenant
   * conversation DB was unreachable and those signals degraded to empty. Without
   * reading this the widget renders the shortfall as a real number, and a
   * zeroed window as "No activity in this period".
   */
  degraded?: { new_leads?: boolean; conv_signals?: boolean };
}

type PeriodKey = 'week' | 'month' | 'quarter' | 'year';
const PERIODS: { key: PeriodKey; label: string; days: number }[] = [
  { key: 'week', label: 'Week', days: 7 },
  { key: 'month', label: 'Month', days: 30 },
  { key: 'quarter', label: 'Quarter', days: 90 },
  { key: 'year', label: 'Year', days: 365 },
];
const STAGES: { key: StageKey; label: string; color: string }[] = [
  { key: 'sent', label: 'New Leads', color: '#0F6E56' },
  { key: 'accepted', label: 'Accepted', color: '#1D9E75' },
  { key: 'responded', label: 'Responded', color: '#5DCAA5' },
  { key: 'sah', label: 'Sales Handoff', color: '#639922' },
];
const DAY_MS = 24 * 60 * 60 * 1000;
// The lead-journey endpoint caps a page at 2000; request that rather than
// letting it fall back to its 500 default — see the fetch below.
const LIST_LIMIT = 2000;
const num = (n: number) => n.toLocaleString();
const rate = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);

export const CombinedFunnelWidget: React.FC<{ id: string }> = ({ id }) => {
  const [period, setPeriod] = useState<PeriodKey>('week');
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openStage, setOpenStage] = useState<StageKey | null>(null);

  // Every load gets a sequence number; only the newest one is allowed to
  // write state. Switching period fires a new request without cancelling the
  // old one, and these requests are slow enough (measured 3.5–5.8s) and
  // variable enough that an EARLIER request can land after a later one — at
  // which point the stale response would overwrite the newer data and the
  // funnel would show, say, Year's numbers with "Week" still selected.
  const reqSeq = useRef(0);

  const load = useCallback(async () => {
    const seq = ++reqSeq.current;
    const isStale = () => seq !== reqSeq.current;
    setLoading(true);
    setError(null);
    try {
      const days = PERIODS.find((p) => p.key === period)?.days ?? 7;
      const to = new Date();
      const from = new Date(to.getTime() - days * DAY_MS);
      // Ask for the endpoint's maximum page (it caps at 2000). Without an
      // explicit limit the backend defaults to 500, but it computes `counts`
      // from the FULL result set before slicing the lists — so a stage with
      // 507 leads reported 507 in the bar and the modal subtitle while the
      // drill-down table (and its "Download CSV") silently carried only 500.
      const qs = `?from=${encodeURIComponent(from.toISOString())}&to=${encodeURIComponent(to.toISOString())}&limit=${LIST_LIMIT}`;
      const res = await fetchWithTenant(`/api/campaigns/lead-journey${qs}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json?.success === false) throw new Error(json?.error || `Request failed (${res.status})`);
      if (isStale()) return; // a newer period was selected while this was in flight
      const c = json?.counts || {};
      setData({
        counts: {
          sent: Number(c.sent) || 0,
          accepted: Number(c.accepted) || 0,
          responded: Number(c.responded) || 0,
          sah: Number(c.sah) || 0,
        },
        lists: {
          sent: Array.isArray(json.sent) ? json.sent : [],
          accepted: Array.isArray(json.accepted) ? json.accepted : [],
          responded: Array.isArray(json.responded) ? json.responded : [],
          sah: Array.isArray(json.sah) ? json.sah : [],
        },
        // Absent on every healthy response, so this stays undefined normally.
        degraded: json?.degraded,
      });
    } catch (e: any) {
      if (isStale()) return; // don't surface a superseded request's error
      setError(e?.message || 'Failed to load funnel');
    } finally {
      // Only the newest request may clear the spinner — otherwise a stale
      // one finishing would stop it while the current request is still going.
      if (!isStale()) setLoading(false);
    }
  }, [period]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { setOpenStage(null); }, [period]);

  const header = (
    <button onClick={load} title="Refresh" className="p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 text-muted-foreground dark:text-[#E0E0E0]">
      <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
    </button>
  );

  // Any source the backend could not read makes the whole funnel a floor —
  // the stages are nested, so an undercounted "responded" drags every stage
  // below it down too.
  const isDegraded = !!(data?.degraded?.conv_signals || data?.degraded?.new_leads);

  const first = data?.counts.sent ?? 0;
  const last = data?.counts.sah ?? 0;
  const overall = rate(last, first);
  const maxCount = Math.max(1, ...STAGES.map((s) => data?.counts[s.key] ?? 0));
  const periodLabel = PERIODS.find((p) => p.key === period)?.label ?? '';

  return (
    <WidgetWrapper id={id} title="Sales funnel" icon={<Filter className="h-4 w-4" />} headerActions={header}>
      <div className="flex items-center gap-1 mb-4">
        {PERIODS.map((p) => {
          const active = period === p.key;
          return (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                active
                  ? 'border-transparent bg-[#0F6E56] text-white'
                  : 'border-slate-200 text-muted-foreground hover:bg-slate-100 dark:border-blue-950/40 dark:text-[#E0E0E0]/70 dark:hover:bg-white/5'
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      {error && !data ? (
        <div className="h-full flex flex-col items-center justify-center text-center gap-1 py-8">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load funnel</p>
          <p className="text-[11px] text-muted-foreground/70 max-w-[240px]">{error}</p>
          <button onClick={load} className="mt-2 text-xs text-blue-600 hover:underline">Try again</button>
        </div>
      ) : loading && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 rounded-lg bg-muted/50 dark:bg-white/5 animate-pulse" style={{ width: `${100 - i * 18}%`, margin: '0 auto' }} />
          ))}
        </div>
      ) : data && isDegraded ? (
        // Reaching "No activity in this period" while the backend told us it
        // could not read the signals would state the opposite of what we know.
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm font-medium dark:text-[#E0E0E0]">Couldn&apos;t read this period&apos;s activity</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
            Some sources didn&apos;t respond, so these numbers would be too low to trust.
            This is a loading problem, not a quiet pipeline — try again shortly.
          </p>
        </div>
      ) : data && first === 0 && last === 0 && data.counts.accepted === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <p className="text-sm font-medium dark:text-[#E0E0E0]">No activity in this period</p>
          <p className="text-xs text-muted-foreground mt-1 max-w-[260px]">Try a wider time range, or wait for your campaigns to send connection requests.</p>
        </div>
      ) : data ? (
        <div className="flex flex-col gap-5">
          <div className="flex items-center justify-center gap-4 sm:gap-6">
            <div className="text-center rounded-lg border border-slate-200 bg-white dark:border-blue-950/40 dark:bg-[#071131] px-3 py-2 min-w-[84px]">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">New Leads</p>
              <p className="text-lg font-medium text-slate-800 dark:text-[#E0E0E0]">{num(first)}</p>
            </div>
            <div className="text-center">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Overall conversion</p>
              <p className="text-3xl font-bold font-display text-slate-800 dark:text-[#E0E0E0]">{overall}%</p>
            </div>
            <div className="text-center rounded-lg border border-emerald-200 bg-white dark:border-emerald-500/30 dark:bg-[#071131] px-3 py-2 min-w-[84px]">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Won (SAH)</p>
              <p className="text-lg font-medium text-emerald-700 dark:text-emerald-400">{num(last)}</p>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            {STAGES.map((s, i) => {
              const count = data.counts[s.key];
              const w = Math.max(14, Math.round((count / maxCount) * 100));
              const prev = i > 0 ? data.counts[STAGES[i - 1].key] : null;
              const conv = prev != null && prev > 0 ? rate(count, prev) : null;
              const dropped = prev != null ? Math.max(0, prev - count) : 0;
              return (
                <div key={s.key}>
                  {i > 0 && (
                    <div className="flex items-center justify-center gap-2 py-0.5">
                      <span className="text-[11px] font-medium text-slate-700 bg-slate-100 rounded-full px-2 py-0.5 dark:text-slate-200 dark:bg-white/5">{conv != null ? `${conv}%` : '-'}</span>
                      {dropped > 0 && <span className="text-[10px] text-muted-foreground/70">{num(dropped)} dropped</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-3">
                    <div className="w-28 shrink-0 text-xs font-medium text-slate-700 dark:text-[#E0E0E0]">{s.label}</div>
                    <div className="flex-1 flex justify-center">
                      <button
                        type="button"
                        onClick={() => setOpenStage(s.key)}
                        title={`View ${s.label} leads`}
                        className="flex items-center justify-center text-white text-sm font-medium rounded-md h-9 transition-all hover:opacity-90 cursor-pointer"
                        style={{ width: `${w}%`, background: s.color }}
                      >
                        {num(count)}
                      </button>
                    </div>
                    <div className="w-10 shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground text-center">Click any stage to see its leads.</p>
        </div>
      ) : null}

      {openStage && data && (
        <StageLeadsModal
          title={STAGES.find((s) => s.key === openStage)!.label}
          // Say what this list ACTUALLY contains. `counts` is the true total,
          // but the list is capped at LIST_LIMIT — quoting the total alone
          // would misdescribe both the table and the CSV it exports.
          subtitle={
            data.lists[openStage].length < data.counts[openStage]
              ? `${periodLabel} · showing ${num(data.lists[openStage].length)} of ${num(data.counts[openStage])} leads`
              : `${periodLabel} · ${num(data.counts[openStage])} lead${data.counts[openStage] === 1 ? '' : 's'}`
          }
          fileLabel={`${STAGES.find((s) => s.key === openStage)!.label.replace(/\s+/g, '-').toLowerCase()}-${period}`}
          leads={data.lists[openStage]}
          onClose={() => setOpenStage(null)}
        />
      )}
    </WidgetWrapper>
  );
};

const fmtFollowup = (iso: string | null): string => {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

function downloadLeadsCsv(leads: LeadRow[], fileLabel: string) {
  // Shared cell encoder: RFC-4180 quoting AND the formula-injection guard. The
  // old local `esc` only quoted — a lead named `=WEBSERVICE(...)` (name/company
  // come from untrusted enrichment) executed when the file was opened in Excel.
  const esc = csvCell;
  const headers = ['Name', 'Company', 'Industry', 'Campaign', 'LinkedIn URL', 'Next follow-up'];
  const lines = [headers.join(',')];
  for (const l of leads) {
    lines.push([
      esc(l.name),
      esc(l.company_name),
      esc(l.industry),
      esc(l.campaign_name),
      esc(l.linkedin_url),
      esc(l.next_followup_at ? new Date(l.next_followup_at).toISOString() : ''),
    ].join(','));
  }
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `leads-${fileLabel}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// Rendered via createPortal(document.body): WidgetWrapper carries a dnd-kit
// `transform`, and a transformed ancestor becomes the containing block for
// position:fixed - so without the portal this modal positions/dims against the
// widget CARD instead of the viewport (headers pushed off-screen on long lists).
const StageLeadsModal: React.FC<{ title: string; subtitle: string; fileLabel: string; leads: LeadRow[]; onClose: () => void }> = ({ title, subtitle, fileLabel, leads, onClose }) => {
  if (typeof document === 'undefined') return null;
  return createPortal(
  <div
    className="fixed inset-0 z-[120] bg-black/40"
    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
    onClick={onClose}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      className="w-full max-w-3xl rounded-xl bg-white border border-gray-200 shadow-2xl dark:bg-[#000724] dark:border-blue-950/40"
      style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
    >
      <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-gray-200 dark:border-blue-950/40 bg-white dark:bg-[#081331]" style={{ flexShrink: 0 }}>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => downloadLeadsCsv(leads, fileLabel)}
            disabled={leads.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border hover:bg-muted/50 dark:border-blue-950/60 dark:hover:bg-blue-950/30 text-slate-700 dark:text-slate-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="h-3.5 w-3.5" /> Download CSV
          </button>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:text-slate-400 dark:hover:text-white" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="bg-white dark:bg-[#000724]" style={{ flex: '1 1 auto', minHeight: 0, overflowY: 'auto' }}>
        {leads.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">No leads in this stage for the selected period.</p>
        ) : (
          <table className="w-full text-sm" style={{ tableLayout: 'fixed' }}>
            {/* Sticky must be on <th>, not <thead> - browsers ignore sticky on
                thead, so with long (scrolling) lists the header would scroll away
                and overlap rows. */}
            <thead>
              <tr className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="sticky top-0 z-10 bg-white dark:bg-[#071131] border-b border-gray-200 dark:border-blue-950/40 px-4 py-2 font-medium text-slate-700 dark:text-slate-300" style={{ width: '30%' }}>Name</th>
                <th className="sticky top-0 z-10 bg-white dark:bg-[#071131] border-b border-gray-200 dark:border-blue-950/40 px-4 py-2 font-medium text-slate-700 dark:text-slate-300" style={{ width: '26%' }}>Company</th>
                <th className="sticky top-0 z-10 bg-white dark:bg-[#071131] border-b border-gray-200 dark:border-blue-950/40 px-4 py-2 font-medium text-slate-700 dark:text-slate-300" style={{ width: '26%' }}>Campaign</th>
                <th className="sticky top-0 z-10 bg-white dark:bg-[#071131] border-b border-gray-200 dark:border-blue-950/40 px-4 py-2 font-medium text-slate-700 dark:text-slate-300" style={{ width: '18%' }}>Next follow-up</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={`${l.lead_id}-${l.campaign_name}`} className="border-b border-gray-100 dark:border-white/5 hover:bg-muted/40 dark:hover:bg-white/5 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-medium truncate text-slate-900 dark:text-[#E0E0E0]" title={l.name}>{l.name || 'Unknown'}</span>
                      {l.linkedin_url && (
                        <a href={l.linkedin_url} target="_blank" rel="noopener noreferrer" title="Open LinkedIn profile" className="text-[#2B7CFF] hover:opacity-80 shrink-0">
                          <Linkedin className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-muted-foreground truncate" title={l.company_name || ''}>{l.company_name || '-'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground truncate" title={l.campaign_name || ''}>{l.campaign_name || '-'}</td>
                  <td className="px-4 py-2.5 text-muted-foreground whitespace-nowrap" title={l.next_followup_at || ''}>{fmtFollowup(l.next_followup_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  </div>,
  document.body
  );
};
