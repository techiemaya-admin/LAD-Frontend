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
  /** Per-agent behaviour flags VOAG reads at call time (voice_agents.configs). */
  configs?: Record<string, unknown> | null;
}

export interface AgentFormData {
  name: string;
  gender: AgentGender;
  language: string;
  voice_id: string;
  agent_instructions: string;
  system_instructions: string;
  outbound_starter_prompt: string;
  /**
   * Spoken fillers — the worker's "ఆ…", "సరే," lead in front of each reply,
   * spoken while the model is still thinking. Stored as configs.fillers; false
   * turns them off, anything else leaves the worker's default (on).
   */
  spoken_fillers: boolean;
}

/**
 * Provider-specific tuning stored on the voice row (voice_agent_voices.provider_config).
 * Only keys on the backend allowlist in resolve_voice() reach the worker.
 */
export interface VoiceProviderConfig {
  model?: string;
  speed?: number;
  pitch?: number;
  /** Fish Audio: quality vs time-to-first-audio. DB rows use "latency". */
  latency?: FishLatencyMode;
  latency_mode?: FishLatencyMode;
  /** Fish Audio: audio container. DB rows use "format". */
  format?: FishOutputFormat;
  output_format?: FishOutputFormat;
  [key: string]: unknown;
}

export type FishLatencyMode = 'normal' | 'balanced' | 'low';
export type FishOutputFormat = 'wav' | 'pcm' | 'mp3' | 'opus';

export const FISH_LATENCY_MODES: { value: FishLatencyMode; label: string; hint: string }[] = [
  { value: 'low', label: 'Low', hint: 'Fastest reply, slightly lower audio quality' },
  { value: 'balanced', label: 'Balanced', hint: 'Default trade-off' },
  { value: 'normal', label: 'Normal', hint: 'Best quality, slowest to start speaking' },
];

export const FISH_OUTPUT_FORMATS: { value: FishOutputFormat; label: string }[] = [
  { value: 'pcm', label: 'PCM (recommended for calls)' },
  { value: 'wav', label: 'WAV' },
  { value: 'mp3', label: 'MP3' },
  { value: 'opus', label: 'Opus (48 kHz only)' },
];

export interface Voice {
  id: string;
  description: string;
  gender: AgentGender;
  accent: string;
  provider: string;
  voice_sample_url: string;
  provider_voice_id: string;
  provider_config?: VoiceProviderConfig;
}

export const DEFAULT_AGENT_FORM: AgentFormData = {
  name: '',
  gender: 'neutral',
  language: 'en-US',
  voice_id: '',
  agent_instructions: '',
  system_instructions: '',
  outbound_starter_prompt: '',
  spoken_fillers: true,
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
  // Indian languages the voice stack already supports end to end (Sarvam STT,
  // Cartesia / Sarvam / Fish TTS). Values are what the worker derives the STT
  // and TTS language from (agent.language → derive_stt_language / derive_language),
  // so they must stay BCP-47 with the -IN region.
  { value: 'te-IN', label: 'Telugu' },
  { value: 'ta-IN', label: 'Tamil' },
  { value: 'kn-IN', label: 'Kannada' },
  { value: 'ml-IN', label: 'Malayalam' },
  { value: 'mr-IN', label: 'Marathi' },
  { value: 'gu-IN', label: 'Gujarati' },
  { value: 'bn-IN', label: 'Bengali' },
  { value: 'pa-IN', label: 'Punjabi' },
  { value: 'ar-SA', label: 'Arabic' },
];

export const GENDERS: { value: AgentGender; label: string }[] = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'neutral', label: 'Neutral' },
];
