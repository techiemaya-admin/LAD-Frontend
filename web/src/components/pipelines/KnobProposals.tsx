'use client';

/**
 * Review settings read out of the workspace's own history.
 *
 * WHY THIS IS A REVIEW SCREEN AND NOT A "FILL IT IN FOR ME" BUTTON
 * A workspace's history contains its agent's past MISTAKES stated in exactly
 * the same confident voice as its facts. Applying these unread would move a
 * wrong price or an invented answer out of a transcript nobody re-reads and
 * into configuration, where it is far harder to notice. So nothing here is
 * saved until someone ticks it.
 *
 * That makes the EVIDENCE the most important thing on screen - it is the only
 * way a reviewer can tell a fact from a hallucination - so it is shown in full
 * next to every proposal rather than hidden behind a disclosure.
 *
 * Anything the server flagged for closer review starts UNTICKED. The default
 * has to be the safe one: a reviewer skimming and hitting apply should get only
 * what was well-sourced.
 */

import React, { useMemo, useState } from 'react';
import { Loader2, Quote, AlertTriangle, Sparkles, X } from 'lucide-react';
import type { KnobProposal, KnobProposalsResult, ProposalSource } from '@lad/frontend-features/snapshots';

const SOURCE_LABEL: Record<ProposalSource, string> = {
  prompt: 'from your instructions',
  customer_message: 'from a customer message',
  agent_message: 'from the assistant’s own reply',
};

/** Values are arbitrary knob types; render them the way the form shows them. */
function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '-';
  if (typeof value === 'boolean') return value ? 'On' : 'Off';
  if (Array.isArray(value)) return value.join('\n');
  return String(value);
}

function ProposalRow({
  proposal,
  checked,
  onToggle,
  disabled,
}: {
  proposal: KnobProposal;
  checked: boolean;
  onToggle: (next: boolean) => void;
  disabled: boolean;
}) {
  const id = `proposal-${proposal.key}`;
  const hasCurrent =
    proposal.currentValue !== null &&
    proposal.currentValue !== undefined &&
    proposal.currentValue !== '' &&
    !(Array.isArray(proposal.currentValue) && proposal.currentValue.length === 0);

  return (
    <li className="rounded-lg border border-gray-200 dark:border-blue-950/40 bg-white dark:bg-[#071131] p-3">
      <div className="flex items-start gap-2.5">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 dark:border-blue-950/40 text-emerald-600 focus:ring-emerald-600 disabled:opacity-50"
        />
        <div className="min-w-0 flex-1">
          <label htmlFor={id} className="flex flex-wrap items-center gap-2 cursor-pointer">
            <span className="text-sm font-medium text-gray-900 dark:text-white">{proposal.label}</span>
            {proposal.needsCloserReview && (
              <span className="inline-flex items-center gap-1 rounded border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                Check this one
              </span>
            )}
          </label>

          {/* The change, not just the value - a reviewer needs to see what it
              would replace before agreeing to it. */}
          <div className="mt-1.5 text-sm">
            {hasCurrent && (
              <div className="text-gray-500 dark:text-slate-400 line-through whitespace-pre-wrap break-words">
                {displayValue(proposal.currentValue)}
              </div>
            )}
            <div className="text-gray-900 dark:text-white whitespace-pre-wrap break-words">
              {displayValue(proposal.value)}
            </div>
          </div>

          {proposal.conflict && (
            <p className="mt-2 rounded border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-2 py-1 text-xs text-amber-900 dark:text-amber-200">
              Your records disagree: {proposal.conflict}
            </p>
          )}

          <figure className="mt-2 border-l-2 border-gray-200 dark:border-blue-950/40 pl-2.5">
            <blockquote className="flex gap-1.5 text-xs italic leading-relaxed text-gray-600 dark:text-slate-300">
              <Quote className="h-3 w-3 mt-0.5 shrink-0 text-gray-400 dark:text-slate-500" aria-hidden="true" />
              <span className="break-words">{proposal.evidence}</span>
            </blockquote>
            <figcaption className="mt-1 text-[11px] text-gray-500 dark:text-slate-400">
              {SOURCE_LABEL[proposal.source]}
            </figcaption>
          </figure>
        </div>
      </div>
    </li>
  );
}

