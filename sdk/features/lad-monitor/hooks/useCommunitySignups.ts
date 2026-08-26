import { useState, useEffect, useCallback } from 'react';
import { getCommunitySignups, updateCommunitySignup } from '../api';
import type { CommunitySignup, SignupStatus } from '../types';

/**
 * Founding-group applications from the public /community landing page.
 */
export function useCommunitySignups(status?: SignupStatus) {
  const [data, setData] = useState<CommunitySignup[]>([]);
  const [summary, setSummary] = useState<Partial<Record<SignupStatus, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCommunitySignups(status);
      setData(res.data);
      setSummary(res.summary);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load signups'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const setStatus = useCallback(
    async (id: string, next: SignupStatus, notes?: string) => {
      setSavingId(id);
      try {
        await updateCommunitySignup(id, next, notes);
        await fetch();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to update signup'));
        throw err;
      } finally {
        setSavingId(null);
      }
    },
    [fetch],
  );

  return { data, summary, loading, error, refetch: fetch, setStatus, savingId };
}
