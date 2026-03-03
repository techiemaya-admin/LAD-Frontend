/**
 * Community ROI Feature - HTTP API Client
 *
 * All HTTP API calls for the community ROI feature.
 * Uses the shared apiClient for consistent request handling.
 */

import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '../../shared/apiClient';
import {
  UUID,
  Member,
  CreateMemberRequest,
  UpdateMemberRequest,
  Interaction,
  LogInteractionRequest,
  Referral,
  LogReferralRequest,
  RelationshipScoreWithScores,
  ContributionScoreWithScores,
  ListMembersParams,
  ListReferralsParams,
  ListInteractionsParams,
  PaginatedResponse,
  ApiResponse,
  LeaderboardStats,
  DashboardKPIs,
  RelationshipHeatmapResponse,
  UpdateRelationshipScoresResponse,
} from './types';

// ===== Configuration =====
const API_PREFIX = '/api/community-roi';

// ===== Query Keys =====
/**
 * Query keys for TanStack Query
 * Organized by feature area (members, interactions, referrals, etc.)
 */
export const communityRoiKeys = {
  all: ['communityRoi'] as const,
  
  // Members
  members: () => [...communityRoiKeys.all, 'members'] as const,
  membersList: (params?: ListMembersParams) => [...communityRoiKeys.members(), 'list', params] as const,
  member: (id: UUID) => [...communityRoiKeys.members(), id] as const,
  memberActivity: (id: UUID) => [...communityRoiKeys.members(), id, 'activity'] as const,
  memberRecentActivity: (id: UUID) => [...communityRoiKeys.members(), id, 'recent'] as const,

  // Interactions
  interactions: () => [...communityRoiKeys.all, 'interactions'] as const,
  interactionsBetween: (id1: UUID, id2: UUID, params?: ListInteractionsParams) =>
    [...communityRoiKeys.interactions(), id1, id2, params] as const,

  // Referrals
  referrals: () => [...communityRoiKeys.all, 'referrals'] as const,
  referralsList: (params?: ListReferralsParams) => [...communityRoiKeys.referrals(), 'list', params] as const,
  memberReferrals: (id: UUID) => [...communityRoiKeys.referrals(), 'member', id] as const,

  // Relationships
  relationships: () => [...communityRoiKeys.all, 'relationships'] as const,
  relationship: (id1: UUID, id2: UUID) => [...communityRoiKeys.relationships(), id1, id2] as const,
  memberRelationships: (id: UUID) => [...communityRoiKeys.relationships(), 'member', id] as const,
  topRelationships: (limit: number) => [...communityRoiKeys.relationships(), 'top', limit] as const,

  // Contributions
  contributions: () => [...communityRoiKeys.all, 'contributions'] as const,
  contribution: (id: UUID) => [...communityRoiKeys.contributions(), id] as const,
  impactScore: (id: UUID) => [...communityRoiKeys.contributions(), 'impact', id] as const,
  topContributors: (limit: number) => [...communityRoiKeys.contributions(), 'top', limit] as const,
  networkStats: () => [...communityRoiKeys.contributions(), 'networkStats'] as const,
  leaderboards: () => [...communityRoiKeys.contributions(), 'leaderboards'] as const,
  
  // Relationship Heatmap
  relationshipHeatmap: () => [...communityRoiKeys.all, 'relationshipHeatmap'] as const,
} as const;


// ===== Member API =====
export const memberApi = {
  /**
   * Get all members (paginated)
   */
  async listMembers(params?: ListMembersParams): Promise<PaginatedResponse<Member>> {
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.limit) queryParams.limit = params.limit.toString();
    if (params?.search) queryParams.search = params.search;
    if (params?.sortBy) queryParams.sortBy = params.sortBy;
    if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
    if (params?.tenantId) queryParams.tenantId = params.tenantId;
    const response = await apiClient.get<{ data: PaginatedResponse<Member> }>(`${API_PREFIX}/members`, { params: queryParams });
    return response.data.data;
  },

  /**
   * Get member by ID
   */
  async getMember(memberId: UUID): Promise<Member> {
    const response = await apiClient.get<{ data: Member }>(`${API_PREFIX}/members/${memberId}`);
    return response.data.data;
  },

  /**
   * Create new member
   */
  async createMember(data: CreateMemberRequest): Promise<Member> {
    const response = await apiClient.post<{ data: Member }>(`${API_PREFIX}/members`, data);
    return response.data.data;
  },

  /**
   * Update member
   */
  async updateMember(memberId: UUID, data: UpdateMemberRequest): Promise<Member> {
    const response = await apiClient.put<{ data: Member }>(`${API_PREFIX}/members/${memberId}`, data);
    return response.data.data;
  },

  /**
   * Delete member (soft delete)
   */
  async deleteMember(memberId: UUID): Promise<void> {
    await apiClient.delete(`${API_PREFIX}/members/${memberId}`);
  },
};

