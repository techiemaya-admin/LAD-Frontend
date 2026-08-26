'use client';

/**
 * Lead Report - the research/audit for one lead, on the CRM lead page.
 *
 * THE ORDERING THIS CARD EXISTS TO COMMUNICATE: the report is generated and
 * stored BEFORE anyone approves it, because there is nothing to review
 * otherwise. So a `public_url` exists while the status is still `pending` - and
 * that URL is the APPROVER's copy, not something the prospect has received.
 * Every label here is written to keep those apart; "delivered" appears only
 * after approval.
 */

import * as React from 'react';
import {
  FileText, Sparkles, Lock, Check, X, Eye, Globe, ChevronDown, AlertTriangle, Loader2,
} from 'lucide-react';

import { LadCard, LadCardHeader } from './shared';
import type { LeadReport, ReportContent, ReportGrounding, ReportViewState } from '@/types/leadReport';

const NAVY = '#182a54';

interface LeadReportSectionProps {
  state: ReportViewState;
  report: LeadReport | null;
  grounding?: ReportGrounding;
  leadFirstName?: string;
  refusalMessage?: string | null;
  actionError?: string | null;
  settledElsewhere?: boolean;
  onAdvance: () => void;
  isAdvancing: boolean;
  onApprove: () => void;
  onReject: (reason?: string) => void;
  isDeciding: boolean;
}

