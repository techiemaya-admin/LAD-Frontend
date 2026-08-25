'use client';

/**
 * Accelerator Sequence - where this lead is in its campaign cadence.
 *
 * Position is DERIVED on the backend from campaign_analytics using the same
 * function the scheduler advances leads with, so this card shows where the
 * engine thinks the lead is rather than a separate opinion about it.
 *
 * The consequence worth knowing: a step that fails writes no success row, so the
 * lead stays parked on it and re-shows it every tick. That is a real stall, not
 * a display artefact - it surfaces here as a "stuck" note on the current step
 * instead of N identical rows.
 */

import * as React from 'react';
import {
  Check, Globe, FileText, Mail, Phone, MessageCircle, BriefcaseBusiness, Camera,
  Settings2, Target, Link2, Info, Sparkles, Pause, Loader2, AlertTriangle,
  type LucideIcon,
} from 'lucide-react';

import { LadCard, LadCardHeader, rel } from './shared';
import type { AcceleratorSequence, SequenceStep } from '@/types/leadReport';

const NAVY = '#182a54';

/** Channel key → icon + tint. Mirrors the CRM's existing channel palette. */
const CHANNEL_ICON: Record<string, { Icon: LucideIcon; color: string }> = {
  linkedin:  { Icon: BriefcaseBusiness, color: '#0a66c2' },
  email:     { Icon: Mail,              color: '#ea4335' },
  whatsapp:  { Icon: MessageCircle,     color: '#22c55e' },
  voice:     { Icon: Phone,             color: '#7c3aed' },
  instagram: { Icon: Camera,            color: '#ec4899' },
  research:  { Icon: Globe,             color: '#0ea5e9' },
  report:    { Icon: FileText,          color: '#2563eb' },
  system:    { Icon: Settings2,         color: '#64748b' },
};

interface AcceleratorSectionProps {
  sequence: AcceleratorSequence;
  /** Only offered when the campaign actually has a report step to advance towards. */
  canAdvance: boolean;
  onAdvance: () => void;
  isAdvancing: boolean;
  onPause?: () => void;
}

