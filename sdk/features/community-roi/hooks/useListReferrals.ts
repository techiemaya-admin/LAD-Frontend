/**
 * Community ROI Feature - useListReferrals Hook
 *
 * React hook for fetching referrals list.
 */
import { useQuery } from '@tanstack/react-query';
import { getListReferralsOptions } from '../api';
import type { Referral, ListReferralsParams, PaginatedResponse } from '../types';

export interface UseListReferralsReturn {
  data: PaginatedResponse<Referral> | undefined;
  referrals: PaginatedResponse<Referral> | undefined;
  isLoading: boolean;
  loading: boolean;
  error: Error | null;
  isError: boolean;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
}

/**
 * Hook to get referrals list with optional filters
 */
export function useListReferrals(params?: ListReferralsParams): UseListReferralsReturn {
  const query = useQuery(getListReferralsOptions(params));

  return {
    data: query.data,
    referrals: query.data,
    isLoading: query.isLoading,
    loading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
