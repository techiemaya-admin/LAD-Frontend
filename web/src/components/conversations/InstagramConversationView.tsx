'use client';

/**
 * Instagram Conversation View
 * ============================
 * Phase 1 (read-only): list Instagram DM threads + render the selected
 * thread with Instagram-native dark-theme styling.
 *
 * Data flow:
 *   GET /api/instagram-conversations/conversations          → thread list
 *   GET /api/instagram-conversations/conversations/{id}/messages → history
 *
 * Future phases (not in this file yet):
 *   - send replies (POST /messages)
 *   - reactions
 *   - story-mention preview cards
 *   - voice clip + image attachment rendering richer than the current
 *     "attached image" placeholder
 */
import type React from 'react';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { useTheme } from '@/contexts/ThemeContext';
import {
  Search, MessageCircleMore, Loader2, ImageIcon, Mic, Heart,
  Bot, User, MessageSquareReply, Target, Megaphone, X, RefreshCw,
  Send, Smile, Users as UsersIcon, Check, CheckCheck, AlertCircle,
} from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface InstagramConversationRow {
  id: string;
  contact_id: string;
  contact_name: string | null;
  contact_phone: string | null;        // 'ig:<sender_id>' for IG contacts
  contact_avatar: string | null;
  status: string;
  context_status: string | null;
  owner: 'AI' | 'human_agent' | null;
  message_count: number;
  last_message_at: string | null;
  metadata: Record<string, unknown> | null;
  last_message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
    metadata: Record<string, unknown> | null;
  } | null;
  created_at: string;
}

interface InstagramMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  external_message_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const LIST_API = '/api/instagram-conversations/conversations';
const BACKFILL_API = '/api/instagram-conversations/conversations/backfill';

// Two Instagram gradients, kept distinct on purpose:
//
//   INSTAGRAM_BRAND_GRADIENT — the iconic yellow→pink→purple rainbow used by
//     the Instagram *logo*. Reserved for brand surfaces (avatar fallbacks,
//     empty-state icon ring, unread badges, the AI toggle pill). Same value
//     in both themes because the brand color doesn't dark-mode-swap.
//
//   INSTAGRAM_CHAT_BLUE_GRADIENT — the blue→indigo gradient real Instagram
//     uses on the *outgoing chat bubble* and the *send button* inside DMs.
//     Same value in both themes for the same reason.
//
// We previously used the brand rainbow on chat bubbles, which made them
// look orange/pink — nothing like the actual Instagram chat UI.
const INSTAGRAM_BRAND_GRADIENT =
  'linear-gradient(135deg, #FEDA77 0%, #F58529 25%, #DD2A7B 50%, #8134AF 75%, #515BD4 100%)';
const INSTAGRAM_CHAT_BLUE_GRADIENT =
  'linear-gradient(135deg, #4F86FF 0%, #5B47FB 60%, #4F5BD5 100%)';

interface Palette {
  bg: string;          // main surface (chat panel)
  panel: string;       // floating modals
  border: string;      // dividers + inputs
  text: string;        // primary text
  muted: string;       // secondary text + icons
  incomingBg: string;  // incoming bubble + active list row + input fill
  hoverBg: string;     // hover background on icon buttons
  outgoingGradient: string;  // brand rainbow — avatars, badges, brand-y CTAs
  outgoingBubble: string;    // Instagram chat-blue — outgoing message + send btn
}

const DARK_PALETTE: Palette = {
  bg: '#000000',
  panel: '#0E0E0E',
  border: '#262626',
  text: '#F5F5F5',
  muted: '#A8A8A8',
  incomingBg: '#262626',
  hoverBg: '#1A1A1A',
  outgoingGradient: INSTAGRAM_BRAND_GRADIENT,
  outgoingBubble: INSTAGRAM_CHAT_BLUE_GRADIENT,
};

// Light mode follows Instagram's actual web app in light mode.
const LIGHT_PALETTE: Palette = {
  bg: '#FFFFFF',
  panel: '#FFFFFF',
  border: '#DBDBDB',
  text: '#262626',
  muted: '#8E8E8E',
  incomingBg: '#EFEFEF',
  hoverBg: '#FAFAFA',
  outgoingGradient: INSTAGRAM_BRAND_GRADIENT,
  outgoingBubble: INSTAGRAM_CHAT_BLUE_GRADIENT,
};

const PaletteContext = createContext<Palette>(DARK_PALETTE);
const usePalette = (): Palette => useContext(PaletteContext);

// ─── Component ──────────────────────────────────────────────────────────────

export default function InstagramConversationView(): JSX.Element {
  const { isDark } = useTheme();
  const palette = isDark ? DARK_PALETTE : LIGHT_PALETTE;
  return (
    <PaletteContext.Provider value={palette}>
      <InstagramConversationViewInner />
    </PaletteContext.Provider>
  );
}