export default function AcceleratorSection({
  sequence, canAdvance, onAdvance, isAdvancing, onPause,
}: AcceleratorSectionProps) {
  const { steps, current_step: current, total_steps: total } = sequence;
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  const anyReportLink = steps.some((s) => s.uses_report_url);

  // Label the primary action for what it will actually do: kick off the
  // grounding when the lead has not reached the report yet, otherwise move the
  // sequence on.
  const researchPending = steps.some(
    (s) => (s.channel === 'research' || s.type === 'lead_report') && s.status !== 'done',
  );

  return (
    <LadCard>
      <LadCardHeader
        title="Accelerator Sequence"
        subtitle={sequence.name}
        action={<StatusPill status={sequence.status} />}
      />

      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-[#141a2e] overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${pct}%`, background: NAVY }}
          />
        </div>
        <span className="text-[12.5px] font-medium text-slate-500 dark:text-[#7a8ba3] tabular-nums shrink-0">
          {current}/{total} steps
        </span>
      </div>

      {sequence.goal && (
        <p className="mt-3 flex items-center gap-2 text-[12.5px] text-slate-500 dark:text-[#7a8ba3]">
          <Target className="w-3.5 h-3.5 shrink-0" />
          <span>
            <span className="font-medium text-slate-600 dark:text-[#9fb0c7]">Goal:</span> {sequence.goal}
          </span>
        </p>
      )}

      <ol className="mt-5">
        {steps.map((step, i) => (
          <StepRow key={step.step_id} step={step} isLast={i === steps.length - 1} />
        ))}
      </ol>

      {anyReportLink && (
        <p className="mt-4 flex items-start gap-2 text-[11.5px] text-slate-400 dark:text-[#5f7089]">
          <Info className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>
            Steps tagged <code>{'{{report_url}}'}</code> render blank until the audit is approved.
          </span>
        </p>
      )}

      {(canAdvance || onPause) && (
        <div className="mt-5 flex items-center gap-2.5">
          {canAdvance && (
            <button
              type="button"
              onClick={onAdvance}
              disabled={isAdvancing}
              className="flex-1 inline-flex items-center justify-center gap-2 h-11 rounded-xl text-[13px] font-semibold text-white disabled:opacity-60"
              style={{ background: NAVY }}
            >
              {isAdvancing
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Sparkles className="w-4 h-4" />}
              {researchPending ? 'Advance research' : 'Advance step'}
            </button>
          )}
          {onPause && (
            <button
              type="button"
              onClick={onPause}
              className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-slate-200 dark:border-[#262831] text-[13px] font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#141a2e]"
            >
              <Pause className="w-4 h-4" />
              Pause
            </button>
          )}
        </div>
      )}
    </LadCard>
  );
}

function StatusPill({ status }: { status: AcceleratorSequence['status'] }) {
  const map = {
    active:    { label: 'Active',    cls: 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400', dot: '#22c55e' },
    paused:    { label: 'Paused',    cls: 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400', dot: '#eab308' },
    completed: { label: 'Completed', cls: 'text-slate-600 border-slate-200 dark:border-[#262831]', dot: '#64748b' },
  }[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${map.cls}`}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: map.dot }} />
      {map.label}
    </span>
  );
}

function StepRow({ step, isLast }: { step: SequenceStep; isLast: boolean }) {
  const meta = CHANNEL_ICON[step.channel] || CHANNEL_ICON.system;
  const Icon = meta.Icon;
  const done = step.status === 'done';
  const current = step.status === 'current';

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {/* Rail */}
      {!isLast && (
        <span className="absolute left-[13px] top-7 bottom-0 w-px bg-slate-200 dark:bg-[#262831]" aria-hidden />
      )}

      <span
        className={`relative z-10 w-[27px] h-[27px] rounded-full grid place-items-center text-[11px] font-semibold shrink-0 border ${
          done
            ? 'bg-white dark:bg-[#000724] border-emerald-300 dark:border-emerald-800 text-emerald-600'
            : current
              ? 'text-white border-transparent'
              : 'bg-white dark:bg-[#000724] border-slate-200 dark:border-[#262831] text-slate-400'
        }`}
        style={current ? { background: '#2563eb' } : undefined}
      >
        {done ? <Check className="w-3.5 h-3.5" /> : step.n}
      </span>

      <div className="min-w-0 flex-1 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Icon className="w-4 h-4 shrink-0" style={{ color: meta.color }} />
            <span className="text-[13.5px] font-semibold text-[#172560] dark:text-white">
              {step.action}
            </span>
            {/* Only the report step carries an approval state. */}
            {step.approval && step.approval !== 'none' && <ApprovalPill status={step.approval} />}
          </div>

          {step.detail && (
            <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-[#7a8ba3]">{step.detail}</p>
          )}

          {step.uses_report_url && (
            <p className="mt-1 inline-flex items-center gap-1.5 text-[11.5px] text-slate-400 dark:text-[#5f7089]">
              <Link2 className="w-3 h-3" />
              <code>{'{{report_url}}'}</code>
            </p>
          )}

          {/* Attempted, never succeeded - the lead is parked here. */}
          {step.stuck && (
            <p className="mt-1.5 inline-flex items-start gap-1.5 text-[11.5px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
              <span>
                Stuck - {step.stuck_attempts} failed attempt
                {step.stuck_attempts === 1 ? '' : 's'}
                {step.stuck_last_attempt ? `, last ${rel(step.stuck_last_attempt)} ago` : ''}. The
                sequence will keep retrying this step until it succeeds.
              </span>
            </p>
          )}
        </div>

        <div className="text-right shrink-0">
          <StepStatusPill step={step} />
          <p className="mt-1 text-[11.5px] text-slate-400 dark:text-[#5f7089]">
            {step.at ? `${rel(step.at)} ago` : `Day ${step.day}`}
          </p>
        </div>
      </div>
    </li>
  );
}

function ApprovalPill({ status }: { status: string }) {
  const cls = status === 'pending'
    ? 'text-amber-700 border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900/50 dark:text-amber-400'
    : status === 'rejected'
      ? 'text-red-700 border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900/50 dark:text-red-400'
      : 'text-emerald-700 border-emerald-200 bg-emerald-50 dark:bg-emerald-950/30 dark:border-emerald-900/50 dark:text-emerald-400';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-medium ${cls}`}>
      <FileText className="w-3 h-3" />
      audit {status}
    </span>
  );
}

function StepStatusPill({ step }: { step: SequenceStep }) {
  const { label, cls } = step.status === 'done'
    // 'Accepted' only when the acceptance was actually observed; a sent invite
    // that nobody accepted yet stays 'Done'.
    ? { label: step.outcome === 'accepted' ? 'Accepted' : 'Done', cls: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400' }
    : step.status === 'current'
      ? { label: step.stuck ? 'Stuck' : 'Current', cls: step.stuck
        ? 'text-amber-700 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400'
        : 'text-blue-700 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-300' }
      : { label: 'Queued', cls: 'text-slate-500 bg-slate-100 dark:bg-[#141a2e] dark:text-[#7a8ba3]' };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${cls}`}>
      {label}
    </span>
  );
}
