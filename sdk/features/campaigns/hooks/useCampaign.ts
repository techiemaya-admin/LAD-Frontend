/**
 * Campaigns Feature - useCampaign Hook
 * 
 * React hook for fetching and managing a single campaign.
 * Framework-independent (no Next.js imports).
 */
import { useState, useCallback, useEffect } from 'react';
import { getCampaign, updateCampaign } from '../api';
import type { Campaign, UpdateCampaignRequest } from '../types';
export interface UseCampaignReturn {
  campaign: Campaign | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  update: (data: UpdateCampaignRequest) => Promise<Campaign>;
  clearError: () => void;
}
export function useCampaign(campaignId: string | null): UseCampaignReturn {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchCampaign = useCallback(async () => {
    if (!campaignId) {
      setCampaign(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const data = await getCampaign(campaignId);
      setCampaign(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load campaign';
      setError(errorMessage);
      // Log error for debugging but don't expose to console in production
      if (process.env.NODE_ENV === 'development') {
        console.error('[campaigns] Failed to load campaign:', err);
      }
      // TODO: Replace with proper error reporting service
    } finally {
      setLoading(false);
    }
  }, [campaignId]);
  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);
  const update = useCallback(
    async (data: UpdateCampaignRequest): Promise<Campaign> => {
      if (!campaignId) {
        throw new Error('Campaign ID is required');
      }
      try {
        setError(null);
        const updatedCampaign = await updateCampaign(campaignId, data);
        setCampaign(updatedCampaign);
        return updatedCampaign;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update campaign';
        setError(errorMessage);
        throw err;
      }
    },
    [campaignId]
  );
  return {
    campaign,
    loading,
    error,
    refetch: fetchCampaign,
    update,
    clearError: () => setError(null),
  };
}