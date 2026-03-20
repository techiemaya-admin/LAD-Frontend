/**
 * Email Accounts Feature — API Functions
 *
 * All HTTP calls for Gmail + Microsoft/Outlook OAuth account management.
 * Uses the shared apiClient. No direct fetch/axios calls.
 * Enhanced with TanStack Query v5 queryOptions for caching.
 *
 * Path convention: paths include /api/ prefix (matching all other SDK features).
 * apiClient baseURL = ${origin}/api — leading-slash paths resolve correctly via new URL().
 */

import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '../../shared/apiClient';
import type {
  EmailStatusResponse,
  ConnectedSender,
  MsBookingBusiness,
  MsBookingService,
  MsBookingStaff,
  OAuthStartResponse,
  SaveBookingConfigRequest,
  SaveTenantDefaultsRequest,
} from './types';

// ── Query Keys ─────────────────────────────────────────────────────────────────

export const emailAccountKeys = {
  all:              ['email-accounts'] as const,
  googleStatus:     () => [...emailAccountKeys.all, 'google', 'status'] as const,
  microsoftStatus:  () => [...emailAccountKeys.all, 'microsoft', 'status'] as const,
  connectedSenders: () => [...emailAccountKeys.all, 'connected-senders'] as const,
  msBusinesses:     () => [...emailAccountKeys.all, 'microsoft', 'businesses'] as const,
  msServices:       (businessId: string) => [...emailAccountKeys.all, 'microsoft', 'services', businessId] as const,
  msStaff:          (businessId: string) => [...emailAccountKeys.all, 'microsoft', 'staff', businessId] as const,
} as const;

// ── Google OAuth ───────────────────────────────────────────────────────────────

/** Start Google OAuth flow — returns the consent URL */
export async function startGoogleOAuth(frontendId = 'settings'): Promise<OAuthStartResponse> {
  const res = await apiClient.post<OAuthStartResponse>(
    '/api/social-integration/email/google/start',
    { frontend_id: frontendId }
  );
  return res.data;
}

/** Get Google connection status for the current user */
export async function getGoogleStatus(): Promise<EmailStatusResponse> {
  const res = await apiClient.post<EmailStatusResponse>(
    '/api/social-integration/email/google/status',
    {}
  );
  return res.data;
}

/** Disconnect Google account */
export async function disconnectGoogle(): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post('/api/social-integration/email/google/disconnect', {});
  return res.data;
}

// ── TanStack Query options ─────────────────────────────────────────────────────

export function getGoogleStatusOptions() {
  return queryOptions({
    queryKey:  emailAccountKeys.googleStatus(),
    queryFn:   () => getGoogleStatus(),
    staleTime: 5 * 60 * 1000,  // 5 min
    gcTime:    10 * 60 * 1000, // 10 min
  });
}

// ── Microsoft OAuth ────────────────────────────────────────────────────────────

/** Start Microsoft OAuth flow — returns the consent URL */
export async function startMicrosoftOAuth(frontendId = 'settings'): Promise<OAuthStartResponse> {
  const res = await apiClient.post<OAuthStartResponse>(
    '/api/social-integration/email/microsoft/start',
    { frontend_id: frontendId }
  );
  return res.data;
}

/** Get Microsoft connection status + Bookings config */
export async function getMicrosoftStatus(): Promise<EmailStatusResponse> {
  const res = await apiClient.post<EmailStatusResponse>(
    '/api/social-integration/email/microsoft/status',
    {}
  );
  return res.data;
}

/** Disconnect Microsoft account */
export async function disconnectMicrosoft(): Promise<{ success: boolean; message: string }> {
  const res = await apiClient.post('/api/social-integration/email/microsoft/disconnect', {});
  return res.data;
}

export function getMicrosoftStatusOptions() {
  return queryOptions({
    queryKey:  emailAccountKeys.microsoftStatus(),
    queryFn:   () => getMicrosoftStatus(),
    staleTime: 5 * 60 * 1000,
    gcTime:    10 * 60 * 1000,
  });
}

// ── Microsoft Bookings ─────────────────────────────────────────────────────────

export async function listMsBookingBusinesses(): Promise<MsBookingBusiness[]> {
  const res = await apiClient.get<{ success: boolean; data: MsBookingBusiness[] }>(
    '/api/social-integration/email/microsoft/list-businesses'
  );
  return res.data?.data ?? [];
}

export async function listMsBookingServices(businessId: string): Promise<MsBookingService[]> {
  const res = await apiClient.get<{ success: boolean; data: MsBookingService[] }>(
    '/api/social-integration/email/microsoft/list-services',
    { params: { business_id: businessId } }
  );
  return res.data?.data ?? [];
}

export async function listMsBookingStaff(businessId: string): Promise<MsBookingStaff[]> {
  const res = await apiClient.get<{ success: boolean; data: MsBookingStaff[] }>(
    '/api/social-integration/email/microsoft/staff',
    { params: { business_id: businessId } }
  );
  return res.data?.data ?? [];
}

export async function saveMsBookingConfig(payload: SaveBookingConfigRequest) {
  const res = await apiClient.post('/api/social-integration/email/microsoft/save-config', payload);
  return res.data;
}

export async function saveMsTenantDefaults(payload: SaveTenantDefaultsRequest) {
  const res = await apiClient.post(
    '/api/social-integration/email/microsoft/bookings/tenant-defaults',
    payload
  );
  return res.data;
}

export function getMsBookingBusinessesOptions(enabled = true) {
  return queryOptions({
    queryKey: emailAccountKeys.msBusinesses(),
    queryFn:  () => listMsBookingBusinesses(),
    enabled,
    staleTime: 10 * 60 * 1000,
    gcTime:    20 * 60 * 1000,
  });
}

export function getMsBookingServicesOptions(businessId: string, enabled = true) {
  return queryOptions({
    queryKey: emailAccountKeys.msServices(businessId),
    queryFn:  () => listMsBookingServices(businessId),
    enabled:  enabled && !!businessId,
    staleTime: 10 * 60 * 1000,
    gcTime:    20 * 60 * 1000,
  });
}

export function getMsBookingStaffOptions(businessId: string, enabled = true) {
  return queryOptions({
    queryKey: emailAccountKeys.msStaff(businessId),
    queryFn:  () => listMsBookingStaff(businessId),
    enabled:  enabled && !!businessId,
    staleTime: 10 * 60 * 1000,
    gcTime:    20 * 60 * 1000,
  });
}

// ── Connected Senders ──────────────────────────────────────────────────────────

export async function getConnectedSenders(): Promise<ConnectedSender[]> {
  const res = await apiClient.get<{ success: boolean; data: ConnectedSender[] }>(
    '/api/social-integration/email/connected-senders'
  );
  return res.data?.data ?? [];
}

export function getConnectedSendersOptions() {
  return queryOptions({
    queryKey:  emailAccountKeys.connectedSenders(),
    queryFn:   () => getConnectedSenders(),
    staleTime: 5 * 60 * 1000,
    gcTime:    10 * 60 * 1000,
  });
}
