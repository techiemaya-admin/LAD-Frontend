/**
 * Live Campaigns Hook using SWR
 * 
 * Features:
 * - Auto-refresh on window focus
 * - Auto-refresh on network reconnect
 * - Deduplication of requests
 * - Smart caching
 * - Shows stale data while revalidating
 */
import useSWR from 'swr';
import { getCampaigns } from '../api';
import type { Campaign, CampaignFilters } from '../types';
export interface UseCampaignsLiveReturn {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  mutate: () => void; // Manual refresh
  isValidating: boolean; // True when fetching in background
}
export function useCampaignsLive(filters?: CampaignFilters): UseCampaignsLiveReturn {
  const { data, error, isValidating, mutate } = useSWR(
    ['campaigns', filters],
    () => getCampaigns(filters),
    {
      // Refresh every 10 seconds
      refreshInterval: 10000,
      // Refresh when window regains focus
      revalidateOnFocus: true,
      // Refresh when network reconnects
      revalidateOnReconnect: true,
      // Deduplicate requests within 2 seconds
      dedupingInterval: 2000,
      // Keep previous data while revalidating (better UX)
      keepPreviousData: true,
    }
  );
  return {
    campaigns: data || [],
    loading: !data && !error,
    error: error?.message || null,
    mutate,
    isValidating,
  };
}