/**
 * Campaigns Feature - useCampaigns Hook
 * 
 * React hook for fetching and managing campaigns list.
 * Framework-independent (no Next.js imports).
 */

import { useState, useCallback, useEffect } from 'react';
import {
  getCampaigns,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  startCampaign,
  pauseCampaign,
  stopCampaign,
} from '../api';
import type { Campaign, CampaignFilters, CreateCampaignRequest, UpdateCampaignRequest } from '../types';

export interface UseCampaignsReturn {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  create: (data: CreateCampaignRequest) => Promise<Campaign>;
  update: (id: string, data: UpdateCampaignRequest) => Promise<Campaign>;
  remove: (id: string) => Promise<void>;
  start: (id: string) => Promise<void>;
  pause: (id: string) => Promise<void>;
  stop: (id: string) => Promise<void>;
  clearError: () => void;
}

export function useCampaigns(filters?: CampaignFilters): UseCampaignsReturn {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCampaigns(filters);
      setCampaigns(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load campaigns';
      setError(errorMessage);
      console.error('[campaigns] Failed to load campaigns:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const create = useCallback(async (data: CreateCampaignRequest): Promise<Campaign> => {
    try {
      setError(null);
      const newCampaign = await createCampaign(data);
      await fetchCampaigns(); // Refetch to get updated list
      return newCampaign;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create campaign';
      setError(errorMessage);
      throw err;
    }
  }, [fetchCampaigns]);

  const update = useCallback(
    async (id: string, data: UpdateCampaignRequest): Promise<Campaign> => {
      try {
        setError(null);
        const updatedCampaign = await updateCampaign(id, data);
        await fetchCampaigns(); // Refetch to get updated list
        return updatedCampaign;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update campaign';
        setError(errorMessage);
        throw err;
      }
    },
    [fetchCampaigns]
  );

  const remove = useCallback(
    async (id: string): Promise<void> => {
      try {
        setError(null);
        await deleteCampaign(id);
        await fetchCampaigns(); // Refetch to get updated list
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete campaign';
        setError(errorMessage);
        throw err;
      }
    },
    [fetchCampaigns]
  );

  const start = useCallback(
    async (id: string): Promise<void> => {
      try {
        setError(null);
        await startCampaign(id);
        await fetchCampaigns(); // Refetch to get updated list
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to start campaign';
        setError(errorMessage);
        throw err;
      }
    },
    [fetchCampaigns]
  );

  const pause = useCallback(
    async (id: string): Promise<void> => {
      try {
        setError(null);
        await pauseCampaign(id);
        await fetchCampaigns(); // Refetch to get updated list
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to pause campaign';
        setError(errorMessage);
        throw err;
      }
    },
    [fetchCampaigns]
  );

  const stop = useCallback(
    async (id: string): Promise<void> => {
      try {
        setError(null);
        await stopCampaign(id);
        await fetchCampaigns(); // Refetch to get updated list
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to stop campaign';
        setError(errorMessage);
        throw err;
      }
    },
    [fetchCampaigns]
  );

  return {
    campaigns,
    loading,
    error,
    refetch: fetchCampaigns,
    create,
    update,
    remove,
    start,
    pause,
    stop,
    clearError: () => setError(null),
  };
}

