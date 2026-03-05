import { useQuery } from '@tanstack/react-query';
import { getMemberActivityHistoryOptions } from '../api';
import { UUID } from '../types';

/**
 * Hook to get activity history for a specific member
 * Used for outreach analysis charts
 */
export function useMemberActivityHistory(memberId: UUID | undefined) {
  const query = useQuery(getMemberActivityHistoryOptions(memberId!));

  return {
    history: query.data || [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  };
}
