/**
 * Conversations Feature - useSendMessage Hook
 *
 * Mutation hook for sending messages. Invalidates caches on success.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { sendMessage, conversationKeys } from '../api';
import type { SendMessageRequest, Message } from '../types';

export interface UseSendMessageReturn {
  send: (data: SendMessageRequest) => void;
  isLoading: boolean;
  error: Error | null;
  lastMessage: Message | undefined;
}

export function useSendMessage(): UseSendMessageReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: sendMessage,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.messages(variables.conversationId),
      });
      queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
    },
  });

  return {
    send: mutation.mutate,
    isLoading: mutation.isPending,
    error: mutation.error,
    lastMessage: mutation.data,
  };
}
