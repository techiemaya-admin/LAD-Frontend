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

export interface UseConversationsReturn {
  conversations: Conversation[];
  allConversations: Conversation[];
  selectedConversation: Conversation | null;
  selectedId: string | number | null;
  selectConversation: (id: string | number) => void;
  channelFilter: string | 'all';
  setChannelFilter: (channel: string | 'all') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
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
export function useConversations(): UseConversationsReturn {
  const dispatch = useDispatch();
  const conversationsFromRedux = useSelector(selectConversations);
  const activeConversationId = useSelector(selectActiveConversationId);
  
  const [selectedId, setSelectedId] = useState<string | number | null>(
    activeConversationId || (conversationsFromRedux[0]?.id ?? null)
  );
  const [channelFilter, setChannelFilter] = useState<string | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = useMemo(() => {
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

        return matchesChannel && matchesSearch;
      })
      .sort((a, b) => {
        const aTime = new Date((a.updatedAt || a.lastMessageTime || 0) as string | number).getTime();
        const bTime = new Date((b.updatedAt || b.lastMessageTime || 0) as string | number).getTime();
        return bTime - aTime;
      });
  }, [conversationsFromRedux, channelFilter, searchQuery]);

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
    try {
      const res = await fetch(
        `/api/whatsapp-conversations/conversations/${selectedId}/messages`,
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
    searchQuery,
    setSearchQuery,
    unreadCounts,
    sendMessage,
    markAsResolved,
    muteConversation,
  };
}

