/**
 * Community ROI Feature - useInteractionsBetween Hook
 *
 * React hook for fetching interactions between two members.
 */
import { useQuery } from '@tanstack/react-query';
import { getInteractionsBetweenOptions } from '../api';
import type { Interaction, ListInteractionsParams, PaginatedResponse, UUID } from '../types';

export interface UseInteractionsBetweenReturn {
  data: PaginatedResponse<Interaction> | undefined;
  interactions: PaginatedResponse<Interaction> | undefined;
  isLoading: boolean;
  loading: boolean;
  error: Error | null;
  isError: boolean;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
}

/**
 * Hook to get interactions between two members
 */
export function useInteractionsBetween(
  memberId1?: UUID,
  memberId2?: UUID,
  params?: ListInteractionsParams
): UseInteractionsBetweenReturn {
  const query = useQuery(getInteractionsBetweenOptions(memberId1!, memberId2!, params));

  return {
    data: query.data,
    interactions: query.data,
    isLoading: query.isLoading,
    loading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
