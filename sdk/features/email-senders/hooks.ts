/**
 * Email Senders — SDK Hooks
 * LAD Architecture: SDK Layer — React Query hooks ONLY, no fetch/axios
 */

import { useQuery } from '@tanstack/react-query';
import { emailSenderKeys, listConnectedSenders } from './api';

/** Returns Gmail and Outlook accounts connected via the Integrations tab */
export function useConnectedEmailSenders() {
  return useQuery({
    queryKey: emailSenderKeys.list(),
    queryFn: listConnectedSenders,
    staleTime: 5 * 60_000, // 5 min — connections don't change often
  });
}
