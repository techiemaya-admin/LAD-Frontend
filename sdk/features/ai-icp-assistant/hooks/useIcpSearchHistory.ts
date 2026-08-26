/**
 * useIcpSearchHistory
 *
 * Fetches the recent Apollo / Sales Nav / ABM search runs for the tenant.
 * Backs the search-history UI on the prospect-discovery page.
 *
 * Pagination is offset-based and reactive: change `limit` or `offset` and the
 * hook re-fetches. For infinite scroll, accumulate results in the parent.
 */
import { useCallback, useEffect, useState } from 'react';

import { listIcpSearchHistory } from '../definitionsApi';
import type { IcpSearch } from '../types';

export interface UseIcpSearchHistoryResult {
  searches: IcpSearch[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useIcpSearchHistory(opts: {
  limit?: number;
  offset?: number;
  /** When false, the hook doesn't fetch on mount. Useful for gated UIs. */
  enabled?: boolean;
} = {}): UseIcpSearchHistoryResult {
  const { limit = 20, offset = 0, enabled = true } = opts;
  const [searches, setSearches] = useState<IcpSearch[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await listIcpSearchHistory({ limit, offset });
      setSearches(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load search history'));
    } finally {
      setLoading(false);
    }
  }, [enabled, limit, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  return { searches, loading, error, refetch: load };
}
