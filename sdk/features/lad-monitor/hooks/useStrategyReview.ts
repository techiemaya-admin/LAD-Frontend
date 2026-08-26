import { useState, useEffect, useCallback } from 'react';
import { getStrategiesForReview, reviewStrategy } from '../api';
import type { StrategyForReview, StrategyReviewStatus } from '../types';

/**
 * Review queue for tenant-published strategies.
 *
 * Approving one makes it visible in every tenant's Community gallery, so the
 * mutation refetches rather than optimistically updating - the queue should
 * reflect committed server state, not an assumed outcome.
 */
export function useStrategyReview(status: StrategyReviewStatus = 'pending') {
  const [data, setData] = useState<StrategyForReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getStrategiesForReview(status));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load the review queue'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const review = useCallback(
    async (id: string, decision: 'approve' | 'reject', note?: string) => {
      setSubmittingId(id);
      setError(null);
      try {
        await reviewStrategy(id, decision, note);
        await fetch();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to record the review'));
        throw err;
      } finally {
        setSubmittingId(null);
      }
    },
    [fetch],
  );

  return { data, loading, error, refetch: fetch, review, submittingId };
}
