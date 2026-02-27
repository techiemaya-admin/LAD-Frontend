import { useQuery } from '@tanstack/react-query';
import { contributionApi, communityRoiKeys } from '../api';
import type { LeaderboardStats } from '../types';

export function useDashboardLeaderboards() {
  const query = useQuery({
    queryKey: communityRoiKeys.leaderboards(),
    queryFn: () => contributionApi.getDashboardLeaderboards(),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

