/**
 * Followups Feature - useCancelFollowup Hook
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { cancelFollowup, followupKeys } from '../api';

export function useCancelFollowup() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (leadId: string) => cancelFollowup(leadId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: followupKeys.status() });
      queryClient.invalidateQueries({ queryKey: followupKeys.inactiveLeads() });
    },
  });

  return {
    cancel: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}
