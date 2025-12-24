/**
 * Campaigns Feature - useCampaignAnalytics Hook
 * 
 * React hook for fetching campaign analytics.
 * Framework-independent (no Next.js imports).
 */

import { useState, useCallback, useEffect } from 'react';
import { getCampaignAnalytics } from '../api';
import type { CampaignAnalytics } from '../types';

export interface UseCampaignAnalyticsReturn {
  analytics: CampaignAnalytics | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearError: () => void;
}

export function useCampaignAnalytics(campaignId: string | null): UseCampaignAnalyticsReturn {
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!campaignId) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getCampaignAnalytics(campaignId);
      setAnalytics(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load campaign analytics';
      setError(errorMessage);
      console.error('[campaigns] Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  return {
    analytics,
    loading,
    error,
    refetch: fetchAnalytics,
    clearError: () => setError(null),
  };
}

