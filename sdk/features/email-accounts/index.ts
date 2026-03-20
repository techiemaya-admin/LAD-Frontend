/**
 * Email Accounts Feature SDK
 * Gmail + Microsoft/Outlook OAuth account integration.
 *
 * Usage:
 *   import { useGoogleEmailStatus, useConnectedSenders } from '@lad/email-accounts';
 */

// Types
export type {
  EmailAccount,
  EmailProvider,
  EmailAccountStatus,
  EmailStatusResponse,
  ConnectedSender,
  MsBookingBusiness,
  MsBookingService,
  MsBookingStaff,
  MsBookingConfig,
  SaveBookingConfigRequest,
  SaveTenantDefaultsRequest,
  OAuthStartResponse,
} from './types';

// API functions + query options
export {
  emailAccountKeys,
  startGoogleOAuth,
  getGoogleStatus,
  disconnectGoogle,
  getGoogleStatusOptions,
  startMicrosoftOAuth,
  getMicrosoftStatus,
  disconnectMicrosoft,
  getMicrosoftStatusOptions,
  listMsBookingBusinesses,
  listMsBookingServices,
  listMsBookingStaff,
  saveMsBookingConfig,
  saveMsTenantDefaults,
  getMsBookingBusinessesOptions,
  getMsBookingServicesOptions,
  getMsBookingStaffOptions,
  getConnectedSenders,
  getConnectedSendersOptions,
} from './api';

// Hooks
export {
  useGoogleEmailStatus,
  useMicrosoftEmailStatus,
  useMsBookingBusinesses,
  useMsBookingServices,
  useMsBookingStaff,
  useConnectedSenders,
  useSaveMsBookingConfig,
} from './hooks';

export type {
  UseGoogleEmailStatusReturn,
  UseMicrosoftEmailStatusReturn,
  UseMsBookingBusinessesReturn,
  UseMsBookingServicesReturn,
  UseMsBookingStaffReturn,
  UseConnectedSendersReturn,
} from './hooks';
