/**
 * Meta Onboarding Feature - API Functions
 *
 * All HTTP calls for Meta Embedded Signup. Uses the shared apiClient; no
 * direct fetch/axios. Enhanced with TanStack Query v5 queryOptions.
 *
 * Path convention: paths include the /api/ prefix (matching every other SDK
 * feature). These resolve to LAD_backend via the universal
 * /api/[feature]/[...path] proxy, which already routes social-integration.
 */

import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '../../shared/apiClient';
import type {
  WhatsAppSignupConfig,
  ExchangeSignupRequest,
  ExchangeSignupResponse,
  WhatsAppAccount,
  WhatsAppAccountsResponse,
  DisconnectResponse,
} from './types';

const BASE = '/api/social-integration/meta';

// ── Query Keys ─────────────────────────────────────────────────────────────────

export const metaOnboardingKeys = {
  all:            ['meta-onboarding'] as const,
  whatsappConfig: () => [...metaOnboardingKeys.all, 'whatsapp', 'config'] as const,
  whatsappAccounts: () => [...metaOnboardingKeys.all, 'whatsapp', 'accounts'] as const,
} as const;

// ── WhatsApp Embedded Signup ───────────────────────────────────────────────────

/** Fetch the app ID / config ID the browser needs to open Meta's dialog. */
export async function getWhatsAppSignupConfig(): Promise<WhatsAppSignupConfig> {
  const res = await apiClient.get<{ success: boolean } & WhatsAppSignupConfig>(
    `${BASE}/whatsapp/config`
  );
  const { appId, configId, graphVersion, esVersion, configured } = res.data;
  // Normalise a missing/blank featureType to null - the hook keys off null
  // to omit `extras.featureType` entirely, which Meta treats differently
  // from an empty string.
  const featureType = res.data.featureType?.trim() || null;
  const features = Array.isArray(res.data.features) && res.data.features.length
    ? res.data.features
    : null;
  return { appId, configId, graphVersion, esVersion, featureType, features, configured };
}

export const getWhatsAppSignupConfigOptions = () =>
  queryOptions({
    queryKey: metaOnboardingKeys.whatsappConfig(),
    queryFn:  getWhatsAppSignupConfig,
    // App/config IDs change only on a Meta App Dashboard edit - no reason to
    // refetch on every mount of the settings page.
    staleTime: 30 * 60 * 1000,
  });

/**
 * Complete the handshake: hand Meta's authorization code to the backend, which
 * exchanges it, verifies the WABA claim, subscribes our webhook, registers the
 * number, and persists the account.
 */
export async function exchangeWhatsAppSignup(
  payload: ExchangeSignupRequest
): Promise<ExchangeSignupResponse> {
  const res = await apiClient.post<ExchangeSignupResponse>(
    `${BASE}/whatsapp/exchange`,
    payload
  );
  return res.data;
}

/** List the tenant's WhatsApp accounts (manual + embedded signup). */
export async function getWhatsAppAccounts(): Promise<WhatsAppAccount[]> {
  const res = await apiClient.get<WhatsAppAccountsResponse>(`${BASE}/whatsapp/accounts`);
  return res.data.accounts ?? [];
}

export const getWhatsAppAccountsOptions = () =>
  queryOptions({
    queryKey: metaOnboardingKeys.whatsappAccounts(),
    queryFn:  getWhatsAppAccounts,
  });

/** Disconnect an account - soft-deletes locally and unsubscribes from Meta. */
export async function disconnectWhatsAppAccount(accountId: string): Promise<DisconnectResponse> {
  const res = await apiClient.delete<DisconnectResponse>(
    `${BASE}/whatsapp/accounts/${accountId}`
  );
  return res.data;
}
