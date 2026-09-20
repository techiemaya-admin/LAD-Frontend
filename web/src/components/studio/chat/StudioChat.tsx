'use client';

/**
 * StudioChat — the Studio's front door: one persistent "Mr LAD" thread per
 * tenant (GET/POST /api/snapshot/studio/chat), the Grok-style chat window.
 *
 * The bot asks with pickers, shows cards and reviews inline, and takes
 * actions from plain text; nothing applies without the same press it needs
 * in the rooms (apply_review / apply_plan / go_live / undo confirm). The
 * rooms and setup steps stay one route away: every `route` a turn carries
 * goes through `onNavigate`, and the page brings the tenant back here.
 *
 * Failure is not emptiness: a thread that fails to load says so and offers
 * the step-by-step setup / the rooms; a failed send is an inline error turn
 * and the owner's words go back into the box.
 */
import { useCallback, useMemo, useState } from 'react';
import { ListOrdered, LayoutGrid, MoreHorizontal, RefreshCw, RotateCcw, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isApiError } from '@lad/shared/apiError';
import {
  useResetChat,
  useSendChat,
  useStudioChat,
  type BriefPlan,
  type ChatMessage,
  type SendChatVars,
  type StudioState,
} from '@lad/frontend-features/tenant-studio';
import { launchRowTitle } from '../StudioLaunchBanner';

/** Mirrors `CHAT_PREFERRED_KEY` on the Studio page (kept here so the component has no page import). */
const CHAT_PREFERRED_KEY = 'studio.chat.preferred';
import { BANNER, LINK, SKELETON, STATUS, TINT } from '../studio-theme';
import { CHAT_SURFACE } from './chat-theme';
import { StudioChatContext, type StudioChatContextValue } from './chat-context';
import Composer, { type QuickIntent } from './Composer';
import MessageList from './MessageList';
import { LadAvatar } from './Bubble';

export interface StudioChatProps {
  state: StudioState;
  /** A route a turn carries: `/studio?room=…` / `/studio?step=N` open in the Studio frame and return here; anything else is a page. */
  onNavigate: (route: string) => void;
  /** "Use the step-by-step setup instead" — opens today's SetupShell (Step 1). Omitted once setup is complete. */
  onOpenSetupSteps?: () => void;
  /** "Open the rooms" — the classic Studio view. */
  onOpenRooms?: () => void;
  /** A plan card's "Edit the full plan": today's PlanReview with this plan. */
  onOpenPlanReview?: (plan: BriefPlan) => void;
}

/** The server's `message` as it is (a 403 already says who can); status-based words only when it sent none. */
function describeError(err: unknown): string {
  if (isApiError(err)) {
    const body = err.body as { message?: string } | undefined;
    if (body?.message) return body.message;
    if (err.status === 403) return 'Only a workspace owner or admin can do that.';
    if (err.status === 401) return 'Your session has expired — sign in again.';
    if (err.status === 404) return 'This workspace does not have the chat yet.';
  }
  return err instanceof Error && err.message ? err.message : 'Try again in a moment.';
}

function errorTurn(title: string, detail: string): ChatMessage {
  return {
    id: `local-error-${Date.now()}`, role: 'lad', text: null, intent: null, args: {}, replyTo: null, status: 'sent',
    createdAt: new Date().toISOString(),
    blocks: [{ type: 'result', title, lines: [detail], tone: 'error' }],
  };
}

