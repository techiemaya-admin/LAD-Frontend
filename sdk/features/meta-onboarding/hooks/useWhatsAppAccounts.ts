/**
 * Meta Onboarding - useWhatsAppAccounts
 * Lists the tenant's connected WhatsApp accounts and exposes a disconnect action.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getWhatsAppAccountsOptions, disconnectWhatsAppAccount, metaOnboardingKeys } from '../api';
import type { WhatsAppAccount } from '../types';

export interface UseWhatsAppAccountsReturn {
  accounts: WhatsAppAccount[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  disconnect: (accountId: string) => Promise<void>;
  isDisconnecting: boolean;
  /** Non-fatal issues from the last disconnect (e.g. Meta unsubscribe failed). */
  disconnectWarnings: string[];
}

export function useWhatsAppAccounts(): UseWhatsAppAccountsReturn {
  const queryClient = useQueryClient();
  const query = useQuery(getWhatsAppAccountsOptions());

  const mutation = useMutation({
    mutationFn: disconnectWhatsAppAccount,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: metaOnboardingKeys.whatsappAccounts() });
    },
  });

  return {
    accounts:  query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     query.error,
    refetch:   query.refetch,
    disconnect: async (accountId: string) => {
      await mutation.mutateAsync(accountId);
    },
    isDisconnecting:    mutation.isPending,
    disconnectWarnings: mutation.data?.warnings ?? [],
  };
}
