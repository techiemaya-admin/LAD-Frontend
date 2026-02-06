// Call Logs SDK API Layer
import { apiGet, apiPost } from "../../shared/apiClient";
import type {
  CallLogsResponse,
  BatchApiResponse,
  GetCallLogsParams,
  EndCallParams,
  RetryCallsParams,
  RecordingSignedUrlParams,
  RecordingSignedUrlResponse,
  CallLogsStats,
} from "./types";

/**
 * Get call logs with optional date range filters
 */
export async function getCallLogs(params?: GetCallLogsParams): Promise<CallLogsResponse> {
  console.log('[Call Logs API] Fetching call logs with params:', params);
  
  const query = new URLSearchParams();
  
  if (params?.from_date) {
    query.append("from_date", params.from_date);
  }
  
  if (params?.to_date) {
    query.append("to_date", params.to_date);
  }

  const queryString = query.toString();
  const url = queryString 
    ? `/api/voice-agent/calls?${queryString}`
    : `/api/voice-agent/calls`;

  console.log('[Call Logs API] Calling URL:', url);
  
  const response = await apiGet<CallLogsResponse>(url);
  console.log('[Call Logs API] Response received:', response);
  
  // Extract data property from API client response
  return response.data;
}

/**
 * Get batch status by job ID
 */
export async function getBatchStatus(batchJobId: string): Promise<BatchApiResponse> {
  console.log('[Call Logs API] Fetching batch status for job ID:', batchJobId);
  
  const response = await apiGet<BatchApiResponse>(`/api/voice-agent/batch/batch-status/${batchJobId}`);
  console.log('[Call Logs API] Batch status response:', response);
  
  // Extract data property from API client response
  return response.data;
}

/**
 * End a single call
 */
export async function endCall({ callId }: EndCallParams): Promise<void> {
  console.log('[Call Logs API] Ending call:', callId);
  
  const response = await apiPost(`/api/voice-agent/calls/${callId}/end`, {});
  console.log('[Call Logs API] End call response:', response);
  
  // No data to return for void response
  return;
}

/**
 * Retry failed calls
 */
export async function retryFailedCalls({ call_ids }: RetryCallsParams): Promise<void> {
  console.log('[Call Logs API] Retrying failed calls:', call_ids);
  
  const response = await apiPost(`/api/voice-agent/calls/retry`, { call_ids });
  console.log('[Call Logs API] Retry response:', response);
  
  // No data to return for void response
  return;
}

/**
 * Get signed recording URL for a call
 */
export async function getRecordingSignedUrl({ callId }: RecordingSignedUrlParams): Promise<RecordingSignedUrlResponse> {
  console.log('[Call Logs API] Fetching signed recording URL for call:', callId);
  
  const response = await apiGet<RecordingSignedUrlResponse>(`/api/voice-agent/calls/${callId}/recording-signed-url`);
  console.log('[Call Logs API] Recording signed URL response:', response);
  
  // Extract data property from API client response
  return response.data;
}

/**
 * Get call logs statistics
 * Fetches call logs and calculates stats by counting based on status and lead_category
 */
export async function getCallLogsStats(params?: GetCallLogsParams): Promise<CallLogsStats> {
  console.log('[Call Logs API] Fetching call logs stats with params:', params);
  
  // Fetch the call logs data
  const callLogsData = await getCallLogs(params);
  const logs = callLogsData.logs || [];
  
  console.log('[Call Logs API] Processing stats from logs:', logs.length);
  
  // Initialize counters
  const stats: CallLogsStats = {
    total_calls: 0,
    completed_calls: 0,
    failed_calls: 0,
    ongoing: 0,
    queue: 0,
    hot_leads: 0,
    warm_leads: 0,
    cold_leads: 0,
  };
  
  // Count each log by status and lead category
  logs.forEach((log) => {
    stats.total_calls++;
    
    const status = (log.status || '').toLowerCase();
    
    // Count by status
    if (status === 'ended' || status === 'completed') {
      stats.completed_calls++;
    } else if (status === 'failed') {
      stats.failed_calls++;
    } else if (status === 'ongoing' || status === 'in_progress' || status === 'calling') {
      stats.ongoing++;
    } else if (status === 'queue' || status === 'queued' || status === 'pending') {
      stats.queue++;
    }
    
    // Count by lead category from analysis
    const leadCategory = log.analysis?.raw_analysis?.lead_score_full?.lead_category;
    if (leadCategory) {
      const category = leadCategory.toLowerCase();
      if (category.includes('hot')) {
        stats.hot_leads++;
      } else if (category.includes('warm')) {
        stats.warm_leads++;
      } else if (category.includes('cold')) {
        stats.cold_leads++;
      }
    }
  });
  
  console.log('[Call Logs API] Calculated stats:', stats);
  
  return stats;
}
