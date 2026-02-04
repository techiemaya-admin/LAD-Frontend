/**
 * Campaigns Feature - useCampaignActivityFeed Hook
 * 
 * React hook for fetching campaign activity feed using TanStack Query.
 * Framework-independent (no Next.js imports).
 */
import { useQuery } from '@tanstack/react-query';
import { getCampaignActivityFeedOptions } from '../api';
export interface CampaignActivity {
  id: string;
  campaign_id: string;
  lead_id?: string;
  action_type: string;
  platform: string;
  status: string;
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  message_content?: string;
  error_message?: string;
  response_data?: any;
  created_at: string;
  updated_at: string;
}

export interface UseCampaignActivityFeedOptions {
  limit?: number;
  offset?: number;
  platform?: string;
  actionType?: string;
  status?: string;
}

export interface UseCampaignActivityFeedReturn {
  data: { activities: CampaignActivity[]; total: number } | undefined;
  activities: CampaignActivity[] | undefined; // Alias for backward compatibility
  total: number;
  isLoading: boolean;
  loading: boolean; // Alias for backward compatibility
  error: Error | null;
  isError: boolean;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
}
/**
 * Hook to get campaign activity feed with TanStack Query
 */
export function useCampaignActivityFeed(
  campaignId: string,
  options: UseCampaignActivityFeedOptions = {}
): UseCampaignActivityFeedReturn {
  const query = useQuery(getCampaignActivityFeedOptions(campaignId, options));
  
  return {
    data: query.data,
    activities: query.data?.activities, // Backward compatibility alias
    total: query.data?.total || 0,
    isLoading: query.isLoading,
    loading: query.isLoading, // Backward compatibility alias
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}