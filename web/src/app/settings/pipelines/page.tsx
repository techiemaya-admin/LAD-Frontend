'use client';

/**
 * /settings/pipelines — the curated-pipeline settings for a snapshot workspace.
 *
 * The backend has served this since the snapshot work landed and nothing had
 * ever called it: GET /api/snapshot/pipelines had zero frontend callers, so
 * every knob — including the pre-class communications ones — could only be set
 * by hand against the API.
 *
 * The screen is GENERIC. The overview sends each pipeline's knob DEFINITIONS
 * next to its values ("the form to render, and the values to render it with"),
 * so a knob added to the snapshot manifest appears here with no change to this
 * file. That is deliberate: a vertical grows knobs steadily, and a screen that
 * needs editing for each one stops being maintained.
 *
 * Tenant scope comes from the JWT — this page never sends a tenant id, and the
 * controller reads it from the token only.
 */

export const dynamic = 'force-dynamic';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { apiGet, apiPatch } from '@/lib/api';
import { useToast } from '@/components/ui/app-toaster';
import { Button } from '@/components/ui/button';

import { PipelineCard } from './components/PipelineCard';
import type { KnobValue, PipelineOverview } from './types';

interface Envelope<T> { success: boolean; data: T }

export default function PipelinesSettingsPage() {
  const { push } = useToast();
  const [overview, setOverview] = useState<PipelineOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    try {
      const res = await apiGet<Envelope<PipelineOverview>>(
        '/api/snapshot/pipelines', { signal },
      );
      setOverview(res.data);
      setError(null);
    } catch {
      // Distinguishing "you have no snapshot" from "the request failed"
      // matters: the first is a normal state for most workspaces, the second
      // needs someone to look. The controller answers 404 for the former, but
      // apiGet collapses both into a throw, so say the honest thing.
      setError('Could not load your pipelines.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    return () => ac.abort();
  }, [load]);

  const toggleActive = async (key: string, active: boolean) => {
    try {
      await apiPatch(`/api/snapshot/pipelines/${key}`, { active });
      // Re-read rather than patching local state: activation is gated
      // server-side (entitlement, snapshot state), so the truth is what came
      // back, not what was clicked.
      await load();
      push({ variant: 'success', title: active ? 'Turned on' : 'Turned off' });
    } catch {
      push({ variant: 'error', title: 'Could not change that', description: 'Please try again.' });
      await load();
    }
  };

  const saveKnobs = async (key: string, values: Record<string, KnobValue>) => {
    try {
      await apiPatch(`/api/snapshot/pipelines/${key}/knobs`, { values });
      await load();
      push({ variant: 'success', title: 'Settings saved' });
    } catch {
      // The service validates and can reject individual fields; without a
      // reload the form would keep showing values the server refused.
      push({
        variant: 'error',
        title: 'Could not save',
        description: 'Some settings were not accepted. Your changes are still here.',
      });
      throw new Error('save failed');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Link href="/settings">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Settings
        </Button>
      </Link>

      <h1 className="text-xl font-semibold">Pipelines</h1>
      {overview?.vertical ? (
        <p className="mt-1 text-sm text-muted-foreground">
          {overview.vertical} edition{overview.version ? ` · v${overview.version}` : ''}
        </p>
      ) : null}

      {error ? (
        <p className="mt-6 text-sm text-red-500">{error}</p>
      ) : !overview?.pipelines?.length ? (
        <p className="mt-6 text-sm text-muted-foreground">
          This workspace doesn&apos;t run curated pipelines.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {overview.pipelines.map((p) => (
            <PipelineCard
              key={p.key}
              pipeline={p}
              onToggleActive={toggleActive}
              onSaveKnobs={saveKnobs}
            />
          ))}
        </div>
      )}
    </div>
  );
}