// ===== Member Query Options =====
/**
 * TanStack Query options for listing members
 */
export const getListMembersOptions = (params?: ListMembersParams) =>
  queryOptions({
    queryKey: communityRoiKeys.membersList(params),
    queryFn: () => memberApi.listMembers(params),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
  });

/**
 * TanStack Query options for getting a single member
 */
export const getMemberOptions = (memberId: UUID) =>
  queryOptions({
    queryKey: communityRoiKeys.member(memberId),
    queryFn: () => memberApi.getMember(memberId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!memberId,
  });


// ===== Interaction API =====
export const interactionApi = {
  /**
   * Get interactions between two members
   */
  async getInteractionsBetween(
    memberId1: UUID,
    memberId2: UUID,
    params?: ListInteractionsParams
  ): Promise<PaginatedResponse<Interaction>> {
    const queryParams: Record<string, string> = {
      member_id_1: memberId1.toString(),
      member_id_2: memberId2.toString(),
    };
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.limit) queryParams.limit = params.limit.toString();

    const response = await apiClient.get<{ data: PaginatedResponse<Interaction> }>(`${API_PREFIX}/interactions`, { params: queryParams });
    return response.data.data;
  },

  /**
   * Log new interaction/meeting
   */
  async logInteraction(data: LogInteractionRequest): Promise<Interaction> {
    const response = await apiClient.post<{ data: Interaction }>(`${API_PREFIX}/interactions`, data);
    return response.data.data;
  },
};

// ===== Interaction Query Options =====
/**
 * TanStack Query options for getting interactions between two members
 */
