/**
 * Call Logs Feature - useCallLogMutations Hook
 * 
 * React hooks for call log operations using TanStack Query mutations.
 * Framework-independent (no Next.js imports).
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { EndCallParams, FollowUpCallParams, RetryCallsParams } from "../types";
import * as api from "../api";

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
 * Hook to place a follow-up call after a completed call
 */
export function useFollowUpCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: FollowUpCallParams) => api.followUpCall(params),
    onSuccess: () => {
      // The new call appears in the list as pending/ringing
      queryClient.invalidateQueries({ queryKey: ["call-logs"] });
    },
  });
}
