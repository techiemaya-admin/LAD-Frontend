import { useState, useEffect, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';
import { safeStorage } from '../../../shared/storage';
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
      
      // Use full backend URL instead of relative path
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL ;
      const baseUrl = backendUrl.includes('/api') ? backendUrl : `${backendUrl}/api`;
      const url = `${baseUrl}/campaigns/${campaignId}/analytics?${params.toString()}`;
      
      // Get auth token from SafeStorage
      const token = typeof window !== 'undefined' ? safeStorage.getItem('token') : null;
      
      const response = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: 'include'
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch activity feed');
      }
      
      if (data?.success) {
        setActivities(data.data.activities || []);
        setTotal(data.data.total || 0);
      } else {
        throw new Error('Failed to fetch activity feed');
      }
    } catch (err) {
      logger.error('[useCampaignActivityFeed] Error fetching activities', err);
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
    
    // Connect to SSE for live updates using the /events endpoint
    const connectSSE = () => {
      try {
        // Get auth token from SafeStorage (EventSource doesn't support custom headers)
        const token = typeof window !== 'undefined' ? safeStorage.getItem('token') : null;
        
        if (!token) {
          logger.warn('[ActivityFeed] No auth token found, cannot connect to SSE');
          setIsConnected(false);
          return;
        }
        
        // Use backend URL for SSE connection - use /events endpoint which supports SSE
        const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL ;
        const baseUrl = backendUrl.includes('/api') ? backendUrl : `${backendUrl}/api`;
        const sseUrl = `${baseUrl}/campaigns/${campaignId}/events?token=${encodeURIComponent(token)}`;
        logger.debug('[ActivityFeed] Connecting to SSE', { url: sseUrl.replace(token, 'TOKEN_HIDDEN') });
        
        const eventSource = new EventSource(sseUrl);
        eventSourceRef.current = eventSource;
        
        eventSource.onopen = () => {
          logger.debug('[ActivityFeed] SSE connected successfully');
          setIsConnected(true);
        };
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            logger.debug('[ActivityFeed] SSE message received', { type: data.type });
            // When stats or activities update, refetch activities to show new ones
            if (data.type === 'CAMPAIGN_STATS_UPDATED' || 
                data.type === 'STATS_UPDATE' || 
                data.type === 'INITIAL_STATS' ||
                data.type === 'ACTIVITY_UPDATE' ||
                data.type === 'NEW_ACTIVITY') {
              fetchActivities();
            }
          } catch (err) {
            logger.error('[ActivityFeed] Failed to parse SSE message', err);
          }
        };
        
        eventSource.onerror = (err) => {
          logger.error('[ActivityFeed] SSE error', { error: err, readyState: eventSource.readyState });
          setIsConnected(false);
          
          // If readyState is 2 (CLOSED), it means the connection was closed
          // This could be due to MIME type error, auth error, or endpoint issue
          if (eventSource.readyState === 2) {
            logger.warn('[ActivityFeed] SSE connection closed. Will retry...');
            eventSource.close();
            eventSourceRef.current = null;
            // Retry connection after 5 seconds
            setTimeout(() => {
              if (campaignId) {
                connectSSE();
              }
            }, 5000);
            return;
          }
          
          // For other errors, try to reconnect
          setTimeout(() => {
            if (eventSourceRef.current === eventSource && campaignId) {
              logger.debug('[ActivityFeed] Attempting to reconnect...');
              connectSSE();
            }
          }, 5000);
        };
      } catch (err) {
        logger.error('[ActivityFeed] Failed to connect SSE', err);
        setIsConnected(false);
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
