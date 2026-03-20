/**
 * Email Accounts Feature — Types
 * Type definitions for Gmail and Microsoft/Outlook OAuth account integration.
 */

export type EmailProvider = 'google' | 'microsoft';
export type EmailAccountStatus = 'active' | 'inactive' | 'error' | 'expired';

export interface EmailAccount {
  id: string;
  provider: EmailProvider;
  email: string;
  display_name: string | null;
  status: EmailAccountStatus;
  scopes: string[];
  booking_config: MsBookingConfig;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailStatusResponse {
  connected: boolean;
  email: string | null;
  provider: EmailProvider;
  scopes?: string[];
  last_verified_at?: string | null;
  // Microsoft-specific
  bookings_accessible?: boolean;
  selected_business_id?: string | null;
  selected_business_name?: string | null;
  default_service_id?: string | null;
  default_staff_member_id?: string | null;
}

export interface ConnectedSender {
  provider: EmailProvider;
  email: string;
  label: string;
}

// ── Microsoft Bookings ─────────────────────────────────────────────────────────

export interface MsBookingBusiness {
  id: string;
  displayName: string;
  email?: string | null;
  phone?: string | null;
  webSiteUrl?: string | null;
}

export interface MsBookingService {
  id: string;
  displayName: string;
  defaultDuration?: string | null;
}

export interface MsBookingStaff {
  id: string;
  displayName: string;
  email?: string | null;
  role?: string | null;
}

export interface MsBookingConfig {
  business_id?: string | null;
  business_name?: string | null;
  service_id?: string | null;
  staff_member_id?: string | null;
}

export interface SaveBookingConfigRequest {
  business_id: string;
  business_name?: string;
  service_id?: string;
  staff_member_id?: string;
}

export interface SaveTenantDefaultsRequest {
  business_id?: string;
  service_id?: string;
  staff_id?: string;
}

// ── OAuth Start ────────────────────────────────────────────────────────────────

export interface OAuthStartResponse {
  url: string;
}
