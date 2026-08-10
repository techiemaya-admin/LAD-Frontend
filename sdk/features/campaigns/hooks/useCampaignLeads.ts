/**
 * Campaigns Feature - useCampaignLeads Hook
 *
 * React hook for fetching campaign leads using TanStack Query.
 * Framework-independent (no Next.js imports).
 */
import { useQuery } from '@tanstack/react-query';
import { getCampaignLeadsOptions } from '../api';
import type { CampaignLeadFilters } from '../api';
import type { CampaignLead } from '../types';

export interface UseCampaignLeadsReturn {
  data: CampaignLead[] | undefined;
  leads: CampaignLead[] | undefined; // Alias for backward compatibility
  /**
   * Leads matching the active filters across the whole campaign, ignoring
   * pagination. Use this for any "N leads" label — `leads.length` is only the
   * size of the loaded page and will understate large campaigns.
   */
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
 * Hook to get campaign leads with TanStack Query.
 *
 * `filters.filter` ('sent' | 'connected' | 'replied') is applied server-side
 * from the same engagement definitions as the analytics stat cards.
 */
export function useCampaignLeads(
  campaignId: string,
  filters?: CampaignLeadFilters
): UseCampaignLeadsReturn {
  const query = useQuery(getCampaignLeadsOptions(campaignId, filters));

  return {
    data: query.data?.leads,
    leads: query.data?.leads, // Backward compatibility alias
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    loading: query.isLoading, // Backward compatibility alias
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
