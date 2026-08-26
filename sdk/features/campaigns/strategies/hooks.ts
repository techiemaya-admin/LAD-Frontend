/**
 * Strategies feature - React Query hooks.
 */
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  createStrategy,
  deleteStrategy,
  getPublishPreview,
  getStrategy,
  importSharedStrategy,
  listSharedStrategies,
  listStrategies,
  publishStrategy,
  strategyKeys,
  unpublishStrategy,
  updateStrategy,
} from './api';
import type {
  CreateStrategyInput,
  PublishPreview,
  SharedStrategy,
  Strategy,
  UpdateStrategyInput,
} from './types';

export function useStrategies(enabled = true) {
  return useQuery<Strategy[]>({
    queryKey: strategyKeys.list(),
    queryFn: listStrategies,
    staleTime: 30_000,
    enabled,
  });
}

export function useStrategy(id: string, enabled = true) {
  return useQuery<Strategy>({
    queryKey: strategyKeys.detail(id),
    queryFn: () => getStrategy(id),
    enabled: enabled && !!id,
  });
}

export function useCreateStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStrategyInput) => createStrategy(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.lists() });
    },
  });
}

export function useUpdateStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateStrategyInput }) =>
      updateStrategy(id, input),
    onSuccess: (strategy) => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: strategyKeys.detail(strategy.id) });
    },
  });
}

export function useDeleteStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteStrategy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.lists() });
    },
  });
}

// ── Phase 2 ─────────────────────────────────────────────────────────────────

/**
 * Publish dry run. Not cached (staleTime 0): the preview must reflect the
 * definition as it stands right now, since the tenant is about to consent to
 * exactly this payload leaving their account.
 */
export function usePublishPreview(id: string | null) {
  return useQuery<PublishPreview>({
    queryKey: strategyKeys.publishPreview(id || ''),
    queryFn: () => getPublishPreview(id as string),
    enabled: !!id,
    staleTime: 0,
    gcTime: 0,
    retry: false,
  });
}

export function usePublishStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => publishStrategy(id),
    onSuccess: (strategy) => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: strategyKeys.detail(strategy.id) });
    },
  });
}

export function useUnpublishStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unpublishStrategy(id),
    onSuccess: (strategy) => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: strategyKeys.detail(strategy.id) });
    },
  });
}

/**
 * The cross-tenant gallery. `retry: false` so that when sharing is disabled
 * backend-side (404) the UI settles into "unavailable" immediately instead of
 * retrying a route that will never exist.
 */
export function useSharedStrategies(enabled = true) {
  return useQuery<SharedStrategy[]>({
    queryKey: strategyKeys.shared(),
    queryFn: listSharedStrategies,
    staleTime: 60_000,
    enabled,
    retry: false,
  });
}

export function useImportSharedStrategy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name?: string }) => importSharedStrategy(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.lists() });
      queryClient.invalidateQueries({ queryKey: strategyKeys.shared() });
    },
  });
}
