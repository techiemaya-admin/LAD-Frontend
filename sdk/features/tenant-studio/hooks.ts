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
  addReferenceLinks,
  applyBrief,
  applyOverlay,
  deleteFirstCampaign,
  deleteGoal,
  deleteReference,
  draftFirstCampaign,
  getFirstCampaign,
  getReferences,
  pullReferencePosts,
  rewriteFirstCampaignMessage,
  saveBrand,
  saveBrandStory,
  updateFirstCampaign,
  updateReference,
  uploadBrandGuide,
  uploadBrandLogos,
  uploadReferences,
  generateChannelPrompt,
  getChannels,
  getStudioState,
  getStyle,
  importStyle,
  importStyleFromMailbox,
  saveChannel,
  listGoals,
  proposeBrief,
  saveSetup,
  upsertGoal,
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

/* ------------------------------------------------------------------ */
/* Setup flow                                                           */
/* ------------------------------------------------------------------ */

export function useSaveSetup() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveSetup,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.all });
    },
  });
}

export function useGoals(enabled = true) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: studioKeys.goals(),
    queryFn: listGoals,
    staleTime: 15_000,
    retry: 1,
    enabled,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: studioKeys.all });
  const upsert = useMutation({ mutationFn: upsertGoal, onSuccess: invalidate });
  const remove = useMutation({ mutationFn: deleteGoal, onSuccess: invalidate });
  return { ...query, upsert, remove };
}

export function useProposeBrief() {
  return useMutation({ mutationFn: proposeBrief });
}

export function useApplyBrief() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: applyBrief,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.all });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Step 6 — channel profiles + writing style                            */
/* ------------------------------------------------------------------ */

export function useChannels(enabled = true) {
  return useQuery({
    queryKey: studioKeys.channels(),
    queryFn: getChannels,
    staleTime: 15_000,
    retry: 1,
    enabled,
  });
}

export function useSaveChannel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: saveChannel,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.all });
    },
  });
}

export function useStyle(enabled = true) {
  return useQuery({
    queryKey: studioKeys.style(),
    queryFn: getStyle,
    staleTime: 15_000,
    retry: 1,
    enabled,
  });
}

export function useImportStyle() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: importStyle,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.all });
    },
  });
}

export function useImportStyleFromMailbox() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: importStyleFromMailbox,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.all });
    },
  });
}

export function useGenerateChannelPrompt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: generateChannelPrompt,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.all });
    },
  });
}

/* ------------------------------------------------------------------ */
/* Step 7 — your first campaign                                         */
/* ------------------------------------------------------------------ */

/** Every write below invalidates the whole studio: the checklist and the rooms read `state.firstCampaign`. */
function useStudioMutation<TData, TVars>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: studioKeys.all });
    },
  });
}

export function useFirstCampaign(enabled = true) {
  return useQuery({
    queryKey: studioKeys.firstCampaign(),
    queryFn: getFirstCampaign,
    staleTime: 15_000,
    retry: 1,
    enabled,
  });
}

export function useDraftFirstCampaign() {
  return useStudioMutation(draftFirstCampaign);
}

export function useUpdateFirstCampaign() {
  return useStudioMutation(updateFirstCampaign);
}

export function useRewriteFirstCampaign() {
  return useStudioMutation(rewriteFirstCampaignMessage);
}

export function useDeleteFirstCampaign() {
  return useStudioMutation(deleteFirstCampaign);
}

/* ------------------------------------------------------------------ */
/* Step 8 — brand and references                                        */
/* ------------------------------------------------------------------ */

export function useReferences(enabled = true) {
  return useQuery({
    queryKey: studioKeys.references(),
    queryFn: getReferences,
    staleTime: 15_000,
    retry: 1,
    enabled,
  });
}

export function useUploadReferences() {
  return useStudioMutation(uploadReferences);
}

export function useUpdateReference() {
  return useStudioMutation(updateReference);
}

export function useDeleteReference() {
  return useStudioMutation(deleteReference);
}

export function useAddReferenceLinks() {
  return useStudioMutation(addReferenceLinks);
}

export function usePullReferencePosts() {
  return useStudioMutation(pullReferencePosts);
}

export function useSaveBrandStory() {
  return useStudioMutation(saveBrandStory);
}

export function useUploadBrandLogos() {
  return useStudioMutation(uploadBrandLogos);
}

export function useSaveBrand() {
  return useStudioMutation(saveBrand);
}

export function useUploadBrandGuide() {
  return useStudioMutation(uploadBrandGuide);
}
