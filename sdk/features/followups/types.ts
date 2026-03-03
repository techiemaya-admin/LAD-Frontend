/**
 * Followups Feature - Type Definitions
 */

export interface FollowupStatus {
  isRunning: boolean;
  scheduledCount: number;
  recentSent24h: number;
  eligibleCount: number;
  businessHours: string;
  timezone: string;
  currentTime: string;
  eligibleContextStatuses: string[];
}

export interface InactiveLead {
  leadId: string;
  phone: string;
  firstName: string;
  lastName: string;
  contextStatus: string;
  lastUserMessage: string | null;
  lastBotMessage: string | null;
  hoursSinceBotMessage: number;
  isScheduled: boolean;
  eligibleForFollowup: boolean;
}

export interface FollowupContextStats {
  totalLeads7Days: number;
  eligibleCount: number;
  eligiblePercentage: number;
  eligibleContextStatuses: string[];
  contextDistribution: Array<{
    contextStatus: string;
    leadCount: number;
    eligibleForFollowup: boolean;
  }>;
}

export interface ScheduleFollowupRequest {
  phoneNumber: string;
  delayHours?: number;
}

export interface FollowupActionResult {
  success: boolean;
  message: string;
}
