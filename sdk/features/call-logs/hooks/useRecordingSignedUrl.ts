/**
 * Call Logs Feature - useRecordingSignedUrl Hook
 * 
 * React hook for fetching signed recording URLs using TanStack Query.
 * Framework-independent (no Next.js imports).
 */
import { useQuery } from "@tanstack/react-query";
import type { RecordingSignedUrlResponse } from "../types";
import * as api from "../api";

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

/**
 * Hook to fetch the MP3 signed URL for a call (download / share).
 *
 * Disabled until asked for: the MP3 is transcoded on the first request, so it is
 * only fetched when the user actually clicks Download.
 */
export function useRecordingMp3Url(callId: string | null | undefined, enabled = false) {
  return useQuery({
    queryKey: ["recording-mp3-url", callId],
    queryFn: () => api.getRecordingMp3Url({ callId: callId! }),
    enabled: !!callId && enabled,
    staleTime: 300000,
  });
}
