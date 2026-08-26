/**
 * useDispatchedSearches - list the tenant's recent search runs from the
 * SearchDispatcher endpoint (`GET /api/ai-icp-assistant/searches`).
 *
 * Mirror of useIcpSearchHistory but goes through the D6 mount. Prefer this
 * one in new UI; useIcpSearchHistory is kept for the R8 history surface.
 */
import { useCallback, useEffect, useState } from 'react';

import { listDispatchedSearches } from '../searchApi';
import type { IcpSearch } from '../types';

export interface UseDispatchedSearchesResult {
  searches: IcpSearch[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useDispatchedSearches(opts: {
  limit?: number;
  offset?: number;
  enabled?: boolean;
} = {}): UseDispatchedSearchesResult {
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
      const rows = await listDispatchedSearches({ limit, offset });
      setSearches(rows);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load searches'));
    } finally {
      setLoading(false);
    }
  }, [enabled, limit, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  return { searches, loading, error, refetch: load };
}
