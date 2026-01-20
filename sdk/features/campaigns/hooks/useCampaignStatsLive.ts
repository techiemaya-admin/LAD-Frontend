/**
 * Real-time Campaign Stats Hook
 * Uses Server-Sent Events (SSE) for live updates - NO POLLING
 */

import { useState, useEffect, useCallback, useRef } from 'react';

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
}

interface UseCampaignStatsLiveResult {
  stats: CampaignStats | null;
  isLoading: boolean;
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
}

export function useCampaignStatsLive({
  campaignId,
  enabled = true
}: UseCampaignStatsLiveOptions): UseCampaignStatsLiveResult {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  // Connect to SSE endpoint
  const connectSSE = useCallback(() => {
    if (!enabled || !campaignId) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    try {
      // Get auth token from localStorage
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';
      
      // Construct SSE URL - backend uses query param for SSE auth
      const sseUrl = `${baseUrl}/api/campaigns/${campaignId}/events${token ? `?token=${token}` : ''}`;
      
      console.log('[CampaignStatsLive] Connecting to SSE:', sseUrl.replace(/token=.*/, 'token=***'));
      
      const eventSource = new EventSource(sseUrl, { withCredentials: true });
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log('[CampaignStatsLive] SSE connected');
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'INITIAL_STATS' || data.type === 'CAMPAIGN_STATS_UPDATED') {
            console.log('[CampaignStatsLive] Stats update received:', data.type);
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

      eventSource.onerror = () => {
        console.warn('[CampaignStatsLive] SSE connection error');
        setIsConnected(false);
        
        eventSource.close();
        eventSourceRef.current = null;

        // Exponential backoff reconnection (infinite retries for live data)
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
        reconnectAttemptsRef.current++;
        
        console.log(`[CampaignStatsLive] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
          connectSSE();
        }, delay);
      };

    } catch (err) {
      console.error('[CampaignStatsLive] Failed to connect SSE:', err);
      setError(err instanceof Error ? err : new Error('Failed to connect'));
      setIsLoading(false);
    }
  }, [campaignId, enabled]);

  // Manual reconnect
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    setError(null);
    setIsLoading(true);
    connectSSE();
  }, [connectSSE]);

  // Connect on mount
  useEffect(() => {
    if (!enabled || !campaignId) {
      setIsLoading(false);
      return;
    }

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
    };
  }, [campaignId, enabled, connectSSE]);

  return {
    stats,
    isLoading,
    isConnected,
    error,
    reconnect
  };
}
