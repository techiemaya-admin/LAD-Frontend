// Call Logs SDK Types

export interface CallLogResponse {
  call_log_id: string;
  id?: string;
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

export interface CallLog {
  id: string;
  assistant: string;
  lead_name: string;
  type: string;
  status: string;
  startedAt: string;
  duration: number;
  cost: number;
  batch_status?: string;
  batch_id?: string;
  lead_category?: string;
  signed_recording_url?: string;
  recording_url?: string;
  call_recording_url?: string;
}

export interface GetCallLogsParams {
  from_date?: string;
  to_date?: string;
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
  total_calls: number | string;
  completed_calls: number | string;
  failed_calls: number | string;
  ongoing: number | string;
  queue: number | string;
  hot_leads: number | string;
  warm_leads: number | string;
  cold_leads: number | string;
}
