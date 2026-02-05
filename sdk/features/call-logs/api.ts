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
