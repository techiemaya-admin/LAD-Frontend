/**
 * Call Logs Feature - useCallLead Hook
 *
 * React hook for fetching the lead associated with a call log via:
 *   GET /api/voiceagents/calls/{id}/lead
 *
 * Framework-independent (no Next.js imports).
 */
import { useQuery } from "@tanstack/react-query";
import type { CallLeadResponse } from "../types";
import * as api from "../api";

/**
 * Hook to fetch the lead linked to a specific call log.
 *
 * @example
 * ```tsx
 * const { data, isLoading, isError } = useCallLead(callId);
 * const lead = data?.lead ?? data;
 * ```
 */
export function useCallLead(callId: string | null | undefined) {
    return useQuery<CallLeadResponse>({
        queryKey: ["call-lead", callId],
        queryFn: () => api.getCallLead({ callId: callId! }),
        enabled: !!callId,
        staleTime: 60000, // 1 minute
    });
}
