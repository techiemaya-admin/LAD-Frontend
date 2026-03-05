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
        const matchesChannel = channelFilter === 'all' || String(conv.id).includes(channelFilter);
        const matchesSearch = 
          searchQuery === '' ||
          String(conv.id).toLowerCase().includes(searchQuery.toLowerCase());
        
        return matchesChannel && matchesSearch;
      })
      .sort((a, b) => {
        const aTime = new Date(a.updatedAt || 0).getTime();
        const bTime = new Date(b.updatedAt || 0).getTime();
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

  const sendMessage = useCallback((content: string) => {
    if (!selectedId || !content.trim()) return;

    const newMessage: Message = {
      id: `msg-${Date.now()}`,
    };

    dispatch(
      addMessageToConversation({
        conversationId: selectedId,
        message: newMessage,
        isActive: true,
      })
    );
  }, [selectedId, dispatch]);

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

