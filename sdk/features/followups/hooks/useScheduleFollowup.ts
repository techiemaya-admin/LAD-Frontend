/**
 * Followups Feature - useScheduleFollowup Hook
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { scheduleFollowup, followupKeys } from '../api';
import type { ScheduleFollowupRequest } from '../types';

export function useScheduleFollowup() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({ leadId, data }: { leadId: string; data: ScheduleFollowupRequest }) =>
      scheduleFollowup(leadId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: followupKeys.status() });
      queryClient.invalidateQueries({ queryKey: followupKeys.inactiveLeads() });
    },
  });

  return {
    schedule: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
