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
        // Get auth token from localStorage (EventSource doesn't support custom headers)
        const token = localStorage.getItem('auth_token') || localStorage.getItem('authToken') || localStorage.getItem('token');
        if (!token) {
          console.warn('[ActivityFeed] No auth token found, cannot connect to SSE');
          setIsConnected(false);
          return;
        }
        
        // Use backend URL for SSE connection
        if (!process.env.NEXT_PUBLIC_BACKEND_URL && !process.env.NEXT_PUBLIC_API_URL && process.env.NODE_ENV === 'production') {
          throw new Error('NEXT_PUBLIC_BACKEND_URL environment variable is required in production');
        }
        // Ensure URL includes /api prefix
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3004';
        const baseUrl = backendUrl.includes('/api') ? backendUrl : `${backendUrl}/api`;
        const sseUrl = `${baseUrl}/campaigns/${campaignId}/analytics?limit=${options.limit}&token=${encodeURIComponent(token)}`;
        console.log('[ActivityFeed] Connecting to SSE:', sseUrl.replace(token, 'TOKEN_HIDDEN'));
        
        const eventSource = new EventSource(sseUrl);
        eventSourceRef.current = eventSource;
        
        eventSource.onopen = () => {
          console.log('[ActivityFeed] SSE connected successfully');
          setIsConnected(true);
        };
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('[ActivityFeed] SSE message received:', data.type);
            // When stats update, refetch activities to show new ones
            if (data.type === 'CAMPAIGN_STATS_UPDATED' || data.type === 'STATS_UPDATE' || data.type === 'INITIAL_STATS') {
              fetchActivities();
            }
          } catch (err) {
            console.error('[ActivityFeed] Failed to parse SSE:', err);
          }
        };
        
        eventSource.onerror = (err) => {
          console.error('[ActivityFeed] SSE error:', err);
          console.log('[ActivityFeed] SSE readyState:', eventSource.readyState);
          setIsConnected(false);
          eventSource.close();
          
          // Don't reconnect if it's an authentication error (readyState 2 = CLOSED)
          // Authentication errors return JSON instead of SSE stream, causing MIME type errors
          if (eventSource.readyState === 2) {
            console.warn('[ActivityFeed] SSE connection closed (possible auth error). Not reconnecting.');
            console.warn('[ActivityFeed] Please log out and log back in to refresh your session.');
            return;
          }
          
          // Reconnect after 5 seconds for other errors
          setTimeout(() => {
            if (eventSourceRef.current === eventSource) {
              console.log('[ActivityFeed] Attempting to reconnect...');
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
