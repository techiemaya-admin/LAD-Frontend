/**
 * Community ROI Feature - useMemberReferrals Hook
 *
 * React hook for fetching referrals by a specific member.
 */
import { useQuery } from '@tanstack/react-query';
import { getMemberReferralsOptions } from '../api';
import { UUID, Referral } from '../types';

export interface UseMemberReferralsReturn {
  data: Referral[] | undefined;
  referrals: Referral[] | undefined;
  isLoading: boolean;
  loading: boolean;
  error: Error | null;
  isError: boolean;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
}

/**
 * Hook to get referrals for a specific member
 */
export function useMemberReferrals(memberId?: UUID): UseMemberReferralsReturn {
  const query = useQuery(getMemberReferralsOptions(memberId!));

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
