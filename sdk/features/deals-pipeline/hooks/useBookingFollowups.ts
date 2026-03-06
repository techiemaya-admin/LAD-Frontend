/**
 * Deals Pipeline Feature - useBookingFollowups Hook
 *
 * React hooks for booking followup operations using TanStack Query mutations.
 * Framework-independent (no Next.js imports).
 */
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { DeleteBookingFollowupParams } from "../types";
import * as api from "../api";

/**
 * Hook to delete a booking followup schedule
 */
export function useDeleteBookingFollowup() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: DeleteBookingFollowupParams) =>
      api.deleteBookingFollowup(params.bookingId, params.followupId),
    onSuccess: (_, variables) => {
      // Invalidate booking-related queries
      queryClient.invalidateQueries({ 
        queryKey: ["deals-pipeline", "bookings", variables.bookingId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ["deals-pipeline", "bookings"] 
      });
      // Also invalidate pipeline data in case bookings affect pipeline stats
      queryClient.invalidateQueries({ 
        queryKey: ["deals-pipeline", "pipeline"] 
      });
    },
  });
}
