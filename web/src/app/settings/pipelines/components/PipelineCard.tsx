'use client';

/**
 * One pipeline: what it is, whether it is on, and its settings.
 *
 * SAVE SEMANTICS — the reason this sends only what changed
 * PATCH /pipelines/:key/knobs merges (knobSchema.mergeKnobValues). Sending the
 * whole rendered form would still be a merge, so it would not delete anything;
 * but a tenant pinned to an older snapshot version renders only THAT version's
 * knobs, and echoing them back rewrites values the newer version owns with
 * whatever the older form happened to resolve. Sending the dirty keys only
 * keeps an edit to one field an edit to one field.
 */

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';

import { KnobField } from './KnobField';
import type { KnobValue, Pipeline } from '../types';

interface Props {
  pipeline: Pipeline;
  onToggleActive: (key: string, active: boolean) => Promise<void>;
  onSaveKnobs: (key: string, values: Record<string, KnobValue>) => Promise<void>;
}

export function PipelineCard({ pipeline, onToggleActive, onSaveKnobs }: Props) {
  const [draft, setDraft] = useState<Record<string, KnobValue>>({});
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);

  const dirty = useMemo(() => Object.keys(draft), [draft]);

  const valueOf = (key: string): KnobValue =>
    key in draft ? draft[key] : (pipeline.knobValues?.[key] ?? null);

  const change = (key: string, value: KnobValue) =>
    setDraft((d) => ({ ...d, [key]: value }));

  const save = async () => {
    if (!dirty.length) return;
    setSaving(true);
    try {
      await onSaveKnobs(pipeline.key, draft);
      setDraft({});
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (next: boolean) => {
    setToggling(true);
    try {
      await onToggleActive(pipeline.key, next);
    } finally {
      setToggling(false);
    }
  };

  const planned = pipeline.state === 'planned';

  return (
    <section className="rounded-lg border border-black/10 dark:border-white/10">
      <header className="flex items-start justify-between gap-4 p-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{pipeline.name}</h2>
            {planned ? (
              // Not decoration. The server REFUSES to activate a pipeline the
              // manifest still calls `planned`, so this badge and the disabled
              // switch below are the UI half of a rule that is enforced
              // whether or not we render it.
              <Badge variant="secondary">Not built yet</Badge>
            ) : null}
            {!pipeline.entitled ? <Badge variant="outline">Not in your plan</Badge> : null}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{pipeline.blurb}</p>
          {planned ? (
            <p className="mt-1 text-xs text-muted-foreground">
              You can fill these in now and they will be saved. This pipeline
              can&apos;t be switched on until it ships.
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {toggling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {/*
            Disabled while planned. The server returns 400 pipeline_not_built_yet
            for that case, so an enabled switch offers a click that cannot
            succeed — and the honest place to say so is here, not in an error
            toast after the fact.

            Still togglable when it is already ON: a tenant who activated one
            before the server-side guard existed has to be able to turn it off.
          */}
          <Switch
            checked={pipeline.active}
            onCheckedChange={toggle}
            disabled={!pipeline.entitled || toggling || (planned && !pipeline.active)}
            aria-label={`Turn ${pipeline.name} ${pipeline.active ? 'off' : 'on'}`}
          />
        </div>
      </header>

      {pipeline.knobs?.length ? (
        <div className="border-t border-black/10 px-4 pb-4 dark:border-white/10">
          <div className="divide-y divide-black/5 dark:divide-white/5">
            {pipeline.knobs.map((def) => (
              <KnobField
                key={def.key}
                def={def}
                value={valueOf(def.key)}
                onChange={change}
                disabled={!pipeline.entitled}
              />
            ))}
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Button onClick={save} disabled={!dirty.length || saving || !pipeline.entitled}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save changes
            </Button>
            {dirty.length ? (
              <span className="text-xs text-muted-foreground">
                {dirty.length} unsaved {dirty.length === 1 ? 'change' : 'changes'}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
