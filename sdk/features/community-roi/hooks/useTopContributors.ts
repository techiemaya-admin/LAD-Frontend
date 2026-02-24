/**
 * Community ROI Feature - useTopContributors Hook
 *
 * React hook for fetching top contributors in the network.
 */
import { useQuery } from '@tanstack/react-query';
import { getTopContributorsOptions } from '../api';
import type { ContributionScoreWithScores } from '../types';

export interface UseTopContributorsReturn {
  data: ContributionScoreWithScores[] | undefined;
  contributors: ContributionScoreWithScores[] | undefined;
  isLoading: boolean;
  loading: boolean;
  error: Error | null;
  isError: boolean;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
}

/**
 * Hook to get top contributors in the network
 */
export function useTopContributors(limit: number = 10): UseTopContributorsReturn {
  const query = useQuery(getTopContributorsOptions(limit));

  return {
    data: query.data,
    contributors: query.data,
    isLoading: query.isLoading,
    loading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
