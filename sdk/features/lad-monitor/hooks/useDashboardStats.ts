import { useState, useEffect, useCallback } from 'react';
import { getDashboardStats } from '../api';
import type { DashboardStats, DateRangeParams } from '../types';

export function useDashboardStats(params?: DateRangeParams) {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const startDate = params?.startDate;
  const endDate = params?.endDate;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboardStats({ startDate, endDate }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load dashboard stats'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
