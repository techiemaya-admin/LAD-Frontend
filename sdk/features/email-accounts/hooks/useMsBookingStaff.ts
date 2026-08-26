/**
 * Email Accounts - useMsBookingStaff
 * Lists staff members for a given Microsoft Bookings business.
 */
import { useQuery } from '@tanstack/react-query';
import { getMsBookingStaffOptions } from '../api';
import type { MsBookingStaff } from '../types';

export interface UseMsBookingStaffReturn {
  staff: MsBookingStaff[];
  /** True until the query has data - covers loading, retrying, and offline-paused. */
  isPending: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useMsBookingStaff(businessId: string, enabled = true): UseMsBookingStaffReturn {
  const query = useQuery(getMsBookingStaffOptions(businessId, enabled));

  return {
    staff:     query.data ?? [],
    isPending:  query.isPending,
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     query.error,
    refetch:   query.refetch,
  };
}
