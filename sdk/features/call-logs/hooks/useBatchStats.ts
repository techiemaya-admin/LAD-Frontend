/**
 * Call Logs Feature - useBatchStats Hook
 * 
 * React hook for fetching batch statistics using TanStack Query.
 */
import { useQuery } from "@tanstack/react-query";
import type { BatchStats } from "../types";
import * as api from "../api";

/**
 * Hook to fetch batch statistics
 */
export function useBatchStats(enabled: boolean = true) {
    return useQuery<BatchStats>({
        queryKey: ["batch-stats"],
        queryFn: () => api.getBatchStats(),
        staleTime: 30000, // 30 seconds
        enabled: enabled,
    });
}
