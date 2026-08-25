'use client';
// Prospect detail panel that opens below the kanban / table when a contact is
// selected. Compositional file - most of the visual logic lives in the smaller
// sub-components below.

import * as React from 'react';
import { useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, MoreHorizontal, SendHorizontal, MapPin, TrendingUp, ChevronDown,
  ChevronUp, Users, MousePointerClick, Route, MoonStar, Ban, Trash2, CalendarClock,
} from 'lucide-react';
import {
  LadCard, LadCardHeader, CH, T, STAGE_META, rel,
} from './shared';
import {
  type ChannelKey, type ProspectFixture, type ProspectEvent,
  type WarmPath,
} from './data';
import WarmPathPanel from './warm-path-panel';
import LeadReportSection from './lead-report-section';
import AcceleratorSection from './accelerator-section';
import { useLeadReport, LeadReportError } from '@/hooks/useLeadReport';
import type { ProspectFollowup } from '@lad/frontend-features/prospects';

interface ProspectDetailProps {
  prospect: ProspectFixture;
  warmPath: WarmPath;
  /** When true, render a "Sample data" caption - the warm-path graph isn't
   *  wired to a live relationship-graph source yet (R18). */
  warmPathSample?: boolean;
  events?: ProspectEvent[];
  /** The events fetch failed — Activity/Recent activity below render off
   *  `events` regardless, so without this flag a failed fetch (events=[])
   *  is visually identical to a genuinely quiet contact. */
  eventsError?: boolean;
  /**
   * We have no events to show and are not still loading them. Distinct from
   * "this contact has no activity": rendering 0 for a failed load told the user
   * the lead was quiet when we simply did not know.
   */
  eventsUnavailable?: boolean;
  /** True when `events` was cut off by the fetch's own page-size limit —
   *  the backend has no total-event-count endpoint, so MiniFeed's "N total
   *  events" label would otherwise silently overclaim completeness for any
   *  contact with more history than fits in one fetch. */
  eventsTruncated?: boolean;
  onClose: () => void;
  /** Soft-delete this prospect ("not a fit"). When omitted, the button is hidden. */
  onRemove?: () => void;
  isRemoving?: boolean;
  /** CRM "Take action" - do-not-contact / quiet (pause outreach). */
  onAction?: (p: { doNotContact?: boolean; quietDays?: number; clearQuiet?: boolean }) => void;
  isActing?: boolean;
  doNotContact?: boolean;
  quietUntil?: string | null;
  /** Upcoming scheduled automatic follow-ups for this prospect. */
  followups?: ProspectFollowup[];
  followupsLoading?: boolean;
  /** The follow-ups fetch failed — without this flag it renders identically
   *  to "no follow-ups queued" (loading=false, followups=[]). */
  followupsError?: boolean;
  /**
   * Channels the Master Agent could not read (MA #16). The list it returned is
   * a FLOOR for these — without saying so, a dropped LinkedIn lookup reads as
   * "no LinkedIn follow-ups are queued".
   */
  followupsDegradedChannels?: string[];
  /**
   * The prospect's `core_lead_id` - the id `campaign_leads` and
   * `campaign_analytics` are keyed by, and the only one the report API resolves.
   * Omitted or null ⇒ the report + accelerator sections are not rendered.
   */
  coreLeadId?: string | null;
}

function degreeLabel(nd?: string | null): string {
  const m: Record<string, string> = {
    FIRST_DEGREE: '1st-degree', SECOND_DEGREE: '2nd-degree', THIRD_DEGREE: '3rd-degree',
  };
  return (nd && (m[nd] || nd.replace(/_/g, ' ').toLowerCase())) || '';
}

// `crm.*` events (crm.quiet_set, crm.do_not_contact_set, crm.deleted) are things the
// operator did to the record, not things the prospect did. They arrive on the "system"
// channel, which the heatmap maps to the "Signal" (intent) row — so an operator toggling
// DNC twice used to read as two buying-intent signals, and inflated "Engagement · 7d" by
// two. Keep them out of both aggregates; the timeline below still shows them as audit trail.
function isOperatorEvent(e: ProspectEvent): boolean {
  return String(e.event_type || '').startsWith('crm.');
}