export function KnobProposals({
  result,
  saving,
  onApply,
  onDismiss,
}: {
  result: KnobProposalsResult;
  saving: boolean;
  /** Receives only the ticked proposals, as a knob-values patch. */
  onApply: (values: Record<string, unknown>) => Promise<string[]>;
  onDismiss: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    // Well-sourced proposals start ticked; anything flagged starts unticked so
    // an unread "apply all" cannot pull in the doubtful ones.
    () => new Set(result.proposals.filter((p) => !p.needsCloserReview).map((p) => p.key)),
  );
  const [errors, setErrors] = useState<string[]>([]);

  const flaggedCount = useMemo(
    () => result.proposals.filter((p) => p.needsCloserReview).length,
    [result.proposals],
  );

  const toggle = (key: string, next: boolean) => {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(key);
      else copy.delete(key);
      return copy;
    });
  };

  const apply = async () => {
    const values: Record<string, unknown> = {};
    for (const p of result.proposals) {
      if (selected.has(p.key)) values[p.key] = p.value;
    }
    setErrors(await onApply(values));
  };

  const { conversations, prompts, usedSamples } = result.scanned;

  return (
    <div className="mt-2 rounded-lg border border-gray-200 dark:border-blue-950/40 bg-gray-50 dark:bg-[#000c3b] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            {result.proposals.length} setting{result.proposals.length === 1 ? '' : 's'} found
          </h4>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-slate-300">
            Read from {usedSamples ? 'the chats you picked' : `${conversations} conversation${conversations === 1 ? '' : 's'}`}
            {prompts > 0 && ` and your assistant’s instructions`}. Nothing is saved until you apply.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          disabled={saving}
          aria-label="Close suggestions"
          className="shrink-0 rounded p-1 text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-white disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {flaggedCount > 0 && (
        <p className="mt-2 text-xs text-amber-800 dark:text-amber-300">
          {flaggedCount} {flaggedCount === 1 ? 'suggestion needs' : 'suggestions need'} a closer look
          and {flaggedCount === 1 ? 'is' : 'are'} left unticked - they came from the assistant’s own
          replies, or your records disagreed.
        </p>
      )}

      {errors.length > 0 && (
        <ul role="alert" className="mt-2 space-y-0.5 rounded border border-red-200 bg-red-50 p-2 text-xs text-red-800">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}

      <ul className="mt-3 space-y-2">
        {result.proposals.map((p) => (
          <ProposalRow
            key={p.key}
            proposal={p}
            checked={selected.has(p.key)}
            onToggle={(next) => toggle(p.key, next)}
            disabled={saving}
          />
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={apply}
          disabled={saving || selected.size === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-slate-600"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Apply {selected.size} setting{selected.size === 1 ? '' : 's'}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          disabled={saving}
          className="text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
        >
          Discard
        </button>
      </div>
    </div>
  );
}

/**
 * The two ways to start a scan, plus its busy and error states.
 *
 * Reading everything is offered first because it needs no decisions. Picking
 * specific chats is the better input - a studio knows which conversations went
 * the way they want - but it is work, so it is the second option rather than
 * the gate.
 */
export function ScanHistoryButton({
  isScanning,
  error,
  onScan,
  onPick,
  onUpload,
}: {
  isScanning: boolean;
  error: string | null;
  onScan: () => void;
  onPick: () => void;
  /** Open the WhatsApp-export upload - for history OLDER than the account. */
  onUpload: () => void;
}) {
  return (
    <div className="mt-1">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onScan}
          disabled={isScanning}
          className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 dark:border-blue-950/40 px-2.5 py-1 text-xs font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-[#071131] disabled:opacity-60"
        >
          {isScanning
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
            : <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />}
          {isScanning ? 'Reading your history…' : 'Fill from my history'}
        </button>
        <button
          type="button"
          onClick={onPick}
          disabled={isScanning}
          className="text-xs text-gray-600 dark:text-slate-300 underline underline-offset-2 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
        >
          or pick specific chats
        </button>
        <button
          type="button"
          onClick={onUpload}
          disabled={isScanning}
          className="text-xs text-gray-600 dark:text-slate-300 underline underline-offset-2 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
        >
          or upload a chat export
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1.5 text-xs text-amber-800 dark:text-amber-300">{error}</p>
      )}
    </div>
  );
}
