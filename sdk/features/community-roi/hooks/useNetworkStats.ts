/**
 * Community ROI Feature - useNetworkStats Hook
 *
 * React hook for fetching network statistics and KPIs.
 */
import { useQuery } from '@tanstack/react-query';
import { getNetworkStatsOptions } from '../api';
import { DashboardKPIs } from '../types';

export type NetworkStats = DashboardKPIs['data'];

export interface UseNetworkStatsReturn {
  data: NetworkStats | undefined;
  stats: NetworkStats | undefined;
  isLoading: boolean;
  loading: boolean;
  error: Error | null;
  isError: boolean;
  refetch: () => void;
  isFetching: boolean;
  isStale: boolean;
}

/**
 * Hook to get network statistics and KPIs
 */
export function useNetworkStats(enabled: boolean = true): UseNetworkStatsReturn {
  const query = useQuery(getNetworkStatsOptions(enabled));

  if (typeof window !== 'undefined') {
    console.log(
      '%c[useNetworkStats] Query state:',
      'color: #3F51B5; font-weight: bold;',
      {
        enabled,
        isLoading: query.isLoading,
        isError: query.isError,
        hasData: !!query.data,
        dataKeys: query.data ? Object.keys(query.data) : 'NO_DATA',
        error: query.error?.message || 'NO_ERROR',
      }
    );
  }

  return {
    data: query.data,
    stats: query.data,
    isLoading: query.isLoading,
    loading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
    isFetching: query.isFetching,
    isStale: query.isStale,
  };
}
