// Call Logs SDK Hooks Layer
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  CallLogsResponse,
  BatchApiResponse,
  GetCallLogsParams,
  EndCallParams,
  RetryCallsParams,
  RecordingSignedUrlParams,
  RecordingSignedUrlResponse,
} from "./types";
import * as api from "./api";

/**
 * Hook to fetch call logs
 */
export function useCallLogs(params?: GetCallLogsParams, enabled: boolean = true) {
  return useQuery<CallLogsResponse>({
    queryKey: ["call-logs", params],
    queryFn: () => api.getCallLogs(params),
    staleTime: 30000, // 30 seconds
    enabled: enabled,
  });
}

/**
 * Hook to fetch batch status
 */
export function useBatchStatus(batchJobId: string | null) {
  return useQuery<BatchApiResponse>({
    queryKey: ["batch-status", batchJobId],
    queryFn: () => api.getBatchStatus(batchJobId!),
    enabled: !!batchJobId,
    staleTime: 5000, // 5 seconds for active batches
  });
}

/**
 * Hook to end a call
 */
export function useEndCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: EndCallParams) => api.endCall(params),
    onSuccess: () => {
      // Invalidate call logs to refresh the list
      queryClient.invalidateQueries({ queryKey: ["call-logs"] });
    },
  });
}

/**
 * Hook to retry failed calls
 */
export function useRetryFailedCalls() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: RetryCallsParams) => api.retryFailedCalls(params),
    onSuccess: () => {
      // Invalidate call logs to refresh the list
      queryClient.invalidateQueries({ queryKey: ["call-logs"] });
    },
  });
}

/**
 * Hook to fetch signed recording URL for a call
 */
export function useRecordingSignedUrl(callId: string | null | undefined) {
  return useQuery({
    queryKey: ["recording-signed-url", callId],
    queryFn: () => api.getRecordingSignedUrl({ callId: callId! }),
    enabled: !!callId,
    staleTime: 300000, // 5 minutes - signed URLs typically have longer expiry
  });
}
