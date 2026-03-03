/**
 * Community ROI Feature - useListMembers Hook
 *
 * React hook for fetching members list using TanStack Query.
 */
import { useQuery } from '@tanstack/react-query';
import { getListMembersOptions } from '../api';
import type { Member, ListMembersParams, PaginatedResponse } from '../types';

export interface UseListMembersReturn {
  data: PaginatedResponse<Member> | undefined;
  members: PaginatedResponse<Member> | undefined;
  isLoading: boolean;
  loading: boolean;
  error: Error | null;
  isError: boolean;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
}

/**
 * Hook to get members list with TanStack Query
 */
export function useListMembers(params?: ListMembersParams): UseListMembersReturn {
  const query = useQuery(getListMembersOptions(params));

  return {
    data: query.data,
    members: query.data,
    isLoading: query.isLoading,
    loading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
