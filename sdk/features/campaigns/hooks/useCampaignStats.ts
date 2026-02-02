/**
 * Campaigns Feature - useCampaignStats Hook
 * 
 * React hook for fetching campaign statistics.
 * Framework-independent (no Next.js imports).
 */
import { useState, useCallback, useEffect } from 'react';
import { getCampaignStats } from '../api';
import type { CampaignStats } from '../types';
export interface UseCampaignStatsReturn {
  stats: CampaignStats | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  clearError: () => void;
}
export function useCampaignStats(): UseCampaignStatsReturn {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getCampaignStats();
      setStats(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load campaign stats';
      setError(errorMessage);
      console.error('[campaigns] Failed to load stats:', err);
      // Set default stats on error
      setStats({
        total_campaigns: 0,
        active_campaigns: 0,
        total_leads: 0,
        total_sent: 0,
        total_delivered: 0,
        total_connected: 0,
        total_replied: 0,
        avg_connection_rate: 0,
        avg_reply_rate: 0,
        instagram_connection_rate: 0,
        whatsapp_connection_rate: 0,
        voice_agent_connection_rate: 0,
      });
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    fetchStats();
  }, [fetchStats]);
  return {
    stats,
    loading,
    error,
    refetch: fetchStats,
    clearError: () => setError(null),
  };
}