/**
 * Email Accounts — useConnectedSenders
 * Returns all connected email accounts formatted as campaign sender options.
 */
import { useQuery } from '@tanstack/react-query';
import { getConnectedSendersOptions } from '../api';
import type { ConnectedSender } from '../types';

export interface UseConnectedSendersReturn {
  senders: ConnectedSender[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useConnectedSenders(): UseConnectedSendersReturn {
  const query = useQuery(getConnectedSendersOptions());

  return {
    senders:   query.data ?? [],
    isLoading: query.isLoading,
    isError:   query.isError,
    error:     query.error,
    refetch:   query.refetch,
  };
}
