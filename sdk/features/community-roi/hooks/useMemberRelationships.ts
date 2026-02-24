/**
 * Community ROI Feature - useMemberRelationships Hook
 *
 * React hook for fetching all relationships for a specific member.
 */
import { useQuery } from '@tanstack/react-query';
import { getMemberRelationshipsOptions } from '../api';
import { UUID, RelationshipScoreWithScores } from '../types';

export interface UseMemberRelationshipsReturn {
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
 * Hook to get all relationships for a member
 */
export function useMemberRelationships(memberId?: UUID): UseMemberRelationshipsReturn {
  const query = useQuery(getMemberRelationshipsOptions(memberId!));

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
