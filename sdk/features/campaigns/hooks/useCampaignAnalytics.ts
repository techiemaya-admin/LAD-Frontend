/**
 * Campaigns Feature - useCampaignAnalytics Hook
 * 
 * React hook for fetching campaign analytics using TanStack Query.
 * Framework-independent (no Next.js imports).
 */
import { useQuery } from '@tanstack/react-query';
import { getCampaignAnalyticsOptions } from '../api';
import type { CampaignAnalytics } from '../types';

export interface UseCampaignAnalyticsReturn {
  data: CampaignAnalytics | undefined;
  analytics: CampaignAnalytics | undefined; // Alias for backward compatibility
  isLoading: boolean;
  loading: boolean; // Alias for backward compatibility
  error: Error | null;
  isError: boolean;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
}

/**
 * Hook to get campaign analytics with TanStack Query
 */
export function useCampaignAnalytics(campaignId: string): UseCampaignAnalyticsReturn {
  const query = useQuery(getCampaignAnalyticsOptions(campaignId));
  
  return {
    data: query.data,
    analytics: query.data, // Backward compatibility alias
    isLoading: query.isLoading,
    loading: query.isLoading, // Backward compatibility alias
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}