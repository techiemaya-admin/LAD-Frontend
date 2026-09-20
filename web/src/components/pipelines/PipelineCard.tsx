'use client';

/**
 * PipelineCard — one prebuilt pipeline: what it does, whether it is on, and
 * its settings. The ONE implementation (the Pipelines room in the Tenant
 * Studio renders it; `/pipelines` and `/settings/pipelines` redirect there).
 *
 * Every card is one of three states, which is the whole model:
 *
 *   locked     not entitled — shown, with what it would do, and no switch
 *   off        entitled, the tenant has not switched it on
 *   on         entitled and running
 *
 * "Locked" is deliberately shown rather than hidden: hiding everything a
 * workspace lacks removes the only route by which they discover it exists.
 *
 * BUILD STATE IS A SECOND, INDEPENDENT AXIS
 * A pipeline the manifest marks `planned` is entitled but no engine runs it
 * yet, and the server refuses to switch it on. Rendering it like a `live`
 * one is the single most misleading thing this card can do — the switch
 * would look like it started work — so a non-live pipeline is labelled and
 * its switch is disabled (still togglable when it is already ON, so a tenant
 * who activated one before the guard existed can turn it off). Its settings
 * can be filled in now; they are saved and used when it ships.
 *
 * Only `live` is treated as running. An unrecognised state — one added to a
 * later manifest and deployed ahead of this build — reads as not-live, so a
 * frontend that has not caught up understates rather than overstates.
 *
 * The switch changes ACTIVATION only. It cannot grant an entitlement — the
 * server refuses, and the optimistic update in usePipelines rolls back.
 *
 * SAVE SEMANTICS: KnobForm sends only the fields that changed. PATCH merges
 * server-side, and a tenant pinned to an older snapshot version renders only
 * THAT version's knobs — echoing the whole form back would rewrite values
 * the newer version owns.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Loader2, Lock, Target } from 'lucide-react';
import { useKnobProposals } from '@lad/frontend-features/snapshots';
import type { KnobValues, SnapshotPipeline } from '@lad/frontend-features/snapshots';
import { KnobForm } from '@/components/pipelines/KnobForm';
import { KnobProposals, ScanHistoryButton } from '@/components/pipelines/KnobProposals';
import { ConversationPicker } from '@/components/pipelines/ConversationPicker';
import { TranscriptUpload } from '@/components/pipelines/TranscriptUpload';
import { BORDER, CARD, CARD_ACTIVE, H_CARD, STATUS, TILE_OFF, TINT } from '@/components/studio/studio-theme';

/** Only `live` means an engine is actually running this pipeline. Unknown states fail closed. */
export function isLivePipeline(pipeline: Pick<SnapshotPipeline, 'state'>): boolean {
  return pipeline.state === 'live';
}

/** Wording per known build state, falling back to a neutral label so a state this build has never heard of still renders honestly. */
const BUILD_STATE_LABEL: Record<string, string> = {
  planned: 'Coming soon',
  building: 'Being built',
};

export function buildStateLabel(pipeline: Pick<SnapshotPipeline, 'state'>): string {
  return (pipeline.state && BUILD_STATE_LABEL[pipeline.state]) || 'Coming soon';
}

/** The manifest's goal event ('trial-booked') in plain words. */
export function goalLabel(goal: string | null | undefined): string | null {
  if (!goal) return null;
  return goal.replace(/[-_]/g, ' ');
}

