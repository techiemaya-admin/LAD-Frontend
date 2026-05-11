/**
 * Conversations Hook - Web Layer
 * 
 * This hook provides the conversation management interface
 * using the Redux conversation state.
 */

import { useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  selectConversations, 
  selectActiveConversationId, 
  addMessageToConversation,
  updateConversation,
  markConversationRead,
  setActiveConversation,
  type Conversation,
  type Message,
} from '@/store/slices/conversationSlice';
import { RootState } from '@/store/store';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

/**
 * Sort modes for the conversation list.
 *  - 'date'           : Most recent activity first (default — matches WhatsApp).
 *  - 'message_count'  : Busiest conversations first (most messages → top).
 *  - 'name'           : Contact name A → Z, unnamed contacts (phone-only) last.
 */
export type ConversationSortBy = 'date' | 'message_count' | 'name';

export interface UseConversationsReturn {
  conversations: Conversation[];
  allConversations: Conversation[];
  selectedConversation: Conversation | null;
  selectedId: string | number | null;
  selectConversation: (id: string | number) => void;
  channelFilter: string | 'all';
  setChannelFilter: (channel: string | 'all') => void;
  contextStatusFilter: string | 'all';
  setContextStatusFilter: (status: string | 'all') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  /** When true, conversations with no messages yet are hidden from the list. */
  hideEmpty: boolean;
  setHideEmpty: (hide: boolean) => void;
  /** Active sort order — see ConversationSortBy for options. */
  sortBy: ConversationSortBy;
  setSortBy: (sortBy: ConversationSortBy) => void;
  unreadCounts: Record<string, number>;
  sendMessage: (content: string) => void;
  markAsResolved: (id: string | number) => void;
  muteConversation: (id: string | number) => void;
}

/**
 * Hook to manage conversations state using Redux
 * 
 * Provides:
 * - Conversation list filtering and searching
 * - Conversation selection
 * - Message sending
 * - Conversation status management (resolved, muted)
 * - Unread count tracking
 */
