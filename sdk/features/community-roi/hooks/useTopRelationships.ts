/**
 * Community ROI Feature - useTopRelationships Hook
 *
 * React hook for fetching top relationships in the network.
 */
import { useQuery } from '@tanstack/react-query';
import { getTopRelationshipsOptions } from '../api';
import type { RelationshipScoreWithScores } from '../types';

export interface UseTopRelationshipsReturn {
  data: RelationshipScoreWithScores[] | undefined;
  relationships: RelationshipScoreWithScores[] | undefined;
  isLoading: boolean;
  loading: boolean;
  error: Error | null;
  isError: boolean;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
}

/**
 * Hook to get top relationships in the network
 */
export function useTopRelationships(limit: number = 10): UseTopRelationshipsReturn {
  const query = useQuery(getTopRelationshipsOptions(limit));

  return {
    data: query.data,
    relationships: query.data,
    isLoading: query.isLoading,
    loading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
