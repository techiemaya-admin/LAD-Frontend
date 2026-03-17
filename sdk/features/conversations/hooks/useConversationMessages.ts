/**
 * Conversations Feature - useConversationMessages Hook
 *
 * Fetches messages for a specific conversation with pagination.
 */
import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getConversationMessagesOptions } from '../api';
import type { Message } from '../types';

export interface UseConversationMessagesReturn {
  messages: Message[];
  total: number;
  hasMore: boolean;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  isFetching: boolean;
}

export function useConversationMessages(
  conversationId: string | null,
  pagination?: { limit?: number; offset?: number }
): UseConversationMessagesReturn {
  const query = useQuery({
    ...getConversationMessagesOptions(conversationId || '', pagination),
    enabled: !!conversationId,
  });

  // Force refetch when conversation ID changes to get latest messages
  useEffect(() => {
    if (conversationId) {
      query.refetch();
    }
  }, [conversationId]);

  return {
    messages: query.data?.messages || [],
    total: query.data?.total || 0,
    hasMore: query.data?.hasMore || false,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
