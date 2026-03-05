export type AgentGender = 'male' | 'female' | 'neutral';
export type AgentStatus = 'active' | 'draft' | 'inactive';

export interface Agent {
  id?: string;
  agent_id?: string;
  name?: string;
  agent_name?: string;
  gender?: AgentGender;
  voice_gender?: string;
  language?: string;
  agent_language?: string;
  status?: AgentStatus;
  agent_instructions?: string;
  system_instructions?: string;
  outbound_starter_prompt?: string;
  created_at?: string;
  updated_at?: string;
  description?: string;
  voice_id?: string;
  voice_sample_url?: string;
  accent?: string;
  provider?: string;
  provider_voice_id?: string;
}

export interface AgentFormData {
  name: string;
  gender: AgentGender;
  language: string;
  agent_instructions: string;
  system_instructions: string;
  outbound_starter_prompt: string;
}

export const DEFAULT_AGENT_FORM: AgentFormData = {
  name: '',
  gender: 'neutral',
  language: 'en-US',
  agent_instructions: '',
  system_instructions: '',
  outbound_starter_prompt: '',
};

export const LANGUAGES = [
  { value: 'en-US', label: 'English (US)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'es-ES', label: 'Spanish (Spain)' },
  { value: 'es-MX', label: 'Spanish (Mexico)' },
  { value: 'fr-FR', label: 'French' },
  { value: 'de-DE', label: 'German' },
  { value: 'it-IT', label: 'Italian' },
  { value: 'pt-BR', label: 'Portuguese (Brazil)' },
  { value: 'ja-JP', label: 'Japanese' },
  { value: 'ko-KR', label: 'Korean' },
  { value: 'zh-CN', label: 'Chinese (Simplified)' },
  { value: 'hi-IN', label: 'Hindi' },
  { value: 'ar-SA', label: 'Arabic' },
];

export const GENDERS: { value: AgentGender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'neutral', label: 'Neutral' },
];