function InstagramConversationViewInner(): JSX.Element {
  const palette = usePalette();
  const router = useRouter();
  const [conversations, setConversations] = useState<InstagramConversationRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  // Backfill (sync history) state — surfaces a small status pill in the
  // header so the operator knows when historical Meta DMs are coming in.
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{
    status?: string;
    threads_processed?: number;
    messages_inserted?: number;
    error?: string | null;
  } | null>(null);

  const [messages, setMessages] = useState<InstagramMessage[]>([]);
  const [activeConvMeta, setActiveConvMeta] = useState<InstagramConversationRow | null>(null);
  const [msgLoading, setMsgLoading] = useState(false);
  const [msgError, setMsgError] = useState<string | null>(null);

  // Ownership toggle (AI auto-reply vs human takeover). Mirrors the
  // WhatsApp MessageComposer dropdown's two-state UX: AI is on by default,
  // operator can pause it to take over manually, and re-enable it later.
  const [ownerUpdating, setOwnerUpdating] = useState(false);
  const [showTakeoverDialog, setShowTakeoverDialog] = useState(false);
  // True when the operator has clicked Broadcast — opens the placeholder
  // group-creation modal. Real send-template implementation is Phase 3.
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  // ── Fetch list ────────────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setListLoading(true);
    setListError(null);
    try {
      const res = await fetchWithTenant(`${LIST_API}?limit=100`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rows: InstagramConversationRow[] = data?.data ?? data?.conversations ?? [];
      setConversations(rows);
      if (rows.length > 0 && !activeId) {
        setActiveId(rows[0].id);
      }
    } catch (err) {
      setListError(err instanceof Error ? err.message : String(err));
    } finally {
      setListLoading(false);
    }
  }, [activeId]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ── Sync history (backfill from Meta) ────────────────────────────────────
  // Kicks the Python service's POST /backfill, then polls /backfill/status
  // every 3s until status === 'done' | 'failed'. We refresh the thread list
  // once when the run completes so new rows show up without a page reload.
  const triggerBackfill = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncStatus({ status: 'running' });
    try {
      const res = await fetchWithTenant(BACKFILL_API, { method: 'POST' });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.detail || `HTTP ${res.status}`);
      }
    } catch (err) {
      setSyncStatus({
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
      setSyncing(false);
      return;
    }

    // Poll status until terminal
    let attempts = 0;
    const tick = async () => {
      attempts += 1;
      try {
        const res = await fetchWithTenant(`${BACKFILL_API}/status`);
        const data = await res.json();
        const s = (data?.status || {}) as typeof syncStatus;
        setSyncStatus(s);
        if (s?.status === 'done' || s?.status === 'failed' || attempts > 200) {
          setSyncing(false);
          if (s?.status === 'done') {
            await loadConversations();
          }
          return;
        }
      } catch {
        // Transient — keep polling
      }
      setTimeout(tick, 3000);
    };
    setTimeout(tick, 1500);
  }, [syncing, loadConversations]);

  // ── Fetch messages for the active thread ─────────────────────────────────
  useEffect(() => {
    if (!activeId) return;
    let cancelled = false;
    (async () => {
      setMsgLoading(true);
      setMsgError(null);
      try {
        const res = await fetchWithTenant(`${LIST_API}/${activeId}/messages?limit=500`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        setMessages(data?.data ?? data?.messages ?? []);
        if (data?.conversation) {
          setActiveConvMeta(data.conversation as InstagramConversationRow);
        }
      } catch (err) {
        if (cancelled) return;
        setMsgError(err instanceof Error ? err.message : String(err));
      } finally {
        if (!cancelled) setMsgLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  // ── Ownership toggle ─────────────────────────────────────────────────────
  // Optimistically flips the local row + activeConvMeta so the UI feels
  // instant, then PATCHes the backend. Rolls back on failure.
  const updateOwnership = useCallback(
    async (next: 'AI' | 'human_agent') => {
      if (!activeId) return;
      const prevConversations = conversations;
      const prevMeta = activeConvMeta;
      setOwnerUpdating(true);
      setConversations((rows) =>
        rows.map((r) => (r.id === activeId ? { ...r, owner: next } : r)),
      );
      if (activeConvMeta && activeConvMeta.id === activeId) {
        setActiveConvMeta({ ...activeConvMeta, owner: next });
      }
      try {
        const res = await fetchWithTenant(`${LIST_API}/${activeId}/ownership`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ owner: next }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        // Roll back the optimistic update
        setConversations(prevConversations);
        setActiveConvMeta(prevMeta);
        // eslint-disable-next-line no-console
        console.error('[InstagramConversationView] ownership update failed:', err);
      } finally {
        setOwnerUpdating(false);
      }
    },
    [activeId, conversations, activeConvMeta],
  );

  // ── Reactions ───────────────────────────────────────────────────────────
  // Optimistically stamp the reaction onto the message in local state, then
  // POST to the backend. The backend rewrites messages.metadata to match, so
  // the next list load is a no-op visually.
  const reactToMessage = useCallback(
    async (messageId: string, reaction: string) => {
      if (!activeId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId
          ? { ...m, metadata: { ...(m.metadata || {}), reaction, reaction_by: 'assistant' } }
          : m)),
      );
      try {
        const res = await fetchWithTenant(`${LIST_API}/${activeId}/messages/${messageId}/react`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reaction }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        // Roll back on failure
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId
            ? {
                ...m,
                metadata: Object.fromEntries(
                  Object.entries(m.metadata || {}).filter(
                    ([k]) => k !== 'reaction' && k !== 'reaction_by',
                  ),
                ),
              }
            : m)),
        );
        // eslint-disable-next-line no-console
        console.error('[InstagramConversationView] react failed:', err);
      }
    },
    [activeId],
  );

  const unreactToMessage = useCallback(
    async (messageId: string) => {
      if (!activeId) return;
      // Stash the previous reaction so we can roll back if the API rejects.
      const prevMessages = messages;
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId
          ? {
              ...m,
              metadata: Object.fromEntries(
                Object.entries(m.metadata || {}).filter(
                  ([k]) => k !== 'reaction' && k !== 'reaction_by',
                ),
              ),
            }
          : m)),
      );
      try {
        const res = await fetchWithTenant(`${LIST_API}/${activeId}/messages/${messageId}/react`, {
          method: 'DELETE',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        setMessages(prevMessages);
        // eslint-disable-next-line no-console
        console.error('[InstagramConversationView] unreact failed:', err);
      }
    },
    [activeId, messages],
  );

  // ── Filtering ────────────────────────────────────────────────────────────
  const filteredConversations = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) => {
      const name = (c.contact_name || '').toLowerCase();
      const igHandle = (c.contact_phone || '').toLowerCase();
      const preview = (c.last_message?.content || '').toLowerCase();
      return name.includes(q) || igHandle.includes(q) || preview.includes(q);
    });
  }, [conversations, search]);

  const activeContact = useMemo(() => {
    const fromList = conversations.find((c) => c.id === activeId);
    return fromList || activeConvMeta || null;
  }, [conversations, activeId, activeConvMeta]);

  return (
    <div className="flex-1 flex overflow-hidden" style={{ backgroundColor: palette.bg, color: palette.text }}>
      {/* ─── Conversation list ───────────────────────────────────────────── */}
      <aside
        className="w-80 flex-shrink-0 flex flex-col border-r"
        style={{ borderColor: palette.border, backgroundColor: palette.bg }}
      >
        <div className="p-4 border-b" style={{ borderColor: palette.border }}>
          <h2 className="text-lg font-semibold mb-3" style={{ color: palette.text }}>
            Instagram
          </h2>
          {(syncing || syncStatus?.status === 'failed') && (
            <div
              className="mb-3 px-2.5 py-1.5 rounded-md text-[11px] flex items-center gap-2"
              style={{
                backgroundColor: palette.incomingBg,
                color: syncStatus?.status === 'failed' ? '#FF6B6B' : palette.muted,
                border: `1px solid ${palette.border}`,
              }}
            >
              {syncing && <RefreshCw className="h-3 w-3 animate-spin" />}
              {syncStatus?.status === 'failed'
                ? `Sync failed: ${syncStatus.error || 'unknown error'}`
                : `Syncing history — ${syncStatus?.threads_processed ?? 0} threads · ${syncStatus?.messages_inserted ?? 0} messages`}
            </div>
          )}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4"
              style={{ color: palette.muted }}
            />
            <input
              type="text"
              placeholder="Search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-lg text-sm focus:outline-none focus:ring-1"
              style={{
                backgroundColor: palette.incomingBg,
                color: palette.text,
                border: `1px solid ${palette.border}`,
              }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {listLoading && (
            <div className="flex items-center justify-center p-8" style={{ color: palette.muted }}>
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading…</span>
            </div>
          )}
          {listError && (
            <div className="p-4 text-sm" style={{ color: '#FF6B6B' }}>
              Couldn&apos;t load: {listError}
            </div>
          )}
          {!listLoading && !listError && filteredConversations.length === 0 && (
            <div className="p-8 text-center text-sm" style={{ color: palette.muted }}>
              {search
                ? 'No conversations match your search.'
                : 'No Instagram conversations yet. Inbound DMs will appear here.'}
            </div>
          )}

          {filteredConversations.map((c) => {
            const isActive = c.id === activeId;
            const displayName = c.contact_name || stripIgPrefix(c.contact_phone) || 'Instagram user';
            const lastMsgPreview = previewText(c.last_message);
            const unread = unreadCount(c);
            return (
              <button
                key={c.id}
                onClick={() => setActiveId(c.id)}
                className="w-full flex items-center gap-3 px-3 py-3 transition-colors text-left"
                style={{
                  backgroundColor: isActive ? palette.incomingBg : 'transparent',
                  borderBottom: `1px solid ${palette.panel}`,
                }}
              >
                <Avatar name={displayName} src={c.contact_avatar} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-sm font-medium truncate"
                      style={{ color: palette.text }}
                    >
                      {displayName}
                    </span>
                    <span className="text-[10px] flex-shrink-0" style={{ color: palette.muted }}>
                      {relativeTime(c.last_message_at || c.created_at)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-0.5">
                    <span
                      className="text-xs truncate"
                      style={{
                        color: unread > 0 ? palette.text : palette.muted,
                        fontWeight: unread > 0 ? 600 : 400,
                      }}
                    >
                      {lastMsgPreview}
                    </span>
                    {unread > 0 && (
                      <span
                        className="text-[10px] font-bold rounded-full px-1.5 py-0.5 flex-shrink-0"
                        style={{ background: palette.outgoingGradient, color: '#fff' }}
                      >
                        {unread > 99 ? '99+' : unread}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* ─── Chat panel ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: palette.bg }}>
        {!activeId ? (
          <EmptyChatPanel />
        ) : (
          <>
            {/* Header — contact + AI toggle + broadcast + AI settings links.
                Mirrors the WhatsApp ChannelConversationView control set so
                operators get parity across channels. */}
            <div
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: palette.border }}
            >
              <Avatar
                name={activeContact?.contact_name || 'IG'}
                src={activeContact?.contact_avatar || null}
              />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold truncate" style={{ color: palette.text }}>
                  {activeContact?.contact_name ||
                    stripIgPrefix(activeContact?.contact_phone) ||
                    'Instagram user'}
                </div>
                <div className="text-[11px]" style={{ color: palette.muted }}>
                  {stripIgPrefix(activeContact?.contact_phone) || 'instagram'}
                </div>
              </div>

              {/* ── AI on/off toggle (per-conversation) ─────────────── */}
              <AiToggleButton
                owner={activeContact?.owner ?? 'AI'}
                disabled={ownerUpdating}
                onWantPauseAi={() => setShowTakeoverDialog(true)}
                onResumeAi={() => updateOwnership('AI')}
              />

              {/* ── Sync history (pull old DMs from Meta) ──────────── */}
              <HeaderIconButton
                title={
                  syncing
                    ? `Syncing… ${syncStatus?.threads_processed ?? 0} threads, ${syncStatus?.messages_inserted ?? 0} messages`
                    : 'Sync conversation history from Instagram'
                }
                ariaLabel="Sync history from Instagram"
                onClick={triggerBackfill}
              >
                <RefreshCw
                  className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`}
                />
              </HeaderIconButton>

              {/* ── Broadcast ───────────────────────────────────────── */}
              <HeaderIconButton
                title="Send to a broadcast group"
                ariaLabel="Open broadcast group panel"
                onClick={() => setShowBroadcastModal(true)}
              >
                <Megaphone className="h-4 w-4" />
              </HeaderIconButton>

              {/* ── AI Comments setting ─────────────────────────────── */}
              <HeaderIconButton
                title="AI Comments — auto-reply to post comments"
                ariaLabel="Open AI Comments settings"
                onClick={() => router.push('/instagram/settings?tab=comments')}
              >
                <MessageSquareReply className="h-4 w-4" />
              </HeaderIconButton>

              {/* ── AI Goals setting ────────────────────────────────── */}
              <HeaderIconButton
                title="AI Goals — track conversions + CTAs"
                ariaLabel="Open AI Goals settings"
                onClick={() => router.push('/instagram/settings?tab=goals')}
              >
                <Target className="h-4 w-4" />
              </HeaderIconButton>
            </div>

            {/* Message stream */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {msgLoading && (
                <div
                  className="flex items-center justify-center h-full"
                  style={{ color: palette.muted }}
                >
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  <span className="text-sm">Loading messages…</span>
                </div>
              )}
              {msgError && (
                <div className="p-4 text-sm" style={{ color: '#FF6B6B' }}>
                  Couldn&apos;t load messages: {msgError}
                </div>
              )}
              {!msgLoading && !msgError && messages.length === 0 && (
                <div
                  className="flex items-center justify-center h-full text-sm"
                  style={{ color: palette.muted }}
                >
                  No messages yet.
                </div>
              )}
              {!msgLoading && !msgError && (() => {
                // Find index of the LAST outgoing message — only that one gets
                // the "Sent / Read / Failed" status line, matching Instagram's
                // pattern of showing delivery state on the most recent send.
                let lastOutgoingIdx = -1;
                for (let i = messages.length - 1; i >= 0; i -= 1) {
                  if (messages[i].role === 'assistant') {
                    lastOutgoingIdx = i;
                    break;
                  }
                }
                return messages.map((m, i) => {
                  const prev = i > 0 ? messages[i - 1] : null;
                  const next = i < messages.length - 1 ? messages[i + 1] : null;
                  return (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      prevSameSender={!!prev && prev.role === m.role}
                      nextSameSender={!!next && next.role === m.role}
                      isLastOutgoing={i === lastOutgoingIdx}
                      conversationId={activeId}
                      onReact={reactToMessage}
                      onUnreact={unreactToMessage}
                    />
                  );
                });
              })()}
            </div>

            {/* Composer — send a free-form DM to the active thread. */}
            <Composer
              conversationId={activeId}
              onSent={(saved) => {
                if (!saved) return;
                setMessages((prev) => [...prev, saved as InstagramMessage]);
                // bump conversation list so it floats to the top
                loadConversations();
              }}
            />
          </>
        )}
      </main>

      {/* ── AI takeover confirmation ───────────────────────────────────── */}
      {showTakeoverDialog && (
        <ConfirmDialog
          title="Pause AI auto-replies?"
          body={
            <>
              The AI will stop replying on this conversation until you re-enable it.
              You can keep responding manually in the meantime, and inbound DMs will
              still arrive — they just won&apos;t trigger an automated reply.
            </>
          }
          confirmLabel="Pause AI"
          onConfirm={() => {
            setShowTakeoverDialog(false);
            updateOwnership('human_agent');
          }}
          onCancel={() => setShowTakeoverDialog(false)}
        />
      )}

      {/* ── Broadcast send modal ────────────────────────────────────────── */}
      {showBroadcastModal && (
        <BroadcastModal onClose={() => setShowBroadcastModal(false)} />
      )}
    </div>
  );
}

// ─── Header icon button ─────────────────────────────────────────────────────

function HeaderIconButton({
  children,
  title,
  ariaLabel,
  onClick,
}: {
  children: React.ReactNode;
  title: string;
  ariaLabel: string;
  onClick: () => void;
}): JSX.Element {
  const palette = usePalette();
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className="h-9 w-9 rounded-full flex items-center justify-center transition-colors"
      style={{
        color: palette.text,
        backgroundColor: 'transparent',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = palette.incomingBg;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
      }}
    >
      {children}
    </button>
  );
}

// ─── AI on/off toggle ───────────────────────────────────────────────────────

function AiToggleButton({
  owner,
  disabled,
  onWantPauseAi,
  onResumeAi,
}: {
  owner: 'AI' | 'human_agent';
  disabled: boolean;
  onWantPauseAi: () => void;
  onResumeAi: () => void;
}): JSX.Element {
  const palette = usePalette();
  const aiActive = owner !== 'human_agent';
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={aiActive ? onWantPauseAi : onResumeAi}
      title={
        aiActive
          ? 'AI is replying automatically. Click to pause and take over manually.'
          : 'AI is paused on this conversation. Click to resume automated replies.'
      }
      aria-pressed={!aiActive}
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium transition-opacity disabled:opacity-50"
      style={
        aiActive
          ? { background: palette.outgoingGradient, color: '#fff' }
          : { backgroundColor: palette.incomingBg, color: palette.text, border: `1px solid ${palette.border}` }
      }
    >
      {aiActive ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
      {aiActive ? 'AI' : 'Human'}
    </button>
  );
}

// ─── Confirmation dialog ────────────────────────────────────────────────────

function ConfirmDialog({
  title,
  body,
  confirmLabel,
  onConfirm,
  onCancel,
}: {
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}): JSX.Element {
  const palette = usePalette();
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onCancel}
    >
      <div
        className="max-w-sm w-full rounded-2xl p-5"
        style={{ backgroundColor: palette.panel, border: `1px solid ${palette.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base font-semibold mb-2" style={{ color: palette.text }}>
          {title}
        </h3>
        <p className="text-sm leading-relaxed mb-5" style={{ color: palette.muted }}>
          {body}
        </p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: 'transparent', color: palette.text, border: `1px solid ${palette.border}` }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
            style={{ background: palette.outgoingGradient, color: '#fff' }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Broadcast modal (Phase 3 placeholder) ──────────────────────────────────

// ─── Composer ───────────────────────────────────────────────────────────────
// Send a free-form DM to one thread. Instagram's 24-hour reply window applies:
// if the Graph call comes back with code 10 we surface the message verbatim
// so the operator knows what to do.

function Composer({
  conversationId,
  onSent,
}: {
  conversationId: string | null;
  onSent: (saved: unknown) => void;
}): JSX.Element {
  const palette = usePalette();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = useCallback(async () => {
    const t = text.trim();
    if (!t || !conversationId || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetchWithTenant(
        `${LIST_API}/${conversationId}/messages`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: t }),
        },
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
      }
      setText('');
      onSent(data?.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }, [text, conversationId, sending, onSent]);

  const disabled = !text.trim() || !conversationId || sending;

  return (
    <div
      className="flex flex-col gap-2 px-4 py-3 border-t"
      style={{ borderColor: palette.border, backgroundColor: palette.bg }}
    >
      {error && (
        <div
          className="text-[11px] px-3 py-1.5 rounded-md"
          style={{
            color: '#FF6B6B',
            backgroundColor: palette.incomingBg,
            border: `1px solid ${palette.border}`,
          }}
        >
          {error}
        </div>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Message…"
          disabled={!conversationId || sending}
          className="flex-1 px-4 py-2 rounded-full text-sm focus:outline-none focus:ring-1 disabled:opacity-50"
          style={{
            backgroundColor: palette.incomingBg,
            color: palette.text,
            border: `1px solid ${palette.border}`,
          }}
        />
        <button
          type="button"
          onClick={send}
          disabled={disabled}
          aria-label="Send"
          className="h-9 w-9 rounded-full flex items-center justify-center transition-opacity disabled:opacity-40"
          style={{ background: palette.outgoingBubble, color: '#fff' }}
        >
          {sending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>
      <div className="text-[10px]" style={{ color: palette.muted }}>
        Instagram only accepts replies within 24 hours of the customer&apos;s last DM.
      </div>
    </div>
  );
}


// ─── Broadcast modal ────────────────────────────────────────────────────────
// Pick a group, type a message, fan out. Polls broadcast/{id} until status is
// terminal so the modal shows live sent/failed counts.

interface BroadcastGroup {
  id: string;
  name: string;
  color?: string;
  instagram_member_count?: number;
}

function BroadcastModal({ onClose }: { onClose: () => void }): JSX.Element {
  const palette = usePalette();
  const [groups, setGroups] = useState<BroadcastGroup[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [groupId, setGroupId] = useState<string>('');
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState<{
    broadcast_id?: string; sent?: number; failed?: number;
    total?: number; status?: string; error?: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithTenant('/api/instagram-conversations/chat-groups');
        const data = await res.json();
        if (cancelled) return;
        const rows: BroadcastGroup[] = (data?.data || data?.groups || []).filter(
          (g: any) => (g.instagram_member_count ?? 0) > 0,
        );
        setGroups(rows);
        if (rows[0]) setGroupId(rows[0].id);
      } catch {
        if (!cancelled) setGroups([]);
      } finally {
        if (!cancelled) setLoadingGroups(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const start = useCallback(async () => {
    if (!groupId || !text.trim() || sending) return;
    setSending(true);
    setProgress({ status: 'starting', sent: 0, failed: 0 });
    try {
      const res = await fetchWithTenant('/api/instagram-conversations/conversations/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ group_id: groupId, text: text.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.success === false) {
        throw new Error(data?.detail || data?.error || `HTTP ${res.status}`);
      }
      const broadcastId = data?.broadcast_id as string | undefined;
      setProgress({
        broadcast_id: broadcastId,
        status: 'running',
        sent: 0, failed: 0,
        total: data?.recipient_count ?? 0,
      });

      // Poll status every 2s until terminal
      if (!broadcastId) return;
      let tries = 0;
      const tick = async () => {
        tries += 1;
        try {
          const statusRes = await fetchWithTenant(
            `/api/instagram-conversations/conversations/broadcast/${broadcastId}`,
          );
          const statusData = await statusRes.json();
          const row = (statusData?.data || {}) as any;
          setProgress({
            broadcast_id: broadcastId,
            status: row.status,
            sent: row.sent_count ?? 0,
            failed: row.failed_count ?? 0,
            total: row.total_recipients ?? 0,
          });
          if (row.status === 'completed' || row.status === 'completed_with_errors' || tries > 200) {
            return;
          }
        } catch {
          /* keep polling */
        }
        setTimeout(tick, 2000);
      };
      setTimeout(tick, 1500);
    } catch (err) {
      setProgress({
        status: 'failed',
        error: err instanceof Error ? err.message : String(err),
      });
    } finally {
      setSending(false);
    }
  }, [groupId, text, sending]);

  const selectedGroup = groups.find((g) => g.id === groupId);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="max-w-lg w-full rounded-2xl"
        style={{ backgroundColor: palette.panel, border: `1px solid ${palette.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: palette.border }}>
          <h3 className="text-base font-semibold flex items-center gap-2" style={{ color: palette.text }}>
            <Megaphone className="h-4 w-4" />
            Broadcast to Instagram group
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center"
            style={{ color: palette.muted }}
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs block mb-1" style={{ color: palette.muted }}>
              Group
            </label>
            {loadingGroups ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: palette.muted }}>
                <Loader2 className="h-4 w-4 animate-spin" /> Loading groups…
              </div>
            ) : groups.length === 0 ? (
              <div className="text-sm" style={{ color: palette.muted }}>
                No groups with Instagram members yet. Select recipients in the list
                and use “Create broadcast group” first.
              </div>
            ) : (
              <select
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                className="w-full px-3 py-2 rounded-md text-sm"
                style={{
                  backgroundColor: palette.incomingBg,
                  color: palette.text,
                  border: `1px solid ${palette.border}`,
                }}
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} · {g.instagram_member_count ?? 0} members
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs block mb-1" style={{ color: palette.muted }}>
              Message
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={4}
              placeholder="What do you want to send?"
              className="w-full px-3 py-2 rounded-md text-sm"
              style={{
                backgroundColor: palette.incomingBg,
                color: palette.text,
                border: `1px solid ${palette.border}`,
              }}
            />
            <div className="text-[10px] mt-1" style={{ color: palette.muted }}>
              <UsersIcon className="inline h-3 w-3 mr-1" />
              Will only reach recipients whose last inbound DM was within 24h
              (Instagram&apos;s reply-window policy). Others are reported as
              failed in the per-recipient log.
            </div>
          </div>

          {progress && (
            <div
              className="rounded-md px-3 py-2 text-xs"
              style={{
                backgroundColor: palette.incomingBg,
                border: `1px solid ${palette.border}`,
                color: progress.status === 'failed' ? '#FF6B6B' : palette.text,
              }}
            >
              {progress.status === 'failed' ? (
                <>Failed: {progress.error}</>
              ) : (
                <>
                  {progress.status === 'completed' || progress.status === 'completed_with_errors'
                    ? 'Done'
                    : 'Sending…'}{' '}
                  · {progress.sent ?? 0}/{progress.total ?? 0} sent · {progress.failed ?? 0} failed
                </>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end px-5 py-4 border-t gap-2" style={{ borderColor: palette.border }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ backgroundColor: 'transparent', color: palette.text, border: `1px solid ${palette.border}` }}
          >
            Close
          </button>
          <button
            type="button"
            onClick={start}
            disabled={!groupId || !text.trim() || sending || !selectedGroup}
            className="px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2 disabled:opacity-50"
            style={{ background: palette.outgoingBubble, color: '#fff' }}
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Send broadcast
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ────────────────────────────────────────────────────────────

function EmptyChatPanel(): JSX.Element {
  const palette = usePalette();
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center"
      style={{ color: palette.muted }}
    >
      <div
        className="h-20 w-20 rounded-full flex items-center justify-center mb-4"
        style={{ background: palette.outgoingGradient }}
      >
        <MessageCircleMore className="h-10 w-10 text-white" />
      </div>
      <div className="text-base font-medium" style={{ color: palette.text }}>
        Your Instagram messages
      </div>
      <div className="text-sm mt-1">Select a conversation to start viewing.</div>
    </div>
  );
}

// ─── Bubble ─────────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  prevSameSender,
  nextSameSender,
  isLastOutgoing,
  conversationId,
  onReact,
  onUnreact,
}: {
  message: InstagramMessage;
  prevSameSender: boolean;
  nextSameSender: boolean;
  isLastOutgoing: boolean;
  conversationId: string | null;
  onReact: (messageId: string, reaction: string) => void;
  onUnreact: (messageId: string) => void;
}): JSX.Element {
  const palette = usePalette();
  const isOutgoing = message.role === 'assistant';
  const isSystem = message.role === 'system';
  const meta = (message.metadata || {}) as Record<string, unknown>;
  const showStoryReply = !!meta.story_id || !!meta.story_url;
  const attachmentType = String(meta.attachment_type || '');
  const attachmentUrl = (meta.attachment_url || '') as string;
  const hasAttachment = ['image', 'audio', 'video'].includes(attachmentType);
  const reaction = (meta.reaction || '') as string;
  const reactionBy = (meta.reaction_by || '') as string;
  // Delivery status — only meaningful for outgoing messages.
  //   • metadata.read_at        → 'read' (set by the messaging_read webhook)
  //   • metadata.last_error or  → 'failed'
  //     message_status='failed'
  //   • external_message_id     → 'sent' (Meta accepted the send)
  //   • otherwise (no mid yet)  → 'sending'
  const messageStatus = String((meta as Record<string, unknown>).message_status || '');
  const readAt = (meta.read_at || meta.seen_at) as string | undefined;
  const sentAt = (meta.sent_at as string | undefined) || message.created_at;
  const lastError = meta.last_error as string | undefined;
  const deliveryState: 'sending' | 'sent' | 'read' | 'failed' = (() => {
    if (messageStatus === 'failed' || lastError) return 'failed';
    if (readAt) return 'read';
    if (message.external_message_id) return 'sent';
    return 'sending';
  })();

  if (isSystem) {
    return (
      <div className="flex justify-center my-3">
        <div className="text-[11px]" style={{ color: palette.muted }}>
          {message.content || systemFallback(message.metadata)}
        </div>
      </div>
    );
  }

  // Tight bubble grouping: round only the outer corners when the next/prev
  // bubble is from the same sender (matches Instagram's grouping).
  const radius = (() => {
    const r = '18px';
    const tight = '4px';
    if (isOutgoing) {
      return `${r} ${prevSameSender ? tight : r} ${nextSameSender ? tight : r} ${r}`;
    }
    return `${prevSameSender ? tight : r} ${r} ${r} ${nextSameSender ? tight : r}`;
  })();

  // Outgoing bubbles use Instagram's chat-blue gradient (matches real Instagram
  // DM "sent" bubbles in both light and dark mode). Incoming stays on the
  // theme-aware neutral.
  const bubbleStyle = isOutgoing
    ? { background: palette.outgoingBubble, color: '#fff', borderRadius: radius }
    : { backgroundColor: palette.incomingBg, color: palette.text, borderRadius: radius };

  // Inline media: actually render the image / audio / video, falling back to a
  // text label when the URL is missing (older backfilled rows may not have it).
  const inlineMedia = hasAttachment ? (
    <InlineMedia
      type={attachmentType}
      url={attachmentUrl}
      caption={message.content}
    />
  ) : null;

  // Reactions: hide the picker on the very first paint by deferring to hover,
  // then send to the API on click. Heart is the only Meta-supported reaction
  // right now; we keep the prop open for future emoji palette.
  const canReact = !isOutgoing && !!message.external_message_id && !!conversationId;
  const reactionEmoji = REACTION_GLYPHS[reaction] || (reaction ? '❤️' : '');

  return (
    <div className={`group flex ${isOutgoing ? 'justify-end' : 'justify-start'} ${nextSameSender ? 'mb-0.5' : 'mb-2'}`}>
      <div className="max-w-[70%] relative">
        {showStoryReply && (
          <div
            className="text-[10px] mb-1"
            style={{ color: palette.muted, textAlign: isOutgoing ? 'right' : 'left' }}
          >
            Replied to a story
          </div>
        )}
        <div
          className={`px-3.5 ${hasAttachment ? 'py-1' : 'py-2'} text-sm leading-snug whitespace-pre-wrap break-words`}
          style={bubbleStyle}
        >
          {inlineMedia}
          {!hasAttachment && message.content}
          {hasAttachment && message.content && message.content !== `[${attachmentType} attachment]` && (
            <div className="mt-1 text-[12px] opacity-90">{message.content}</div>
          )}
        </div>

        {/* Reaction overlay — small badge at the bottom-right of the bubble */}
        {reactionEmoji && (
          <button
            type="button"
            title={
              reactionBy === 'assistant'
                ? `You reacted with ${reactionEmoji}. Click to remove.`
                : `Reacted with ${reactionEmoji}`
            }
            onClick={() => {
              if (reactionBy === 'assistant' && canReact) {
                onUnreact(message.id);
              }
            }}
            className="absolute -bottom-2 right-1 rounded-full text-[12px] leading-none px-1.5 py-1"
            style={{
              backgroundColor: palette.bg,
              border: `1px solid ${palette.border}`,
            }}
          >
            {reactionEmoji}
          </button>
        )}

        {/* Hover reaction picker — only for inbound messages with an external id */}
        {canReact && (
          <button
            type="button"
            onClick={() => onReact(message.id, 'love')}
            className={
              'absolute -top-3 ' +
              (isOutgoing ? 'left-1' : 'right-1') +
              ' opacity-0 group-hover:opacity-100 transition-opacity ' +
              'rounded-full px-1.5 py-1 text-[12px] leading-none cursor-pointer'
            }
            style={{
              backgroundColor: palette.bg,
              border: `1px solid ${palette.border}`,
              color: palette.text,
            }}
            title="React with ❤️"
          >
            ❤️
          </button>
        )}

        {/* Footer: timestamp on every "last-of-group" bubble, plus delivery
            status text on the very last outgoing bubble. Matches Instagram's
            pattern of only attaching a status line to the most recent send. */}
        {!nextSameSender && (
          <BubbleFooter
            isOutgoing={isOutgoing}
            sentAt={sentAt}
            showStatus={isOutgoing && isLastOutgoing}
            deliveryState={deliveryState}
            readAt={readAt}
            lastError={lastError}
          />
        )}
      </div>
    </div>
  );
}

// Tiny formatter for "12:34 PM"-style time. Falls back to empty on bad input.
function formatBubbleTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

// Bubble footer: timestamp + (optional) delivery status. Lives below the
// rounded bubble, aligned to the bubble's side (right for outgoing, left for
// incoming). The status text/icon is only rendered for the most recent
// outgoing message — Instagram only "shows seen" once per conversation, not
// per bubble.
function BubbleFooter({
  isOutgoing,
  sentAt,
  showStatus,
  deliveryState,
  readAt,
  lastError,
}: {
  isOutgoing: boolean;
  sentAt: string | null | undefined;
  showStatus: boolean;
  deliveryState: 'sending' | 'sent' | 'read' | 'failed';
  readAt: string | undefined;
  lastError: string | undefined;
}): JSX.Element | null {
  const palette = usePalette();
  const timeStr = formatBubbleTime(sentAt);
  if (!timeStr && !showStatus) return null;

  // "Seen at HH:MM" if we have a read timestamp; otherwise just the state name.
  const statusLabel = (() => {
    if (!showStatus) return '';
    switch (deliveryState) {
      case 'sending': return 'Sending…';
      case 'sent':    return 'Sent';
      case 'read':    return readAt ? `Seen ${formatBubbleTime(readAt)}` : 'Seen';
      case 'failed':  return lastError ? `Failed — ${lastError}` : 'Failed';
      default:        return '';
    }
  })();

  const statusColor = deliveryState === 'failed' ? '#FF6B6B' : palette.muted;

  const StatusIcon = (() => {
    if (!showStatus) return null;
    switch (deliveryState) {
      case 'sending': return <Loader2 className="h-3 w-3 animate-spin" />;
      case 'sent':    return <Check className="h-3 w-3" />;
      case 'read':    return <CheckCheck className="h-3 w-3" style={{ color: '#4F86FF' }} />;
      case 'failed':  return <AlertCircle className="h-3 w-3" />;
      default:        return null;
    }
  })();

  return (
    <div
      className="mt-1 flex items-center gap-1 text-[10px] leading-tight"
      style={{
        color: statusColor,
        justifyContent: isOutgoing ? 'flex-end' : 'flex-start',
      }}
    >
      {timeStr && <span>{timeStr}</span>}
      {showStatus && (
        <>
          {timeStr && <span aria-hidden="true">·</span>}
          {StatusIcon}
          <span>{statusLabel}</span>
        </>
      )}
    </div>
  );
}

// Map Meta's reaction codes to emoji glyphs. Right now Meta only emits 'love'
// for Instagram, but keep this open so a future heart-and-friends rollout
// doesn't require a code change.
const REACTION_GLYPHS: Record<string, string> = {
  love: '❤️',
  heart: '❤️',
  like: '👍',
  haha: '😆',
  wow: '😮',
  sad: '😢',
  angry: '😡',
};

function InlineMedia({ type, url, caption }: { type: string; url: string; caption: string | null }): JSX.Element {
  const palette = usePalette();
  if (!url) {
    // No URL persisted (older backfill rows / fallback): keep the original
    // textual placeholder so the operator at least knows what kind of media
    // it was.
    if (type === 'image') {
      return (
        <span className="inline-flex items-center gap-1.5">
          <ImageIcon className="h-4 w-4" />
          {caption || 'Photo'}
        </span>
      );
    }
    if (type === 'audio') {
      return (
        <span className="inline-flex items-center gap-1.5">
          <Mic className="h-4 w-4" />
          {caption || 'Voice clip'}
        </span>
      );
    }
    return <>{caption || `Attachment (${type})`}</>;
  }
  if (type === 'image') {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={caption || 'Photo'}
          className="rounded-xl max-h-72 max-w-full object-cover"
          style={{ border: `1px solid ${palette.border}` }}
        />
      </a>
    );
  }
  if (type === 'video') {
    return (
      <video
        src={url}
        controls
        playsInline
        className="rounded-xl max-h-72 max-w-full"
        style={{ border: `1px solid ${palette.border}` }}
      />
    );
  }
  if (type === 'audio') {
    return (
      <audio src={url} controls className="w-full" />
    );
  }
  // Unknown type — show a link with the filename
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="underline">
      {caption || 'Open attachment'}
    </a>
  );
}

// ─── Avatar ─────────────────────────────────────────────────────────────────

function Avatar({ name, src }: { name: string; src: string | null }): JSX.Element {
  const palette = usePalette();
  const initials = name
    .split(' ')
    .filter(Boolean)
    .map((s) => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'IG';
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={name} className="h-10 w-10 rounded-full object-cover flex-shrink-0" />;
  }
  return (
    <div
      className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
      style={{ background: palette.outgoingGradient, color: '#fff' }}
    >
      {initials}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function stripIgPrefix(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.startsWith('ig:') ? phone.slice(3) : phone;
}

function previewText(lastMessage: InstagramConversationRow['last_message']): string {
  if (!lastMessage) return 'No messages yet';
  const meta = (lastMessage.metadata || {}) as Record<string, unknown>;
  const isOutgoing = lastMessage.role === 'assistant';
  const prefix = isOutgoing ? 'You: ' : '';
  if (meta.story_id || meta.story_url) {
    return `${prefix}Story reply`;
  }
  if (meta.attachment_type === 'image') return `${prefix}📷 Photo`;
  if (meta.attachment_type === 'audio') return `${prefix}🎤 Voice clip`;
  if (meta.attachment_type === 'video') return `${prefix}🎬 Video`;
  return `${prefix}${(lastMessage.content || '').slice(0, 80)}`;
}

function unreadCount(c: InstagramConversationRow): number {
  const raw = (c.metadata || {}) as Record<string, unknown>;
  const v = raw.unread_count;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function relativeTime(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return 'now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h`;
  if (diffSec < 7 * 86400) return `${Math.floor(diffSec / 86400)}d`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function systemFallback(meta: Record<string, unknown> | null): string {
  if (!meta) return '';
  if ((meta as any).system_event === 'story_mention') return 'Mentioned you in their story';
  return '';
}
