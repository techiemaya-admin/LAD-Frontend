/**
 * Community ROI Feature - useRelationshipScore Hook
 *
 * React hook for fetching relationship strength between two members.
 */
import { useQuery } from '@tanstack/react-query';
import { getRelationshipScoreOptions } from '../api';
import { UUID, RelationshipScoreWithScores } from '../types';

export interface UseRelationshipScoreReturn {
  data: RelationshipScoreWithScores | undefined;
  relationship: RelationshipScoreWithScores | undefined;
  isLoading: boolean;
  loading: boolean;
  error: Error | null;
  isError: boolean;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
}

/**
 * Hook to get relationship strength between two members
 */
export function useRelationshipScore(
  memberId1?: UUID,
  memberId2?: UUID
): UseRelationshipScoreReturn {
  const query = useQuery(getRelationshipScoreOptions(memberId1!, memberId2!));

  return {
    data: query.data,
    relationship: query.data,
    isLoading: query.isLoading,
    loading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
