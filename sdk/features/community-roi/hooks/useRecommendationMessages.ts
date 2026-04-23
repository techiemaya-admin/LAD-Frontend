/**
 * Community ROI - useRecommendationMessages Hook
 * React hook for fetching templates and sending recommendation messages
 */

import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { communityROIApiClient } from '../communityROIApiClient';

export interface CommunicationTemplate {
  id: string;
  name: string;
  template_key?: string;
  content: string;
  body?: string; // legacy alias — prefer content
  placeholders?: string[];
  metadata?: {
    sendMode?: string;
    templateOrder?: string | number;
    description?: string;
    metaApproved?: boolean;
  };
  created_at?: string;
}

export interface SendInstantMessagesRequest {
  memberIds: string[];
  templateIds: string[];
  recommendations: any[];
}

export interface SendInstantMessagesResponse {
  success: boolean;
  data?: {
    sentCount: number;
    failedCount: number;
    failedMembers: any[];
    messageIds: string[];
  };
  error?: string;
}

export interface ScheduleMessagesRequest {
  scheduledTime: string;
  sendToAllMembers: boolean;
  memberIds?: string[];
  templateIds: string[];
}

export interface ScheduleMessagesResponse {
  success: boolean;
  data?: {
    id: string;
    status: string;
    scheduled_time: string;
    send_to_all_members: boolean;
    member_ids?: string[];
    template_ids: string[];
    created_at: string;
  };
  error?: string;
}

export interface PendingSchedule {
  id: string;
  scheduled_time: string;
  status: string;
  send_to_all_members: boolean;
  member_ids?: string[];
  template_ids: string[];
  message_log?: any;
  created_at: string;
}

/**
 * Hook to fetch recommendation templates
 */
export function useRecommendationTemplates() {
  const query = useQuery({
    queryKey: ['recommendationTemplates'],
    queryFn: async () => {
      const response = await communityROIApiClient.get<{
        success: boolean;
        data: CommunicationTemplate[];
        count: number;
      }>('/recommendations/templates');
      return response.data.data || [];
    },
  });

  return {
    templates: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to send instant messages
 */
export function useSendInstantMessages() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<SendInstantMessagesResponse | null>(null);

  const sendMessages = async (request: SendInstantMessagesRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await communityROIApiClient.post<SendInstantMessagesResponse>(
        '/recommendations/send-instant',
        request
      );
      setResult(response.data);
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    sendMessages,
    isLoading,
    error,
    result,
  };
}

/**
 * Hook to schedule messages
 */
export function useScheduleMessages() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [result, setResult] = useState<ScheduleMessagesResponse | null>(null);

  const scheduleMessages = async (request: ScheduleMessagesRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await communityROIApiClient.post<ScheduleMessagesResponse>(
        '/recommendations/schedule',
        request
      );
      setResult(response.data);
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    scheduleMessages,
    isLoading,
    error,
    result,
  };
}

/**
 * Hook to fetch pending schedules
 */
export function usePendingSchedules() {
  const query = useQuery({
    queryKey: ['pendingSchedules'],
    queryFn: async () => {
      const response = await communityROIApiClient.get<{
        success: boolean;
        data: PendingSchedule[];
        count: number;
      }>('/recommendations/schedules/pending');
      return response.data.data || [];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  return {
    schedules: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}
