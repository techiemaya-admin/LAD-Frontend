/**
 * Campaigns Feature - useLinkedInLimits Hook
 *
 * React hook for fetching LinkedIn daily limits using TanStack Query.
 */
import { useQuery } from '@tanstack/react-query';
import { getLinkedInLimitsOptions } from '../api';
import type { LinkedInLimits } from '../api';

export interface UseLinkedInLimitsReturn {
  limits: LinkedInLimits | null;
  isLoading: boolean;
  error: Error | null;
  isError: boolean;
  refetch: () => void;
}

/**
 * Hook to get LinkedIn daily limits with TanStack Query
 */
export function useLinkedInLimits(): UseLinkedInLimitsReturn {
  const query = useQuery(getLinkedInLimitsOptions());

  return {
    limits: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
  };
}
