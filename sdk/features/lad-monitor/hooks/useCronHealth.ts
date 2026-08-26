import { useState, useEffect, useCallback } from 'react';
import { getCronHealth } from '../api';
import type { CronHealth } from '../types';

export function useCronHealth() {
  const [data, setData] = useState<CronHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getCronHealth());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load cron health'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
