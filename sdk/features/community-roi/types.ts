/**
 * Community ROI Feature - TypeScript Type Definitions
 * Interfaces and contracts for all entities
 */

export type UUID = string;

// ===== Member Types =====
export interface Member {
  id: UUID;
  tenant_id: UUID;
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  designation?: string;
  industry?: string;
  network_group?: string;
  total_one_to_ones: number;
  total_referrals_given: number;
  total_referrals_received: number;
  total_business_inside_aed: number;
  total_business_outside_aed: number;
  current_streak: number;
  max_streak: number;
  last_unique_meeting_at?: string;
  metadata?: Record<string, any>;
  is_deleted: boolean;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface CreateMemberRequest {
  name: string;
  email?: string;
  phone?: string;
  company_name?: string;
  designation?: string;
  industry?: string;
  network_group?: string;
}

export interface UpdateMemberRequest {
  name?: string;
  email?: string;
  phone?: string;
  company_name?: string;
  designation?: string;
  industry?: string;
  network_group?: string;
}

// ===== Interaction Types =====
export interface Interaction {
  id: UUID;
  tenant_id: UUID;
  member_a_id: UUID;
  member_b_id: UUID;
  meeting_month: string; // YYYY-MM format
  meeting_count: number;
  metadata?: Record<string, any>;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface LogInteractionRequest {
  member_a_id: UUID;
  member_b_id: UUID;
  meeting_month?: string; // Optional, defaults to current month
  meeting_count?: number; // Optional, defaults to 1
  metadata?: Record<string, any>;
}

// ===== Referral Types =====
export interface Referral {
  id: UUID;
  tenant_id: UUID;
  referred_by_id: UUID;
  referred_to_id: UUID;
  referral_month: string; // YYYY-MM format
  referral_count: number;
  business_type?: string;
  estimated_value_aed?: number;
  metadata?: Record<string, any>;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface LogReferralRequest {
  referred_by_id: UUID;
  referred_to_id: UUID;
  business_type?: string;
  estimated_value_aed?: number;
  referral_month?: string; // Optional, defaults to current month
  referral_count?: number; // Optional, defaults to 1
  metadata?: Record<string, any>;
}

// ===== Relationship Types =====
export interface RelationshipScore {
  id: UUID;
  tenant_id: UUID;
  member_a_id: UUID;
  member_b_id: UUID;
  combination_type: number; // 0-3
  one_to_one_count: number;
  referral_count: number;
  both_count: number;
  metadata?: Record<string, any>;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface RelationshipScoreWithScores extends RelationshipScore {
  interaction_score?: number;
  trust_score?: number;
  business_value_score?: number;
  combined_score?: number;
}

export interface GetRelationshipRequest {
  member_id_1: UUID;
  member_id_2: UUID;
}

// ===== Contribution Types =====
export interface ContributionScore {
  id: UUID;
  tenant_id: UUID;
  member_id: UUID;
  total_oto: number;
  unique_oto_partners: number;
  total_referrals_given: number;
  total_referrals_received: number;
  inside_network_business_aed: number;
  outside_network_business_aed: number;
  total_business_aed: number;
  avg_referrals_per_month: number;
  avg_value_per_referral_aed: number;
  calculated_at: Date;
  metadata?: Record<string, any>;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
}

export interface ContributionScoreWithScores extends ContributionScore {
  activity_score?: number;
  value_contribution_score?: number;
  trust_score?: number;
  net_contributor_score?: number;
  overall_impact_score?: number;
  peer_percentile?: number;
}

// ===== Event Types =====
export interface CommunityROIEvent {
  id: UUID;
  tenant_id: UUID;
  event_type: string;
  source: string;
  member_id?: UUID;
  related_member_id?: UUID;
  interaction_id?: UUID;
  referral_id?: UUID;
  event_data: Record<string, any>;
  whatsapp_message_id?: string;
  success: boolean;
  error_message?: string;
  metadata?: Record<string, any>;
  is_deleted: boolean;
  created_at: Date;
  updated_at: Date;
}

// ===== API Response Types =====
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// ===== Query Parameters =====
export interface ListMembersParams {
  tenantId: UUID;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: 'name' | 'created_at' | 'total_business_aed';
  sortOrder?: 'asc' | 'desc';
}

export interface ListReferralsParams {
  page?: number;
  limit?: number;
  business_type?: string;
  start_month?: string;
  end_month?: string;
  sortBy?: 'created_at' | 'estimated_value_aed';
  sortOrder?: 'asc' | 'desc';
}

export interface ListInteractionsParams {
  page?: number;
  limit?: number;
  member_id?: UUID;
  start_month?: string;
  end_month?: string;
}

// ===== WhatsApp Integration Types =====
export interface WhatsAppWebhookPayload {
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        messages?: Array<{
          from: string;
          id: string;
          text?: { body: string };
          timestamp: string;
        }>;
        contacts?: Array<{
          profile: { name: string };
          wa_id: string;
        }>;
      };
    }>;
  }>;
}

// ===== Error Types =====
export class CommunityROIError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'CommunityROIError';
  }
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// ===== Utility Types =====
export type SortOrder = 'asc' | 'desc';
export type CombinationType = 0 | 1 | 2 | 3; // 0: None, 1: Meeting only, 2: Reserved, 3: Both
export type EventSource = 'whatsapp' | 'api' | 'manual' | 'system';

// ===== Leaderboard Types =====
export interface LeaderboardEntry {
  id: string;
  name: string;
  company_name: string;
  value: number;
}

export interface LeaderboardStats {
  topReferrals: LeaderboardEntry[];
  topMeetings: LeaderboardEntry[];
  topTyfcb: (LeaderboardEntry & { inside: number; outside: number })[];
}

// ===== Analytics KPI Types =====
export interface NetworkBreakdown {
  totalInteractions: number;
  meetings: number;
  referrals: number;
}

export interface RelationshipStrength {
  avgStrengthScore: number;
  maxEngagementScore: number;
  minEngagementScore: number;
}

export interface ConnectivityAnalysis {
  avgConnectionsPerMember: number;
  avgRelationshipScore: number;
  networkDensity: number;
  memberCount: number;
}

export interface BusinessValue {
  totalReferrals: number;
  totalBusinessValue: number;
  avgReferralValue: number;
  currency: string;
}

export interface DashboardKPIs {
  success: boolean;
  data: {
    networkBreakdown: NetworkBreakdown;
    relationshipStrength: RelationshipStrength;
    connectivityAnalysis: ConnectivityAnalysis;
    businessValue: BusinessValue;
    calculatedAt: string;
  };
}

// ===== Relationship Heatmap Types =====
export interface HeatmapColorLegend {
  M: { label: string; color: string };
  R: { label: string; color: string };
  MR: { label: string; color: string };
}

export interface HeatmapDataPoint {
  member_a_id: string;
  member_b_id: string;
  member_a_name: string;
  member_b_name: string;
  combination_type: 'M' | 'R' | 'MR' | null;
  meeting_count: number;
  referral_count: number;
  both_count: number;
  color_code: string;
}

export interface RelationshipHeatmapResponse {
  success: boolean;
  data: HeatmapDataPoint[];
  metadata: {
    totalPairs: number;
    colorLegend: HeatmapColorLegend;
  };
}

export interface UpdateRelationshipScoresResponse {
  success: boolean;
  data: {
    updatedPairs: number;
    statistics: {
      meetingOnly: number;
      referralOnly: number;
      both: number;
    };
  };
  message: string;
}

