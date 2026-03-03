/**
 * Followups Feature - useFollowupStatus Hook
 */
import { useQuery } from '@tanstack/react-query';
import { getFollowupStatusOptions } from '../api';
import type { FollowupStatus } from '../types';

export function useFollowupStatus() {
  const query = useQuery(getFollowupStatusOptions());

  return {
    status: query.data as FollowupStatus | undefined,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
