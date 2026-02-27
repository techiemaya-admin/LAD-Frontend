/**
 * Community ROI Feature - useMemberMutations Hook
 *
 * React hooks for member mutations (create, update, delete).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { memberApi, communityRoiKeys } from '../api';
import type { Member, CreateMemberRequest, UpdateMemberRequest, UUID } from '../types';

/**
 * Hook to create a new member
 */
export function useCreateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMemberRequest) => memberApi.createMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityRoiKeys.members() });
    },
  });
}

/**
 * Hook to update an existing member
 */
export function useUpdateMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: UUID; data: UpdateMemberRequest }) =>
      memberApi.updateMember(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: communityRoiKeys.member(id) });
      queryClient.invalidateQueries({ queryKey: communityRoiKeys.members() });
    },
  });
}

/**
 * Hook to delete a member (soft delete)
 */
export function useDeleteMember() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (memberId: UUID) => memberApi.deleteMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: communityRoiKeys.members() });
    },
  });
}
