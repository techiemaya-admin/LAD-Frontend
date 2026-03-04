// Call Logs SDK Types

export interface CallLogResponse {
  call_log_id: string;
  id?: string;
  lead_id?: string;
  agent_name: string;
  lead_first_name?: string;
  lead_last_name?: string;
  lead_name?: string;
  direction: "inbound" | "outbound";
  call_type?: "inbound" | "outbound";
  status: string;
  started_at: string;
  duration_seconds: number;
  call_duration?: number;
  cost?: number;
  call_cost?: number;
  batch_status?: string;
  batch_id?: string;
  lead_category?: string;
  lead_tags?: string[];
  signed_recording_url?: string;
  recording_url?: string;
  call_recording_url?: string;
  analysis?: {
    raw_analysis?: {
      lead_score_full?: {
        lead_category?: string;
      };
    };
  };
}



export interface CallLogsResponse {
  logs: CallLogResponse[];
}

export interface BatchResultItem {
  to_number?: string | null;
  status?: string | null;
  index?: number;
  lead_name?: string | null;
  context?: string | null;
  call_log_id?: string | null;
  room_name?: string | null;
  dispatch_id?: string | null;
  error?: string | null;
  batch_status?: string | null;
}

export interface BatchPayload {
  job_id: string;
  status: string;
  results: BatchResultItem[];
}

export interface BatchApiResponse {
  success: boolean;
  batch?: BatchPayload;
  result?: BatchPayload;
}

export interface VoiceAgentBatchMetadata {
  job_id?: string;
  [key: string]: any;
}

export interface VoiceAgentBatch {
  id: string;
  tenant_id: string;
  status: string;
  total_calls: number;
  completed_calls: number;
  failed_calls: number;
  initiated_by_user_id?: string | null;
  agent_id?: string | null;
  voice_id?: string | null;
  from_number_id?: string | null;
  scheduled_at?: string | null;
  started_at?: string | null;
  finished_at?: string | null;
  metadata?: VoiceAgentBatchMetadata;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface BatchViewApiResponse {
  success?: boolean;
  data?: VoiceAgentBatch[];
  result?: VoiceAgentBatch[];
  batches?: VoiceAgentBatch[];
  count?: number;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export interface BatchCallLogsApiResponse {
  success?: boolean;
  data?: {
    batch_id: string;
    call_logs: CallLogResponse[];
  } | CallLogResponse[];
}

export interface CallLog {
  id: string;
  assistant: string;
  lead_id?: string;
  lead_name: string;
  type: string;
  status: string;
  startedAt: string;
  duration: number;
  cost: number;
  batch_status?: string;
  batch_id?: string;
  is_batch_header?: boolean;
  batch_total_calls?: number;
  batch_completed_calls?: number;
  batch_failed_calls?: number;
  lead_category?: string;
  lead_tags?: string[];
  signed_recording_url?: string;
  recording_url?: string;
  call_recording_url?: string;
}

export interface GetCallLogsParams {
  status?: string;
  agent_id?: string;
  from_date?: string;
  to_date?: string;
  page?: number;
  limit?: number;
  lead_category?: string;
}

export interface BatchViewParams {
  page?: number;
  limit?: number;
}

export interface EndCallParams {
  callId: string;
}

export interface RetryCallsParams {
  call_ids: string[];
}

export interface RecordingSignedUrlParams {
  callId: string;
}

export interface RecordingSignedUrlResponse {
  success: boolean;
  signed_url?: string;
  data?: {
    signed_url?: string;
  };
}

export interface CallLogsStats {
  total_calls: number;
  completed_calls: number;
  failed_calls: number;
  ongoing: number;
  queue: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
}

export interface BatchStats {
  total_batches: number;
  completed_batches: number;
  running_batches: number;
  failed_batches: number;
  upcoming_batches: number;
  total_calls_scheduled: number;
  total_calls_completed: number;
  total_calls_failed: number;
}

// ============================================================================
// CALL LEAD TYPES
// ============================================================================

export interface CallLeadParams {
  callId: string;
}

/** Shape of a lead record returned by GET /api/voice-agent/calls/{id}/lead */
export interface CallLead {
  id?: string;
  user_id?: string;
  tenant_id?: string;
  source?: string;
  source_id?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  company_name?: string | null;
  company_domain?: string | null;
  title?: string | null;
  linkedin_url?: string | null;
  location?: string | null;
  status?: string;
  priority?: number;
  stage?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
  notes?: string | null;
  raw_data?: unknown;
  is_deleted?: boolean;
  created_at?: string;
  updated_at?: string;
  last_contacted_at?: string | null;
  created_by_user_id?: string | null;
  assigned_user_id?: string | null;
  assigned_at?: string | null;
  last_activity_at?: string | null;
  next_follow_up_at?: string | null;
  estimated_value?: number | null;
  currency?: string;
  is_archived?: boolean;
  country_code?: string | null;
  base_number?: string | null;
  apollo_person_id?: string | null;
  phone_type?: string | null;
  phone_confidence?: number | null;
  [key: string]: unknown;
}

export interface CallLeadResponse {
  success?: boolean;
  /** Lead is wrapped under `data` */
  data?: CallLead;
  /** Legacy: some backends wrap under `lead` */
  lead?: CallLead;
  [key: string]: unknown;
}

// ============================================================================
// SSE STREAM TYPES
// ============================================================================

/**
 * Callback function type for SSE call logs stream
 * Called whenever a new call log update is received from the stream
 */
export type CallLogsStreamCallback = (callLog: CallLogResponse) => void;

/**
 * Configuration options for the call logs SSE stream
 */
export interface CallLogsStreamOptions {
  /** Callback fired when a new call log is received */
  onMessage: CallLogsStreamCallback;
  /** Callback fired when an error occurs */
  onError?: (error: Event) => void;
  /** Callback fired when the connection is opened */
  onOpen?: () => void;
  /** Callback fired when the connection is closed */
  onClose?: () => void;
}

/**
 * Handle returned by subscribeToCallLogsStream for managing the connection
 */
export interface CallLogsStreamHandle {
  /** Close the SSE connection */
  close: () => void;
}
