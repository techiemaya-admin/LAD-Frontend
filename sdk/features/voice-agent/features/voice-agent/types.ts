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