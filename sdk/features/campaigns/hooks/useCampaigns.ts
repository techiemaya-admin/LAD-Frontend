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
    
    // Real-time SSE connection for live updates
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let reconnectAttempts = 0;
    const MAX_RECONNECT_ATTEMPTS = 5;

    const connectSSE = () => {
      try {
        eventSource = new EventSource('/api/campaigns/stream');

        eventSource.onopen = () => {
          console.log('[campaigns] SSE connected');
          reconnectAttempts = 0; // Reset on successful connection
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'INITIAL_DATA') {
              setCampaigns(data.campaigns);
              setLoading(false);
            } else if (data.type === 'STATS_UPDATE') {
              // Update specific campaign stats
              setCampaigns(prev => 
                prev.map(c => 
                  c.id === data.campaignId 
                    ? { ...c, stats: data.stats }
                    : c
                )
              );
            } else if (data.type === 'CAMPAIGN_UPDATE') {
              // Refresh to get latest data
              fetchCampaigns();
            }
          } catch (err) {
            console.error('[campaigns] Failed to parse SSE event:', err);
          }
        };

        eventSource.onerror = (error) => {
          console.error('[campaigns] SSE error:', error);
          eventSource?.close();
          
          // Attempt to reconnect with exponential backoff
          if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            reconnectAttempts++;
            console.log(`[campaigns] Reconnecting in ${delay}ms (attempt ${reconnectAttempts})`);
            
            reconnectTimeout = setTimeout(() => {
              connectSSE();
            }, delay);
          } else {
            console.warn('[campaigns] Max reconnect attempts reached, falling back to manual refresh');
          }
        };
      } catch (err) {
        console.error('[campaigns] Failed to create SSE connection:', err);
      }
    };

    connectSSE();
    
    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
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

