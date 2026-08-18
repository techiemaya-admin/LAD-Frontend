'use client';

/**
 * Pipelines — the curated workspace's home screen.
 *
 * This is the surface that REPLACES the workflow builder for a tenant on a
 * vertical snapshot. They do not compose nodes; they switch prebuilt pipelines
 * on and off. Every card is one of three states, which is the whole model:
 *
 *   locked     not entitled — shown, with what it would do, and no switch
 *   off        entitled, tenant has not switched it on
 *   on         entitled and running
 *
 * "Locked" is deliberately shown rather than hidden: hiding everything a
 * workspace lacks removes the only route by which they discover it exists.
 *
 * BUILD STATE IS A SECOND, INDEPENDENT AXIS
 * A pipeline the manifest marks `planned` is entitled and switchable, but no
 * engine runs it yet. Rendering it identically to a `live` one is the single
 * most misleading thing this page can do: the switch looks like it started
 * work, and the tenant waits for an agent that was never going to reply. So a
 * non-live pipeline is labelled, and switching it on says what that actually
 * means — the choice is recorded and takes effect when the pipeline ships.
 *
 * Only `live` is treated as running. An unrecognised state — one added to a
 * later manifest and deployed ahead of this page — reads as not-live, so a
 * frontend that has not caught up understates rather than overstates.
 *
 * The switch changes ACTIVATION only. It cannot grant an entitlement — the
 * server refuses, and the optimistic update in usePipelines rolls back.
 */