export function useConversations({ channel }: { channel?: 'personal' | 'waba' } = {}): UseConversationsReturn {
  const dispatch = useDispatch();
  const conversationsFromRedux = useSelector(selectConversations);
  const activeConversationId = useSelector(selectActiveConversationId);
  
  const [selectedId, setSelectedId] = useState<string | number | null>(
    activeConversationId || (conversationsFromRedux[0]?.id ?? null)
  );
  const [channelFilter, setChannelFilter] = useState<string | 'all'>('all');
  const [contextStatusFilter, setContextStatusFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  // New UX controls — hide empty conversations + sort mode.
  // Defaults preserve previous behaviour: show everything, sorted by recency.
  const [hideEmpty, setHideEmpty] = useState(false);
  const [sortBy, setSortBy] = useState<ConversationSortBy>('date');

  const filteredConversations = useMemo(() => {
    /**
     * Pull a conversation's message count from whichever shape redux is
     * holding it in. The backend returns `message_count`, but mappers in
     * different parts of the app camel-case it, so we accept both. We also
     * fall back to checking `last_message_at` / `lastMessageTime` so a
     * conversation that has activity but no count column is still treated
     * as non-empty.
     */
    const messageCountOf = (conv: Conversation): number => {
      const c = conv as Record<string, unknown>;
      const raw = c.messageCount ?? c.message_count;
      const n = typeof raw === 'number' ? raw : Number(raw);
      if (Number.isFinite(n) && n > 0) return n;
      // Fallback: any last-message timestamp implies ≥ 1 message.
      return c.lastMessageAt || c.last_message_at || c.lastMessageTime ? 1 : 0;
    };

    /** Best-effort contact name extraction for the 'name' sort. */
    const nameOf = (conv: Conversation): string => {
      const c = conv as Record<string, unknown>;
      return String(
        c.contactName ?? c.contact_name ?? c.leadName ?? c.lead_name ?? ''
      ).trim().toLowerCase();
    };

    /** Last-activity timestamp for the 'date' sort. */
    const timeOf = (conv: Conversation): number => {
      return new Date(
        (conv.updatedAt || conv.lastMessageTime || 0) as string | number
      ).getTime();
    };

    return conversationsFromRedux
      .filter((conv) => {
        // Match by conv.channel field (set from API response)
        // Normalize: 'whatsapp', 'business_whatsapp', 'personal_whatsapp' → 'whatsapp'
        const rawChannel = String((conv as Record<string, unknown>).channel || 'whatsapp');
        const normalizedChannel =
          rawChannel === 'business_whatsapp' || rawChannel === 'personal_whatsapp'
            ? 'whatsapp'
            : rawChannel;
        const matchesChannel =
          channelFilter === 'all' || normalizedChannel === channelFilter;

        // Match by context_status field
        const rawContextStatus = String(
          (conv as Record<string, unknown>).contextStatus ||
          (conv as Record<string, unknown>).context_status ||
          ''
        );
        const matchesContextStatus =
          contextStatusFilter === 'all' || rawContextStatus === contextStatusFilter;

        // Search by contact name, lead name, or last message content
        const searchLower = searchQuery.toLowerCase();
        const contactName = String(
          (conv as Record<string, unknown>).contactName ||
          (conv as Record<string, unknown>).contact_name ||
          (conv as Record<string, unknown>).leadName ||
          (conv as Record<string, unknown>).lead_name ||
          ''
        ).toLowerCase();
        const lastMsgContent = String(
          (conv as Record<string, unknown>).lastMessageContent ||
          (conv as Record<string, unknown>).last_message ||
          ''
        ).toLowerCase();
        const matchesSearch =
          searchQuery === '' ||
          contactName.includes(searchLower) ||
          lastMsgContent.includes(searchLower) ||
          String(conv.id).toLowerCase().includes(searchLower);

        // New: drop conversations with no messages yet when the toggle is on.
        const matchesHideEmpty = !hideEmpty || messageCountOf(conv) > 0;

        return matchesChannel && matchesContextStatus && matchesSearch && matchesHideEmpty;
      })
      .sort((a, b) => {
        if (sortBy === 'message_count') {
          // Most messages first; tie-break by recency so equally busy
          // conversations still feel ordered intuitively.
          const diff = messageCountOf(b) - messageCountOf(a);
          return diff !== 0 ? diff : timeOf(b) - timeOf(a);
        }
        if (sortBy === 'name') {
          // A → Z. Empty-name rows sink to the bottom (matches backend
          // NULLS LAST behaviour) so unidentified phone-only contacts
          // don't dominate the top of an alphabetical list.
          const an = nameOf(a);
          const bn = nameOf(b);
          if (!an && !bn) return 0;
          if (!an) return 1;
          if (!bn) return -1;
          return an.localeCompare(bn);
        }
        // 'date' (default) — newest activity first.
        return timeOf(b) - timeOf(a);
      });
  }, [conversationsFromRedux, channelFilter, contextStatusFilter, searchQuery, hideEmpty, sortBy]);

  const selectedConversation = useMemo(() => {
    return conversationsFromRedux.find((c) => String(c.id) === String(selectedId)) || null;
  }, [conversationsFromRedux, selectedId]);

  const unreadCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0 };
    conversationsFromRedux.forEach((conv) => {
      const unread = conv.unread || conv.unreadCount || 0;
      counts.all += unread;
    });
    return counts;
  }, [conversationsFromRedux]);

  const selectConversation = useCallback((id: string | number) => {
    setSelectedId(id);
    dispatch(setActiveConversation(id));
    // Mark as read
    dispatch(markConversationRead(id));
  }, [dispatch]);

  const sendMessage = useCallback(async (content: string) => {
    if (!selectedId || !content.trim()) return;

    const conv = conversationsFromRedux.find((c) => String(c.id) === String(selectedId));
    const leadId = conv?.leadId;

    // Optimistically add to local state
    const tempId = `msg-${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
    };
    dispatch(
      addMessageToConversation({
        conversationId: selectedId,
        message: newMessage,
        isActive: true,
      })
    );

    // Send to backend API (which sends via WhatsApp)
    const channelParam = channel ? `?channel=${channel}` : '';
    try {
      const res = await fetchWithTenant(
        `/api/whatsapp-conversations/conversations/${selectedId}/messages${channelParam}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: content.trim(),
            lead_id: leadId ? String(leadId) : undefined,
          }),
        }
      );
      const data = await res.json();
      if (!data.success) {
        console.error('Failed to send message via WhatsApp:', data.error);
      }
    } catch (err) {
      console.error('Error sending message:', err);
    }
  }, [selectedId, conversationsFromRedux, dispatch]);

  const markAsResolved = useCallback((id: string | number) => {
    dispatch(
      updateConversation({
        id: id,
      })
    );
  }, [dispatch]);

  const muteConversation = useCallback((id: string | number) => {
    dispatch(
      updateConversation({
        id: id,
      })
    );
  }, [dispatch]);

  return {
    conversations: filteredConversations,
    allConversations: conversationsFromRedux,
    selectedConversation,
    selectedId,
    selectConversation,
    channelFilter,
    setChannelFilter,
    contextStatusFilter,
    setContextStatusFilter,
    searchQuery,
    setSearchQuery,
    hideEmpty,
    setHideEmpty,
    sortBy,
    setSortBy,
    unreadCounts,
    sendMessage,
    markAsResolved,
    muteConversation,
  };
}

