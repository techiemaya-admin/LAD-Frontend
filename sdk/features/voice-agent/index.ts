// Voice Agent Feature SDK
export { default as voiceAgentService } from './services/voiceAgentService';
export type {
  VoiceAgent,
  CallLog,
  PhoneNumber,
  BatchCallLogEntry,
  MakeCallRequest,
  MakeCallResponse,
  ResolvePhonesResponse,
  TriggerBatchCallRequest,
  TriggerBatchCallResponse,
  UpdateCallLeadTagsRequest,
  UpdateCallLeadTagsResponse,
  UpdateSummaryRequest,
  UpdateSummaryResponse,
  UserAvailableAgent,
  UserAvailableNumber,
  VoiceAgentTargetType,
} from './types';

// React Query Hooks - import directly from hook files
export { useAvailableAgents } from './hooks/useAvailableAgents';
export { useMakeCall } from './hooks/useMakeCall';
export { useResolvePhones } from './hooks/useResolvePhones';
export { useTriggerBatchCall } from './hooks/useTriggerBatchCall';
export { useUpdateCallLeadTags } from './hooks/useUpdateCallLeadTags';
export { useUpdateSummary } from './hooks/useUpdateSummary';
export { useUserAvailableNumbers } from './hooks/useUserAvailableNumbers';

// Legacy/stub hooks for backward compatibility
export const useVoiceAgents = () => ({ data: [], isLoading: false });
export const useCallLogs = () => ({ data: [], isLoading: false });
export const useCallLog = () => ({ data: null, isLoading: false });
export const useBatchCallLogs = () => ({ data: [], isLoading: false });
export const useTenantPhoneNumbers = () => ({ data: [], isLoading: false });

// Query keys for cache management
export const voiceAgentKeys = {
  all: ['voiceAgent'] as const,
  agents: ['voiceAgent', 'agents'] as const,
  numbers: ['voiceAgent', 'numbers'] as const,
  calls: ['voiceAgent', 'calls'] as const,
};
