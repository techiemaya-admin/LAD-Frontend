import { useQuery, useMutation, useQueryClient, UseQueryResult, UseMutationResult } from '@tanstack/react-query';
import voiceAgentService from './services/voiceAgentService';
import type { VoiceAgent, CallLog, PhoneNumber, BatchCallLogEntry } from './types';
/**
 * Voice Agent Hooks
 * React Query hooks for voice agent operations
 */
// Query Keys
export const voiceAgentKeys = {
  all: ['voiceAgent'] as const,
  agents: () => [...voiceAgentKeys.all, 'agents'] as const,
  availableAgents: () => [...voiceAgentKeys.all, 'availableAgents'] as const,
  callLogs: () => [...voiceAgentKeys.all, 'callLogs'] as const,
  callLog: (id: string) => [...voiceAgentKeys.callLogs(), id] as const,
  batchCallLogs: (batchId: string) => [...voiceAgentKeys.all, 'batchCallLogs', batchId] as const,
  phoneNumbers: () => [...voiceAgentKeys.all, 'phoneNumbers'] as const,
  userAvailableNumbers: () => [...voiceAgentKeys.all, 'userAvailableNumbers'] as const,
  resolvePhones: (ids: string[], type: string) => [...voiceAgentKeys.all, 'resolvePhones', ids, type] as const,
};
/**
 * Hook to fetch all voice agents
 */
export function useVoiceAgents(): UseQueryResult<VoiceAgent[], Error> {
  return useQuery({
    queryKey: voiceAgentKeys.agents(),
    queryFn: () => voiceAgentService.getVoiceAgents(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
/**
 * Hook to fetch call logs
 * @param voiceAgentId - Optional filter by voice agent ID
 */
export function useCallLogs(voiceAgentId?: string): UseQueryResult<CallLog[], Error> {
  return useQuery({
    queryKey: [...voiceAgentKeys.callLogs(), voiceAgentId],
    queryFn: () => voiceAgentService.getCallLogs(voiceAgentId),
    staleTime: 30 * 1000, // 30 seconds
  });
}
/**
 * Hook to fetch a specific call log
 * @param id - Call log ID
 */
export function useCallLog(id: string): UseQueryResult<CallLog, Error> {
  return useQuery({
    queryKey: voiceAgentKeys.callLog(id),
    queryFn: () => voiceAgentService.getCallLog(id),
    enabled: !!id,
  });
}
/**
 * Hook to fetch batch call logs
 * @param batchId - Batch ID
 */
export function useBatchCallLogs(batchId: string): UseQueryResult<BatchCallLogEntry[], Error> {
  return useQuery({
    queryKey: voiceAgentKeys.batchCallLogs(batchId),
    queryFn: () => voiceAgentService.getBatchCallLogs(batchId),
    enabled: !!batchId,
    staleTime: 10 * 1000, // 10 seconds
  });
}
/**
 * Hook to fetch tenant phone numbers
 */
export function useTenantPhoneNumbers(): UseQueryResult<PhoneNumber[], Error> {
  return useQuery({
    queryKey: voiceAgentKeys.phoneNumbers(),
    queryFn: () => voiceAgentService.getTenantPhoneNumbers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
/**
 * Hook to fetch user's available phone numbers
 */
export function useUserAvailableNumbers(): UseQueryResult<PhoneNumber[], Error> {
  return useQuery({
    queryKey: voiceAgentKeys.userAvailableNumbers(),
    queryFn: () => voiceAgentService.getUserAvailableNumbers(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
/**
 * Hook to fetch user's available voice agents
 */
export function useAvailableAgents(): UseQueryResult<VoiceAgent[], Error> {
  return useQuery({
    queryKey: voiceAgentKeys.availableAgents(),
    queryFn: () => voiceAgentService.getAvailableAgents(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
/**
 * Hook to resolve phone numbers from IDs
 */
export function useResolvePhones(
  ids: string[],
  type: 'company' | 'employee' = 'company'
): UseMutationResult<any[], Error, void> {
  return useMutation({
    mutationFn: () => voiceAgentService.resolvePhones(ids, type),
  });
}
/**
 * Hook to make a call
 */
export function useMakeCall(): UseMutationResult<
  CallLog,
  Error,
  { voiceAgentId: string; phoneNumber: string; context?: string; fromNumber?: string }
> {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ voiceAgentId, phoneNumber, context, fromNumber }: { voiceAgentId: string; phoneNumber: string; context?: string; fromNumber?: string }) =>
      voiceAgentService.makeCall(voiceAgentId, phoneNumber, context, fromNumber),
    onSuccess: () => {
      // Invalidate call logs to refetch
      queryClient.invalidateQueries({ queryKey: voiceAgentKeys.callLogs() });
    },
  });
}