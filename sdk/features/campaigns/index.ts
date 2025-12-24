/**
 * Campaigns Feature - Frontend SDK Exports
 * 
 * Central export point for all campaigns-related frontend functionality.
 * Import from this file to use campaigns features in your application.
 * 
 * USAGE:
 * ```typescript
 * import { 
 *   useCampaigns,
 *   useCampaign,
 *   useCampaignStats,
 *   useCampaignAnalytics,
 *   useCampaignLeads,
 *   type Campaign,
 *   type CampaignStats
 * } from '@/sdk/features/campaigns';
 * ```
 */

// ============================================================================
// API FUNCTIONS
// ============================================================================
export {
  getCampaigns,
  getCampaign,
  getCampaignStats,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  startCampaign,
  pauseCampaign,
  stopCampaign,
  getCampaignAnalytics,
  getCampaignLeads,
  getLeadProfileSummary,
  generateLeadProfileSummary,
} from './api';

// ============================================================================
// HOOKS
// ============================================================================
export { useCampaigns } from './hooks/useCampaigns';
export { useCampaign } from './hooks/useCampaign';
export { useCampaignStats } from './hooks/useCampaignStats';
export { useCampaignAnalytics } from './hooks/useCampaignAnalytics';
export { useCampaignLeads } from './hooks/useCampaignLeads';

// ============================================================================
// TYPES
// ============================================================================
export type {
  Campaign,
  CampaignStatus,
  CampaignStats,
  CampaignFilters,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignAnalytics,
  CampaignLead,
} from './types';

// ============================================================================
// HOOK RETURN TYPES
// ============================================================================
export type { UseCampaignsReturn } from './hooks/useCampaigns';
export type { UseCampaignReturn } from './hooks/useCampaign';
export type { UseCampaignStatsReturn } from './hooks/useCampaignStats';
export type { UseCampaignAnalyticsReturn } from './hooks/useCampaignAnalytics';
export type { UseCampaignLeadsReturn } from './hooks/useCampaignLeads';

