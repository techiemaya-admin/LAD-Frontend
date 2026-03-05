/**
 * Community ROI Feature - useReferralMutations Hook
 *
 * React hooks for referral mutations (log, update).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { referralApi, communityRoiKeys } from '../api';
import type { Referral, LogReferralRequest, UUID } from '../types';

/**
 * Hook to log a new referral
 */
export function useLogReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LogReferralRequest) => referralApi.logReferral(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityRoiKeys.referrals() });
      queryClient.invalidateQueries({ queryKey: communityRoiKeys.relationships() });
      queryClient.invalidateQueries({ queryKey: communityRoiKeys.contributions() });
    },
  });
}

/**
 * Hook to update an existing referral
 */
export function useUpdateReferral() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: Partial<LogReferralRequest> }) =>
      referralApi.updateReferral(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityRoiKeys.referrals() });
    },
  });
}