export default function ProspectDetail({ prospect, warmPath, warmPathSample = false, events = [], eventsError = false, eventsUnavailable = false, eventsTruncated = false, onClose, onRemove, isRemoving = false, onAction, isActing = false, doNotContact = false, quietUntil = null, followups = [], followupsLoading = false, followupsError = false, followupsDegradedChannels = [], coreLeadId = null }: ProspectDetailProps) {
  const [warmOpen, setWarmOpen] = useState(false);
  const sectionRef = useRef<HTMLDivElement | null>(null);

  // KPI computation
  const kpis = useMemo(() => {
    const now = new Date();
    const days = 7;
    const daily = new Array(days).fill(0);
    let total = 0;
    let lastDir: ProspectEvent['direction'] | null = null;
    for (const e of events) {
      if (isOperatorEvent(e)) continue;
      const d = new Date(e.occurred_at);
      const diff = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
      if (diff >= 0 && diff < days) {
        daily[days - 1 - diff] += 1;
        total += 1;
      }
      if (!lastDir) lastDir = e.direction;
    }
    const routes =
      (warmPath?.top_connection ? 1 : 0) +
      (warmPath?.shared_employer ? 1 : 0) +
      (warmPath?.account_pipeline ? 1 : 0) +
      (warmPath?.customer_reference ? 1 : 0) +
      (warmPath?.mutual_connections?.length || 0);
    return {
      dailyCounts: daily,
      total7d: total,
      routes,
      topConnection: warmPath?.top_connection?.name || '-',
      lastDir,
    };
  }, [warmPath, events]);

  const toggleWarm = () => {
    setWarmOpen((prev) => {
      const next = !prev;
      if (next && sectionRef.current) {
        setTimeout(() => {
          if (sectionRef.current) {
            const top = sectionRef.current.getBoundingClientRect().top + window.scrollY - 72;
            window.scrollTo({ top, behavior: 'smooth' });
          }
        }, 50);
      }
      return next;
    });
  };

  const stage = STAGE_META[prospect.lifecycle_stage] || STAGE_META.new;

  return (
    <div className="mt-6 space-y-4">
      {/* Sub-header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Row 1: Back button and Contact Name */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onClose}
            className="h-8 px-2.5 rounded-lg text-[12.5px] font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-[#1a2a43] inline-flex items-center gap-1.5 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> All deals
          </button>
          <span className="text-slate-300 dark:text-slate-700 shrink-0">/</span>
          <span className="text-[12.5px] font-medium text-[#172560] dark:text-white truncate">
            {prospect.full_name}
          </span>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          {onRemove && (
            <button
              onClick={onRemove}
              disabled={isRemoving}
              title="Remove this prospect - not a fit"
              className="h-9 px-3 flex-1 md:flex-none rounded-lg text-[12.5px] font-medium text-rose-600 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40 inline-flex items-center justify-center md:justify-start gap-1.5 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> {isRemoving ? 'Removing…' : 'Not a fit'}
            </button>
          )}
          <button
            disabled
            title="Not available yet"
            className="h-9 px-3 flex-1 md:flex-none rounded-lg text-[12.5px] font-medium text-[#172560] dark:text-white border border-slate-200 dark:border-[#262831] inline-flex items-center justify-center md:justify-start gap-1.5 opacity-50 cursor-not-allowed"
          >
            <MoreHorizontal className="w-4 h-4" /> More
          </button>
          <button
            type="button"
            disabled
            title="Not available yet"
            className="h-10 px-4 flex-1 md:flex-none rounded-xl text-xs font-bold uppercase tracking-wider text-white !text-white inline-flex items-center justify-center gap-2 shadow-md transition-all duration-200 outline-none border-none opacity-50 cursor-not-allowed
            bg-[#0b1957]
            dark:bg-[#2563eb]"
          >
            <SendHorizontal className="w-4 h-4 shrink-0 stroke-[2.5] text-white !text-white" />
            <span className="text-white !text-white">Message</span>
          </button>
        </div>
      </div>

      {/* Hero + KPI row */}
      <LadCard padded={false}>
        <div className="flex flex-col lg:flex-row">
          <div className="p-5 lg:p-6 lg:w-[34%] border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-[#1c2c4e] flex items-center gap-4">
            <div
              className="w-16 h-16 rounded-2xl grid place-items-center text-white text-[20px] font-semibold shrink-0"
              style={{ background: `linear-gradient(135deg, ${T.primary}, ${T.primaryHead})` }}
            >
              {prospect.full_name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2
                  className="text-[20px] font-bold text-[#1e293b] dark:text-white"
                  style={{ fontFamily: '"Space Grotesk", system-ui' }}
                >
                  {prospect.full_name}
                </h2>
                <span
                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{ background: `${stage.color}1a`, color: stage.color }}
                >
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: stage.color }}></span>
                  {stage.label}
                </span>
              </div>
              <p className="text-[12.5px] text-slate-700 dark:text-slate-200 mt-1">{prospect.job_title}</p>
              <p className="text-[12.5px] text-slate-500 dark:text-slate-300 font-medium">
                {prospect.company_name}
              </p>
              {/* Only render the pin when there is a location to pin. Rendering
                  it unconditionally left a lone map-pin icon floating under the
                  company for every prospect with no location — same orphaned
                  decoration as the "·" separator in tables.tsx's NameCell. The
                  network_distance block right below already guards this way. */}
              {prospect.location && String(prospect.location).trim() && (
                <p className="text-[11.5px] text-slate-500 dark:text-slate-300 mt-1 flex items-center gap-1.5">
                  <MapPin className="w-3 h-3" />
                  {prospect.location}
                </p>
              )}
              {(prospect.network_distance || (prospect.mutual_connections_count ?? 0) > 0) && (
                <p className="text-[11px] mt-1.5 flex items-center gap-2 flex-wrap">
                  {prospect.network_distance && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium"
                      style={{ background: `${T.primary}14`, color: T.primary }}
                    >
                      <Users className="w-3 h-3" /> {degreeLabel(prospect.network_distance)}
                    </span>
                  )}
                  {(prospect.mutual_connections_count ?? 0) > 0 && (
                    <span className="text-slate-600 dark:text-slate-300">
                      {prospect.mutual_connections_count} mutual connection
                      {prospect.mutual_connections_count === 1 ? '' : 's'}
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="lg:flex-1 grid grid-cols-2 lg:grid-cols-4">
            <KpiFit value={prospect.fit_score} />
            <KpiSpark counts={kpis.dailyCounts} total={eventsUnavailable ? null : kpis.total7d} />
            <KpiRoutes
              count={kpis.routes}
              top={kpis.topConnection}
              onClick={toggleWarm}
              open={warmOpen}
            />
            <KpiLast
              channel={prospect.last_channel}
              occurredAt={prospect.last_event_at}
              direction={kpis.lastDir}
            />
          </div>
        </div>
      </LadCard>

      {/* Warm path */}
      <div ref={sectionRef}>
        {warmPathSample && (
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-400">
            Sample data · warm-path is not yet wired to a live source
          </div>
        )}
        <WarmPathPanel wp={warmPath} prospect={prospect} open={warmOpen} onToggle={toggleWarm} />
      </div>

      {(eventsError || eventsUnavailable) && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30 p-3 text-[12.5px] text-rose-700 dark:text-rose-300">
          Couldn&apos;t load this contact&apos;s activity — the Activity chart and Recent activity below may be
          missing events, not showing that the contact is actually quiet.
        </div>
      )}
      <ActivityHeatmap events={events} days={30} unavailable={eventsUnavailable} />

      <AcceleratorPanels coreLeadId={coreLeadId} firstName={prospect.full_name?.split(' ')[0]} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FitRadar p={prospect} />
        <ChannelDonut p={prospect} />
      </div>

      <IntentStrip signals={prospect.intent_signals} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <MiniFeed events={events} truncated={eventsTruncated} unavailable={eventsUnavailable} />
        </div>
        <div className="space-y-4">
          <Actions onAction={onAction} isActing={isActing} doNotContact={doNotContact} quietUntil={quietUntil} />
          <NextFollowups followups={followups} loading={followupsLoading} error={followupsError} degradedChannels={followupsDegradedChannels} />
        </div>
      </div>
    </div>
  );
}

// ── Lead report + accelerator ────────────────────────────────────────────

/**
 * The two accelerator sections, sharing one fetch.
 *
 * Renders NOTHING when the lead is not enrolled in a campaign - most CRM
 * contacts are not, and an empty "no sequence" card on every one of them would
 * be noise rather than information.
 */
function AcceleratorPanels({ coreLeadId, firstName }: { coreLeadId: string | null; firstName?: string }) {
  const {
    bundle, isLoading, loadError, state, refusalMessage, advance, isAdvancing,
    approve, reject, isDeciding, settledElsewhere, actionError,
  } = useLeadReport(coreLeadId);

  if (!coreLeadId || isLoading) return null;

  // A failed fetch used to render EXACTLY like "this contact isn't in a
  // campaign": both fell into the `return null` below, so the Lead Report and
  // Accelerator cards were simply absent. Not-enrolled is the overwhelmingly
  // common case, so nothing ever prompted the user to suspect the cards were
  // MISSING rather than legitimately not applicable — a lead sitting on an
  // unapproved report looked like a lead with no report at all.
  //
  // 404 is the one status that genuinely means "there is nothing here", so it
  // keeps rendering nothing. Everything else is an outage and says so.
  if (loadError && !(loadError instanceof LeadReportError && loadError.status === 404)) {
    return (
      <LadCard>
        <LadCardHeader title="Lead Report" subtitle="Could not load" />
        <p className="text-[13px] text-rose-600 dark:text-rose-300">
          Couldn&apos;t load this lead&apos;s report and sequence — this isn&apos;t
          necessarily &quot;not in a campaign.&quot; If they are enrolled, any pending
          audit and its approval state are hidden right now.
        </p>
      </LadCard>
    );
  }

  if (!bundle?.enrolled) return null;

  return (
    <>
      <LeadReportSection
        state={state}
        report={bundle.report}
        grounding={bundle.grounding}
        leadFirstName={firstName}
        refusalMessage={refusalMessage}
        actionError={actionError}
        settledElsewhere={settledElsewhere}
        onAdvance={advance}
        isAdvancing={isAdvancing}
        onApprove={approve}
        onReject={reject}
        isDeciding={isDeciding}
      />
      {bundle.sequence && (
        <AcceleratorSection
          sequence={bundle.sequence}
          canAdvance={Boolean(bundle.has_report_step)}
          onAdvance={advance}
          isAdvancing={isAdvancing}
        />
      )}
    </>
  );
}

// ── KPI tiles ────────────────────────────────────────────────────────────
function KpiFit({ value }: { value: number | null }) {
  const scored = value != null;
  const pct = scored ? Math.round(value * 100) : 0;
  const band = !scored
    ? 'Not scored yet'
    : value >= 0.8 ? 'Strong match'
    : value >= 0.6 ? 'Good match'
    : value >= 0.4 ? 'Partial match'
    : 'Weak match';
  return (
    <div className="p-4 lg:p-5 border-r border-b lg:border-b-0 border-slate-100 dark:border-[#1c2c4e] flex items-center gap-3">
      <div className="relative w-14 h-14 shrink-0">
        <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
          <circle cx="18" cy="18" r="15.9" fill="none" stroke={T.badgeBg} strokeWidth="3.6" />
          {scored && (
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke={T.primary} strokeWidth="3.6" strokeLinecap="round"
              strokeDasharray={`${pct} 100`}
            />
          )}
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span
            className="text-[14px] font-bold tabular-nums text-[#172560] dark:text-white"
            style={{ fontFamily: '"Space Grotesk", system-ui' }}
          >
            {scored ? pct : '-'}
          </span>
        </div>
      </div>
      <div className="min-w-0">
        <p className="text-[10.5px] uppercase tracking-wider text-slate-500 dark:text-slate-300 font-semibold">
          Fit score
        </p>
        <p className="text-[13px] font-semibold text-[#172560] dark:text-white mt-0.5">{band}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-300">
          {scored ? 'Fit to active ICP' : 'Scored on discovery'}
        </p>
      </div>
    </div>
  );
}

// `total: null` = we could not load the events, which is NOT the same as zero
// activity. Render a dash rather than a number we cannot stand behind.
function KpiSpark({ counts, total }: { counts: number[]; total: number | null }) {
  const max = Math.max(1, ...counts);
  const w = 100, h = 26, n = counts.length;
  const step = w / (n - 1);
  const pts = counts.map((c, i) => `${i * step},${h - (c / max) * h}`).join(' ');
  const lastX = (n - 1) * step;
  const lastY = h - (counts[n - 1] / max) * h;
  return (
    <div className="p-4 lg:p-5 border-b lg:border-b-0 lg:border-r border-slate-100 dark:border-[#1c2c4e]">
      <p className="text-[10.5px] uppercase tracking-wider text-slate-500 dark:text-slate-300 font-semibold">
        Engagement · 7d
      </p>
      <div className="flex items-baseline gap-2 mt-1">
        <span
          className="text-2xl font-bold tabular-nums text-[#1e293b] dark:text-white"
          style={{ fontFamily: '"Space Grotesk", system-ui' }}
        >
          {total ?? '—'}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-300">
          {total == null ? 'not loaded' : 'events'}
        </span>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-7 mt-2 overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="sparkLad" x1="0" x2="0" y1="0" y2="1">
            {/* Light mode uses T.primary, dark mode switches to bright blue */}
            <stop offset="0%" className="[stop-color:var(--spark-color,#0B1957)] dark:[stop-color:#3b82f6]" stopOpacity="0.4" />
            <stop offset="100%" className="[stop-color:var(--spark-color,#0B1957)] dark:[stop-color:#3b82f6]" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Area Fill */}
        <polyline points={`0,${h} ${pts} ${w},${h}`} fill="url(#sparkLad)" stroke="none" />

        {/* Stroke Line: uses T.primary in light mode, bright blue in dark mode */}
        <polyline
          points={pts}
          fill="none"
          stroke={T.primary}
          className="stroke-[#0B1957] dark:stroke-[#3b82f6]"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Endpoint Circle */}
        <circle
          cx={lastX}
          cy={lastY}
          r="2.5"
          fill={T.primary}
          className="fill-[#0B1957] dark:fill-[#60a5fa]"
        />
      </svg>
    </div>
  );
}

