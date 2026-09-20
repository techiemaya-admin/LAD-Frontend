'use client';

/**
 * MessageList — the thread: day separators, one Bubble per turn, a typing
 * indicator while a turn is in flight, "Earlier messages" at the top when
 * the server has more, and a "Jump to latest" pill when the tenant has
 * scrolled up and new turns arrive. Sticks to the bottom otherwise.
 */
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowDown, Loader2 } from 'lucide-react';
import type { ChatMessage } from '@lad/frontend-features/tenant-studio';
import Bubble, { LadAvatar } from './Bubble';
import { AI_GRADIENT, BUBBLE_AGENT } from '../studio-theme';

function dayKey(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toDateString();
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric' });
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2" data-testid="chat-typing" role="status" aria-label="Mr LAD is typing">
      <div className="w-8 shrink-0"><LadAvatar /></div>
      <div className={`inline-flex items-center gap-1 rounded-2xl rounded-bl-md px-3.5 py-2.5 ${BUBBLE_AGENT}`}>
        <span className="studio-typing-dot h-1.5 w-1.5 rounded-full bg-current opacity-60" />
        <span className="studio-typing-dot h-1.5 w-1.5 rounded-full bg-current opacity-60 [animation-delay:150ms]" />
        <span className="studio-typing-dot h-1.5 w-1.5 rounded-full bg-current opacity-60 [animation-delay:300ms]" />
      </div>
    </div>
  );
}

export interface MessageListProps {
  messages: ChatMessage[];
  /** A turn is in flight: the typing indicator shows after the last bubble. */
  typing: boolean;
  hasMore: boolean;
  loadingOlder: boolean;
  onLoadOlder: () => void;
  /** Rendered above the first turn (the pinned launch summary). */
  pinned?: ReactNode;
  /** Local-only turns (a failed send's error), rendered after the server's. */
  trailing?: ChatMessage[];
}

const NEAR_BOTTOM_PX = 96;

export default function MessageList({ messages, typing, hasMore, loadingOlder, onLoadOlder, pinned, trailing = [] }: MessageListProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);
  const [unseen, setUnseen] = useState(0);
  const lastCountRef = useRef(0);
  const prevHeightRef = useRef<number | null>(null);

  const all = [...messages, ...trailing];
  const lastId = all.length ? all[all.length - 1].id : null;

  // While a smooth scroll we started is still travelling, the scroll events
  // it fires must not read as "the tenant scrolled away".
  const followingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scrollToEnd = (smooth: boolean) => {
    const reduce = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const animated = smooth && !reduce;
    atBottomRef.current = true;
    if (followingRef.current) clearTimeout(followingRef.current);
    followingRef.current = setTimeout(() => { followingRef.current = null; }, animated ? 800 : 100);
    endRef.current?.scrollIntoView({ block: 'end', behavior: animated ? 'smooth' : 'auto' });
    setUnseen(0);
  };
  useEffect(() => () => { if (followingRef.current) clearTimeout(followingRef.current); }, []);

  // Keep the viewport where it was when older messages load above it.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (prevHeightRef.current !== null) {
      el.scrollTop += el.scrollHeight - prevHeightRef.current;
      prevHeightRef.current = null;
    }
  }, [messages.length]);

  // New turns: follow them when the tenant is at the bottom, count them otherwise.
  useEffect(() => {
    const grew = all.length > lastCountRef.current;
    const first = lastCountRef.current === 0;
    lastCountRef.current = all.length;
    if (!grew) return;
    if (atBottomRef.current || first) scrollToEnd(!first);
    else setUnseen((n) => n + 1);
  }, [lastId, all.length]);

  useEffect(() => {
    if (typing && atBottomRef.current) scrollToEnd(true);
  }, [typing]);

  const onScroll = () => {
    const el = scrollerRef.current;
    if (!el || followingRef.current) return;
    const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
    atBottomRef.current = gap < NEAR_BOTTOM_PX;
    if (atBottomRef.current && unseen) setUnseen(0);
  };

  const loadOlder = () => {
    prevHeightRef.current = scrollerRef.current?.scrollHeight ?? null;
    onLoadOlder();
  };

  let lastDay = '';
  return (
    <div className="relative min-h-0 flex-1">
      <div ref={scrollerRef} onScroll={onScroll} className="h-full overflow-y-auto overscroll-contain px-3 py-3 sm:px-5" data-testid="chat-scroller" aria-live="polite">
        <div className="mx-auto w-full max-w-[820px] space-y-3">
          {pinned}
          {hasMore && (
            <div className="flex justify-center">
              <button type="button" onClick={loadOlder} disabled={loadingOlder} className="rounded-full border border-slate-200/80 bg-white/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur transition-colors hover:text-foreground disabled:opacity-60 dark:border-white/10 dark:bg-white/5" data-testid="chat-load-older">
                {loadingOlder ? <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />Loading…</span> : 'Earlier messages'}
              </button>
            </div>
          )}
          {all.map((m, i) => {
            const day = dayKey(m.createdAt);
            const sep = day && day !== lastDay;
            lastDay = day || lastDay;
            const prev = all[i - 1];
            const sameAuthor = prev && prev.role === m.role && prev.role === 'lad' && dayKey(prev.createdAt) === day;
            return (
              <div key={m.id} className="space-y-3">
                {sep && (
                  <div className="flex items-center gap-3 py-1" role="separator" aria-label={dayLabel(m.createdAt)}>
                    <span className="h-px flex-1 bg-slate-200/80 dark:bg-white/10" />
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{dayLabel(m.createdAt)}</span>
                    <span className="h-px flex-1 bg-slate-200/80 dark:bg-white/10" />
                  </div>
                )}
                <Bubble message={m} showAvatar={!sameAuthor} />
              </div>
            );
          })}
          {typing && <TypingIndicator />}
          <div ref={endRef} className="h-px" />
        </div>
      </div>
      {unseen > 0 && (
        <button
          type="button"
          onClick={() => scrollToEnd(true)}
          className={`absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-white shadow-lg ${AI_GRADIENT}`}
          data-testid="chat-jump-latest"
        >
          <ArrowDown className="h-3.5 w-3.5" />{unseen === 1 ? 'New message' : `${unseen} new messages`}
        </button>
      )}
    </div>
  );
}
