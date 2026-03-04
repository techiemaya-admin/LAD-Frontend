export interface VoiceAgent {
  id: string;
  name: string;
  description?: string;
  voice_id?: string;
  prompt_template?: string;
  created_at: string;
  updated_at: string;
}

export interface CallLog {
  id: string;
  voice_agent_id: string;
  phone_number: string;
  status: 'initiated' | 'ringing' | 'answered' | 'completed' | 'failed' | 'busy' | 'no_answer';
  duration?: number;
  recording_url?: string;
  transcript?: string;
  created_at: string;
  updated_at: string;
}

export interface PhoneNumber {
  id: string;
  tenant_id: string;
  country_code: string;
  base_number: string;
  provider: string;
  number_type?: string;
  capabilities?: Record<string, unknown> | string[];
  is_active?: boolean;
  metadata?: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface BatchCallLogEntry {
  call_log_id: string | null;
  batch_id: string;
  batch_entry_id: string | null;
  to_number: string | null;
  status: string;
  index: number;
  lead_id: string | null;
  added_context: string | null;
  room_name: string | null;
  dispatch_id: string | null;
  error: string | null;
  started_at: string | null;
  ended_at: string | null;
}

export type VoiceAgentTargetType = 'lead' | 'phone_number' | 'contact';

export interface UserAvailableAgent {
  id: string;
  name: string;
  description?: string;
}

export interface UserAvailableNumber {
  id: string;
  number: string;
  country_code: string;
  provider: string;
}

export interface MakeCallRequest {
  voiceAgentId: string;
  phoneNumber: string;
  fromNumber?: string;
  context?: Record<string, any>;
  // Aliases for backwards compatibility
  agent_id?: string;
  phone_number?: string;
  from_number?: string;
}

export interface MakeCallResponse {
  call_id: string;
  status: string;
}

export interface ResolvePhonesResponse {
  success: boolean;
  phones: Array<{ phone: string; type: VoiceAgentTargetType }>;
}

export interface TriggerBatchCallRequest {
  agent_id: string;
  batch_data: Array<{ phone: string; lead_id?: string; context?: Record<string, any> }>;
}

export interface TriggerBatchCallResponse {
  batch_id: string;
  total: number;
  scheduled: number;
}

export interface UpdateCallLeadTagsRequest {
  callId: string;
  tags: string[];
  // Aliases for backwards compatibility
  call_id?: string;
}

export interface UpdateCallLeadTagsResponse {
  success: boolean;
  message?: string;
}

export interface UpdateSummaryRequest {
  call_id: string;
  summary: string;
  key_points?: string[];
}

export interface UpdateSummaryResponse {
  success: boolean;
  summary: string;
}
