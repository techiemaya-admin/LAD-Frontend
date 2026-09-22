/**
 * Tenant Studio — React Query hooks.
 *
 * Every LLM-backed call is a mutation (it costs credits and must never fire
 * on render). State is a query so the rooms can show readiness up front and
 * refresh after an apply.
 */
'use client';

import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from '@tanstack/react-query';
import {
  addReferenceLinks,
  answerQuestion,
  applyAndUpdate,
  createQuestion,
  dismissQuestion,
  getLaunchStatus,
  getStudioChat,
  getStudioHistory,
  goLive,
  listQuestions,
  runTestRun,
  sendTestRunFeedback,
  undoHistory,
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
  resetStudioChat,
  sendStudioChat,
  studioKeys,
  tailorChat,
} from './api';
import type { ChatBlock, ChatMessage, ChatPending, ChatSendInput, ChatThreadPage, QuestionStatus } from './types';

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

/* ------------------------------------------------------------------ */
/* Step 9 — try your agent and go live                                  */
/* ------------------------------------------------------------------ */

export function useTestRun() {
  return useMutation({ mutationFn: runTestRun });
}

export function useTestRunFeedback() {
  return useMutation({ mutationFn: sendTestRunFeedback });
}

/** Changes the overlay AND the live agents, so everything studio-shaped refreshes. */
export function useApplyAndUpdate() {
  return useStudioMutation(applyAndUpdate);
}

export function useLaunchStatus(enabled = true) {
  return useQuery({
    queryKey: studioKeys.launch(),
    queryFn: getLaunchStatus,
    staleTime: 15_000,
    retry: 1,
    enabled,
  });
}

export function useGoLive() {
  return useStudioMutation(goLive);
}

/* ------------------------------------------------------------------ */
/* History + undo                                                       */
/* ------------------------------------------------------------------ */

export function useStudioHistory(enabled = true, limit = 50) {
  return useQuery({
    queryKey: studioKeys.history(limit),
    queryFn: () => getStudioHistory(limit),
    staleTime: 15_000,
    retry: 1,
    enabled,
  });
}

export function useUndoHistory() {
  return useStudioMutation(undoHistory);
}

/* ------------------------------------------------------------------ */
/* Questions Mr LAD has for the owner                                   */
/* ------------------------------------------------------------------ */

export function useQuestions(status: QuestionStatus = 'open', enabled = true) {
  return useQuery({
    queryKey: studioKeys.questions(status),
    queryFn: () => listQuestions(status),
    staleTime: 15_000,
    retry: 1,
    enabled,
  });
}

export function useAnswerQuestion() {
  return useStudioMutation(answerQuestion);
}

export function useDismissQuestion() {
  return useStudioMutation(dismissQuestion);
}

export function useCreateQuestion() {
  return useStudioMutation(createQuestion);
}

/* ------------------------------------------------------------------ */
/* Studio chat — one persistent "Mr LAD" thread per tenant              */
/* ------------------------------------------------------------------ */

type ChatCache = InfiniteData<ChatThreadPage, string | undefined>;

/** The thread as the UI reads it: oldest → newest across every loaded page, no duplicates. */
export interface ChatThread {
  messages: ChatMessage[];
  pending: ChatPending;
  hasMore: boolean;
}

function flattenThread(data: ChatCache): ChatThread {
  const seen = new Set<string>();
  const messages: ChatMessage[] = [];
  // pages[0] is the newest page; older pages follow. Read them oldest-first.
  for (let i = data.pages.length - 1; i >= 0; i -= 1) {
    for (const m of data.pages[i].messages) {
      if (!m || seen.has(m.id)) continue;
      seen.add(m.id);
      messages.push(m);
    }
  }
  messages.sort((a, b) => (a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0));
  const newest = data.pages[0];
  const oldest = data.pages[data.pages.length - 1];
  return {
    messages,
    pending: newest?.pending ?? { pickers: [], reviews: [], prompts: [] },
    hasMore: Boolean(oldest?.hasMore),
  };
}

/**
 * The thread, paged: the first page is the newest 50, `fetchNextPage` loads
 * the 50 before the oldest one on screen. Absent on backends that predate
 * the thread — pass `enabled=false` there.
 */