import React, { useState } from 'react';
import { Lock, Loader2, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import { usePipelines, useKnobProposals } from '@lad/frontend-features/snapshots';
import type { SnapshotPipeline, KnobValues } from '@lad/frontend-features/snapshots';
import { KnobForm } from '@/components/pipelines/KnobForm';
import { KnobProposals, ScanHistoryButton } from '@/components/pipelines/KnobProposals';
import { ConversationPicker } from '@/components/pipelines/ConversationPicker';
import { useAuth } from '@/contexts/AuthContext';

/** Only `live` means an engine is actually running this pipeline. Unknown
 *  states fail closed — see the header comment. */
function isLive(pipeline: SnapshotPipeline) {
  return pipeline.state === 'live';
}

/** Wording per known build state, falling back to a neutral label so a state
 *  this build has never heard of still renders honestly. */
const BUILD_STATE_LABEL: Record<string, string> = {
  planned: 'Not running yet',
  building: 'Being built',
};

function BuildStateBadge({ pipeline }: { pipeline: SnapshotPipeline }) {
  if (isLive(pipeline)) return null;
  const label = (pipeline.state && BUILD_STATE_LABEL[pipeline.state]) || 'Not running yet';
  return (
    <span className="shrink-0 rounded-md border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-300">
      {label}
    </span>
  );
}

function EngineHint({ pipeline }: { pipeline: SnapshotPipeline }) {
  if (!pipeline.goal) return null;
  return (
    <span className="text-xs text-gray-500 dark:text-slate-400">
      Aims for: <span className="font-medium text-gray-700 dark:text-slate-300">{pipeline.goal.replace(/-/g, ' ')}</span>
    </span>
  );
}

function PipelineCard({
  pipeline,
  pending,
  saving,
  onToggle,
  onSaveKnobs,
}: {
  pipeline: SnapshotPipeline;
  pending: boolean;
  saving: boolean;
  onToggle: (active: boolean) => void;
  onSaveKnobs: (values: KnobValues) => Promise<string[]>;
}) {
  const { key, name, blurb, entitled, active, campaignCount, knobs, knobValues } = pipeline;
  const live = isLive(pipeline);
  const toggleId = `pipeline-toggle-${key}`;
  const [showSettings, setShowSettings] = useState(false);
  const hasKnobs = entitled && knobs.length > 0;
  // Per-card, so two open cards do not share one set of suggestions. Mounted
  // with the card rather than with the settings panel so a scan survives the
  // panel being collapsed and reopened.
  const proposals = useKnobProposals(key);
  // Idle → picking → reviewing. Held here rather than in the picker so leaving
  // the picker cannot strand a half-made selection.
  const [pickingChats, setPickingChats] = useState(false);

  return (
    <div
      className={`rounded-xl border p-5 flex flex-col gap-3 transition-colors ${
        entitled ? 'border-gray-200 dark:border-blue-950/40 bg-white dark:bg-[#071131]' : 'border-gray-200 dark:border-blue-950/40 bg-gray-50 dark:bg-[#000c3b]'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white truncate">{name}</h3>
            {!entitled && <Lock className="h-3.5 w-3.5 text-gray-400 dark:text-slate-500 shrink-0" aria-hidden="true" />}
            <BuildStateBadge pipeline={pipeline} />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-gray-600 dark:text-slate-300">{blurb}</p>
        </div>

        {entitled ? (
          <label htmlFor={toggleId} className="flex items-center gap-2 shrink-0 cursor-pointer">
            <span className="sr-only">
              {live
                ? (active ? `Turn ${name} off` : `Turn ${name} on`)
                : (active
                    ? `Turn ${name} off. Not running yet.`
                    : `Turn ${name} on. Not running yet — starts when this pipeline ships.`)}
            </span>
            <input
              id={toggleId}
              type="checkbox"
              role="switch"
              checked={active}
              disabled={pending}
              onChange={(e) => onToggle(e.target.checked)}
              className="h-5 w-9 appearance-none rounded-full bg-gray-300 dark:bg-slate-600 checked:bg-emerald-600 dark:checked:bg-emerald-600 relative cursor-pointer transition-colors disabled:opacity-50 before:content-[''] before:absolute before:top-0.5 before:left-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform checked:before:translate-x-4"
            />
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400 dark:text-slate-500" aria-hidden="true" />}
          </label>
        ) : (
          <span className="shrink-0 rounded-md bg-gray-200 dark:bg-slate-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-slate-300">
            Not in your plan
          </span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 dark:border-blue-950/40 pt-3">
        <EngineHint pipeline={pipeline} />
        {entitled && (
          <span className="text-xs text-gray-500 dark:text-slate-400 tabular-nums">
            {!live
              ? (active ? 'On — starts when this ships' : 'Available when this ships')
              : campaignCount === 0
                ? 'No campaigns yet'
                : `${campaignCount} campaign${campaignCount === 1 ? '' : 's'}`}
          </span>
        )}
      </div>

      {hasKnobs && (
        <>
          <button
            type="button"
            onClick={() => setShowSettings((s) => !s)}
            aria-expanded={showSettings}
            className="-mt-1 flex items-center gap-1 self-start text-xs font-medium text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white"
          >
            {showSettings
              ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
            Settings
          </button>

          {/* Mounted only when open so each card keeps its own draft state and
              a collapse discards edits rather than holding them invisibly. */}
          {showSettings && (
            <>
              {/* Offered above the form: filling 27 fields by hand is the real
                  cost here, and most of the answers are already in the
                  workspace's own history. */}
              {proposals.result ? (
                <KnobProposals
                  result={proposals.result}
                  saving={saving}
                  onApply={async (values) => {
                    const errs = await onSaveKnobs(values);
                    // Keep the panel open when the server rejected something —
                    // dismissing would hide both the errors and the evidence
                    // needed to judge them.
                    if (!errs.length) proposals.dismiss();
                    return errs;
                  }}
                  onDismiss={proposals.dismiss}
                />
              ) : pickingChats ? (
                <ConversationPicker
                  isScanning={proposals.isScanning}
                  onCancel={() => setPickingChats(false)}
                  onScan={async (ids) => {
                    await proposals.scan(ids);
                    // Leave the picker only once the scan has returned: closing
                    // on click would drop the user back to the buttons with no
                    // sign anything was happening.
                    setPickingChats(false);
                  }}
                />
              ) : (
                <ScanHistoryButton
                  isScanning={proposals.isScanning}
                  error={proposals.error}
                  onScan={() => void proposals.scan()}
                  onPick={() => setPickingChats(true)}
                />
              )}

              <KnobForm
                knobs={knobs}
                values={knobValues}
                saving={saving}
                onSave={onSaveKnobs}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}

export default function PipelinesPage() {
  const { overview, isLoading, error, pendingKey, savingKey, toggle, saveKnobs } = usePipelines();
  const { isCuratedWorkspace } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-500 dark:text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin mr-2" aria-hidden="true" />
        Loading your pipelines…
      </div>
    );
  }

  // A tenant outside a snapshot reaching this route is not an error — they
  // simply run the general-purpose product, where campaigns are built rather
  // than switched on.
  if (!isCuratedWorkspace || !overview?.vertical) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-20 text-center">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Pipelines aren&apos;t set up for this workspace</h1>
        <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-slate-300">
          Curated pipelines come with an industry edition of Mr LAD. Your workspace builds
          campaigns directly instead.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Pipelines</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-gray-600 dark:text-slate-300">
          Switch on the work you want Mr LAD doing. Each pipeline is built for your industry
          and runs on its own.
        </p>
        {overview.version && (
          <p className="mt-2 text-xs text-gray-400 dark:text-slate-500 tabular-nums">
            {overview.vertical} edition · v{overview.version}
          </p>
        )}
      </header>

      {error && (
        <div
          role="alert"
          className="mb-6 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 items-start">
        {overview.pipelines.map((pipeline) => (
          <PipelineCard
            key={pipeline.key}
            pipeline={pipeline}
            pending={pendingKey === pipeline.key}
            saving={savingKey === pipeline.key}
            onToggle={(active) => void toggle(pipeline.key, active)}
            onSaveKnobs={(values) => saveKnobs(pipeline.key, values)}
          />
        ))}
      </div>
    </div>
  );
}
