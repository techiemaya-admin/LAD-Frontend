import { useState, useEffect, useCallback } from 'react';
import { getTaskHealth } from '../api';
import type { TaskHealth } from '../types';

export function useTaskHealth() {
  const [data, setData] = useState<TaskHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getTaskHealth());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load task health'));
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
