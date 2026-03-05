/**
 * Community ROI Feature - useLogInteraction Hook
 *
 * React hook for logging new interactions/meetings.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { interactionApi, communityRoiKeys } from '../api';
import type { Interaction, LogInteractionRequest } from '../types';

/**
 * Hook to log a new interaction between members
 */
export function useLogInteraction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LogInteractionRequest) => interactionApi.logInteraction(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityRoiKeys.interactions() });
      queryClient.invalidateQueries({ queryKey: communityRoiKeys.relationships() });
      queryClient.invalidateQueries({ queryKey: communityRoiKeys.contributions() });
    },
  });
}
