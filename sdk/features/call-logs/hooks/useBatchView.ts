/**
 * Call Logs Feature - useBatchView Hook
 * 
 * React hook for fetching batch list using TanStack Query.
 * Framework-independent (no Next.js imports).
 */
import { useQuery } from "@tanstack/react-query";
import type { BatchViewApiResponse, BatchViewParams } from "../types";
import * as api from "../api";

/**
 * Hook to fetch batches for batch view
 */
export function useBatchView(params?: BatchViewParams, enabled: boolean = true) {
  return useQuery<BatchViewApiResponse>({
    queryKey: ["batch-view", params],
    queryFn: () => api.getBatchView(params),
    staleTime: 30000,
    enabled,
  });
}
