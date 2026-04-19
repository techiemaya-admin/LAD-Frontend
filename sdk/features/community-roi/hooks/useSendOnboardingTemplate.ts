/**
 * Community ROI Feature - useSendOnboardingTemplate Hook
 *
 * React hook for sending WhatsApp onboarding template messages to members
 */

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { communityROIApiClient } from '../communityROIApiClient';

const API_PREFIX = '/api/community-roi';

export interface SendTemplateParams {
  memberIds: string[];
  templateName: string;
  templateVariables?: Record<string, any>;
}

/**
 * Hook to send WhatsApp onboarding template to members
 */
export function useSendOnboardingTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: SendTemplateParams) => {
      const response = await communityROIApiClient.post<any>(
        `${API_PREFIX}/members/send-template`,
        {
          ...params,
          templateName: 'onboard_new_member'
        }
      );
      return response.data;
    },
    onSuccess: () => {
      // Refresh members list after sending templates
      queryClient.invalidateQueries({
        queryKey: ['communityRoi', 'members'],
      });
    },
  });
}