export const getInteractionsBetweenOptions = (
  memberId1: UUID,
  memberId2: UUID,
  params?: ListInteractionsParams
) =>
  queryOptions({
    queryKey: communityRoiKeys.interactionsBetween(memberId1, memberId2, params),
    queryFn: () => interactionApi.getInteractionsBetween(memberId1, memberId2, params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!memberId1 && !!memberId2,
  });


// ===== Referral API =====
export const referralApi = {
  /**
   * Get all referrals (with filters)
   */
  async listReferrals(params?: ListReferralsParams): Promise<PaginatedResponse<Referral>> {
    const queryParams: Record<string, string> = {};
    if (params?.page) queryParams.page = params.page.toString();
    if (params?.limit) queryParams.limit = params.limit.toString();
    if (params?.business_type) queryParams.business_type = params.business_type;
    if (params?.start_month) queryParams.start_month = params.start_month;
    if (params?.end_month) queryParams.end_month = params.end_month;

    const response = await apiClient.get<{ data: PaginatedResponse<Referral> }>(`${API_PREFIX}/referrals`, { params: queryParams });
    return response.data.data;
  },

  /**
   * Get referrals by member
   */
  async getMemberReferrals(memberId: UUID): Promise<Referral[]> {
    const response = await apiClient.get<{ data: Referral[] }>(`${API_PREFIX}/referrals/member/${memberId}`);
    return response.data.data;
  },

  /**
   * Get member activity history
   */
  async getMemberActivityHistory(memberId: UUID): Promise<any[]> {
    const response = await apiClient.get<{ data: any[] }>(`${API_PREFIX}/members/${memberId}/activity-history`);
    return response.data.data;
  },

  /**
   * Get recent activity feed
   */
  async getRecentActivity(memberId: UUID, limit: number = 10): Promise<any[]> {
    const response = await apiClient.get<{ data: any[] }>(`${API_PREFIX}/members/${memberId}/recent-activity`, {
      params: { limit }
    });
    return response.data.data;
  },

  /**
   * Log new referral
   */
  async logReferral(data: LogReferralRequest): Promise<Referral> {
    const response = await apiClient.post<{ data: Referral }>(`${API_PREFIX}/referrals`, data);
    return response.data.data;
  },

  /**
   * Update referral (e.g., mark as closed)
   */
  async updateReferral(referralId: UUID, data: Partial<LogReferralRequest>): Promise<Referral> {
    const response = await apiClient.put<{ data: Referral }>(`${API_PREFIX}/referrals/${referralId}`, data);
    return response.data.data;
  },
};

// ===== Referral Query Options =====
/**
 * TanStack Query options for listing referrals
 */
export const getListReferralsOptions = (params?: ListReferralsParams) =>
  queryOptions({
    queryKey: communityRoiKeys.referralsList(params),
    queryFn: () => referralApi.listReferrals(params),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

/**
 * TanStack Query options for getting member referrals
 */
export const getMemberReferralsOptions = (memberId: UUID) =>
  queryOptions({
    queryKey: communityRoiKeys.memberReferrals(memberId),
    queryFn: () => referralApi.getMemberReferrals(memberId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!memberId,
  });

/**
 * TanStack Query options for getting member activity history
 */
export const getMemberActivityHistoryOptions = (memberId: UUID) =>
  queryOptions({
    queryKey: communityRoiKeys.memberActivity(memberId),
    queryFn: () => referralApi.getMemberActivityHistory(memberId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!memberId,
  });

/**
 * TanStack Query options for getting member recent activity feed
 */
export const getMemberRecentActivityOptions = (memberId: UUID, limit: number = 10) =>
  queryOptions({
    queryKey: communityRoiKeys.memberRecentActivity(memberId),
    queryFn: () => referralApi.getRecentActivity(memberId, limit),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!memberId,
  });

// ===== Relationship API =====
export const relationshipApi = {
  /**
   * Get relationship strength between two members
   */
  async getRelationshipScore(
    memberId1: UUID,
    memberId2: UUID
  ): Promise<RelationshipScoreWithScores> {
    const response = await apiClient.get<{ data: RelationshipScoreWithScores }>(
      `${API_PREFIX}/relationships/${memberId1}/${memberId2}`
    );
    return response.data.data;
  },

  /**
   * Get all relationships for a member
   */
  async getMemberRelationships(memberId: UUID): Promise<RelationshipScoreWithScores[]> {
    const response = await apiClient.get<{ data: RelationshipScoreWithScores[] }>(`${API_PREFIX}/relationships/member/${memberId}`);
    return response.data.data;
  },

  /**
   * Get top relationships in network
   */
  async getTopRelationships(limit: number = 10): Promise<RelationshipScoreWithScores[]> {
    const response = await apiClient.get<{ data: RelationshipScoreWithScores[] }>(`${API_PREFIX}/relationships/top`, { params: { limit: String(limit) } });
    return response.data.data;
  },
};

// ===== Relationship Query Options =====
/**
 * TanStack Query options for getting relationship score between two members
 */
export const getRelationshipScoreOptions = (memberId1: UUID, memberId2: UUID) =>
  queryOptions({
    queryKey: communityRoiKeys.relationship(memberId1, memberId2),
    queryFn: () => relationshipApi.getRelationshipScore(memberId1, memberId2),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!memberId1 && !!memberId2,
  });

/**
 * TanStack Query options for getting all relationships for a member
 */
export const getMemberRelationshipsOptions = (memberId: UUID) =>
  queryOptions({
    queryKey: communityRoiKeys.memberRelationships(memberId),
    queryFn: () => relationshipApi.getMemberRelationships(memberId),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    enabled: !!memberId,
  });

/**
 * TanStack Query options for getting top relationships
 */
export const getTopRelationshipsOptions = (limit: number = 10) =>
  queryOptions({
    queryKey: communityRoiKeys.topRelationships(limit),
    queryFn: () => relationshipApi.getTopRelationships(limit),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

// ===== Contribution API =====
export const contributionApi = {
  /**
   * Get member contribution score
   */
  async getMemberContribution(memberId: UUID): Promise<ContributionScoreWithScores> {
    const response = await apiClient.get<{ data: ContributionScoreWithScores }>(`${API_PREFIX}/contributions/${memberId}`);
    return response.data.data;
  },

  /**
   * Get member impact score
   */
  async getMemberImpactScore(memberId: UUID): Promise<{
    score: number;
    percentile: number;
    ranking: number;
  }> {
    const response = await apiClient.get<{ data: { score: number; percentile: number; ranking: number } }>(`${API_PREFIX}/contributions/${memberId}/impact`);
    return response.data.data;
  },

  /**
   * Get top contributors in network
   */
  async getTopContributors(limit: number = 10): Promise<ContributionScoreWithScores[]> {
    const response = await apiClient.get<{ data: ContributionScoreWithScores[] }>(`${API_PREFIX}/contributions/top`, { params: { limit: String(limit) } });
    return response.data.data;
  },

  /**
   * Get network statistics and KPIs from analytics endpoint
   */
  async getNetworkStats(): Promise<DashboardKPIs['data']> {
    const response = await apiClient.get<{ data: DashboardKPIs['data'] }>(`${API_PREFIX}/analytics/dashboard`);
    
    console.log('%c[contributionApi] getNetworkStats - Raw Response:', 'color: #FF6B6B; font-weight: bold;', {
      fullResponse: response,
      responseData: response.data,
      innerData: response.data?.data,
    });
    
    const result = response.data.data;
    console.log('%c[contributionApi] getNetworkStats - Returning:', 'color: #4ECDC4; font-weight: bold;', {
      hasNetworkBreakdown: !!result?.networkBreakdown,
      hasConnectivity: !!result?.connectivityAnalysis,
      networkBreakdown: result?.networkBreakdown,
      connectivityAnalysis: result?.connectivityAnalysis,
      fullResult: result,
    });
    
    return result;
  },

  /**
   * Get dashboard leaderboards
   */
  async getDashboardLeaderboards(): Promise<LeaderboardStats> {
    const response = await apiClient.get<{ data: LeaderboardStats }>(`${API_PREFIX}/contributions/leaderboards`);
    return response.data.data;
  },

  /**
   * Import Excel data
   */
  async importData(file: File): Promise<{ success: boolean; message: string }> {
    if (!file) {
      throw new Error('File is required');
    }
    
    console.log('[CommunityROI API] importData called with:', {
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      acceptedTypes: ['.xlsx', '.xls', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.ms-excel']
    });
    
    const formData = new FormData();
    formData.append('file', file);
    
    // Verify file was actually added   // Note: FormData entries can't be directly inspected, so we just ensure append was called
    console.log('[CommunityROI API] FormData created with file appended');
    
    // DO NOT set Content-Type header manually - let the HTTP client set it with the boundary
    // Setting it without boundary causes "Multipart: Boundary not found" error
    try {
      const response = await apiClient.post<{ success: boolean; message: string }>(
        `${API_PREFIX}/import/excel`, 
        formData
      );
      
      console.log('[CommunityROI API] Import successful:', response);
      return response.data;
    } catch (error) {
      console.error('[CommunityROI API] Import failed:', error);
      throw error;
    }
  },
};


// ===== Contribution Query Options =====
/**
 * TanStack Query options for getting member contribution
 */
export const getMemberContributionOptions = (memberId: UUID) =>
  queryOptions({
    queryKey: communityRoiKeys.contribution(memberId),
    queryFn: () => contributionApi.getMemberContribution(memberId),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: !!memberId,
  });

/**
 * TanStack Query options for getting member impact score
 */
export const getMemberImpactScoreOptions = (memberId: UUID) =>
  queryOptions({
    queryKey: communityRoiKeys.impactScore(memberId),
    queryFn: () => contributionApi.getMemberImpactScore(memberId),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    enabled: !!memberId,
  });

/**
 * TanStack Query options for getting top contributors
 */
export const getTopContributorsOptions = (limit: number = 10) =>
  queryOptions({
    queryKey: communityRoiKeys.topContributors(limit),
    queryFn: () => contributionApi.getTopContributors(limit),
    staleTime: 10 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

/**
 * TanStack Query options for getting network statistics
 */
export const getNetworkStatsOptions = (enabled: boolean = true) =>
  queryOptions({
    queryKey: communityRoiKeys.networkStats(),
    queryFn: () => contributionApi.getNetworkStats(),
    staleTime: 0, // Always fresh - no caching for now
    gcTime: 0,
    enabled, // Allow disabling the query
  });

// ===== Relationship Scores API =====
export const relationshipScoresApi = {
  /**
   * Update relationship scores based on meeting and referral data
   */
  async updateRelationshipScores(): Promise<UpdateRelationshipScoresResponse> {
    const response = await apiClient.post<UpdateRelationshipScoresResponse>(
      `${API_PREFIX}/relationship-scores/update`
    );
    return response.data;
  },

  /**
   * Get relationship heatmap data with color codes
   */
  async getRelationshipHeatmap(): Promise<RelationshipHeatmapResponse> {
    const response = await apiClient.get<RelationshipHeatmapResponse>(
      `${API_PREFIX}/relationship-scores/heatmap`
    );
    return response.data;
  },
};

// ===== Relationship Scores Query Options =====
/**
 * TanStack Query options for getting relationship heatmap
 */
export const getRelationshipHeatmapOptions = (enabled: boolean = true) =>
  queryOptions({
    queryKey: communityRoiKeys.relationshipHeatmap(),
    queryFn: () => relationshipScoresApi.getRelationshipHeatmap(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
    enabled,
  });

// ===== Webhook API =====
export const webhookApi = {
  /**
   * Handle WhatsApp webhook (server calls this)
   * This is not typically called from client
   */
  async handleWhatsAppWebhook(payload: any): Promise<ApiResponse<any>> {
    const response = await apiClient.post<ApiResponse<any>>(`${API_PREFIX}/webhooks/whatsapp`, payload);
    return response.data;
  },
};

export default {
  memberApi,
  interactionApi,
  referralApi,
  relationshipApi,
  contributionApi,
  relationshipScoresApi,
  webhookApi,
};
