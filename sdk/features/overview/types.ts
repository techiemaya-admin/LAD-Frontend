/**
 * Dashboard Feature Types
 * Type definitions for Lead Bookings and Users
 */

// Lead Booking Types
export interface LeadBooking {
  id: string;
  tenant_id: string;
  lead_id: string;
  assigned_user_id: string;
  booking_type: string;
  booking_source: string;
  scheduled_at: string;
  timezone: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no-show';
  call_result?: string;
  retry_count: number;
  parent_booking_id?: string;
  notes?: string;
  metadata?: Record<string, any>;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  buffer_until?: string;
  task_name?: string;
  task_scheduled_at?: string;
  task_status?: string;
  executed_at?: string;
  execution_attempts?: number;
  last_execution_error?: string;
  idempotency_key?: string;
}

// User Types
export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  name: string;
  avatar_url?: string;
  phone?: string;
  is_active: boolean;
  last_login_at?: string;
  created_at: string;
  updated_at: string;
}

// Call Log Types
export interface CallLog {
  id: string;
  from?: string;
  to?: string;
  startedAt?: string;
  endedAt?: string;
  status: string;
  recordingUrl?: string;
  timeline?: Array<{ t: string; title: string; desc?: string }>;
  agentName?: string;
  leadName?: string;
  duration_seconds?: number;
  call_date?: string; // New from API
}

export interface CallSummary {
  call_date: string;
  total_calls: number;
}

// Wallet/Credits Types
export interface WalletStats {
  balance: number;
  totalMinutes: number;
  remainingMinutes: number;
  usageThisMonth: number;
}

// Phone Number Types
export interface PhoneNumber {
  id: string;
  e164: string;
  label?: string;
  provider?: string;
  sid?: string;
  account?: string;
}

// Voice Agent Types
export interface VoiceAgent {
  id: string;
  name: string;
  language?: string;
  accent?: string;
  gender?: string;
  provider?: string;
  description?: string;
  voice_sample_url?: string | null;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
  message?: string;
}

export interface LeadBookingListResponse extends ApiResponse<LeadBooking[]> { }
export interface LeadBookingResponse extends ApiResponse<LeadBooking> { }
export interface UsersListResponse extends ApiResponse<User[]> { }
export interface CallLogListResponse extends ApiResponse<{
  summary: CallSummary[];
  logs: CallLog[];
  countToday?: number;
  countYesterday?: number;
  countThisMonth?: number;
  countLastMonth?: number;
  answerRate?: number;
  answerRateLastWeek?: number;
}> { }
export interface WalletStatsResponse extends ApiResponse<WalletStats> { }
export interface PhoneNumberListResponse extends ApiResponse<PhoneNumber[]> { }
export interface VoiceAgentListResponse extends ApiResponse<VoiceAgent[]> { }

// Query Parameters
export interface GetLeadBookingsParams {
  user_id?: string;
  status?: string;
  bookingType?: string;
  bookingSource?: string;
  leadId?: string;
  startDate?: string;
  endDate?: string;
  callResult?: string;
  limit?: number;
}

export interface GetDashboardCallsParams {
  startDate?: string;
  endDate?: string;
  user_id?: string;
}

export interface CreateLeadBookingParams {
  leadId: string;
  assignedUserId: string;
  bookingType: string;
  bookingSource: string;
  scheduledAt: string;
  timezone: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateLeadBookingParams {
  status?: string;
  call_result?: string;
  retry_count?: number;
  notes?: string;
  metadata?: Record<string, any>;
  task_name?: string;
  task_scheduled_at?: string;
  task_status?: string;
  executed_at?: string;
  execution_attempts?: number;
  last_execution_error?: string;
}
