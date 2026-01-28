/**
 * Hooks for inbound leads feature
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { saveInboundLeads, getInboundLeads, cancelLeadBookingsForReNurturing } from '../api';

/**
 * Hook to save inbound leads
 */
export function useSaveInboundLeads() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: saveInboundLeads,
    onSuccess: () => {
      // Invalidate leads queries on success
      queryClient.invalidateQueries({ queryKey: ['inbound-leads'] });
    },
  });
}

/**
 * Hook to get inbound leads with pagination
 */
export function useInboundLeads(filters?: {
  limit?: number;
  offset?: number;
  search?: string;
}) {
  return useQuery({
    queryKey: ['inbound-leads', filters],
    queryFn: () => getInboundLeads(filters),
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to cancel bookings for leads to re-nurture them
 */
export function useCancelLeadBookings() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cancelLeadBookingsForReNurturing,
    onSuccess: () => {
      // Invalidate leads queries on success
      queryClient.invalidateQueries({ queryKey: ['inbound-leads'] });
    },
  });
}
