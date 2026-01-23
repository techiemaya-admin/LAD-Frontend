/**
 * Campaigns Feature - React Query Hooks
 * 
 * React Query hooks for campaigns feature.
 * LAD Architecture Compliant - Hooks only, no direct API calls
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { 
  getProfileSummary, 
  generateProfileSummary,
  getCampaigns,
  getCampaign,
  getCampaignStats,
  startCampaign,
  pauseCampaign,
  stopCampaign,
  deleteCampaign,
  createCampaign,
  updateCampaign,
  getCampaignLeads,
} from './api';
import type { Campaign, CampaignStats, CampaignLead } from './types';
/**
 * Hook to get profile summary for a lead
 */
export function useProfileSummary(leadId: string | null, campaignId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['profile-summary', leadId, campaignId],
    queryFn: () => {
      if (!leadId || !campaignId) throw new Error('leadId and campaignId are required');
      return getProfileSummary(leadId, campaignId);
    },
    enabled: enabled && !!leadId && !!campaignId
  });
}
/**
 * Hook to generate profile summary for a lead
 */
export function useGenerateProfileSummary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ leadId, campaignId, profileData }: { leadId: string; campaignId: string; profileData: any }) => {
      return generateProfileSummary(leadId, campaignId, profileData);
    },
    onSuccess: (data, variables) => {
      // Invalidate and refetch profile summary
      queryClient.invalidateQueries({ queryKey: ['profile-summary', variables.leadId, variables.campaignId] });
    }
  });
}
/**
 * Hook to get campaigns with filters
 */
export function useCampaigns(filters?: { search?: string; status?: string }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['campaigns', filters],
    queryFn: async () => {
      const response = await getCampaigns(filters);
      if (!response.success) {
        throw new Error('Failed to fetch campaigns');
      }
      return response.data || [];
    },
  });
  const startMutation = useMutation({
    mutationFn: (campaignId: string) => startCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats'] });
    },
  });
  const pauseMutation = useMutation({
    mutationFn: (campaignId: string) => pauseCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats'] });
    },
  });
  const stopMutation = useMutation({
    mutationFn: (campaignId: string) => stopCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats'] });
    },
  });
  const removeMutation = useMutation({
    mutationFn: (campaignId: string) => deleteCampaign(campaignId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      queryClient.invalidateQueries({ queryKey: ['campaign-stats'] });
    },
  });
  return {
    campaigns: query.data || [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : undefined,
    refetch: query.refetch,
    start: startMutation.mutateAsync,
    pause: pauseMutation.mutateAsync,
    stop: stopMutation.mutateAsync,
    remove: removeMutation.mutateAsync,
  };
}
/**
 * Hook to get a single campaign by ID
 */
export function useCampaign(campaignId: string | null, enabled: boolean = true) {
  return useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      if (!campaignId) throw new Error('Campaign ID is required');
      const response = await getCampaign(campaignId);
      if (!response.success) {
        throw new Error('Failed to fetch campaign');
      }
      return response.data;
    },
    enabled: enabled && !!campaignId,
  });
}
/**
 * Hook to get campaign statistics
 */
export function useCampaignStats() {
  const query = useQuery({
    queryKey: ['campaign-stats'],
    queryFn: async () => {
      const response = await getCampaignStats();
      if (!response.success) {
        throw new Error('Failed to fetch campaign stats');
      }
      return response.data || {};
    },
  });
  return {
    stats: query.data as CampaignStats | undefined,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : undefined,
    refetch: query.refetch,
  };
}
/**
 * Hook to get leads for a campaign
 */
export function useCampaignLeads(campaignId: string, filters?: { search?: string }) {
  const query = useQuery({
    queryKey: ['campaign-leads', campaignId, filters],
    queryFn: async () => {
      const response = await getCampaignLeads(campaignId, filters);
      if (!response.success) {
        throw new Error('Failed to fetch campaign leads');
      }
      return response.data || [];
    },
    enabled: !!campaignId,
  });
  return {
    leads: query.data as CampaignLead[] | undefined,
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : undefined,
    refetch: query.refetch,
  };
}
/**
 * Hook to subscribe to live campaign updates via SSE
 * Updates all campaigns in the cache when any campaign stats change
 */
export function useCampaignLiveUpdates() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);
  useEffect(() => {
    // Connect to SSE endpoint for all campaigns updates
    const baseUrl = process.env.NEXT_PUBLIC_CAMPAIGN_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
    // Get auth token from localStorage (EventSource doesn't support custom headers)
    const token = localStorage.getItem('auth_token');
    if (!token) {
      console.error('[SSE] No auth token found, skipping campaign live updates');
      return;
    }
    const eventSource = new EventSource(`${baseUrl}/api/campaigns/stream?token=${encodeURIComponent(token)}`);
    eventSourceRef.current = eventSource;
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        // Handle different event types
        if (data.type === 'INITIAL_DATA') {
          // Initial data received
        } else if (data.type === 'CAMPAIGN_STATS_UPDATED' || data.type === 'campaign-update') {
          // Invalidate campaigns list to trigger refetch with new stats
          queryClient.invalidateQueries({ queryKey: ['campaigns'] });
        }
      } catch (error) {
        console.error('[SSE] Failed to parse campaign update:', error);
      }
    };
    eventSource.onerror = (error) => {
      console.error('[SSE] Campaign updates connection error:', error);
    };
    return () => {
      eventSource.close();
    };
  }, [queryClient]);
}
