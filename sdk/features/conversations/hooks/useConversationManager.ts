/**
 * Conversations Feature - useConversationManager Hook
 *
 * Main hook that combines TanStack Query data fetching with local UI state.
 * Preserves the UseConversationsReturn interface so ConversationsPage
 * requires minimal changes.
 *
 * This replaces the old mock-based useConversations hook.
 */
import { useState, useMemo, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getConversationsOptions,
  getConversationMessagesOptions,
  sendMessage as sendMessageApi,
  updateConversationStatus,
  markConversationRead as markConversationReadApi,
  conversationKeys,
  type ConversationQueryOptions,
} from '../api';
import type {
  Conversation,
  Channel,
  Message,
  UseConversationsReturn,
  ConversationListFilters,
  RichMessagePayload,
} from '../types';

export interface UseConversationsOptions {
  /**
   * Lock this hook instance to a specific backend.
   * 'personal' → LAD_backend (Baileys)
   * 'waba'     → LAD-WABA-Comms (Meta Business API)
   * Omit to use the current localStorage.whatsappChannel setting.
   */
  channel?: 'personal' | 'waba';
}

/**
 * Main hook for managing conversations state.
 * Fetches real data from the backend via TanStack Query
 * while maintaining local UI state for selection, filtering, etc.
 */
export function useConversations(hookOptions?: UseConversationsOptions): UseConversationsReturn {
  const queryClient = useQueryClient();

  // Local UI state
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [channelFilter, setChannelFilter] = useState<Channel | 'all'>('all');
  const [contextStatusFilter, setContextStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [offset, setOffset] = useState(0);
  const [allLoadedConversations, setAllLoadedConversations] = useState<Conversation[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  // Build filters from local state — include the channel override so both the
  // query key and the HTTP request carry it, keeping personal/waba caches separate.
  const filters: ConversationQueryOptions = useMemo(() => ({
    backendChannel: hookOptions?.channel,
    limit: 20,
    offset: offset,
    search: searchQuery || undefined,
    context_status: contextStatusFilter !== 'all' ? contextStatusFilter : undefined,
  }), [hookOptions?.channel, offset, searchQuery, contextStatusFilter]);

  // Fetch conversations from backend
  const conversationsQuery = useQuery(getConversationsOptions(filters));

  // Extract conversations from new API response structure
  const currentPageData = conversationsQuery.data || { conversations: [], total: 0, hasMore: false };

  // Accumulate conversations across pages whenever TanStack Query delivers fresh data.
  // Depend on dataUpdatedAt so we process each successful fetch exactly once
  // without causing infinite loops from object-reference changes.
  useEffect(() => {
    if (currentPageData.conversations.length === 0 && !currentPageData.hasMore) return;
    if (offset === 0) {
      // Fresh load or search/filter change — replace all loaded conversations
      setAllLoadedConversations(currentPageData.conversations);
      setHasMore(currentPageData.hasMore);
      setIsLoadingMore(false);
    } else {
      // Load more — append new conversations, dedup by id
      setAllLoadedConversations((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const newOnes = currentPageData.conversations.filter((c) => !existingIds.has(c.id));
        if (newOnes.length === 0) return prev; // nothing new
        return [...prev, ...newOnes];
      });
      setHasMore(currentPageData.hasMore);
      setIsLoadingMore(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationsQuery.dataUpdatedAt, offset]);

  // Reset pagination when search or filters change
  useEffect(() => {
    setOffset(0);
    setAllLoadedConversations([]);
    setHasMore(true);
  }, [searchQuery, contextStatusFilter]);

  const conversations = allLoadedConversations;
  // allConversations mirrors conversations — used for unread badges and mute status.
  // Loaded conversations are sorted most-recent-first, so unreads are always visible.
  const allConversations = allLoadedConversations;

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

  // Load more conversations for infinite scroll
  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || conversationsQuery.isLoading) {
      return;
    }
    setIsLoadingMore(true);
    setOffset((prev) => prev + 20);
  }, [hasMore, isLoadingMore, conversationsQuery.isLoading]);

  // Select conversation
  const selectConversation = useCallback((id: string) => {
    setSelectedId(id);

    // Fire-and-forget: persist the unread reset to the DB
    // The next poll will update the UI from the server response
    markConversationReadApi(id, hookOptions?.channel).catch(() => {
      // Non-critical — the next poll will re-sync from DB
    });
  }, [queryClient, hookOptions?.channel]);

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
    (payload: RichMessagePayload) => {
      if (!effectiveSelectedId || !selectedConversation) return;
      // Require at least some content for text messages (also guard against missing type)
      const payloadType = payload.type || 'text';
      if (payloadType === 'text' && !payload.content?.trim()) return;

      sendMutation.mutate({
        conversationId: effectiveSelectedId,
        leadId: selectedConversation.leadId || selectedConversation.contact.id,
        phoneNumber: selectedConversation.contact.phone,
        channel: hookOptions?.channel,
        // spread all rich fields
        type:            payloadType,
        content:         payload.content ?? '',  // always send content key, even if empty (non-text types)

        fileBase64:      payload.fileBase64,
        filename:        payload.filename,
        contentType:     payload.contentType,
        caption:         payload.caption,
        latitude:        payload.latitude,
        longitude:       payload.longitude,
        locationName:    payload.locationName,
        locationAddress: payload.locationAddress,
        contactName:     payload.contactName,
        contactPhone:    payload.contactPhone,
        contactEmail:    payload.contactEmail,
        contactCompany:  payload.contactCompany,
        pollQuestion:    payload.pollQuestion,
        pollOptions:     payload.pollOptions,
      });
    },
    [effectiveSelectedId, selectedConversation, sendMutation, hookOptions?.channel]
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
    // Pagination
    loadMore,
    isLoadingMore,
    hasMore,
  };
}
