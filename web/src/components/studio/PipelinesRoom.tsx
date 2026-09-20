'use client';

/**
 * PipelinesRoom — the curated workspace's home room inside the Tenant Studio.
 *
 * A tenant on an industry edition does not compose nodes; they switch the
 * prebuilt pipelines on and off and fill in each one's settings. This room
 * is that surface: one PipelineCard per pipeline the edition ships, read
 * from GET /api/snapshot/pipelines (the knob DEFINITIONS come with the
 * values, so a knob added to the manifest appears here with no change).
 *
 * Reached from the Pipelines tab, the entry tile, the sidebar item, the
 * `/pipelines` and `/settings/pipelines` redirects (`/studio?room=pipelines`),
 * and from a Step 9 launch row whose `fix.room` is `'pipelines'` — in that
 * case `focusKey` opens that pipeline's settings straight away.
 */
import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Loader2, SlidersHorizontal } from 'lucide-react';
import { usePipelines } from '@lad/frontend-features/snapshots';
import type { KnobValues, PipelineKey } from '@lad/frontend-features/snapshots';
import { studioKeys } from '@lad/frontend-features/tenant-studio';
import { PipelineCard } from '@/components/pipelines/PipelineCard';
import { CARD, H_CARD, ICON_TILE, SKELETON, STATUS } from './studio-theme';

/** The one address for this room; the sidebar item and the old routes point here. */
export const PIPELINES_ROOM_HREF = '/studio?room=pipelines';

export interface PipelinesRoomProps {
  /** A pipeline whose settings should open on arrival (a launch row sent the tenant to fill them in). */
  focusKey?: string | null;
}

export default function PipelinesRoom({ focusKey = null }: PipelinesRoomProps) {
  const { overview, isLoading, error, pendingKey, savingKey, toggle, saveKnobs } = usePipelines();
  const focusRef = useRef<HTMLDivElement | null>(null);
  // The studio state (`workspace.pipelines`, the launch rows' knobsMissing) is
  // a separate query; a switch or a saved setting changes what it reports.
  const qc = useQueryClient();
  const refreshStudio = () => { void qc.invalidateQueries({ queryKey: studioKeys.all }); };
  const toggleAndRefresh = async (key: PipelineKey, active: boolean) => { await toggle(key, active); refreshStudio(); };
  const saveAndRefresh = async (key: PipelineKey, values: KnobValues) => { const errs = await saveKnobs(key, values); if (!errs.length) refreshStudio(); return errs; };

  // Scroll the focused card into view once, after the cards exist.
  useEffect(() => {
    if (!focusKey || !overview || !focusRef.current) return;
    focusRef.current.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }, [focusKey, overview]);

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" data-testid="pipelines-room-loading">
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />Loading your pipelines…</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`${SKELETON} h-36`} />
          <div className={`${SKELETON} h-36`} />
        </div>
      </div>
    );
  }

  // Failure is not emptiness: a request that failed says so, and a workspace
  // outside an edition is told that its campaigns are built, not switched on.
  if (!overview) {
    return (
      <p className={`rounded-2xl border p-4 text-sm ${STATUS.needed}`} role="alert" data-testid="pipelines-room-error">
        {error || 'Could not load your pipelines.'} Refresh, or try again in a moment.
      </p>
    );
  }
  if (!overview.vertical || overview.pipelines.length === 0) {
    return (
      <div className={`${CARD} p-5`} data-testid="pipelines-room-empty">
        <h3 className={`text-base ${H_CARD}`}>Pipelines aren&rsquo;t set up for this workspace</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Prebuilt pipelines come with an industry edition of Mr LAD. Your workspace builds campaigns directly instead.
        </p>
      </div>
    );
  }

  const on = overview.pipelines.filter((p) => p.entitled && p.active).length;
  const available = overview.pipelines.filter((p) => p.entitled).length;

  return (
    <div className="space-y-4" data-testid="pipelines-room">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="flex items-start gap-3">
          <span className={`${ICON_TILE} mt-0.5 h-9 w-9 shrink-0`}><SlidersHorizontal className="h-5 w-5" aria-hidden="true" /></span>
          <div>
            <h2 className={`text-lg ${H_CARD}`}>Pipelines</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Switch on the work you want Mr LAD doing. Each pipeline is built for your industry and runs on its own.
            </p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground tabular-nums" data-testid="pipelines-room-count">
          {on} on, {available} available{overview.version ? ` · ${overview.vertical} edition v${overview.version}` : ` · ${overview.vertical} edition`}
        </p>
      </div>

      {error && (
        <p role="alert" className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${STATUS.warn}`}>
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </p>
      )}

      <div className="grid items-start gap-3 sm:grid-cols-2">
        {overview.pipelines.map((pipeline) => (
          <div key={pipeline.key} ref={pipeline.key === focusKey ? focusRef : undefined} className="min-w-0 scroll-mt-4">
            <PipelineCard
              pipeline={pipeline}
              pending={pendingKey === pipeline.key}
              saving={savingKey === pipeline.key}
              defaultOpen={pipeline.key === focusKey}
              onToggle={(active) => void toggleAndRefresh(pipeline.key as PipelineKey, active)}
              onSaveKnobs={(values) => saveAndRefresh(pipeline.key as PipelineKey, values)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
