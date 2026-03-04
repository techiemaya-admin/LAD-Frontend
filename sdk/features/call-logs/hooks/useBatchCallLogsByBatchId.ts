/**
 * Call Logs Feature - useBatchCallLogsByBatchId Hook
 * 
 * React hook for fetching call logs for a specific batch using TanStack Query.
 * Framework-independent (no Next.js imports).
 */
import { useQuery } from "@tanstack/react-query";
import type { BatchCallLogsApiResponse } from "../types";
import * as api from "../api";

/**
 * Hook to fetch call logs for a specific batch
 */
export function useBatchCallLogsByBatchId(batchId: string | null, enabled: boolean = true) {
  return useQuery<BatchCallLogsApiResponse>({
    queryKey: ["batch-call-logs", batchId],
    queryFn: () => api.getBatchCallLogsByBatchId(batchId!),
    enabled: enabled && !!batchId,
    staleTime: 15000,
  });
}
