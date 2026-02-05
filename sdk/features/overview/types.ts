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

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  count?: number;
  error?: string;
  message?: string;
}

export interface LeadBookingListResponse extends ApiResponse<LeadBooking[]> {}
export interface LeadBookingResponse extends ApiResponse<LeadBooking> {}
export interface UsersListResponse extends ApiResponse<User[]> {}

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

// Voice Agent Types
export interface VoiceAgent {
  id: string;
  name: string;
  agent_name?: string;
  label?: string;
}

// Call Log Types
export interface CallLog {
  id: string;
  from: string;
  to: string;
  startedAt: string;
  endedAt?: string;
  status: string;
  recordingUrl?: string;
  timeline?: Array<{ t: string; title: string; desc?: string }>;
  agentName?: string;
  agent_name?: string;
  agent?: string;
  leadName?: string;
  lead_name?: string;
  lead_first_name?: string;
  lead_last_name?: string;
  call_id?: string;
  call_log_id?: string;
  uuid?: string;
  initiated_by?: string;
  from_number?: string;
  fromnum?: string;
  source?: string;
  from_number_id?: string;
  to_number?: string;
  tonum?: string;
  started_at?: string;
  created_at?: string;
  createdAt?: string;
  start_time?: string;
  timestamp?: string;
  ended_at?: string;
  end_time?: string;
  call_status?: string;
  result?: string;
  call_recording_url?: string;
  recording_url?: string;
  voice?: string;
  target?: string;
  client_name?: string;
  customer_name?: string;
}

// Credits/Wallet Types
export interface WalletData {
  wallet?: {
    currentBalance?: number;
    availableBalance?: number;
  };
  credits?: number;
  balance?: number;
  monthly_usage?: number;
}

// API Response Types for new endpoints
export interface AvailableAgentsResponse extends ApiResponse<VoiceAgent[]> {
  agents?: VoiceAgent[];
}

export interface CallLogsResponse extends ApiResponse<CallLog[]> {
  logs?: CallLog[];
  calls?: CallLog[];
}

export interface WalletResponse extends ApiResponse<WalletData> {}

// Query Parameters for Call Logs
export interface GetCallLogsParams {
  startDate?: string;
  endDate?: string;
}
