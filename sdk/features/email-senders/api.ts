/**
 * Email Senders — SDK API
 * LAD Architecture: SDK Layer — HTTP calls ONLY (no business logic)
 */

import { apiClient } from '../../shared/apiClient';
import type { ConnectedEmailSender, ConnectedEmailSendersResponse } from './types';

export const emailSenderKeys = {
  all: ['email-senders'] as const,
  list: () => [...emailSenderKeys.all, 'list'] as const,
};

export async function listConnectedSenders(): Promise<ConnectedEmailSender[]> {
  const res = await apiClient.get<ConnectedEmailSendersResponse>(
    '/api/campaigns/email/connected-senders'
  );
  return res.data.data;
}