export default function LeadReportSection({
  state, report, grounding, leadFirstName, refusalMessage, actionError,
  settledElsewhere, onAdvance, isAdvancing, onApprove, onReject, isDeciding,
}: LeadReportSectionProps) {
  const showBody = Boolean(report) && ['pending', 'approved', 'rejected', 'none'].includes(state);

  return (
    <LadCard>
      <LadCardHeader
        title="Lead Report"
        subtitle={
          report
            ? `${report.report_type_label} · ${report.scope === 'campaign' ? 'Campaign-scoped' : 'Lead-scoped'}`
            : 'Research & audit for this lead'
        }
        action={<StatusPill state={state} />}
      />

      {state === 'empty' && <EmptyPanel name={leadFirstName} onAdvance={onAdvance} disabled={isAdvancing} />}
      {state === 'running' && <RunningPanel />}
      {state === 'needs_research' && <NeedsResearchPanel message={refusalMessage} onRetry={onAdvance} />}

      {showBody && report && (
        <>
          <StatusStrip state={state} report={report} />

          {state === 'pending' && (
            <div className="flex items-center gap-2 mb-5">
              <button
                type="button"
                onClick={onApprove}
                disabled={isDeciding}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-semibold text-white disabled:opacity-60"
                style={{ background: NAVY }}
              >
                {isDeciding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                Approve &amp; send
              </button>
              <button
                type="button"
                onClick={() => onReject()}
                disabled={isDeciding}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 dark:border-[#262831] text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#141a2e] disabled:opacity-60"
              >
                <X className="w-4 h-4" />
                Reject
              </button>
            </div>
          )}

          {settledElsewhere && (
            <p className="mb-4 text-[12.5px] text-slate-500 dark:text-[#7a8ba3]">
              The approver settled this from the link they were sent - showing their decision.
            </p>
          )}
          {actionError && (
            <p className="mb-4 text-[12.5px] text-red-600 dark:text-red-400">{actionError}</p>
          )}

          <ReportBody content={report.content} />

          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-[#262831]">
            <div className="flex flex-wrap items-center gap-3">
              {report.public_url && (
                <a
                  href={report.public_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-slate-200 dark:border-[#262831] text-[13px] font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#141a2e]"
                >
                  <FileText className="w-4 h-4" />
                  View PDF
                </a>
              )}
              {/* The gate withholds DELIVERY, not creation - so say whose copy this is. */}
              {state === 'pending' && (
                <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate-500 dark:text-[#7a8ba3]">
                  <Eye className="w-3.5 h-3.5" />
                  Approver copy - not delivered to the tenant
                </span>
              )}
            </div>

            <GroundingLine grounding={grounding} />

            <p className="mt-3 text-[11.5px] text-slate-400 dark:text-[#5f7089]">
              Figures the source doesn&apos;t support are scrubbed after generation - a sparse report is
              the guard working.
            </p>
          </div>
        </>
      )}
    </LadCard>
  );
}

// ── Header pill ─────────────────────────────────────────────────────────────

function StatusPill({ state }: { state: ReportViewState }) {
  const map: Record<ReportViewState, { label: string; cls: string }> = {
    empty:          { label: 'Not generated', cls: 'text-slate-500 border-slate-200 dark:border-[#262831]' },
    running:        { label: 'Generating…',   cls: 'text-blue-700 border-blue-200 bg-blue-50 dark:bg-blue-950/30 dark:border-blue-900/50 dark:text-blue-300' },
    needs_research: { label: 'Needs research', cls: 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400' },
    none:           { label: 'Generated',     cls: 'text-slate-600 border-slate-200 dark:border-[#262831]' },
    pending:        { label: 'Awaiting approval', cls: 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400' },
    approved:       { label: 'Approved',      cls: 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400' },
    rejected:       { label: 'Rejected',      cls: 'text-red-700 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400' },
  };
  const m = map[state];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${m.cls}`}>
      <FileText className="w-3 h-3" />
      {m.label}
    </span>
  );
}

// ── Pre-report panels ───────────────────────────────────────────────────────

function EmptyPanel({ name, onAdvance, disabled }: { name?: string; onAdvance: () => void; disabled: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[#262831] py-10 px-6 text-center">
      <div className="mx-auto w-11 h-11 rounded-xl grid place-items-center bg-slate-50 dark:bg-[#141a2e] mb-4">
        <FileText className="w-5 h-5 text-slate-400" />
      </div>
      <p className="text-[14px] font-semibold text-[#172560] dark:text-white">
        No research report yet{name ? ` for ${name}` : ''}
      </p>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-500 dark:text-[#7a8ba3] max-w-md mx-auto">
        Run the web-research node to ground an audit for this lead. A report with no grounding is
        refused - never generated with filler.
      </p>
      <button
        type="button"
        onClick={onAdvance}
        disabled={disabled}
        className="mt-5 inline-flex items-center gap-2 h-10 px-4 rounded-xl text-[13px] font-semibold text-white disabled:opacity-60"
        style={{ background: NAVY }}
      >
        <Sparkles className="w-4 h-4" />
        Advance research
      </button>
    </div>
  );
}

function RunningPanel() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-[#262831] p-6">
      <div className="flex items-center gap-2.5 text-[13px] font-medium text-[#172560] dark:text-white">
        <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        Web-research node · scraping sources…
      </div>
      <div className="mt-5 space-y-3" aria-hidden>
        {['w-2/3', 'w-full', 'w-11/12', 'w-1/2'].map((w, i) => (
          <div key={i} className={`h-3 rounded bg-slate-100 dark:bg-[#141a2e] animate-pulse ${w}`} />
        ))}
      </div>
    </div>
  );
}

function NeedsResearchPanel({ message, onRetry }: { message?: string | null; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-5">
      <div className="flex gap-3">
        <AlertTriangle className="w-4.5 h-4.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-amber-900 dark:text-amber-300">
            Needs research first
          </p>
          <p className="mt-1 text-[12.5px] leading-relaxed text-amber-800 dark:text-amber-400/90">
            {message
              || 'Add a Web research or Scrape step upstream. A report with no grounding is refused, not generated with filler.'}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-3 inline-flex items-center gap-2 h-9 px-3.5 rounded-lg border border-amber-300 dark:border-amber-800 bg-white/70 dark:bg-transparent text-[12.5px] font-semibold text-amber-900 dark:text-amber-300"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Add research step
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Status strip ────────────────────────────────────────────────────────────

function StatusStrip({ state, report }: { state: ReportViewState; report: LeadReport }) {
  const when = (iso: string | null) => {
    if (!iso) return 'just now';
    const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const h = Math.round(mins / 60);
    return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
  };

  if (state === 'pending') {
    return (
      <Strip tone="amber">
        Generated {when(report.created_at)} · awaiting {report.approval_channel || 'email'} approval -
        not sent yet. The PDF below is the approver copy.
      </Strip>
    );
  }
  if (state === 'approved') {
    return (
      <Strip tone="neutral">
        Approved {when(report.approved_at)}
        {report.delivered_by ? ` · delivered via ${report.delivered_by}` : ''} ·{' '}
        <code className="text-[12px]">{'{{report_url}}'}</code> now resolves in outreach.
      </Strip>
    );
  }
  if (state === 'rejected') {
    return (
      <Strip tone="red">
        <span className="block">
          Rejected - not sent{report.reject_reason ? ` · ${report.reject_reason}` : ''}.
        </span>
        {/* The stamp happens at approval, so a rejected report leaves the token empty. */}
        <span className="block mt-1 opacity-90">
          Unlinkable downstream until re-approved; <code className="text-[12px]">{'{{report_url}}'}</code>{' '}
          stays blank.
        </span>
      </Strip>
    );
  }
  // 'none' - generated with no approval gate configured.
  return (
    <Strip tone="neutral">
      Generated {when(report.created_at)} · no approval gate on this step
      {report.delivered_by ? ` · delivered via ${report.delivered_by}` : ''}.
    </Strip>
  );
}

function Strip({ tone, children }: { tone: 'amber' | 'neutral' | 'red'; children: React.ReactNode }) {
  const cls = {
    amber: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300',
    neutral: 'border-slate-200 bg-slate-50 text-slate-600 dark:border-[#262831] dark:bg-[#0d1428] dark:text-[#9fb0c7]',
    red: 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300',
  }[tone];
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 mb-5 text-[12.5px] leading-relaxed ${cls}`}>
      <Lock className="w-3.5 h-3.5 shrink-0 mt-0.5 opacity-70" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

// ── Document body ───────────────────────────────────────────────────────────

/**
 * Renders `content` exactly as the PDF does. Every field is optional - the
 * generator omits what the sources could not support, and a missing section is
 * the scrubber working rather than a rendering bug, so nothing here fills a gap
 * with a placeholder.
 */
function ReportBody({ content }: { content: ReportContent }) {
  const sections = Array.isArray(content?.sections) ? content.sections : [];

  return (
    <article>
      {content?.headline && (
        <h4 className="text-[17px] font-bold leading-snug tracking-tight text-[#172560] dark:text-white">
          {content.headline}
        </h4>
      )}
      {content?.subtitle && (
        <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-slate-400 dark:text-[#5f7089]">
          {content.subtitle}
        </p>
      )}
      {content?.summary && <Paragraphs text={content.summary} className="mt-4" />}

      {sections.map((s, i) => (
        <section key={i} className="mt-6">
          {s.heading && (
            <h5 className="text-[14px] font-semibold text-[#172560] dark:text-white">{s.heading}</h5>
          )}
          {s.body && <Paragraphs text={s.body} className="mt-2" />}
          {Array.isArray(s.points) && s.points.length > 0 && (
            <ul className="mt-2.5 space-y-1.5">
              {s.points.map((p, j) => (
                <li key={j} className="flex gap-2.5 text-[13.5px] leading-relaxed text-slate-600 dark:text-[#9fb0c7]">
                  <span className="mt-[7px] w-1 h-1 rounded-full bg-blue-500 shrink-0" />
                  <span className="min-w-0">{p}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}

      {content?.closing && (
        <div className="mt-6 rounded-xl bg-blue-50/70 dark:bg-blue-950/20 px-4 py-3.5 text-[13.5px] leading-relaxed text-slate-700 dark:text-[#9fb0c7]">
          {content.closing}
        </div>
      )}
    </article>
  );
}

/** `body` carries \n\n breaks from the generator; keep them as real paragraphs. */
function Paragraphs({ text, className = '' }: { text: string; className?: string }) {
  const paras = String(text).split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className={className}>
      {paras.map((p, i) => (
        <p
          key={i}
          className={`text-[13.5px] leading-relaxed text-slate-600 dark:text-[#9fb0c7] ${i ? 'mt-2' : ''}`}
        >
          {p}
        </p>
      ))}
    </div>
  );
}

// ── Grounding disclosure ────────────────────────────────────────────────────

function GroundingLine({ grounding }: { grounding?: ReportGrounding }) {
  const [open, setOpen] = React.useState(false);
  if (!grounding || (!grounding.research && !grounding.scrape)) return null;

  const sources = grounding.sources || [];
  const what = grounding.research && grounding.scrape
    ? 'web research and their website'
    : grounding.research ? 'web research' : 'their website';

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={sources.length === 0}
        className="inline-flex items-center gap-2 text-[12.5px] text-slate-500 dark:text-[#7a8ba3] disabled:cursor-default"
      >
        <Globe className="w-3.5 h-3.5" />
        <span>
          Grounded on {what}
          {/* Only claim a count when the URLs are actually named. */}
          {sources.length > 0 && ` · ${sources.length} source${sources.length === 1 ? '' : 's'}`}
        </span>
        {sources.length > 0 && (
          <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
        )}
      </button>

      {open && sources.length > 0 && (
        <ul className="mt-2.5 space-y-1.5 pl-5">
          {sources.map((url) => (
            <li key={url} className="truncate">
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[12px] text-blue-600 dark:text-blue-400 hover:underline"
              >
                {url}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
