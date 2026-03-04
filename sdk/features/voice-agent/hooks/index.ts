// Voice Agent Hooks Index
export { useAvailableAgents } from './useAvailableAgents';
export { useMakeCall } from './useMakeCall';
export { useResolvePhones } from './useResolvePhones';
export { useTriggerBatchCall } from './useTriggerBatchCall';
export { useUpdateCallLeadTags } from './useUpdateCallLeadTags';
export { useUpdateSummary } from './useUpdateSummary';
export { useUserAvailableNumbers } from './useUserAvailableNumbers';

// Legacy hooks (stubs for compatibility)
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
