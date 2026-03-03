/**
 * Followups Feature - useContextStats Hook
 */
import { useQuery } from '@tanstack/react-query';
import { getContextStatsOptions } from '../api';
import type { FollowupContextStats } from '../types';

export function useContextStats() {
  const query = useQuery(getContextStatsOptions());

  return {
    stats: query.data as FollowupContextStats | undefined,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
