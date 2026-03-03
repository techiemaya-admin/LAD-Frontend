/**
 * Followups Feature - API Functions
 *
 * Uses proxyClient for relative fetch through Next.js API routes.
 * Follows the campaigns/api.ts pattern.
 */
import { queryOptions } from '@tanstack/react-query';
import { proxyClient } from '../../shared/proxyClient';
import type {
  FollowupStatus,
  InactiveLead,
  FollowupContextStats,
  ScheduleFollowupRequest,
  FollowupActionResult,
} from './types';

// ====================
// Query Keys
// ====================

export const followupKeys = {
  all: ['followups'] as const,
  status: () => [...followupKeys.all, 'status'] as const,
  inactiveLeads: () => [...followupKeys.all, 'inactive'] as const,
  contextStats: () => [...followupKeys.all, 'context-stats'] as const,
} as const;

// ====================
// Data Mappers
// ====================

function mapFollowupStatus(raw: any): FollowupStatus {
  return {
    isRunning: raw.is_running ?? raw.scheduler_running ?? false,
    scheduledCount: raw.scheduled_followups_count ?? raw.scheduled_count ?? 0,
    recentSent24h: raw.recent_followups_sent_24h ?? 0,
    eligibleCount: raw.leads_eligible_for_followup ?? 0,
    businessHours: raw.business_hours ?? '7:01 AM - 11:59 PM GST',
    timezone: raw.timezone ?? 'Asia/Dubai',
    currentTime: raw.current_time ?? new Date().toISOString(),
    eligibleContextStatuses: raw.eligible_context_statuses ?? [],
  };
}

function mapInactiveLead(raw: any): InactiveLead {
  return {
    leadId: raw.lead_id,
    phone: raw.phone,
    firstName: raw.first_name || '',
    lastName: raw.last_name || '',
    contextStatus: raw.context_status || 'unknown',
    lastUserMessage: raw.last_user_message,
    lastBotMessage: raw.last_bot_message,
    hoursSinceBotMessage: raw.hours_since_bot_message || 0,
    isScheduled: raw.is_scheduled || false,
    eligibleForFollowup: raw.eligible_for_followup || false,
  };
}

function mapContextStats(raw: any): FollowupContextStats {
  return {
    totalLeads7Days: raw.total_leads_7_days || 0,
    eligibleCount: raw.eligible_leads_count || 0,
    eligiblePercentage: raw.eligible_percentage || 0,
    eligibleContextStatuses: raw.eligible_context_statuses || [],
    contextDistribution: (raw.context_distribution || []).map((item: any) => ({
      contextStatus: item.context_status || 'unknown',
      leadCount: item.lead_count || 0,
      eligibleForFollowup: item.eligible_for_followup || false,
    })),
  };
}

// ====================
// API Functions
// ====================

export async function getFollowupStatus(): Promise<FollowupStatus> {
  const response = await proxyClient.get<any>('/api/followups/status');
  return mapFollowupStatus(response.data);
}

export const getFollowupStatusOptions = () =>
  queryOptions({
    queryKey: followupKeys.status(),
    queryFn: getFollowupStatus,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000,
    refetchInterval: 30000, // Poll every 30 seconds
  });

export async function getInactiveLeads(): Promise<InactiveLead[]> {
  const response = await proxyClient.get<{ leads: any[]; total_inactive_leads: number }>(
    '/api/followups/leads/inactive'
  );
  return (response.data.leads || []).map(mapInactiveLead);
}

export const getInactiveLeadsOptions = () =>
  queryOptions({
    queryKey: followupKeys.inactiveLeads(),
    queryFn: getInactiveLeads,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000,
  });

export async function getContextStats(): Promise<FollowupContextStats> {
  const response = await proxyClient.get<any>('/api/followups/context-stats');
  return mapContextStats(response.data);
}

export const getContextStatsOptions = () =>
  queryOptions({
    queryKey: followupKeys.contextStats(),
    queryFn: getContextStats,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 10 * 60 * 1000,
  });

// ====================
// Mutation Functions
// ====================

export async function scheduleFollowup(
  leadId: string,
  data: ScheduleFollowupRequest
): Promise<FollowupActionResult> {
  const response = await proxyClient.post<FollowupActionResult>(
    `/api/followups/schedule/${leadId}`,
    { phone_number: data.phoneNumber, delay_hours: data.delayHours }
  );
  return response.data;
}

export async function cancelFollowup(leadId: string): Promise<FollowupActionResult> {
  const response = await proxyClient.delete<FollowupActionResult>(
    `/api/followups/cancel/${leadId}`
  );
  return response.data;
}

export async function executeFollowups(): Promise<FollowupActionResult> {
  const response = await proxyClient.post<FollowupActionResult>('/api/followups/execute');
  return response.data;
}
