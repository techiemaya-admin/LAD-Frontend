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

  const fetchActivities = useCallback(async () => {
    if (!campaignId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.offset) params.append('offset', options.offset.toString());
      if (options.platform) params.append('platform', options.platform);
      if (options.actionType) params.append('actionType', options.actionType);
      if (options.status) params.append('status', options.status);

      const response = await axios.get(
        `/api/campaigns/${campaignId}/analytics?${params.toString()}`
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
      setActivities([]);
      setTotal(0);
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
      try {
        const eventSource = new EventSource(`/api/campaigns/${campaignId}/events`);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log('[ActivityFeed] SSE connected');
          setIsConnected(true);
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // When stats update, refetch activities to show new ones
            if (data.type === 'CAMPAIGN_STATS_UPDATED' || data.type === 'STATS_UPDATE') {
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
          
          // Reconnect after 5 seconds
          setTimeout(() => {
            if (eventSourceRef.current === eventSource) {
              connectSSE();
            }
          }, 5000);
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
