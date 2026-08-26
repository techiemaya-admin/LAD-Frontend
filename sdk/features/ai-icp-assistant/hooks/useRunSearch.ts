/**
 * useRunSearch - mutation hook for POST /api/ai-icp-assistant/search.
 *
 * Triggers a discovery run via the SearchDispatcher backend and exposes the
 * candidates + per-backend results to the UI. Keeps the last result so the
 * "Run search" panel can show the previous run when idle.
 *
 * Sync mode (default) - runs Apollo + Sales Nav serverside, ~3-8s for typical
 * caps. Async mode (`{ async: true }`) returns immediately with a `searchId`
 * and the caller can poll `useSearch(searchId)` for completion.
 */
import { useCallback, useState } from 'react';

import { runSearch } from '../searchApi';
import type { RunSearchInput, SearchRunResult } from '../types';

export interface UseRunSearchResult {
  /** The last successful run, or null if nothing's been run this session. */
  result: SearchRunResult | null;
  /** True while a run is in flight. */
  running: boolean;
  error: Error | null;
  /** Fire a new run. Returns the result on success, throws on failure. */
  run: (input?: RunSearchInput, opts?: { async?: boolean }) => Promise<SearchRunResult>;
  /** Clear `result` and `error` without firing anything. */
  reset: () => void;
}

export function useRunSearch(): UseRunSearchResult {
  const [result, setResult] = useState<SearchRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const run = useCallback(
    async (input: RunSearchInput = {}, opts: { async?: boolean } = {}) => {
      setRunning(true);
      setError(null);
      try {
        const res = await runSearch(input, opts);
        setResult(res);
        return res;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setRunning(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
  }, []);

  return { result, running, error, run, reset };
}
