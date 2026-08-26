/**
 * Email Accounts - useMsBookingServices
 * Lists services for a given Microsoft Bookings business.
 */
import { useQuery } from '@tanstack/react-query';
import { getMsBookingServicesOptions } from '../api';
import type { MsBookingService } from '../types';

export interface UseMsBookingServicesReturn {
  services: MsBookingService[];
  /** True until the query has data - covers loading, retrying, and offline-paused. */
  isPending: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMsBookingServices(businessId: string, enabled = true): UseMsBookingServicesReturn {
  const query = useQuery(getMsBookingServicesOptions(businessId, enabled));

  return {
    services:  query.data ?? [],
    isPending:  query.isPending,
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     query.error,
    refetch:   query.refetch,
  };
}
