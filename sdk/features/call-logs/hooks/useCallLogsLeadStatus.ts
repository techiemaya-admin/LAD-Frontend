/**
 * Call Logs Feature - useCallLogsLeadStatus Hook
 * 
 * React hook for fetching call logs filtered by status and/or lead_tag using TanStack Query.
 * Framework-independent (no Next.js imports).
 */
import { useQuery } from "@tanstack/react-query";
import type { CallLogsResponse, GetCallLogsLeadStatusParams } from "../types";
import * as api from "../api";

/**
 * Hook to fetch call logs filtered by status and/or lead_tag
 * 
 * @example
 * // Filter by status only
 * const { data, isLoading } = useCallLogsLeadStatus({ status: 'ended', page: 1, limit: 50 });
 * 
 * @example
 * // Filter by lead_tag only
 * const { data, isLoading } = useCallLogsLeadStatus({ lead_tag: 'hot', page: 1, limit: 50 });
 * 
 * @example
 * // Filter by both status and lead_tag
 * const { data, isLoading } = useCallLogsLeadStatus({ status: 'ended', lead_tag: 'hot', page: 1, limit: 50 });
 */
export function useCallLogsLeadStatus(params?: GetCallLogsLeadStatusParams, enabled: boolean = true) {
  return useQuery<CallLogsResponse>({
    queryKey: ["call-logs-lead-status", params],
    queryFn: () => api.getCallLogsLeadStatus(params),
    staleTime: 30000, // 30 seconds
    enabled: enabled && !!(params?.status || params?.lead_tag),
  });
}
