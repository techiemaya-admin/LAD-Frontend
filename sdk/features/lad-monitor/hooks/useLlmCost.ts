import { useState, useEffect, useCallback } from 'react';
import { getLlmCost } from '../api';
import type { LlmCostData } from '../types';

/**
 * LLM spend + spike detection for the admin observability console.
 * `days` is the trailing lookback window (default 30, capped at 90 server-side).
 */
export function useLlmCost(days = 30) {
  const [data, setData] = useState<LlmCostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getLlmCost({ days }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load LLM cost'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
