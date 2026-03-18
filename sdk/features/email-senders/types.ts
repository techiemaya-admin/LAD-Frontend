/**
 * Email Senders — SDK Types
 * LAD Architecture: SDK Layer — shared TypeScript contracts
 */

export type EmailProvider = 'google' | 'microsoft';

export interface ConnectedEmailSender {
  provider: EmailProvider;
  email: string;
  label: string;
}

export interface ConnectedEmailSendersResponse {
  success: boolean;
  data: ConnectedEmailSender[];
}