export function useStudioChat(enabled = true) {
  return useInfiniteQuery({
    queryKey: studioKeys.chat(),
    queryFn: ({ pageParam }) => getStudioChat({ before: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.hasMore && last.messages.length > 0 ? last.messages[0].id : undefined),
    select: flattenThread,
    staleTime: 15_000,
    retry: 1,
    enabled,
  });
}

/** Marks a picker on `messageId` as answered with `keys` (the tick, the disabled rows) without waiting for a refetch. */
function markPicked(pages: ChatThreadPage[], messageId: string, keys: string[]): ChatThreadPage[] {
  return pages.map((page) => ({
    ...page,
    pending: { ...page.pending, pickers: page.pending.pickers.filter((id) => id !== messageId) },
    messages: page.messages.map((m) => {
      if (m.id !== messageId) return m;
      const blocks: ChatBlock[] = m.blocks.map((b) => (b.type === 'picker' ? { ...b, chosen: b.multi ? keys : keys[0] } : b));
      return { ...m, blocks, status: 'done' as const };
    }),
  }));
}

/** A prompt (`args.awaiting`) answered by a line: no longer pending. */
function markAnswered(pages: ChatThreadPage[], messageId: string): ChatThreadPage[] {
  return pages.map((page) => ({
    ...page,
    pending: { ...page.pending, prompts: page.pending.prompts.filter((id) => id !== messageId) },
    messages: page.messages.map((m) => (m.id === messageId && m.status === 'pending' && !m.blocks.some((b) => b.type === 'picker') ? { ...m, status: 'done' as const } : m)),
  }));
}

function appendToNewest(pages: ChatThreadPage[], add: ChatMessage[], dropId?: string): ChatThreadPage[] {
  if (pages.length === 0) return [{ messages: add, pending: { pickers: [], reviews: [], prompts: [] }, hasMore: false }];
  return pages.map((page, i) => (i === 0
    ? { ...page, messages: [...page.messages.filter((m) => m.id !== dropId), ...add] }
    : page));
}

/** What the mutation takes: the POST body plus the words the optimistic owner bubble shows for a pick or a quick intent. */
export type SendChatVars = ChatSendInput & { optimisticText?: string };

/**
 * One owner turn with an optimistic bubble: the owner's words show at once
 * (status `pending`), a failed turn removes them again, and the lad turns
 * append from the response. Anything the turn may have changed elsewhere
 * (state, launch, questions, history, first campaign) is refetched; a turn
 * that touches an earlier message (a pick, an apply, a spoken answer the
 * server matched) also refreshes the thread so that message's `chosen` /
 * `applied` comes from the server.
 */
export function useSendChat() {
  const qc = useQueryClient();
  const key = studioKeys.chat();
  return useMutation({
    // A pick or an intent carries its label as `text` too, so the stored owner
    // turn has words; the server's resolution order (pick, then intent, then
    // text) means the label never reaches the classifier.
    mutationFn: ({ optimisticText, ...input }: SendChatVars) => sendStudioChat(input.text || !optimisticText ? input : { ...input, text: optimisticText }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const previous = qc.getQueryData<ChatCache>(key);
      const optimisticId = `optimistic-${Date.now()}`;
      const text = vars.text ?? vars.optimisticText ?? null;
      qc.setQueryData<ChatCache>(key, (old) => {
        if (!old) return old;
        let pages = old.pages;
        if (vars.pick) pages = markPicked(pages, vars.pick.messageId, vars.pick.keys ?? (vars.pick.key ? [vars.pick.key] : []));
        const owner: ChatMessage = {
          id: optimisticId, role: 'owner', text, blocks: [], intent: vars.intent ?? null, args: vars.args ?? {},
          replyTo: vars.pick?.messageId ?? vars.replyTo ?? null, status: 'pending', createdAt: new Date().toISOString(),
        };
        return { ...old, pages: appendToNewest(pages, [owner]) };
      });
      return { previous, optimisticId };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData<ChatCache>(key, ctx.previous);
    },
    onSuccess: (result, vars, ctx) => {
      // An intent/pick turn the server stored without words keeps the label the bubble already shows.
      const owner: ChatMessage = result.owner.text ? result.owner : { ...result.owner, text: vars.text ?? vars.optimisticText ?? null };
      qc.setQueryData<ChatCache>(key, (old) => {
        if (!old) return old;
        let pages = appendToNewest(old.pages, [owner, ...result.lad], ctx?.optimisticId);
        // A line that answered a prompt settles it.
        if (vars.replyTo) pages = markAnswered(pages, vars.replyTo);
        return { ...old, pages };
      });
      // A spoken turn (`voice: true`) may have been matched server-side to a pending picker / review / plan
      // (`owner.args.spoken`): that earlier message's `chosen` / `applied` must come from the server.
      const spoken = vars.voice === true || result.owner.args?.spoken === true;
      const touchesEarlier = Boolean(vars.pick) || spoken || vars.intent === 'apply_review' || result.lad.some((m) => m.intent === 'apply_review');
      if (touchesEarlier) void qc.invalidateQueries({ queryKey: key });
      void qc.invalidateQueries({ queryKey: studioKeys.all, predicate: (q) => q.queryKey[1] !== 'chat' });
    },
  });
}

/** Owner only: archives the thread and shows the re-seeded one. */
export function useResetChat() {
  const qc = useQueryClient();
  const key = studioKeys.chat();
  return useMutation({
    mutationFn: resetStudioChat,
    onSuccess: (page) => {
      if (page.messages.length > 0) qc.setQueryData<ChatCache>(key, { pages: [page], pageParams: [undefined] });
      void qc.invalidateQueries({ queryKey: studioKeys.all });
    },
  });
}
