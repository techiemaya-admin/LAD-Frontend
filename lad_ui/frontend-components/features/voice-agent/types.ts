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
