/**
 * Hook to fetch LinkedIn daily limits
 */
import { useState, useEffect, useCallback } from 'react';
import { fetchLinkedInLimits } from '../api';
import type { LinkedInLimits } from '../types';

export function useLinkedInLimits() {
  const [limits, setLimits] = useState<LinkedInLimits | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchLimits = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchLinkedInLimits();
      if (res.success) {
        setLimits({
          remaining: res.remainingDailyLimit,
          total: res.totalDailyLimit,
        });
      }
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Failed to fetch LinkedIn limits');
      setError(errorObj);
      setLimits({ remaining: 0, total: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  return { limits, loading, error, refetch: fetchLimits };
}
