/**
 * Meta Onboarding Feature SDK
 *
 * Meta Embedded Signup through TechieMaya's Tech Provider app - one platform
 * Meta app, per-tenant encrypted tokens. WhatsApp today; Instagram next,
 * reusing the same backend plumbing under /api/social-integration/meta/*.
 *
 * Usage:
 *   import {
 *     useWhatsAppSignupConfig,
 *     useWhatsAppEmbeddedSignup,
 *   } from '@lad/frontend-features/meta-onboarding';
 */

// Types
export type {
  ConnectionMethod,
  WhatsAppSignupConfig,
  WhatsAppAccount,
  CoexistenceHistoryState,
  EmbeddedSignupResult,
  ExchangeSignupRequest,
  ExchangeSignupResponse,
  WhatsAppAccountsResponse,
  DisconnectResponse,
} from './types';

// API functions + query options
export {
  metaOnboardingKeys,
  getWhatsAppSignupConfig,
  getWhatsAppSignupConfigOptions,
  exchangeWhatsAppSignup,
  getWhatsAppAccounts,
  getWhatsAppAccountsOptions,
  disconnectWhatsAppAccount,
} from './api';

// Hooks
export {
  useWhatsAppSignupConfig,
  useWhatsAppAccounts,
  useWhatsAppEmbeddedSignup,
} from './hooks';

export type {
  UseWhatsAppSignupConfigReturn,
  UseWhatsAppAccountsReturn,
  UseWhatsAppEmbeddedSignupOptions,
  UseWhatsAppEmbeddedSignupReturn,
} from './hooks';
