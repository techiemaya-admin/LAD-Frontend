/**
 * Lead Appreciation feature - React Query hooks.
 */
'use client';

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';

import {
  approveAppreciationSignal,
  getAppreciationStats,
  listAppreciationSignals,
  rejectAppreciationSignal,
  runAppreciationScan,
} from './api';
import type {
  AppreciationSignal,
  AppreciationStatusCount,
  ApproveSignalInput,
  ListSignalsParams,
  RejectSignalInput,
} from './types';

const SIGNALS_KEY = 'lead-appreciation-signals';
const STATS_KEY = 'lead-appreciation-stats';

export function useAppreciationSignals(params?: ListSignalsParams, enabled = true) {
  return useQuery<AppreciationSignal[]>({
    queryKey: [SIGNALS_KEY, params],
    queryFn: () => listAppreciationSignals(params),
    staleTime: 30_000,
    enabled,
  });
}

export function useAppreciationStats(enabled = true) {
  return useQuery<AppreciationStatusCount[]>({
    queryKey: [STATS_KEY],
    queryFn: () => getAppreciationStats(),
    staleTime: 30_000,
    enabled,
  });
}

export function useApproveAppreciationSignal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: ApproveSignalInput) => approveAppreciationSignal(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SIGNALS_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_KEY] });
    },
  });
}

export function useRejectAppreciationSignal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: RejectSignalInput) => rejectAppreciationSignal(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SIGNALS_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_KEY] });
    },
  });
}

export function useRunAppreciationScan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => runAppreciationScan(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SIGNALS_KEY] });
      queryClient.invalidateQueries({ queryKey: [STATS_KEY] });
    },
  });
}
