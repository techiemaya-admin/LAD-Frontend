/**
 * Real-time Campaign Stats Hook
 * Uses Server-Sent Events (SSE) for live updates with polling fallback
 */
import { useState, useEffect, useCallback, useRef } from 'react';
import { apiGet } from '../../../shared/apiClient';
interface PlatformMetrics {
  linkedin: { sent: number; connected: number; replied: number };
  email: { sent: number; connected: number; replied: number };
  whatsapp: { sent: number; connected: number; replied: number };
  voice: { sent: number; connected: number; replied: number };
  instagram: { sent: number; connected: number; replied: number };
}
export interface CampaignStats {
  leads_count: number;
  sent_count: number;
  connected_count: number;
  replied_count: number;
  delivered_count: number;
  opened_count: number;
  clicked_count: number;
  platform_metrics?: PlatformMetrics | null;
}
interface UseCampaignStatsLiveOptions {
  campaignId: string;
  enabled?: boolean;
  fallbackInterval?: number; // Polling interval if SSE fails (default: 30s)
}
interface UseCampaignStatsLiveResult {
  stats: CampaignStats | null;
  isLoading: boolean;
  isConnected: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}
export function useCampaignStatsLive({
  campaignId,
  enabled = true,
  fallbackInterval = 30000
}: UseCampaignStatsLiveOptions): UseCampaignStatsLiveResult {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fallbackIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  // Fetch stats from REST endpoint
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiGet<{ success: boolean; data: CampaignStats }>(
        `/campaigns/${campaignId}/stats`
      );
      if (response.success && response.data) {
        setStats(response.data);
        setError(null);
      }
    } catch (err) {
      console.error('[CampaignStatsLive] Failed to fetch stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);
  // Connect to SSE endpoint
  const connectSSE = useCallback(() => {
    if (!enabled || !campaignId) return;
    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '/api';
      // Construct SSE URL with auth token
      const sseUrl = `${baseUrl}/campaigns/${campaignId}/events${token ? `?token=${token}` : ''}`;
      const eventSource = new EventSource(sseUrl);
      eventSourceRef.current = eventSource;
      eventSource.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        // Clear fallback polling if SSE connects
        if (fallbackIntervalRef.current) {
          clearInterval(fallbackIntervalRef.current);
          fallbackIntervalRef.current = null;
        }
      };
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'INITIAL_STATS' || data.type === 'CAMPAIGN_STATS_UPDATED') {
            setStats(data.stats);
            setIsLoading(false);
          } else if (data.type === 'ERROR') {
            console.error('[CampaignStatsLive] Server error:', data.message);
            setError(new Error(data.message));
          }
        } catch (err) {
          console.error('[CampaignStatsLive] Failed to parse SSE message:', err);
        }
      };
      eventSource.onerror = (err) => {
        console.error('[CampaignStatsLive] SSE error:', err);
        setIsConnected(false);
        eventSource.close();
        eventSourceRef.current = null;
        // Exponential backoff reconnection
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          `);
          reconnectTimeoutRef.current = setTimeout(() => {
            connectSSE();
          }, delay);
        } else {
          // Fall back to polling after max reconnect attempts
          console.warn('[CampaignStatsLive] Max reconnect attempts reached, falling back to polling');
          startFallbackPolling();
        }
      };
    } catch (err) {
      console.error('[CampaignStatsLive] Failed to connect SSE:', err);
      setError(err instanceof Error ? err : new Error('Failed to connect'));
      startFallbackPolling();
    }
  }, [campaignId, enabled]);
  // Start polling as fallback
  const startFallbackPolling = useCallback(() => {
    if (fallbackIntervalRef.current) return;
    // Initial fetch
    fetchStats();
    // Set up interval
    fallbackIntervalRef.current = setInterval(() => {
      fetchStats();
    }, fallbackInterval);
  }, [fetchStats, fallbackInterval]);
  // Manual refresh
  const refresh = useCallback(async () => {
    setIsLoading(true);
    await fetchStats();
  }, [fetchStats]);
  // Connect on mount
  useEffect(() => {
    if (!enabled || !campaignId) {
      setIsLoading(false);
      return;
    }
    // Try SSE first
    connectSSE();
    // Cleanup
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
      if (fallbackIntervalRef.current) {
        clearInterval(fallbackIntervalRef.current);
        fallbackIntervalRef.current = null;
      }
    };
  }, [campaignId, enabled, connectSSE]);
  return {
    stats,
    isLoading,
    isConnected,
    error,
    refresh
  };
}