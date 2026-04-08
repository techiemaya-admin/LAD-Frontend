/**
 * Community ROI Feature - useRelationshipHeatmap Hook
 *
 * React hook for fetching relationship heatmap data with color codes.
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import { getRelationshipHeatmapOptions, relationshipScoresApi } from '../api';
import { RelationshipHeatmapResponse, UpdateRelationshipScoresResponse } from '../types';

export interface UseRelationshipHeatmapReturn {
  data: RelationshipHeatmapResponse | undefined;
  heatmapData: RelationshipHeatmapResponse['data'] | undefined;
  colorLegend: RelationshipHeatmapResponse['metadata']['colorLegend'] | undefined;
  isLoading: boolean;
  loading: boolean;
  error: Error | null;
  isError: boolean;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
}

export interface UseUpdateRelationshipScoresReturn {
  mutate: () => void;
  mutateAsync: () => Promise<UpdateRelationshipScoresResponse>;
  isLoading: boolean;
  loading: boolean;
  error: Error | null;
  isError: boolean;
  isSuccess: boolean;
  data: UpdateRelationshipScoresResponse | undefined;
}

/**
 * Hook to get relationship heatmap data
 */
export function useRelationshipHeatmap(enabled: boolean = true): UseRelationshipHeatmapReturn {
  const query = useQuery(getRelationshipHeatmapOptions(enabled));

  return {
    data: query.data,
    heatmapData: query.data?.data,
    colorLegend: query.data?.metadata?.colorLegend,
    isLoading: query.isLoading,
    loading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}

/**
 * Hook to update relationship scores (recalculate based on meetings and referrals)
 */
export function useUpdateRelationshipScores(): UseUpdateRelationshipScoresReturn {
  const mutation = useMutation({
    mutationFn: () => relationshipScoresApi.updateRelationshipScores(),
  });

  return {
    mutate: mutation.mutate as () => void,
    mutateAsync: mutation.mutateAsync,
    isLoading: mutation.isPending,
    loading: mutation.isPending,
    error: mutation.error,
    isError: mutation.isError,
    isSuccess: mutation.isSuccess,
    data: mutation.data,
  };
}
