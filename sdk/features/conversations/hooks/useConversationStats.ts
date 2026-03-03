/**
 * Conversations Feature - useConversationStats Hook
 *
 * Fetches conversation analytics/statistics.
 */
import { useQuery } from '@tanstack/react-query';
import { getConversationStatsOptions } from '../api';
import type { ConversationStats } from '../types';

export interface UseConversationStatsReturn {
  stats: ConversationStats | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useConversationStats(): UseConversationStatsReturn {
  const query = useQuery(getConversationStatsOptions());

  return {
    stats: query.data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
