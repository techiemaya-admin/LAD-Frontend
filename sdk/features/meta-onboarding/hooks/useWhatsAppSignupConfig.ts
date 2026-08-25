/**
 * Meta Onboarding - useWhatsAppSignupConfig
 * Fetches the app ID / config ID the browser needs to open Meta's dialog.
 */
import { useQuery } from '@tanstack/react-query';
import { getWhatsAppSignupConfigOptions } from '../api';
import type { WhatsAppSignupConfig } from '../types';

export interface UseWhatsAppSignupConfigReturn {
  config: WhatsAppSignupConfig | null;
  /** True only when the environment can actually open the signup dialog. */
  isConfigured: boolean;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
}

export function useWhatsAppSignupConfig(): UseWhatsAppSignupConfigReturn {
  const query = useQuery(getWhatsAppSignupConfigOptions());

  return {
    config:       query.data ?? null,
    isConfigured: Boolean(query.data?.configured),
    isLoading:    query.isLoading,
    isError:      query.isError,
    error:        query.error,
  };
}
