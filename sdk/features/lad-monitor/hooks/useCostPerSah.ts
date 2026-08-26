import { useState, useEffect, useCallback } from 'react';
import { getCostPerSah, recomputeSah } from '../api';
import type { SahCostData, DateRangeParams } from '../types';

export function useCostPerSah(params?: DateRangeParams) {
  const [data, setData] = useState<SahCostData | null>(null);
  const [loading, setLoading] = useState(true);
  const [recomputing, setRecomputing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const startDate = params?.startDate;
  const endDate = params?.endDate;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getCostPerSah({ startDate, endDate }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load SAH cost'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const recompute = useCallback(async () => {
    setRecomputing(true);
    try {
      await recomputeSah();
      await fetch();
    } finally {
      setRecomputing(false);
    }
  }, [fetch]);

  return { data, loading, recomputing, error, refetch: fetch, recompute };
}
