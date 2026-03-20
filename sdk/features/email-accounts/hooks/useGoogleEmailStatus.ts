/**
 * Email Accounts — useGoogleEmailStatus
 * Polls Google OAuth connection status for the current user.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getGoogleStatusOptions, disconnectGoogle, emailAccountKeys } from '../api';
import type { EmailStatusResponse } from '../types';

export interface UseGoogleEmailStatusReturn {
  status: EmailStatusResponse | undefined;
  isConnected: boolean;
  email: string | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  disconnect: () => Promise<void>;
}

export function useGoogleEmailStatus(): UseGoogleEmailStatusReturn {
  const queryClient = useQueryClient();
  const query = useQuery(getGoogleStatusOptions());

  async function disconnect() {
    await disconnectGoogle();
    queryClient.invalidateQueries({ queryKey: emailAccountKeys.googleStatus() });
    queryClient.invalidateQueries({ queryKey: emailAccountKeys.connectedSenders() });
  }

  return {
    status:      query.data,
    isConnected: query.data?.connected ?? false,
    email:       query.data?.email ?? null,
    isLoading:   query.isLoading,
    isError:     query.isError,
    error:       query.error,
    refetch:     query.refetch,
    disconnect,
  };
}
