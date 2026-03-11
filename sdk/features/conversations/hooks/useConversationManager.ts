/**
 * Conversations Feature - useConversationManager Hook
 *
 * Main hook that combines TanStack Query data fetching with local UI state.
 * Preserves the UseConversationsReturn interface so ConversationsPage
 * requires minimal changes.
 *
 * This replaces the old mock-based useConversations hook.
 */
import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getConversationsOptions,
  getConversationMessagesOptions,
  sendMessage as sendMessageApi,
  updateConversationStatus,
  conversationKeys,
} from '../api';
import type {
  Conversation,
  Channel,
  Message,
  UseConversationsReturn,
  ConversationListFilters,
} from '../types';

/**
 * Main hook for managing conversations state.
 * Fetches real data from the backend via TanStack Query
 * while maintaining local UI state for selection, filtering, etc.
 */
export function useConversations(): UseConversationsReturn {
  const queryClient = useQueryClient();

  // Local UI state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all');
  const [contextStatusFilter, setContextStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Build filters from local state
  const filters: ConversationListFilters = useMemo(() => ({
    channel: channelFilter !== 'all' ? channelFilter : undefined,
    search: searchQuery || undefined,
    context_status: contextStatusFilter !== 'all' ? contextStatusFilter : undefined,
  }), [channelFilter, searchQuery, contextStatusFilter]);

  // Fetch conversations from backend
  const conversationsQuery = useQuery(getConversationsOptions(filters));
  const allConversationsQuery = useQuery(getConversationsOptions());

  const conversations = conversationsQuery.data || [];
  const allConversations = allConversationsQuery.data || [];

  // Auto-select first conversation if none selected
  const effectiveSelectedId = useMemo(() => {
    if (selectedId && conversations.find((c) => c.id === selectedId)) {
      return selectedId;
    }
    return conversations[0]?.id || null;
  }, [selectedId, conversations]);

  // Selected conversation (with messages loaded separately)
  const selectedConversation = useMemo(() => {
    return conversations.find((c) => c.id === effectiveSelectedId) || null;
  }, [conversations, effectiveSelectedId]);

  // Unread counts
  const unreadCounts = useMemo(() => {
    const counts = { all: 0, whatsapp: 0, linkedin: 0, gmail: 0 };
    allConversations.forEach((conv) => {
      counts.all += conv.unreadCount;
      counts[conv.channel] += conv.unreadCount;
    });
    return counts;
  }, [allConversations]);

  // Select conversation
  const selectConversation = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: sendMessageApi,
    onSuccess: () => {
      // Invalidate messages and conversation list to show updated last message
      if (effectiveSelectedId) {
        queryClient.invalidateQueries({ queryKey: conversationKeys.messages(effectiveSelectedId) });
      }
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });

  const sendMessage = useCallback(
    (content: string) => {
      if (!effectiveSelectedId || !content.trim() || !selectedConversation) return;

      sendMutation.mutate({
        conversationId: effectiveSelectedId,
        content: content.trim(),
        leadId: selectedConversation.leadId || selectedConversation.contact.id,
      });
    },
    [effectiveSelectedId, selectedConversation, sendMutation]
  );

  // Status update mutations
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'open' | 'resolved' | 'muted' }) =>
      updateConversationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });

  const markAsResolved = useCallback(
    (id: string) => {
      statusMutation.mutate({ id, status: 'resolved' });
    },
    [statusMutation]
  );

  const muteConversation = useCallback(
    (id: string) => {
      // Toggle mute
      const conv = allConversations.find((c) => c.id === id);
      const newStatus = conv?.status === 'muted' ? 'open' : 'muted';
      statusMutation.mutate({ id, status: newStatus });
    },
    [statusMutation, allConversations]
  );

  return {
    conversations,
    allConversations,
    selectedConversation,
    selectedId: effectiveSelectedId,
    selectConversation,
    channelFilter,
    setChannelFilter,
    contextStatusFilter,
    setContextStatusFilter,
    searchQuery,
    setSearchQuery,
    unreadCounts,
    sendMessage,
    markAsResolved,
    muteConversation,
    isLoading: conversationsQuery.isLoading,
    error: conversationsQuery.error,
    refetch: conversationsQuery.refetch,
  };
}
