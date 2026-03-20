/**
 * Email Accounts — useMicrosoftEmailStatus
 * Polls Microsoft/Outlook OAuth connection status + Bookings config.
 */
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getMicrosoftStatusOptions, disconnectMicrosoft, emailAccountKeys } from '../api';
import type { EmailStatusResponse } from '../types';

export interface UseMicrosoftEmailStatusReturn {
  status: EmailStatusResponse | undefined;
  isConnected: boolean;
  email: string | null;
  bookingsAccessible: boolean;
  selectedBusinessId: string | null;
  selectedBusinessName: string | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  disconnect: () => Promise<void>;
}

export function useMicrosoftEmailStatus(): UseMicrosoftEmailStatusReturn {
  const queryClient = useQueryClient();
  const query = useQuery(getMicrosoftStatusOptions());

  async function disconnect() {
    await disconnectMicrosoft();
    queryClient.invalidateQueries({ queryKey: emailAccountKeys.microsoftStatus() });
    queryClient.invalidateQueries({ queryKey: emailAccountKeys.connectedSenders() });
  }

  return {
    status:               query.data,
    isConnected:          query.data?.connected ?? false,
    email:                query.data?.email ?? null,
    bookingsAccessible:   query.data?.bookings_accessible ?? false,
    selectedBusinessId:   query.data?.selected_business_id ?? null,
    selectedBusinessName: query.data?.selected_business_name ?? null,
    isLoading:            query.isLoading,
    isError:              query.isError,
    error:                query.error,
    refetch:              query.refetch,
    disconnect,
  };
}
