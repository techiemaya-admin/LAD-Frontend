/**
 * Campaigns Feature - useCampaignPostStats Hook
 *
 * Post performance for an auto-post campaign (posts, impressions, reactions,
 * comments, reposts, approvals, schedule health, connections since first post).
 * `data === null` means the campaign is not an auto-post campaign — hide the
 * section. `data === undefined` while loading.
 * Framework-independent (no Next.js imports).
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCampaignPostStats, getCampaignPostStatsOptions, campaignKeys } from '../api';
import type { CampaignPostStats } from '../types';

export interface UseCampaignPostStatsReturn {
  data: CampaignPostStats | null | undefined;
  isLoading: boolean;
  error: Error | null;
  isFetching: boolean;
  /** Re-read live counters from LinkedIn, bypassing the backend cache. */
  refresh: () => Promise<void>;
}

export function useCampaignPostStats(campaignId: string): UseCampaignPostStatsReturn {
  const queryClient = useQueryClient();
  const query = useQuery(getCampaignPostStatsOptions(campaignId));

  const refresh = async () => {
    const fresh = await getCampaignPostStats(campaignId, true);
    queryClient.setQueryData(campaignKeys.postStats(campaignId), fresh);
  };

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    isFetching: query.isFetching,
    refresh,
  };
}
