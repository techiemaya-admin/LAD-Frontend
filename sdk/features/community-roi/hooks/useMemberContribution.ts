/**
 * Community ROI Feature - useMemberContribution Hook
 *
 * React hook for fetching member contribution score.
 */
import { useQuery } from '@tanstack/react-query';
import { getMemberContributionOptions } from '../api';
import { UUID } from '../types';
import type { ContributionScoreWithScores } from '../types';

export interface UseMemberContributionReturn {
  data: ContributionScoreWithScores | undefined;
  contribution: ContributionScoreWithScores | undefined;
  isLoading: boolean;
  loading: boolean;
  error: Error | null;
  isError: boolean;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
}

/**
 * Hook to get member contribution score
 */
export function useMemberContribution(memberId?: UUID): UseMemberContributionReturn {
  const query = useQuery(getMemberContributionOptions(memberId!));

  return {
    data: query.data,
    contribution: query.data,
    isLoading: query.isLoading,
    loading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
