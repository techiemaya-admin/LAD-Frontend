/**
 * /settings/icp-search-strategy - strategy editor for the tenant's active ICP.
 *
 * Loads the canonical active ICP via useActiveIcpDefinition, hands its
 * `icp_definition.search_strategy` to SearchStrategyEditor, and persists
 * changes via useIcpDefinitionMutations.update().
 *
 * Save semantics: the backend's UpdateIcpDefinitionInput replaces
 * `icp_definition` wholesale, so we send the unchanged ICP shape with just
 * the `search_strategy` block swapped in. Server-side `apollo_payload_hash`
 * gets recomputed automatically on the next dispatcher run.
 */
'use client';

export const dynamic = 'force-dynamic';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

import Link from 'next/link';

import {
  useActiveIcpDefinition,
  useIcpDefinitionMutations,
} from '@lad/frontend-features/ai-icp-assistant';
import type {
  IcpStructured,
  SearchStrategy,
} from '@lad/frontend-features/ai-icp-assistant';

import { SearchStrategyEditor } from './components/SearchStrategyEditor';

const DEFAULT_STRATEGY: SearchStrategy = {
  discovery_order: ['apollo', 'sales_navigator'],
  apollo: { enabled: true, max_results_per_run: 500 },
  sales_navigator: { enabled: true, max_results_per_run: 100 },
  abm: { enabled: false, target_accounts: [] },
  fallback_rules: {
    if_apollo_returns_zero: 'try_sales_navigator',
    if_company_has_named_target: 'use_abm_only',
    if_total_cap_reached: 'stop',
  },
  deduplication: {
    key_priority: ['linkedin_url', 'email', 'phone_e164', 'apollo_id', 'linkedin_member_urn'],
    cross_backend_merge: 'highest_confidence',
  },
  total_cap_per_run: 800,
  total_cap_per_day: 2000,
};

function strategyEqual(a: SearchStrategy, b: SearchStrategy): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

export default function IcpSearchStrategyPage() {
  const { definition, loading, error: loadError, refetch } = useActiveIcpDefinition();
  const { update, loading: saving, error: saveError } = useIcpDefinitionMutations({
    onSuccess: refetch,
  });

  // Local working copy of the strategy. Initialised from the loaded definition.
  const [draft, setDraft] = useState<SearchStrategy | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // Seed the draft when the definition loads (and re-seed if it changes).
  useEffect(() => {
    if (!definition) return;
    const current = definition.icp_definition?.search_strategy ?? DEFAULT_STRATEGY;
    setDraft(current);
  }, [definition]);

  const original = useMemo<SearchStrategy>(() => {
    return definition?.icp_definition?.search_strategy ?? DEFAULT_STRATEGY;
  }, [definition]);

  const dirty = useMemo(() => {
    if (!draft) return false;
    return !strategyEqual(draft, original);
  }, [draft, original]);

  const handleSave = async () => {
    if (!definition || !draft) return;
    const nextIcp: IcpStructured = {
      ...definition.icp_definition,
      search_strategy: draft,
    };
    await update(definition.id, { icp_definition: nextIcp });
    setSavedAt(Date.now());
  };

  const handleReset = () => {
    setDraft(original);
  };

  const handleResetToDefaults = () => {
    setDraft(DEFAULT_STRATEGY);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-8">
      <header className="mb-6">
        {/* Back Button */}
        <div className="mb-4 sm:hidden sm:mb-6">
          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors p-0 h-auto hover:bg-transparent group"
          >
            <div className="p-1.5 rounded-full bg-white shadow-sm border border-slate-200 group-hover:border-slate-300 transition-all">
              <ArrowLeft className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm">Back</span>
          </Button>
        </div>
        <nav className="text-xs text-gray-500">
          <Link href="/settings" className="hover:underline">
            Settings
          </Link>{' '}
          /{' '}
          <Link href="/prospects" className="hover:underline">
            Prospects
          </Link>
        </nav>
        <h1 className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
          Search strategy
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Tune how the dispatcher discovers prospects: which backends to use,
          in what order, and how to handle overlap. Saved values apply to every
          subsequent run.
        </p>
      </header>

      {loading && (
        <div className="rounded border border-gray-200 bg-gray-50 dark:bg-slate-900 dark:border-slate-800 p-6 text-sm text-gray-600">
          Loading active ICP…
        </div>
      )}

      {loadError && (
        <div className="rounded border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          Could not load ICP: {(loadError as Error).message}
        </div>
      )}

      {!loading && !loadError && !definition && (
        <div className="rounded border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          You don&apos;t have an active ICP yet. Define one in onboarding before
          configuring the search strategy.{' '}
          <Link
            href="/onboarding/advanced-search-ai"
            className="font-medium underline hover:no-underline"
          >
            Go to onboarding →
          </Link>
        </div>
      )}

      {definition && draft && (
        <>
          <div className="mb-4 flex items-center justify-between rounded-md bg-gray-50 dark:bg-background px-4 py-2 text-xs text-gray-600">
            <span>
              Editing variant <strong>{definition.variant_name}</strong> ·
              last updated{' '}
              {new Date(definition.updated_at).toLocaleString()}
            </span>
            <button
              type="button"
              onClick={handleResetToDefaults}
              className="text-xs text-blue-600 underline hover:no-underline"
            >
              Reset to defaults
            </button>
          </div>

          <SearchStrategyEditor
            value={draft}
            onChange={setDraft}
            disabled={saving}
          />

          {/* ── Action bar (sticky bottom) ────────────────────────────── */}
          <div className="sticky bottom-0 mt-6 -mx-6 border-t border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-800 px-6 py-3 shadow-sm sm:mx-0 sm:rounded-b-lg">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs text-gray-600 dark:text-gray-500">
                {saveError ? (
                  <span className="text-rose-600">
                    Save failed: {saveError.message}
                  </span>
                ) : dirty ? (
                  <span className="text-amber-700">Unsaved changes</span>
                ) : savedAt ? (
                  <span className="text-emerald-700">
                    Saved {Math.max(1, Math.floor((Date.now() - savedAt) / 1000))}
                    s ago
                  </span>
                ) : (
                  <span>All changes saved.</span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={!dirty || saving}
                  className="rounded border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Discard
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!dirty || saving}
                  className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Saving…' : 'Save strategy'}
                </button>
              </div>
            </div>
          </div>

          {/* ── JSON preview (collapsible, debug aid) ─────────────────── */}
          <details className="mt-6 rounded border border-gray-200 bg-white dark:bg-slate-900 dark:border-slate-800">
            <summary className="cursor-pointer px-4 py-2 text-xs text-gray-600 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-slate-800">
              Show effective strategy JSON
            </summary>
            <pre className="overflow-x-auto px-4 py-3 text-xs text-gray-700 dark:text-gray-300">
              {JSON.stringify(draft, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  );
}