export default function StudioChat({ state, onNavigate, onOpenSetupSteps, onOpenRooms, onOpenPlanReview }: StudioChatProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const canAct = user?.role === 'admin' || user?.role === 'owner';
  const curated = state.workspace?.curated === true;
  const setupDone = Boolean(state.setup && state.setup.completedAt !== null);
  const thread = useStudioChat(true);
  const send = useSendChat();
  const reset = useResetChat();
  const [trailing, setTrailing] = useState<ChatMessage[]>([]);
  const [restore, setRestore] = useState<{ text: string; at: number } | null>(null);

  const messages = useMemo(() => thread.data?.messages ?? [], [thread.data]);
  // The last lad turn waiting on a line (`args.awaiting`, or listed in
  // `pending.prompts`): the next free-text turn answers it with `replyTo`.
  const prompts = thread.data?.pending.prompts;
  const replyTo = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      if (m.role !== 'lad') continue;
      const waiting = Boolean(m.args?.awaiting) || Boolean(prompts?.includes(m.id));
      return waiting && m.status !== 'done' && m.status !== 'dismissed' ? m.id : undefined;
    }
    return undefined;
  }, [messages, prompts]);

  const post = useCallback((vars: SendChatVars) => {
    if (send.isPending) return;
    send.mutate(vars, {
      onSuccess: (result) => {
        setTrailing([]);
        // A tenant who talks to Mr LAD mid-setup lands back on the thread next visit.
        try { window.localStorage.setItem(CHAT_PREFERRED_KEY, '1'); } catch { /* private mode: the home rule still applies */ }
        // The `open` intent answers with a route: go there straight away.
        const opened = result.lad.find((m) => m.intent === 'open');
        const route = opened?.blocks.flatMap((b) => (b.type === 'actions' ? b.items : [])).find((i) => i.route && !i.intent)?.route;
        if (route) onNavigate(route);
      },
      onError: (err) => {
        const detail = describeError(err);
        setTrailing((t) => [...t, errorTurn(vars.text ? "That didn't go through — your words are back in the box." : "That didn't go through — tap it again.", detail)]);
        if (vars.text) setRestore({ text: vars.text, at: Date.now() });
      },
    });
  }, [send, onNavigate]);

  const ctx = useMemo<StudioChatContextValue>(() => ({
    send: post,
    sending: send.isPending,
    navigate: onNavigate,
    canAct,
    curated,
    openPlanReview: onOpenPlanReview,
  }), [post, send.isPending, onNavigate, canAct, curated, onOpenPlanReview]);

  const onQuick = (q: QuickIntent) => post({ intent: q.intent, optimisticText: q.label });

  const doReset = () => {
    if (!canAct || reset.isPending) return;
    if (typeof window !== 'undefined' && !window.confirm('Start the conversation over? Your changes stay applied; only the thread is archived.')) return;
    reset.mutate(undefined, {
      onSuccess: () => { setTrailing([]); toast({ title: 'Started over', description: 'The old thread is archived.' }); },
      onError: (err) => toast({ title: 'Could not start over', description: describeError(err), variant: 'destructive' }),
    });
  };

  // The pinned first message: the launch summary while anything blocks go-live.
  const launch = state.launch;
  const blocking = launch && !setupDone && !launch.completedAt ? launch.blocking : [];
  const pinned = blocking.length > 0 ? (
    <div className={`flex flex-col gap-1.5 ${BANNER.base} ${BANNER.warn} sm:flex-row sm:items-center sm:justify-between`} role="status" data-testid="chat-pinned-launch">
      <span className="flex items-start gap-2 text-sm">
        <Rocket className={`mt-0.5 h-4 w-4 shrink-0 ${TINT.warn}`} aria-hidden />
        <span>{blocking.length} thing{blocking.length === 1 ? '' : 's'} before go-live: {blocking.map(launchRowTitle).join(', ')}.</span>
      </span>
      <button type="button" onClick={() => post({ intent: 'launch', optimisticText: "What's blocking go-live?" })} disabled={send.isPending} className={`shrink-0 text-sm ${LINK}`} data-testid="chat-pinned-launch-action">
        Show me →
      </button>
    </div>
  ) : null;

  return (
    <StudioChatContext.Provider value={ctx}>
      <div className={`flex h-full min-h-[60vh] flex-col ${CHAT_SURFACE}`} data-testid="studio-chat">
        <header className="flex items-center gap-3 border-b border-gray-100 px-3 py-2.5 dark:border-gray-800 sm:px-5">
          <LadAvatar size={36} />
          <div className="min-w-0 flex-1">
            <h1 className="text-base font-bold leading-tight tracking-tight text-[#0b1957] dark:text-white sm:text-lg">Mr LAD</h1>
            <p className="truncate text-xs text-gray-500 dark:text-slate-400">
              {setupDone ? 'Your studio, one conversation. Ask, change, switch things on.' : 'Set up your workspace by talking. Nothing applies until you say so.'}
            </p>
          </div>
          {!setupDone && onOpenSetupSteps && (
            <button type="button" onClick={onOpenSetupSteps} className={`hidden text-xs sm:inline ${LINK}`} data-testid="chat-open-steps">
              Use the step-by-step setup instead
            </button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button type="button" size="icon-sm" variant="ghost" aria-label="More" className="shrink-0 rounded-full" data-testid="chat-menu">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-60">
              {onOpenRooms && (
                <DropdownMenuItem onSelect={onOpenRooms} data-testid="chat-open-rooms"><LayoutGrid className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />Open the rooms</DropdownMenuItem>
              )}
              {!setupDone && onOpenSetupSteps && (
                <DropdownMenuItem onSelect={onOpenSetupSteps} data-testid="chat-open-steps-menu"><ListOrdered className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />Step-by-step setup</DropdownMenuItem>
              )}
              <DropdownMenuItem onSelect={() => { void thread.refetch(); }}><RefreshCw className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />Refresh</DropdownMenuItem>
              {canAct && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onSelect={doReset} disabled={reset.isPending} data-testid="chat-reset"><RotateCcw className="mr-2 h-4 w-4 text-muted-foreground" aria-hidden />Start the conversation over</DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {thread.isLoading ? (
          <div className="flex-1 space-y-3 px-4 py-4 sm:px-6" aria-busy="true" data-testid="chat-loading">
            <div className={`${SKELETON} h-12 w-2/3`} />
            <div className={`${SKELETON} h-28 w-3/4`} />
            <div className={`${SKELETON} ml-auto h-10 w-1/2`} />
          </div>
        ) : thread.data === undefined ? (
          <div className="flex-1 px-4 py-4 sm:px-6" data-testid="chat-error">
            <div className={`rounded-2xl border p-4 text-sm ${STATUS.needed}`} role="alert">
              <p className="font-medium">The conversation could not load.</p>
              <p className="mt-0.5">{describeError(thread.error)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" onClick={() => { void thread.refetch(); }}><RefreshCw className="h-4 w-4" />Try again</Button>
                {!setupDone && onOpenSetupSteps && <Button type="button" size="sm" variant="outline" onClick={onOpenSetupSteps}>Use the step-by-step setup instead</Button>}
                {onOpenRooms && <Button type="button" size="sm" variant="ghost" onClick={onOpenRooms}>Open the rooms</Button>}
              </div>
            </div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            trailing={trailing}
            typing={send.isPending}
            hasMore={Boolean(thread.data.hasMore)}
            loadingOlder={thread.isFetchingNextPage}
            onLoadOlder={() => { void thread.fetchNextPage(); }}
            pinned={pinned}
          />
        )}

        <Composer
          onSend={(text) => post({ text, replyTo })}
          onQuick={onQuick}
          sending={send.isPending}
          canAct={canAct}
          restore={restore}
          placeholder={replyTo ? 'Reply to Mr LAD…' : setupDone ? 'Ask Mr LAD anything, or tell it what to change…' : 'Tell Mr LAD about your business, or ask what to do first…'}
          above={!setupDone && onOpenSetupSteps ? (
            <p className="mb-1.5 text-[11px] text-muted-foreground sm:hidden">
              Prefer a form? <button type="button" onClick={onOpenSetupSteps} className={LINK}>Use the step-by-step setup instead</button>
            </p>
          ) : undefined}
        />
      </div>
    </StudioChatContext.Provider>
  );
}
