/**
 * MindBody Feature - React Query Hooks
 *
 * TanStack Query hooks for the MindBody integration.
 * Each hook accepts fetchFn (fetchWithTenant) for tenant-aware requests.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getMindBodyStatus,
  connectMindBody,
  disconnectMindBody,
  getAvailableClasses,
} from './api';
import type { MindBodyConnectPayload, MindBodyStatus, MindBodyClass } from './types';

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const mindBodyKeys = {
  all: ['mindbody'] as const,
  status: () => [...mindBodyKeys.all, 'status'] as const,
  classes: () => [...mindBodyKeys.all, 'classes'] as const,
} as const;

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Hook to get the current MindBody connection status.
 */
export function useMindBodyStatus(
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>
) {
  return useQuery<MindBodyStatus, Error>({
    queryKey: mindBodyKeys.status(),
    queryFn: () => getMindBodyStatus(fetchFn),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to connect MindBody.
 * Invalidates the status query on success so the UI refreshes automatically.
 */
export function useConnectMindBody(
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>
) {
  const queryClient = useQueryClient();

  return useMutation<MindBodyStatus, Error, MindBodyConnectPayload>({
    mutationFn: (payload) => connectMindBody(fetchFn, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mindBodyKeys.status() });
    },
  });
}

/**
 * Hook to disconnect MindBody.
 * Invalidates the status query on success so the UI refreshes automatically.
 */
export function useDisconnectMindBody(
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>
) {
  const queryClient = useQueryClient();

  return useMutation<{ success: boolean }, Error, void>({
    mutationFn: () => disconnectMindBody(fetchFn),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mindBodyKeys.status() });
    },
  });
}

/**
 * Hook to fetch available classes from the connected MindBody site.
 * Only runs when `enabled` is true (i.e. integration is connected).
 */
export function useAvailableClasses(
  fetchFn: (url: string, init?: RequestInit) => Promise<Response>,
  options?: { enabled?: boolean }
) {
  return useQuery<MindBodyClass[], Error>({
    queryKey: mindBodyKeys.classes(),
    queryFn: () => getAvailableClasses(fetchFn),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: options?.enabled ?? true,
  });
}
