/**
 * Email Accounts — useMsBookingServices
 * Lists services for a given Microsoft Bookings business.
 */
import { useQuery } from '@tanstack/react-query';
import { getMsBookingServicesOptions } from '../api';
import type { MsBookingService } from '../types';

export interface UseMsBookingServicesReturn {
  services: MsBookingService[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMsBookingServices(businessId: string, enabled = true): UseMsBookingServicesReturn {
  const query = useQuery(getMsBookingServicesOptions(businessId, enabled));

  return {
    services:  query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     query.error,
    refetch:   query.refetch,
  };
}