function KpiRoutes({
  count, top, onClick, open,
}: { count: number; top: string; onClick: () => void; open: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      className="text-left w-full p-4 lg:p-5 border-r border-slate-100 dark:border-[#1c2c4e] hover:bg-[#f1f3fb] dark:hover:bg-[#0e1d4d] transition group"
    >
      <div className="flex items-start justify-between">
        <p className="text-[10.5px] uppercase tracking-wider text-slate-500 dark:text-slate-300 font-semibold">
          Warm routes
        </p>
        <span
          className="inline-flex items-center gap-1 text-[10.5px] font-medium opacity-70 group-hover:opacity-100 text-[#0B1957] dark:text-slate-400 transition-colors"
        >
          {open ? 'Hide' : 'Open'}
          {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </span>
        </div>
        <div className="flex items-baseline gap-2 mt-1">
          <span
            className="text-2xl font-bold tabular-nums text-[#1e293b] dark:text-white"
            style={{ fontFamily: '"Space Grotesk", system-ui' }}
          >
            {count}
          </span>
          <span className="text-[11px] font-medium text-[#0B1957] dark:text-slate-400">
            paths
          </span>
      </div>
      <div className="mt-2 flex items-center gap-1.5">
        <div
          className="w-5 h-5 rounded-full text-white grid place-items-center text-[9px] font-semibold"
          style={{ background: 'linear-gradient(135deg, #fbbf24, #ef4444)' }}
        >
          AM
        </div>
        <p className="text-[11px] text-slate-600 dark:text-slate-300 truncate">
          via <span className="font-semibold text-[#172560] dark:text-white">{top}</span>
        </p>
      </div>
    </button>
  );
}

function KpiLast({
  channel, occurredAt, direction,
}: { channel: ChannelKey; occurredAt: string; direction: ProspectEvent['direction'] | null }) {
  const c = CH[channel] || CH.system;
  const Icon = c.Icon;
  return (
    <div className="p-4 lg:p-5">
      <p className="text-[10.5px] uppercase tracking-wider text-slate-500 dark:text-slate-300 font-semibold">
        Last touch
      </p>
      <div className="flex items-baseline gap-2 mt-1">
        <span
          className="text-2xl font-bold tabular-nums text-[#1e293b] dark:text-white"
          style={{ fontFamily: '"Space Grotesk", system-ui' }}
        >
          {rel(occurredAt)}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-300">ago</span>
      </div>
      <div className="mt-2 inline-flex items-center gap-1.5">
        <span
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
          style={{ color: c.color, background: `${c.color}1a` }}
        >
          <Icon className="w-3 h-3" /> {c.label}
        </span>
        <span className="text-[11px] text-slate-500 dark:text-slate-300">
          {direction === 'inbound' ? 'reply' : 'sent'}
        </span>
      </div>
    </div>
  );
}

// ── Activity heatmap ─────────────────────────────────────────────────────
// Map raw event channels (incl. aliases) onto the heatmap's canonical rows.
// Personal WA (wapa) and Business WA (waba) both roll up under "WhatsApp" - without
// this, wapa events fall through to the "Signal" (intent) catch-all.
const HEATMAP_CHANNEL: Record<string, ChannelKey> = {
  whatsapp: 'whatsapp', waba: 'whatsapp', wapa: 'whatsapp', personal_whatsapp: 'whatsapp',
  linkedin: 'linkedin',
  email: 'email', gmail: 'email', outlook: 'email',
  voice: 'voice',
  instagram: 'instagram', ig: 'instagram',
  intent: 'intent', signal: 'intent', fit: 'intent', system: 'intent',
};

function ActivityHeatmap({ events, days = 30, unavailable = false }: { events: ProspectEvent[]; days?: number; unavailable?: boolean }) {
  const ch: ChannelKey[] = ['linkedin', 'whatsapp', 'email', 'voice', 'instagram', 'intent'];
  const grid: Record<string, number[]> = {};
  ch.forEach((c) => (grid[c] = new Array(days).fill(0)));
  for (const e of events) {
    if (isOperatorEvent(e)) continue;
    const d = new Date(e.occurred_at);
    const diff = Math.floor((new Date().getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (diff < 0 || diff >= days) continue;
    const key: ChannelKey = HEATMAP_CHANNEL[String(e.channel).toLowerCase()] ?? 'intent';
    grid[key][days - 1 - diff] += 1;
  }
  const max = Math.max(1, ...ch.flatMap((c) => grid[c]));
  return (
    <LadCard>
      <LadCardHeader
        title="Activity"
        subtitle={
          // An all-empty grid is indistinguishable from a genuinely quiet
          // contact, so say which one this is.
          unavailable ? 'could not be loaded' : `Last ${days} days · all channels`
        }
      />
      <div className="space-y-1.5">
        {ch.map((c) => {
          const cells = grid[c];
          const meta = CH[c];
          const Icon = meta.Icon;
          const sum = cells.reduce((a, b) => a + b, 0);
          const isIntentChannel = c === 'intent';
          return (
            <div key={c} className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 w-24 shrink-0">
                <Icon className={`w-3.5 h-3.5 ${isIntentChannel ? 'text-[#172560] dark:text-[#60a5fa]' : ''}`}                      style={isIntentChannel ? undefined : { color: meta?.color || 'currentColor' }}/>
                <span className="text-[11.5px] font-medium text-[#172560] dark:text-white">{meta.label}</span>
              </div>
              <div
                className="flex-1 grid gap-[3px]"
                style={{ gridTemplateColumns: `repeat(${days}, minmax(0, 1fr))` }}
              >
                {cells.map((v, i) => {
                  const intensity = v === 0 ? 0 : 0.25 + (v / max) * 0.75;
                  return (
                    <div
                      key={i}
                      title={v ? `${v} event${v > 1 ? 's' : ''}` : 'no activity'}
                      className="aspect-square rounded-[3px] ring-1 ring-slate-100 dark:ring-[#262831]"
                      style={{
                        background: v === 0 ? 'transparent' : meta.color,
                        opacity: v === 0 ? 1 : intensity,
                      }}
                    ></div>
                  );
                })}
              </div>
              <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-300 w-8 text-right">
                {sum}
              </span>
            </div>
          );
        })}
        <div className="flex items-center justify-between pt-2 text-[10.5px] text-slate-500 dark:text-slate-300">
          <span>{days} days ago</span>
          <span>Today</span>
        </div>
      </div>
    </LadCard>
  );
}

// ── Fit radar ────────────────────────────────────────────────────────────
const FIT_LABELS: Record<string, string> = {
  title_match: 'Title',
  industry_match: 'Industry',
  size_match: 'Size',
  geo_match: 'Geo',
  seniority_match: 'Seniority',
  tech_stack_match: 'Tech',
};

function FitRadar({ p }: { p: ProspectFixture }) {
  const signals = Object.entries(p.fit_signals);
  if (signals.length === 0) {
    return (
      <LadCard>
        <LadCardHeader title="Fit signals" subtitle="Not scored yet" />
        <div className="py-10 text-center text-[12.5px] text-slate-500 dark:text-slate-300">
          No fit signals for this prospect yet - fit is computed when it&apos;s
          discovered via a search (Apollo · Sales Nav · ABM).
        </div>
      </LadCard>
    );
  }
  const n = signals.length, cx = 100, cy = 90, r = 70;
  const pt = (i: number, mag: number): [number, number] => {
    const ang = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [cx + Math.cos(ang) * r * mag, cy + Math.sin(ang) * r * mag];
  };
  const polyPts = (mag: number) => signals.map((_, i) => pt(i, mag).join(',')).join(' ');
  const valPts = signals.map(([, v], i) => pt(i, v).join(',')).join(' ');
  return (
    <LadCard>
      <LadCardHeader title="Fit signals" subtitle={`ICP fit · score ${(p.fit_score ?? 0).toFixed(2)}`} />
      <div className="flex items-center gap-5">
        <svg viewBox="0 0 200 180" className="w-44 h-40 shrink-0">
          {[0.25, 0.5, 0.75, 1].map((m) => (
            <polygon
              key={m}
              points={polyPts(m)}
              fill="none"
              stroke="currentColor"
              className="text-slate-200 dark:text-[#262831]"
              strokeWidth="0.8"
            />
          ))}
          {signals.map((_, i) => {
            const [x, y] = pt(i, 1);
            return (
              <line
                key={i}
                x1={cx} y1={cy} x2={x} y2={y}
                stroke="currentColor"
                className="text-slate-200 dark:text-[#262831]"
                strokeWidth="0.5"
              />
            );
          })}
          <polygon
            points={valPts}
            fill={T.primary}
            fillOpacity="0.18"
            stroke={T.primary}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {signals.map(([k, v], i) => {
            const [x, y] = pt(i, v);
            return <circle key={k} cx={x} cy={y} r="2.5" fill={T.primary} />;
          })}
          {signals.map(([k], i) => {
            const [x, y] = pt(i, 1.22);
            return (
              <text
                key={k}
                x={x} y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-slate-600 dark:fill-[#7a8ba3]"
                style={{ fontSize: 9.5, fontWeight: 500 }}
              >
                {FIT_LABELS[k] || k}
              </text>
            );
          })}
        </svg>
        <div className="flex-1 grid grid-cols-1 gap-1.5">
          {signals.map(([k, v]) => (
            <div key={k} className="flex items-center gap-2">
              <span className="text-[11px] text-slate-600 dark:text-slate-300 w-16">
                {FIT_LABELS[k] || k}
              </span>
              <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: T.badgeBg }}>
                <div className="h-full" style={{ width: `${v * 100}%`, background: T.primary }}></div>
              </div>
              <span className="text-[11px] tabular-nums font-semibold text-[#172560] dark:text-white w-8 text-right">
                {Math.round(v * 100)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </LadCard>
  );
}

// ── Channel donut ────────────────────────────────────────────────────────
function ChannelDonut({ p }: { p: ProspectFixture }) {
  const rolls = Object.entries(p.channel_rollups).filter(([, rr]) => rr.count > 0);
  const total = rolls.reduce((a, [, rr]) => a + rr.count, 0);
  let offset = 0;
  const r = 38, C = 2 * Math.PI * r;
  return (
    <LadCard>
      <LadCardHeader title="Channel mix" subtitle={`${total} events · ${rolls.length} channels`} />
      <div className="flex items-center gap-5">
        <div className="relative w-32 h-32 shrink-0">
          <svg viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r={r} fill="none" stroke="#f1f5f9" strokeWidth="12" />
            {rolls.map(([ch, rr]) => {
              const len = (rr.count / total) * C;
              const dash = `${len} ${C - len}`;
              const meta = CH[ch];
              const node = (
                <circle
                  key={ch}
                  cx="50" cy="50" r={r}
                  fill="none"
                  stroke={meta?.color || T.primary}
                  strokeWidth="12"
                  strokeDasharray={dash}
                  strokeDashoffset={-offset}
                />
              );
              offset += len;
              return node;
            })}
          </svg>
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              <p className="text-[10.5px] uppercase tracking-wider text-slate-500 dark:text-slate-300 font-semibold">
                Events
              </p>
              <p
                className="text-xl font-bold tabular-nums text-[#172560] dark:text-white"
                style={{ fontFamily: '"Space Grotesk", system-ui' }}
              >
                {total}
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 space-y-1.5">
          {rolls.map(([ch, rr]) => {
            const meta = CH[ch];
            return (
              <div key={ch} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta?.color || T.primary }}></span>
                <span className="text-[11.5px] font-medium text-[#172560] dark:text-white flex-1">
                  {meta?.label || ch}
                </span>
                <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-300">
                  {rr.count}
                </span>
                <span className="text-[10.5px] tabular-nums text-slate-400 dark:text-slate-300/70 w-9 text-right">
                  {Math.round((rr.count / total) * 100)}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </LadCard>
  );
}

// ── Intent strip ─────────────────────────────────────────────────────────
const INTENT_META: Record<
  string,
  { Icon: React.ElementType; color: string; label: string; desc: (s: ProspectFixture['intent_signals'][number]) => string }
> = {
  'hiring.detected': {
    Icon: Users, color: T.linkedin, label: 'Hiring',
    desc: (s) => String((s.payload as { role?: string }).role ?? ''),
  },
  'funding.raised': {
    Icon: TrendingUp, color: T.success, label: 'Funding',
    desc: (s) => {
      const p = s.payload as { round?: string; amount_usd?: number };
      return `${p.round ?? ''} · $${((p.amount_usd ?? 0) / 1e6).toFixed(0)}M`;
    },
  },
  'website.visited': {
    Icon: MousePointerClick, color: T.primary, label: 'On site',
    desc: (s) => {
      const p = s.payload as { pages?: string[]; session_dur_s?: number };
      return `${p.pages?.length ?? 0} pages · ${Math.round((p.session_dur_s ?? 0) / 60)}m`;
    },
  },
};

function IntentStrip({ signals }: { signals: ProspectFixture['intent_signals'] }) {
  if (!signals || signals.length === 0) return null;
  return (
    <LadCard>
      <LadCardHeader title="Intent" subtitle="Reasons to reach out this week" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {signals.map((s, i) => {
          const m = INTENT_META[s.signal_type] || {
            Icon: TrendingUp, color: T.primary, label: s.signal_type, desc: () => '',
          };
          const Icon = m.Icon;
          return (
            <div
              key={i}
              className="relative rounded-2xl border border-slate-200 dark:border-[#1c2c4e] dark:bg-[#09153b]/50 p-4 overflow-hidden"
            >
              <div
                className="absolute -right-6 -top-6 w-20 h-20 rounded-full opacity-10"
                style={{ background: m.color }}
              ></div>
              <div className="flex items-center justify-between relative">
                <div
                  className="w-8 h-8 rounded-xl grid place-items-center"
                  style={{ background: `${m.color}1f`, color: m.color }}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-300 tabular-nums">
                  {s.recency_days}d
                </span>
              </div>
              <p className="text-[10.5px] uppercase tracking-wider text-slate-500 dark:text-slate-300 font-semibold mt-3">
                {m.label}
              </p>
              <p className="text-[13px] text-[#172560] dark:text-white font-semibold mt-0.5 leading-snug">
                {m.desc(s)}
              </p>
              <div className="mt-2.5 flex items-center gap-1.5">
                <div
                  className="flex-1 h-1 rounded-full overflow-hidden"
                  style={{ background: T.badgeBg }}
                >
                  <div className="h-full" style={{ width: `${s.confidence * 100}%`, background: m.color }}></div>
                </div>
                <span className="text-[10.5px] tabular-nums text-slate-500 dark:text-slate-300">
                  {Math.round(s.confidence * 100)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </LadCard>
  );
}

// ── Mini feed ────────────────────────────────────────────────────────────
function MiniFeed({ events, truncated = false, unavailable = false }: { events: ProspectEvent[]; truncated?: boolean; unavailable?: boolean }) {
  const recent = events.slice(0, 6);
  return (
    <LadCard>
      <LadCardHeader
        title="Recent activity"
        subtitle={
          // The backend's events endpoint has no total-count support (unlike
          // /api/prospects), so "N total events" would overclaim completeness
          // for any contact whose real history exceeds the fetch limit.
          // `unavailable` is a third case again: we have no events because the
          // fetch did not deliver, so "0 total events" would be a claim about
          // the contact rather than about us.
          unavailable
            ? 'could not be loaded'
            : truncated ? `${events.length}+ events (most recent shown)` : `${events.length} total events`
        }
      />
      <ul className="space-y-2.5">
        {recent.map((e) => {
          const m = CH[e.channel] || CH.system;
          const Icon = m.Icon;
          let preview = '';
          const payload = e.payload as Record<string, unknown>;
          if (payload.preview) preview = String(payload.preview);
          else if (payload.subject) preview = String(payload.subject);
          else if (payload.role) preview = `Posted ${payload.role}`;
          else if (payload.round) {
            const amt = ((payload.amount_usd as number) || 0) / 1e6;
            preview = `${payload.round} · $${amt.toFixed(0)}M`;
          } else if (payload.pages) preview = (payload.pages as string[]).join(', ');
          else if (payload.note) preview = String(payload.note);
          else preview = e.event_type.replace(/\./g, ' ');
          return (
            <li key={e.seq} className="flex items-start gap-3">
              <div
                className="w-7 h-7 rounded-full grid place-items-center shrink-0"
                style={{ background: `${m.color}1a`, color: m.color }}
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11.5px] text-slate-500 dark:text-slate-300">
                  <span className="font-semibold text-[#172560] dark:text-white">{m.label}</span> · {e.direction}
                  <span className="ml-1.5 tabular-nums">{rel(e.occurred_at)} ago</span>
                </p>
                <p className="text-[12.5px] text-[#172560] dark:text-white mt-0.5 truncate">{preview}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </LadCard>
  );
}

// ── Action strip ─────────────────────────────────────────────────────────
function Actions({ onAction, isActing, doNotContact, quietUntil }: {
  onAction?: (p: { doNotContact?: boolean; quietDays?: number; clearQuiet?: boolean }) => void;
  isActing?: boolean;
  doNotContact?: boolean;
  quietUntil?: string | null;
}) {
  const quietActive = !!quietUntil && new Date(quietUntil).getTime() > Date.now();
  return (
    <LadCard>
      <LadCardHeader title="Take action" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <ActionBtn Icon={Route} label="Ask for intro" hint="Not available yet" primary disabled />
        <ActionBtn Icon={SendHorizontal} label="Send message" hint="Not available yet" disabled />
        <ActionBtn
          Icon={MoonStar}
          label={quietActive ? 'Quieted' : 'Quiet 7d'}
          hint={quietActive ? `until ${new Date(quietUntil!).toLocaleDateString()}` : 'pause agent replies'}
          active={quietActive}
          disabled={isActing}
          onClick={() => onAction?.(quietActive ? { clearQuiet: true } : { quietDays: 7 })}
        />
        <ActionBtn
          Icon={Ban}
          label="Do not contact"
          // Was "hard suppress" / "suppressed". Both overstated what the flag
          // does: quiet_until and do_not_contact are surfaced to the agent's
          // prompt (tenant_context_service builds a CROSS-CHANNEL STATE block
          // from them), but no send path gates on either — a running campaign
          // sequence keeps executing its steps regardless. Say what is true.
          hint={doNotContact ? 'flagged - click to lift' : 'tell the agent to stop'}
          danger
          active={!!doNotContact}
          disabled={isActing}
          onClick={() => onAction?.({ doNotContact: !doNotContact })}
        />
      </div>
      <p className="mt-2.5 text-[11.5px] text-slate-500 dark:text-slate-400 leading-snug">
        Agent replies honour these. A running campaign sequence does not — pause
        the campaign to stop its steps.
      </p>
    </LadCard>
  );
}

function ActionBtn({
  Icon, label, hint, primary, danger, onClick, disabled, active,
}: {
  Icon: React.ElementType;
  label: string;
  hint: string;
  primary?: boolean;
  danger?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  const cls = primary
    ? 'text-white shadow-sm hover:opacity-95'
    : danger
    ? 'text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 hover:bg-rose-50 dark:hover:bg-rose-950/40'
    : 'text-[#172560] dark:text-white border border-slate-200 dark:border-[#1c2c4e] hover:bg-slate-50 dark:hover:bg-[#0e1d4d]';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`rounded-2xl p-4 text-left flex items-center gap-3 transition ${cls} ${
        active ? 'ring-2 ring-current ring-offset-1 dark:ring-offset-[#0f1722]' : ''
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${!onClick ? 'cursor-default' : ''}`}
      style={primary ? { background: T.primary } : undefined}
    >
      <div
        className={`w-10 h-10 rounded-xl grid place-items-center ${
          primary ? 'bg-white/15' : danger ? 'bg-rose-50 dark:bg-rose-950/40' : ''
        }`}
        style={!primary && !danger ? { background: T.badgeBg } : undefined}
      >
        <Icon
          className="w-5 h-5"
          style={primary ? { color: 'white' } : danger ? { color: T.danger } : { color: T.primary }}
        />
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold">{label}</p>
        <p
          className={`text-[11px] ${
            primary ? 'text-white/70' : 'text-slate-500 dark:text-slate-300'
          } truncate`}
        >
          {hint}
        </p>
      </div>
    </button>
  );
}

/** Friendly "when" for a future schedule: absolute label + a relative badge. */
function futureWhen(iso?: string | null): { abs: string; badge: string | null } {
  if (!iso) return { abs: 'Unscheduled', badge: null };
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return { abs: 'Unscheduled', badge: null };
  const abs = new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  });
  const diff = Math.round((t - Date.now()) / 1000);
  if (diff <= 0) return { abs, badge: 'due' };
  const m = Math.round(diff / 60); if (m < 60) return { abs, badge: `in ${m}m` };
  const h = Math.round(m / 60); if (h < 24) return { abs, badge: `in ${h}h` };
  const d = Math.round(h / 24); if (d < 14) return { abs, badge: `in ${d}d` };
  return { abs, badge: `in ${Math.round(d / 7)}w` };
}

/** Upcoming automatic follow-ups the Master Agent has scheduled across channels. */
function NextFollowups({
  followups, loading, error, degradedChannels = [],
}: { followups: ProspectFollowup[]; loading?: boolean; error?: boolean; degradedChannels?: string[] }) {
  return (
    <LadCard>
      <LadCardHeader
        title="Next follow-ups"
        subtitle={
          error
            ? 'Could not load'
            : loading
              ? 'Loading…'
              : degradedChannels.length
                // A count we know is short must not be stated as a total.
                ? `${followups.length}+ scheduled`
                : followups.length
                  ? `${followups.length} scheduled`
                  : 'Automatic outreach'
        }
      />
      {error ? (
        <p className="text-[13px] text-rose-600 dark:text-rose-300">
          Couldn&apos;t check the schedule — this isn&apos;t necessarily &quot;no follow-ups queued.&quot;
        </p>
      ) : loading ? (
        <p className="text-[13px] text-slate-500 dark:text-slate-300">Checking the schedule…</p>
      ) : followups.length === 0 && degradedChannels.length ? (
        // The ONE case the server can tell us about and we previously could
        // not: nothing came back, but only because a channel was unreadable.
        <p className="text-[13px] text-amber-700 dark:text-amber-300">
          Couldn&apos;t read {degradedChannels.join(', ')} follow-ups, so this isn&apos;t
          necessarily &quot;none queued.&quot;
        </p>
      ) : followups.length === 0 ? (
        <div className="flex items-center gap-2 text-[13px] text-slate-500 dark:text-slate-300">
          <CalendarClock className="w-4 h-4 shrink-0" />
          <span>No automatic follow-ups queued.</span>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {followups.map((f) => {
            const ch = String(f.channel ?? 'system').toLowerCase();
            const meta = CH[ch] || CH[HEATMAP_CHANNEL[ch] ?? 'system'] || CH.system;
            const Icon = meta.Icon;
            const when = futureWhen(f.scheduled_time);
            const desc = [f.type, f.stage].filter(Boolean).join(' · ').replace(/_/g, ' ');
            return (
              <li key={f.id} className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl grid place-items-center shrink-0"
                  style={{ background: T.badgeBg }}
                >
                  <Icon className="w-4 h-4" style={{ color: meta.color }} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-semibold text-[#172560] dark:text-white truncate">
                    {meta.label}
                    {desc ? (
                      <span className="font-normal text-slate-500 dark:text-slate-300"> · {desc}</span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-300 truncate">
                    {when.abs}
                    {f.attempt ? ` · attempt ${f.attempt}` : ''}
                  </p>
                </div>
                {when.badge ? (
                  <span
                    className="text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: T.badgeBg, color: T.primary }}
                  >
                    {when.badge}
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
      {!error && !loading && followups.length > 0 && degradedChannels.length > 0 && (
        <p className="mt-2 text-[11.5px] text-amber-700 dark:text-amber-300">
          {degradedChannels.join(', ')} follow-ups couldn&apos;t be read — there may be more
          than shown.
        </p>
      )}
    </LadCard>
  );
}
