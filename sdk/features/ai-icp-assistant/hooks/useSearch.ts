/**
 * useSearch - fetch a single search audit row.
 *
 * Pair with `useRunSearch({ async: true })` to drive a "running…" UI:
 * the mutation returns a `searchId`, then `useSearch(searchId, { pollMs: 3000 })`
 * polls the GET endpoint until `status === 'completed'`.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import { getSearchById } from '../searchApi';
import type { IcpSearch } from '../types';

export interface UseSearchOpts {
  /** When false, no fetch happens on mount. */
  enabled?: boolean;
  /** Poll every N milliseconds while status is `running`. 0 = no polling. */
  pollMs?: number;
}

export interface UseSearchResult {
  search: IcpSearch | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'cost_capped']);

export function useSearch(
  id: string | null | undefined,
  opts: UseSearchOpts = {},
): UseSearchResult {
  const { enabled = true, pollMs = 0 } = opts;
  const [search, setSearch] = useState<IcpSearch | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cancelledRef = useRef(false);

  const load = useCallback(async () => {
    if (!id || !enabled) return;
    setLoading(true);
    setError(null);
    try {
      const row = await getSearchById(id);
      if (!cancelledRef.current) setSearch(row);
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to load search'));
      }
    } finally {
      if (!cancelledRef.current) setLoading(false);
    }
  }, [id, enabled]);

  // Initial + dependency-driven fetch
  useEffect(() => {
    cancelledRef.current = false;
    void load();
    return () => {
      cancelledRef.current = true;
    };
  }, [load]);

  // Polling for running searches
  useEffect(() => {
    if (!pollMs || !enabled || !search) return;
    if (TERMINAL_STATUSES.has(search.status)) return;
    const t = setInterval(() => {
      void load();
    }, pollMs);
    return () => clearInterval(t);
  }, [search, pollMs, enabled, load]);

  return { search, loading, error, refetch: load };
}
