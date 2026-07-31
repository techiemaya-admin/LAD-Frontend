/**
 * Email Accounts — useMsBookingBusinesses
 * Lists Microsoft Bookings businesses accessible to the connected account.
 */
import { useQuery } from '@tanstack/react-query';
import { getMsBookingBusinessesOptions } from '../api';
import type { MsBookingBusiness } from '../types';

export interface UseMsBookingBusinessesReturn {
  businesses: MsBookingBusiness[];
  /** True until the query has data — covers loading, retrying, and offline-paused. */
  isPending: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMsBookingBusinesses(enabled = true): UseMsBookingBusinessesReturn {
  const query = useQuery(getMsBookingBusinessesOptions(enabled));

  return {
    businesses: query.data ?? [],
    isPending:  query.isPending,
    isLoading:  query.isLoading,
    isError:    query.isError,
    error:      query.error,
    refetch:    query.refetch,
  };
}
