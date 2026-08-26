/**
 * RunSearchPanel - top-of-page widget on /prospects that triggers a new
 * SearchDispatcher run and shows the result inline.
 *
 * Backend contract: POST /api/ai-icp-assistant/search.
 *
 * Behaviour:
 *   - Idle:    "Run search" button + maxResults dropdown
 *   - Running: spinner + "Calling Apollo + Sales Navigator…"
 *   - Result:  candidate count, per-backend breakdown, total cost,
 *              hint that prospects will appear below within seconds
 *   - Error:   surfaces the backend error message (incl. 'no_active_icp')
 *
 * After a successful run, the parent's prospect list is invalidated so the
 * newly discovered candidates appear in the table below.
 */
'use client';

import { useState } from 'react';
import Link from 'next/link';

import { useRunSearch } from '@lad/frontend-features/ai-icp-assistant';
import type {
  BackendRunRollup,
  SearchRunResult,
} from '@lad/frontend-features/ai-icp-assistant';

const MAX_RESULTS_OPTIONS = [5, 25, 50, 100, 250, 500];

export interface RunSearchPanelProps {
  /** Called after a successful run so the parent can refetch the prospects list. */
  onRunComplete?: (result: SearchRunResult) => void;
}

export function RunSearchPanel({ onRunComplete }: RunSearchPanelProps) {
  const { result, running, error, run, reset } = useRunSearch();
  const [maxResults, setMaxResults] = useState(25);

  const handleRun = async () => {
    try {
      const res = await run({ maxResults, triggeredBy: 'manual' });
      onRunComplete?.(res);
    } catch {
      /* error already surfaced via hook state */
    }
  };

  return (
    <section className="mb-6 rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">
            Discover new prospects
          </h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Finds new prospects that match your active ICP and adds them to
            your CRM. Cost shown below per run.{' '}
            <Link
              href="/settings/icp-search-strategy"
              className="text-blue-600 underline hover:no-underline"
            >
              Edit strategy
            </Link>
            .
          </p>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-sm">
            <span className="text-gray-600">Max results</span>
            <select
              value={maxResults}
              onChange={(e) => setMaxResults(Number(e.target.value))}
              disabled={running}
              className="rounded border border-gray-300 bg-white px-2 py-1.5 text-sm disabled:opacity-50"
            >
              {MAX_RESULTS_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={handleRun}
            disabled={running}
            className="rounded bg-blue-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? 'Running…' : 'Run search'}
          </button>
        </div>
      </div>

      {running && <RunningStrip />}

      {error && <ErrorStrip message={error.message} onDismiss={reset} />}

      {result && !running && !error && (
        <ResultStrip result={result} onDismiss={reset} />
      )}
    </section>
  );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function RunningStrip() {
  return (
    <div className="border-t border-gray-200 bg-blue-50 px-5 py-3 text-sm text-blue-700">
      <span className="inline-block animate-pulse">●</span>{' '}
      Finding prospects… typically 3-8s.
    </div>
  );
}

function ErrorStrip({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  // Map the soft-error code → friendlier copy.
  const friendly =
    message === 'no_active_icp'
      ? "No active ICP found. Define your Ideal Customer Profile in onboarding first."
      : message === 'unauthorised - tenant id missing'
        ? 'Session expired - please sign in again.'
        : message;

  return (
    <div className="flex items-start justify-between gap-3 border-t border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700">
      <span>
        <strong>Search failed:</strong> {friendly}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="text-xs underline hover:no-underline"
      >
        dismiss
      </button>
    </div>
  );
}

function ResultStrip({
  result,
  onDismiss,
}: {
  result: SearchRunResult;
  onDismiss: () => void;
}) {
  // Soft "no_active_icp" path: returned with success=false from the dispatcher
  // before we reached the candidate stage.
  if (result.error === 'no_active_icp') {
    return <ErrorStrip message="no_active_icp" onDismiss={onDismiss} />;
  }

  const count = result.count ?? result.candidates.length;
  const backendEntries = Object.entries(result.backendResults || {});

  return (
    <div className="border-t border-gray-200 bg-emerald-50 px-5 py-3 text-sm">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <strong className="text-emerald-700">{count}</strong>{' '}
          <span className="text-gray-700">
            candidate{count === 1 ? '' : 's'} discovered
          </span>
          <span className="ml-2 text-xs text-gray-500">
            search id {result.searchId?.slice(0, 8) ?? '-'} · cost $
            {(result.totalCostUsd || 0).toFixed(2)}
          </span>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-gray-500 underline hover:no-underline"
        >
          dismiss
        </button>
      </div>

      {backendEntries.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {backendEntries.map(([name, r]) => (
            <BackendChip key={name} name={name} rollup={r} />
          ))}
        </div>
      )}

      {count > 0 && (
        <p className="mt-2 text-xs text-gray-600">
          New prospects will appear in the table below within seconds.
        </p>
      )}

      {(result.emitErrors ?? 0) > 0 && (
        <p className="mt-1 text-xs text-amber-700">
          ⚠ {result.emitErrors} prospect{result.emitErrors === 1 ? '' : 's'}{' '}
          could not be saved this run. They will retry on the next run.
        </p>
      )}
    </div>
  );
}

function BackendChip({ name, rollup }: { name: string; rollup: BackendRunRollup }) {
  if (rollup.skipped) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600">
        <strong className="capitalize">{name.replace(/_/g, ' ')}</strong>
        <span>skipped</span>
        {rollup.reason && <span className="text-gray-400">· {rollup.reason}</span>}
      </span>
    );
  }
  if (rollup.error) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs text-rose-700">
        <strong className="capitalize">{name.replace(/_/g, ' ')}</strong>
        <span>error</span>
        <span className="text-rose-500">· {rollup.error.slice(0, 32)}</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-0.5 text-xs text-gray-700 ring-1 ring-gray-200">
      <strong className="capitalize">{name.replace(/_/g, ' ')}</strong>
      <span>
        {rollup.candidates ?? 0}
        {rollup.total_matches != null ? ` / ${rollup.total_matches} found` : ''}
      </span>
      {rollup.cost_usd != null && (
        <span className="text-gray-500">· ${rollup.cost_usd.toFixed(2)}</span>
      )}
    </span>
  );
}
