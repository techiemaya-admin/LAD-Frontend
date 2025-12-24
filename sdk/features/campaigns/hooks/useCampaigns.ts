/**
 * useCampaigns Hook
 * 
 * Manages campaigns list with filtering, creation, and deletion
 */

import { useState, useCallback } from 'react';
import * as api from '../api';
import type {
  Campaign,
  CampaignCreateInput,
  CampaignListParams,
} from '../types';

export function useCampaigns(initialParams?: CampaignListParams) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (params?: CampaignListParams) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCampaigns(params || initialParams);
      setCampaigns(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load campaigns'));
    } finally {
      setLoading(false);
    }
  }, [initialParams]);

  const create = useCallback(async (data: CampaignCreateInput) => {
    setLoading(true);
    setError(null);
    try {
      const newCampaign = await api.createCampaign(data);
      setCampaigns(prev => [...prev, newCampaign]);
      return newCampaign;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create campaign'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (campaignId: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.deleteCampaign(campaignId);
      setCampaigns(prev => prev.filter(c => c.id !== campaignId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete campaign'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    campaigns,
    loading,
    error,
    load,
    create,
    remove,
  };
}
