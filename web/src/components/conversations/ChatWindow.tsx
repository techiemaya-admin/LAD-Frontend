import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { Conversation, Message } from '@/types/conversation';
import { useConversationMessages } from '@lad/frontend-features/conversations';
import { ChatHeader } from './ChatHeader';
import { MessageList } from './MessageList';
import { MessageComposer } from './MessageComposer';
import { MessageSquare, Loader2 } from 'lucide-react';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import type { RichMessagePayload } from '@lad/frontend-features/conversations';

interface ChatWindowProps {
  conversation: Conversation | null;
  onMarkResolved: (id: string) => void;
  onMute: (id: string) => void;
  onSendMessage: (payload: RichMessagePayload) => void;
  onTogglePanel: () => void;
  isPanelOpen: boolean;
  backendChannel?: 'personal' | 'waba';
  onPin?: (id: string) => void;
  onLock?: (id: string) => void;
  onFavorite?: (id: string) => void;
  onExport?: (id: string) => void;
  onBlock?: (id: string) => void;
  onDelete?: (id: string) => void;
  /** Called when agent avatar is clicked — parent should open Assignment tab */
  onOpenAssignmentPanel?: () => void;
}

// ── Deduplicate messages by ID (newest wins on tie) ───────────────────────────
function dedupeById(msgs: Message[]): Message[] {
  const seen = new Map<string, Message>();
  for (const m of msgs) seen.set(m.id, m);
  return Array.from(seen.values()).sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

// ── How many messages to load per page ───────────────────────────────────────
// 50 recent messages are polled every 3 s — enough to show the current thread
// without fetching the full history on every interval tick.
// Older messages are fetched on-demand when the user scrolls up ("load more").
const INITIAL_LIMIT = 50;
const LOAD_MORE_LIMIT = 100; // older messages fetched when user scrolls up

export const ChatWindow = memo(function ChatWindow({
  conversation,
  onMarkResolved,
  onMute,
  onSendMessage,
  onTogglePanel,
  isPanelOpen,
  backendChannel,
  onPin,
  onLock,
  onFavorite,
  onExport,
  onBlock,
  onDelete,
  onOpenAssignmentPanel,
}: ChatWindowProps) {
  // ── Latest 50 messages polled every 3 s; older ones loaded on scroll-up ────
  const { messages: polledMessages, isLoading: messagesLoading, isAgentTyping, total } =
    useConversationMessages(
      conversation?.id || null,
      { limit: INITIAL_LIMIT },
      backendChannel
    );

  // ── Older messages accumulated via "load more" ────────────────────────────
  const [olderMessages, setOlderMessages] = useState<Message[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [olderOffset, setOlderOffset] = useState(INITIAL_LIMIT); // next offset to fetch

  // Reset older messages when conversation changes
  const prevConvId = useRef<string | null>(null);
  useEffect(() => {
    if (conversation?.id && conversation.id !== prevConvId.current) {
      prevConvId.current = conversation.id;
      setOlderMessages([]);
      setOlderOffset(INITIAL_LIMIT);
    }
  }, [conversation?.id]);

  // ── Merge: olderMessages + polledMessages, deduped & sorted ──────────────
  const allMessages = dedupeById([...olderMessages, ...polledMessages]);

  // hasMore = there are messages older than what we've loaded
  const hasMore = total > olderOffset;

  // ── Load older messages (called when user scrolls to top) ─────────────────
  const handleLoadMore = useCallback(async () => {
    if (loadingOlder || !conversation?.id || !hasMore) return;
    setLoadingOlder(true);
    try {
      const channel = backendChannel ?? 'waba';
      const url = `/api/whatsapp-conversations/conversations/${conversation.id}/messages` +
        `?limit=${LOAD_MORE_LIMIT}&offset=${olderOffset}&channel=${channel}`;
      const res = await fetchWithTenant(url);
      if (!res.ok) return;
      const data = await res.json();
      const raw: any[] = data.data || data.messages || [];

      // Map raw API shape to Message type (mirrors SDK's mapMessageFromApi)
      const mapped: Message[] = raw.map((r: any) => {
        const rawRole = r.role || 'user';
        const meta =
          typeof r.metadata === 'string'
            ? (() => { try { return JSON.parse(r.metadata); } catch { return {}; } })()
            : (r.metadata || {});
        const role =
          meta.sender_type === 'human_agent' && rawRole === 'assistant'
            ? 'human_agent'
            : rawRole;
        const isOutgoing = role === 'assistant' || role === 'AI' || role === 'human_agent';
        return {
          id: r.id,
          conversationId: r.conversation_id,
          content: r.content || '',
          timestamp: new Date(r.created_at),
          isOutgoing,
          status: r.message_status || 'sent',
          sender: {
            id: isOutgoing ? (meta.human_agent_id || 'agent') : r.lead_id || 'user',
            name: isOutgoing ? (role === 'human_agent' ? (meta.sender_name || 'Agent') : 'AI Agent') : 'Contact',
          },
          role,
          senderName: role === 'human_agent' ? (meta.sender_name || undefined) : undefined,
          humanAgentId: meta.human_agent_id || undefined,
        } as Message;
      });

      setOlderMessages((prev) => dedupeById([...mapped, ...prev]));
      setOlderOffset((prev) => prev + LOAD_MORE_LIMIT);
    } catch (err) {
      console.error('[ChatWindow] Failed to load older messages', err);
    } finally {
      setLoadingOlder(false);
    }
  }, [conversation?.id, backendChannel, loadingOlder, hasMore, olderOffset]);

  // ── Agent avatar click → open Assignment panel ────────────────────────────
  const handleAgentClick = useCallback(() => {
    if (!isPanelOpen) onTogglePanel();
    onOpenAssignmentPanel?.();
  }, [isPanelOpen, onTogglePanel, onOpenAssignmentPanel]);

  // ── Empty state ───────────────────────────────────────────────────────────
  if (!conversation) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-background/50 text-muted-foreground">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8" />
        </div>
        <h3 className="font-heading font-semibold text-lg mb-1">Select a conversation</h3>
        <p className="text-sm">Choose from your conversations on the left</p>
      </div>
    );
  }

  const displayMessages =
    allMessages.length > 0 ? allMessages : conversation.messages;

  return (
    <div className="flex-1 flex flex-col min-w-0 whatsapp-chat-bg">
      <ChatHeader
        conversation={conversation}
        onMarkResolved={() => onMarkResolved(conversation.id)}
        onMute={() => onMute(conversation.id)}
        onTogglePanel={onTogglePanel}
        isPanelOpen={isPanelOpen}
        onPin={() => onPin?.(conversation.id)}
        onLock={() => onLock?.(conversation.id)}
        onFavorite={() => onFavorite?.(conversation.id)}
        onExport={() => onExport?.(conversation.id)}
        onBlock={() => onBlock?.(conversation.id)}
        onDelete={() => onDelete?.(conversation.id)}
      />

      {messagesLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <MessageList
          messages={displayMessages}
          conversationId={conversation.id}
          isAgentTyping={isAgentTyping}
          contact={conversation.contact}
          onAgentClick={handleAgentClick}
          hasMore={hasMore}
          isLoadingMore={loadingOlder}
          onLoadMore={handleLoadMore}
        />
      )}

      <MessageComposer
        channel={conversation.channel}
        backendChannel={backendChannel}
        onSendMessage={onSendMessage}
        disabled={conversation.status === 'resolved'}
        contactName={conversation.contact?.name}
        conversationId={conversation.id}
        owner={conversation.owner}
      />
    </div>
  );
});
