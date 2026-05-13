/**
 * Community ROI Feature - useNewMembers Hook
 *
 * React hook for fetching and managing new members from external sources
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { communityROIApiClient } from '../communityROIApiClient';
import { communityRoiKeys } from '../api';

const API_PREFIX = '/api/community-roi';

export interface ExternalMember {
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  source: string;
}

export interface NewMembersResponse {
  externalCount: number;
  databaseCount: number;
  newMembers: ExternalMember[];
  timestamp: string;
}

export interface UseNewMembersReturn {
  data: NewMembersResponse | undefined;
  newMembers: ExternalMember[];
  isLoading: boolean;
  error: Error | null;
  isError: boolean;
  refetch: () => Promise<any>;
}

/**
 * Hook to get new members not yet in database
 */
export function useNewMembers(enabled: boolean = true): UseNewMembersReturn {
  const query = useQuery({
    queryKey: [...communityRoiKeys.members(), 'new-members'],
    queryFn: async () => {
      const response = await communityROIApiClient.get<{ data: NewMembersResponse }>(
        `${API_PREFIX}/members/sync/new-members`
      );
      return response.data.data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  });

  return {
    data: query.data,
    newMembers: query.data?.newMembers || [],
    isLoading: query.isLoading,
    error: query.error,
    isError: query.isError,
    refetch: query.refetch,
  };
}

/**
 * Hook to onboard selected new members
 */
export function useOnboardNewMembers() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      selectedMemberIds: string[];
      sendTemplate?: boolean;
    }) => {
      const response = await communityROIApiClient.post<any>(
        `${API_PREFIX}/members/sync/onboard`,
        params
      );
      return response.data.data;
    },
    onSuccess: () => {
      // Invalidate member lists and new members
      queryClient.invalidateQueries({
        queryKey: communityRoiKeys.members(),
      });
      queryClient.invalidateQueries({
        queryKey: [...communityRoiKeys.members(), 'new-members'],
      });
    },
  });
}
