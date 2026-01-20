/**
 * Real-time Campaign Activity Feed Hook
 * Uses Server-Sent Events (SSE) for live updates - NO POLLING
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

interface CampaignActivity {
  id: string;
  campaign_id: string;
  lead_id?: string;
  action_type: string;
  platform: string;
  status: string;
  lead_name?: string;
  lead_phone?: string;
  lead_email?: string;
  message_content?: string;
  error_message?: string;
  response_data?: any;
  created_at: string;
  updated_at: string;
}

interface UseCampaignActivityFeedOptions {
  limit?: number;
  offset?: number;
  platform?: string;
  actionType?: string;
  status?: string;
}

interface UseCampaignActivityFeedReturn {
  activities: CampaignActivity[];
  total: number;
  isLoading: boolean;
  isConnected: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useCampaignActivityFeed(
  campaignId: string,
  options: UseCampaignActivityFeedOptions = {}
): UseCampaignActivityFeedReturn {
  const [activities, setActivities] = useState<CampaignActivity[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);

  const fetchActivities = useCallback(async () => {
    if (!campaignId) {
      setIsLoading(false);
      return;
    }

    setError(null);

    try {
      const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.platform) params.append('platform', options.platform);
      if (options.actionType) params.append('actionType', options.actionType);
      if (options.status) params.append('status', options.status);

      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(
        `${baseUrl}/api/campaigns/${campaignId}/analytics?${params.toString()}`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      );

      if (response.data?.success) {
        setActivities(response.data.data.activities || []);
        setTotal(response.data.data.total || 0);
      } else {
        throw new Error('Failed to fetch activity feed');
      }
    } catch (err) {
      console.error('[useCampaignActivityFeed] Error:', err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setIsLoading(false);
    }
  }, [campaignId, options.limit, options.offset, options.platform, options.actionType, options.status]);

  // SSE connection for real-time updates
  useEffect(() => {
    if (!campaignId) return;

    // Initial fetch
    fetchActivities();

    // Connect to SSE for live updates
    const connectSSE = () => {
      // Close existing
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      try {
        const token = localStorage.getItem('authToken') || localStorage.getItem('token');
        const baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '';
        const sseUrl = `${baseUrl}/api/campaigns/${campaignId}/events${token ? `?token=${token}` : ''}`;
        
        const eventSource = new EventSource(sseUrl, { withCredentials: true });
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('[ActivityFeed] SSE connected');
          setIsConnected(true);
          reconnectAttemptsRef.current = 0;
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // When stats update, refetch activities to show new ones
            if (data.type === 'CAMPAIGN_STATS_UPDATED' || data.type === 'STATS_UPDATE' || data.type === 'INITIAL_STATS') {
              console.log('[ActivityFeed] New activity detected, refreshing...');
              fetchActivities();
            }
          } catch (err) {
            console.error('[ActivityFeed] Failed to parse SSE:', err);
          }
        };

        eventSource.onerror = () => {
          console.warn('[ActivityFeed] SSE disconnected');
          setIsConnected(false);
          eventSource.close();
          eventSourceRef.current = null;
          
          // Exponential backoff reconnection (infinite retries)
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectAttemptsRef.current++;
          
          console.log(`[ActivityFeed] Reconnecting in ${delay}ms`);
          reconnectTimeoutRef.current = setTimeout(connectSSE, delay);
        };
      } catch (err) {
        console.error('[ActivityFeed] Failed to connect SSE:', err);
      }
    };

    connectSSE();

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
  }, [campaignId, fetchActivities]);

  return {
    activities,
    total,
    isLoading,
    isConnected,
    error,
    refresh: fetchActivities
  };
}
