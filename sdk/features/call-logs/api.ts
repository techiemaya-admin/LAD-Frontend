// Call Logs SDK API Layer
import { apiGet, apiPost } from "../../shared/apiClient";
import type {
  CallLogsResponse,
  BatchApiResponse,
  BatchViewApiResponse,
  BatchCallLogsApiResponse,
  GetCallLogsParams,
  GetCallLogsLeadStatusParams,
  BatchViewParams,
  EndCallParams,
  RetryCallsParams,
  RecordingSignedUrlParams,
  RecordingSignedUrlResponse,
  CallLogsStats,
  BatchStats,
  CallLogsStreamOptions,
  CallLogsStreamHandle,
  CallLeadParams,
  CallLeadResponse,
} from "./types";

/**
 * Get call logs with optional date range filters
 */
export async function getCallLogs(params?: GetCallLogsParams): Promise<CallLogsResponse> {
  const query = new URLSearchParams();

  if (params?.status) {
    query.append("status", params.status);
  }

  if (params?.agent_id) {
    query.append("agent_id", params.agent_id);
  }

  if (params?.from_date) {
    query.append("from_date", params.from_date);
  }

  if (params?.to_date) {
    query.append("to_date", params.to_date);
  }

  if (params?.page) {
    query.append("page", params.page.toString());
  }

  if (params?.limit) {
    query.append("limit", params.limit.toString());
  }

  if (params?.lead_tag) {
    query.append("lead_tag", params.lead_tag);
  }

  if (params?.lead_category) {
    query.append("lead_category", params.lead_category);
  }

  // Correct endpoint is /api/voice-agent/calls, not /call-logs
  const response = await apiGet(`/api/voice-agent/calls?${query.toString()}`);

  // Handle both array and object response structures safely
  const rawData = response.data;
  const rawLogs = Array.isArray(rawData) 
    ? rawData 
    : (rawData?.logs || rawData?.raw_logs || rawData?.data || []);

  return {
    logs: rawLogs.map((item: any) => ({
      ...item,
      disposition: item.disposition || item.analysis?.disposition || item.analysis?.raw_analysis?.disposition || item.analysis?.raw_analysis?.lead_disposition || "N/A",
    })),
    pagination: rawData?.pagination
  };
}

/**
 * Get a single call log by ID
 */
export async function getCallLog(callId: string): Promise<any> {
  const response = await apiGet<any>(`/api/voice-agent/calls/${callId}`);

  return response.data;
}

/**
 * Get the lead associated with a call log
 * GET /api/voice-agent/calls/{id}/lead
 */
export async function getCallLead({ callId }: CallLeadParams): Promise<CallLeadResponse> {
  const response = await apiGet<CallLeadResponse>(`/api/voice-agent/calls/${callId}/lead`);
  return response.data;
}
export async function getBatchStatus(batchJobId: string): Promise<BatchApiResponse> {
  const response = await apiGet<BatchApiResponse>(`/api/voice-agent/batch/batch-status/${batchJobId}`);

  return response.data;
}

/**
 * Get batch list for batch view
 */
export async function getBatchView(params?: BatchViewParams): Promise<BatchViewApiResponse | any> {
  const query = new URLSearchParams();

  if (params?.page) {
    query.append("page", params.page.toString());
  }

  if (params?.limit) {
    query.append("limit", params.limit.toString());
  }

  const queryString = query.toString();
  const url = `/api/voice-agent/batch-view${queryString ? `?${queryString}` : ""}`;

  const response = await apiGet<BatchViewApiResponse | any>(url);
  return response.data;
}

/**
 * Get call logs for a specific batch by batch_id
 */
export async function getBatchCallLogsByBatchId(batchId: string): Promise<BatchCallLogsApiResponse | any> {
  try {
    const response = await apiGet<BatchCallLogsApiResponse | any>(
      `/api/voice-agent/batch-id/${batchId}`,
    );
    return response.data;
  } catch (error: any) {
    const message = typeof error?.message === "string" ? error.message : "";
    if (!message.includes("HTTP 404")) {
      throw error;
    }
    const fallbackResponse = await apiGet<BatchCallLogsApiResponse | any>(
      `/api/voice-agent/batch/${batchId}`,
    );
    return fallbackResponse.data;
  }
}

/**
 * End a single call
 */
export async function endCall({ callId }: EndCallParams): Promise<void> {
  const response = await apiPost(`/api/voice-agent/calls/${callId}/end`, {});

  return;
}

/**
 * Get signed recording URL for a call
 */
export async function getRecordingSignedUrl({ callId }: RecordingSignedUrlParams): Promise<RecordingSignedUrlResponse> {
  const response = await apiGet<RecordingSignedUrlResponse>(`/api/voice-agent/calls/${callId}/recording-signed-url`);

  return response.data;
}


/**
 * Retry failed calls
 */
export async function retryFailedCalls(params: RetryCallsParams): Promise<void> {
  const response = await apiPost(`/api/voice-agent/calls/retry`, params);

  return;
}

/**
 * Get call logs statistics
 * Fetches call logs statistics for a specific tenant
 */
export async function getCallLogsStats(tenant_id: string): Promise<CallLogsStats> {
  const response = await apiGet<CallLogsStats>(`/api/voice-agent/calls/stats?tenant_id=${tenant_id}`);

  return response.data;
}

/**
 * Get batch statistics
 * Fetches overall batch statistics for the voice agent
 */
export async function getBatchStats(): Promise<BatchStats> {
  const response = await apiGet<BatchStats>(`/api/voice-agent/batch/stats`);

  return response.data;
}

// ============================================================================
// SSE STREAM API
// ============================================================================

/**
 * Subscribe to call logs SSE stream for real-time status updates
 * 
 * This creates an EventSource connection to the backend SSE endpoint
 * and calls the provided callbacks when messages are received.
 * 
 * @example
 * ```typescript
 * const handle = subscribeToCallLogsStream({
 *   onMessage: (callLog) => {
 *     console.log('Call log update:', callLog.call_log_id, callLog.status);
 *     // Update your local state here
 *   },
 *   onError: (error) => console.error('Stream error:', error),
 *   onOpen: () => console.log('Stream connected'),
 *   onClose: () => console.log('Stream closed'),
 * });
 * 
 * // Later, to close the connection:
 * handle.close();
 * ```
 */
export function subscribeToCallLogsStream(options: CallLogsStreamOptions): CallLogsStreamHandle {
  const { onMessage, onError, onOpen, onClose } = options;

  // Build the SSE URL - use the same base URL as other API calls
  // The backend URL is determined by apiClient's baseURL logic
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
  const baseURL = backendUrl?.endsWith('/api') ? backendUrl.replace(/\/api$/, '') : backendUrl;
  const sseUrl = `${baseURL}/api/voice-agent/calls/stream`;

  // Create EventSource with credentials to send cookies
  const eventSource = new EventSource(sseUrl, { withCredentials: true } as EventSourceInit);

  eventSource.onopen = () => {
    onOpen?.();
  };

  eventSource.onmessage = (event) => {
    try {
      const callLog = JSON.parse(event.data);
      onMessage(callLog);
    } catch (error) {
      console.error('[Call Logs Stream] Failed to parse SSE message:', error);
    }
  };

  eventSource.onerror = (error) => {
    onError?.(error);
    // Note: EventSource will automatically try to reconnect
  };

  return {
    close: () => {
      eventSource.close();
      onClose?.();
    },
  };
}

