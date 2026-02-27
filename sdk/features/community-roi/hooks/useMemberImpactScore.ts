/**
 * Community ROI Feature - useMemberImpactScore Hook
 *
 * React hook for fetching member impact score and ranking.
 */
import { useQuery } from '@tanstack/react-query';
import { getMemberImpactScoreOptions } from '../api';
import { UUID } from '../types';

export interface MemberImpactScore {
  score: number;
  percentile: number;
  ranking: number;
}

export interface UseMemberImpactScoreReturn {
  data: MemberImpactScore | undefined;
  impactScore: MemberImpactScore | undefined;
  isLoading: boolean;
  loading: boolean;
  error: Error | null;
  isError: boolean;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
}

/**
 * Hook to get member impact score and ranking
 */
export function useMemberImpactScore(memberId?: UUID): UseMemberImpactScoreReturn {
  const query = useQuery(getMemberImpactScoreOptions(memberId!));

  return {
    data: query.data,
    impactScore: query.data,
    isLoading: query.isLoading,
    loading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
