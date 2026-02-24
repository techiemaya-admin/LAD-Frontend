/**
 * Community ROI Feature - Frontend SDK Exports
 *
 * Central export point for all community ROI-related frontend functionality.
 * Import from this file to use community ROI features in your application.
 *
 * USAGE:
 * ```typescript
 * import {
 *   useListMembers,
 *   useMember,
 *   useRelationshipScore,
 *   useNetworkStats,
 *   type Member,
 *   type Interaction,
 * } from '@/sdk/features/community-roi';
 * ```
 */

// ============================================================================
// API FUNCTIONS
// ============================================================================
export {
  memberApi,
  interactionApi,
  referralApi,
  relationshipApi,
  contributionApi,
  relationshipScoresApi,
  webhookApi,
} from './api';

// ============================================================================
// QUERY KEYS & OPTIONS
// ============================================================================
export {
  communityRoiKeys,
  getListMembersOptions,
  getMemberOptions,
  getInteractionsBetweenOptions,
  getListReferralsOptions,
  getMemberReferralsOptions,
  getMemberActivityHistoryOptions,
  getMemberRecentActivityOptions,
  getRelationshipScoreOptions,
  getMemberRelationshipsOptions,
  getTopRelationshipsOptions,
  getMemberContributionOptions,
  getMemberImpactScoreOptions,
  getTopContributorsOptions,
  getNetworkStatsOptions,
  getRelationshipHeatmapOptions,
} from './api';

// ============================================================================
// HOOKS
// ============================================================================
export {
  useListMembers,
  useMember,
  useCreateMember,
  useUpdateMember,
  useDeleteMember,
  useInteractionsBetween,
  useLogInteraction,
  useListReferrals,
  useMemberReferrals,
  useMemberActivityHistory,
  useMemberRecentActivity,
  useLogReferral,
  useUpdateReferral,
  useRelationshipScore,
  useMemberRelationships,
  useTopRelationships,
  useMemberContribution,
  useMemberImpactScore,
  useTopContributors,
  useNetworkStats,
  useDashboardLeaderboards,
  useRelationshipHeatmap,
  useUpdateRelationshipScores,
} from './hooks';

// ============================================================================
// TYPES
// ============================================================================
export type {
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
  HeatmapDataPoint,
  HeatmapColorLegend,
  RelationshipHeatmapResponse,
  UpdateRelationshipScoresResponse,
} from './types';

