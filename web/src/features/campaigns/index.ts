/**
 * Campaigns Feature - Web Layer Barrel Re-export
 * 
 * This file serves as a barrel re-export of SDK campaigns functionality
 * and provides a convenient import point for web components.
 * 
 * ARCHITECTURE NOTE: Per LAD Architecture Guidelines:
 * - Business logic (api.ts, hooks.ts, types.ts) lives in: sdk/features/campaigns/
 * - UI components live in: web/src/components/campaigns/
 * - This barrel simply re-exports from SDK for convenience
 * 
 * USAGE:
 * Import SDK types and hooks from here:
 * ```typescript
 * import { useCampaigns, type Campaign } from '@/features/campaigns';
 * ```
 * 
 * Import UI components from web/src/components/campaigns directly:
 * ```typescript
 * import { CampaignsList } from '@/components/campaigns';
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
  saveInboundLeads,
  getInboundLeads,
  cancelLeadBookingsForReNurturing,
} from '@lad/frontend-features/campaigns';

// ============================================================================
// HOOKS
// ============================================================================
export {
  useCampaigns,
  useCampaign,
  useCampaignStats,
  useCampaignAnalytics,
  useCampaignLeads,
  useSaveInboundLeads,
  useInboundLeads,
  useCancelLeadBookings,
} from '@lad/frontend-features/campaigns';

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
  // Hook return types
  UseCampaignsReturn,
  UseCampaignReturn,
  UseCampaignStatsReturn,
  UseCampaignAnalyticsReturn,
  UseCampaignLeadsReturn,
} from '@lad/frontend-features/campaigns';

// ============================================================================
// STORE (Web-layer state management)
// ============================================================================
// Note: Store remains in web layer as it's UI-specific state management
export { useCampaignStore } from './store/campaignStore';
