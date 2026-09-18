/**
 * Tenant Studio — React Query hooks.
 *
 * Every LLM-backed call is a mutation (it costs credits and must never fire
 * on render). State is a query so the rooms can show readiness up front and
 * refresh after an apply.
 */
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  applyOverlay,
  getStudioState,
  icpScore,
  icpTrain,
  listOverlayVersions,
  refine,
  rehearse,
  studioKeys,
  tailorChat,
} from './api';

export function useStudioState() {
  return useQuery({
    queryKey: studioKeys.state(),
    queryFn: getStudioState,
    staleTime: 15_000,
    retry: 1,
  });
}

export function useOverlayVersions() {
  return useQuery({
    queryKey: studioKeys.versions(),
    queryFn: listOverlayVersions,
    staleTime: 15_000,
    retry: 1,
  });
}

export function useRehearse() {
  return useMutation({ mutationFn: rehearse });
}

export function useRefine() {
  return useMutation({ mutationFn: refine });
}

export function useIcpScore() {
  return useMutation({ mutationFn: icpScore });
}

export function useIcpTrain() {
  return useMutation({ mutationFn: icpTrain });
}

export function useTailorChat() {
  return useMutation({ mutationFn: tailorChat });
}

export function useApplyOverlay() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: applyOverlay,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.all });
    },
  });
}
