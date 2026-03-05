/**
 * Community ROI Feature - useMember Hook
 *
 * React hook for fetching a single member using TanStack Query.
 */
import { useQuery } from '@tanstack/react-query';
import { getMemberOptions } from '../api';
import type { Member, UUID } from '../types';

export interface UseMemberReturn {
  data: Member | undefined;
  member: Member | undefined;
  isLoading: boolean;
  loading: boolean;
  error: Error | null;
  isError: boolean;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
}

/**
 * Hook to get a single member by ID with TanStack Query
 */
export function useMember(memberId?: UUID): UseMemberReturn {
  const query = useQuery(getMemberOptions(memberId!));

  return {
    data: query.data,
    member: query.data,
    isLoading: query.isLoading,
    loading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
