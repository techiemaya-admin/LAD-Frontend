import { useQuery } from '@tanstack/react-query';
import { getMemberRecentActivityOptions } from '../api';
import { UUID } from '../types';

/**
 * Hook to get recent activity feed for a specific member
 */
export function useMemberRecentActivity(memberId: UUID | undefined, limit: number = 10) {
  const query = useQuery(getMemberRecentActivityOptions(memberId!, limit));

  return {
    activity: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
