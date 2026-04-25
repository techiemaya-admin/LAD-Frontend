/**
 * Community ROI Feature - useRelationshipHeatmap Hook
 *
 * React hook for fetching relationship heatmap data with color codes.
 */
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { getRelationshipHeatmapOptions, relationshipScoresApi } from '../api';
import { RelationshipHeatmapResponse, UpdateRelationshipScoresResponse } from '../types';
import { communityROIApiClient } from '../communityROIApiClient';

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
    error: query.error as Error | null,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}

/**
 * Hook to generate bulk 1-to-1 meeting recommendations for all members.
 * Calls POST /api/community-roi/recommendations/generate-bulk
 */
export function useGenerateBulkRecommendations() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const generate = async (numWeeks: number = 2) => {
    setIsGenerating(true);
    setError(null);
    try {
      // Use communityROIApiClient so auth headers (Bearer token) are included automatically
      const response = await communityROIApiClient.post<Record<string, unknown>>(
        '/api/community-roi/recommendations/generate-bulk',
        { numWeeks }
      );
      const data = response.data;
      setResult(data);
      return data;
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsGenerating(false);
    }
  };

  return { generate, isGenerating, result, error };
}

/**
 * Fetches the last saved (already generated) recommendations grouped by week.
 * Calls GET /api/community-roi/recommendations/saved — no regeneration side effects.
 */
export function useSavedRecommendations() {
  const [data, setData] = useState<Record<string, unknown> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await communityROIApiClient.get<Record<string, unknown>>(
        '/api/community-roi/recommendations/saved'
      );
      setData(response.data);
    } catch (e) {
      setError(e as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, refetch: fetch };
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
