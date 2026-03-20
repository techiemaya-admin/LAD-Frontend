/**
 * Email Accounts — useMsBookingBusinesses
 * Lists Microsoft Bookings businesses accessible to the connected account.
 */
import { useQuery } from '@tanstack/react-query';
import { getMsBookingBusinessesOptions } from '../api';
import type { MsBookingBusiness } from '../types';

export interface UseMsBookingBusinessesReturn {
  businesses: MsBookingBusiness[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMsBookingBusinesses(enabled = true): UseMsBookingBusinessesReturn {
  const query = useQuery(getMsBookingBusinessesOptions(enabled));

  return {
    businesses: query.data ?? [],
    isLoading:  query.isLoading,
    isError:    query.isError,
    error:      query.error,
    refetch:    query.refetch,
  };
}