function BuildStateBadge({ pipeline }: { pipeline: SnapshotPipeline }) {
  if (isLivePipeline(pipeline)) return null;
  return (
    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS.warn}`}>
      {buildStateLabel(pipeline)}
    </span>
  );
}

export interface PipelineCardProps {
  pipeline: SnapshotPipeline;
  /** The switch is mid-flight. */
  pending: boolean;
  /** The settings are saving. */
  saving: boolean;
  onToggle: (active: boolean) => void;
  /** Returns the server's per-field messages, or [] on success. */
  onSaveKnobs: (values: KnobValues) => Promise<string[]>;
  /** Open the settings panel on mount (a launch row sent the tenant here to fill them in). */
  defaultOpen?: boolean;
}

export function PipelineCard({ pipeline, pending, saving, onToggle, onSaveKnobs, defaultOpen = false }: PipelineCardProps) {
  const { key, name, blurb, entitled, active, campaignCount, knobs, knobValues } = pipeline;
  const live = isLivePipeline(pipeline);
  const toggleId = `pipeline-toggle-${key}`;
  const [showSettings, setShowSettings] = useState(defaultOpen);
  const hasKnobs = entitled && knobs.length > 0;
  // Per-card, so two open cards do not share one set of suggestions. Mounted
  // with the card rather than with the settings panel so a scan survives the
  // panel being collapsed and reopened.
  const proposals = useKnobProposals(key);
  // Idle → (picking | uploading) → reviewing. One field, not two booleans, so
  // the picker and the upload panel can never be open at once.
  const [sourceMode, setSourceMode] = useState<'pick' | 'upload' | null>(null);
  const switchDisabled = pending || !entitled || (!live && !active);
  const goal = goalLabel(pipeline.goal);

  return (
    <section
      className={`flex flex-col gap-3 p-4 sm:p-5 ${entitled && active ? CARD_ACTIVE : CARD} ${entitled ? '' : TILE_OFF}`}
      data-testid={`pipeline-card-${key}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`text-base ${H_CARD}`}>{name}</h3>
            {!entitled && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />}
            <BuildStateBadge pipeline={pipeline} />
          </div>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{blurb}</p>
        </div>

        {entitled ? (
          <label htmlFor={toggleId} className={`flex shrink-0 items-center gap-2 ${switchDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
            <span className="sr-only">
              {live
                ? (active ? `Turn ${name} off` : `Turn ${name} on`)
                : (active ? `Turn ${name} off. Not running yet.` : `${name} cannot be switched on until it ships.`)}
            </span>
            <input
              id={toggleId}
              type="checkbox"
              role="switch"
              checked={active}
              disabled={switchDisabled}
              onChange={(e) => onToggle(e.target.checked)}
              className="relative h-5 w-9 cursor-pointer appearance-none rounded-full bg-slate-300 transition-colors before:absolute before:left-0.5 before:top-0.5 before:h-4 before:w-4 before:rounded-full before:bg-white before:transition-transform before:content-[''] checked:bg-gradient-to-r checked:from-[#2B7CFF] checked:via-[#7C5CFF] checked:to-[#C049FF] checked:before:translate-x-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7C5CFF]/60 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-white/20"
            />
            {pending && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" aria-hidden="true" />}
          </label>
        ) : (
          <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS.optional}`}>
            Not in your plan
          </span>
        )}
      </div>

      <div className={`flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t ${BORDER} pt-3`}>
        {goal ? (
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Target className="h-3.5 w-3.5 text-[#7C5CFF] dark:text-[#B69CFF]" aria-hidden="true" />
            Aims for: <span className="font-medium text-foreground">{goal}</span>
          </span>
        ) : <span />}
        {entitled && (
          <span className={`text-xs tabular-nums ${active && live ? TINT.readyText : 'text-muted-foreground'}`}>
            {!live
              ? (active ? 'On — starts when this ships' : 'Available when this ships')
              : !active
                ? 'Off'
                : campaignCount === 0
                  ? 'On — no campaigns yet'
                  : `On — ${campaignCount} campaign${campaignCount === 1 ? '' : 's'}`}
          </span>
        )}
      </div>

      {hasKnobs && (
        <>
          <button
            type="button"
            onClick={() => setShowSettings((s) => !s)}
            aria-expanded={showSettings}
            className="-mt-1 flex items-center gap-1 self-start text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-[#7C5CFF] dark:hover:text-[#B69CFF]"
            data-testid={`pipeline-settings-${key}`}
          >
            {showSettings
              ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              : <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />}
            Settings ({knobs.length})
          </button>

          {/* Mounted only when open so each card keeps its own draft state and
              a collapse discards edits rather than holding them invisibly. */}
          {showSettings && (
            <>
              {!live && (
                <p className="text-xs text-muted-foreground">
                  You can fill these in now and they will be saved. This pipeline can&rsquo;t be switched on until it ships.
                </p>
              )}
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
              ) : sourceMode === 'pick' ? (
                <ConversationPicker
                  isScanning={proposals.isScanning}
                  onCancel={() => setSourceMode(null)}
                  onScan={async (ids) => {
                    await proposals.scan(ids);
                    // Leave the picker only once the scan has returned: closing
                    // on click would drop the user back to the buttons with no
                    // sign anything was happening.
                    setSourceMode(null);
                  }}
                />
              ) : sourceMode === 'upload' ? (
                <TranscriptUpload
                  pipeline={key}
                  isScanning={proposals.isScanning}
                  onCancel={() => setSourceMode(null)}
                  onScan={async (transcript, studioParticipants) => {
                    await proposals.scanUpload(transcript, studioParticipants);
                    setSourceMode(null);
                  }}
                />
              ) : (
                <ScanHistoryButton
                  isScanning={proposals.isScanning}
                  error={proposals.error}
                  onScan={() => void proposals.scan()}
                  onPick={() => setSourceMode('pick')}
                  onUpload={() => setSourceMode('upload')}
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
    </section>
  );
}

export default PipelineCard;
