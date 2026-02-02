/**
 * Campaigns Components - Barrel Export
 * 
 * Main export point for all campaign-related UI components.
 * 
 * ARCHITECTURE NOTE: Per LAD Architecture Guidelines:
 * - Business logic (api.ts, hooks.ts, types.ts) lives in: sdk/features/campaigns/
 * - UI components live here: web/src/components/campaigns/
 * 
 * USAGE:
 * ```typescript
 * import { CampaignsList, CampaignsTable } from '@/components/campaigns';
 * import { useCampaigns, type Campaign } from '@lad/frontend-features/campaigns'; // SDK imports
 * ```
 */

// ============================================================================
// MAIN COMPONENTS
// ============================================================================
export { default as CampaignsList } from './CampaignsList';
export { default as CampaignsTable } from './CampaignsTable';
export { default as CampaignFilters } from './CampaignFilters';
export { default as CampaignStatsCards } from './CampaignStatsCards';
export { default as CampaignActionsMenu } from './CampaignActionsMenu';
export { default as CampaignBuilder } from './CampaignBuilder';
export { default as CreateCampaignDialog } from './CreateCampaignDialog';

// ============================================================================
// SPECIALIZED COMPONENTS
// ============================================================================
export { default as FlowCanvas } from './FlowCanvas';
export { default as StepLibrary } from './StepLibrary';
export { default as StepSettings } from './StepSettings';

// ============================================================================
// CARD & DIALOG COMPONENTS
// ============================================================================
export { default as LeadCard } from './LeadCard';
export { default as CompanyCard } from './CompanyCard';
export { default as EmployeeCard } from './EmployeeCard';
export { default as ProfileSummaryDialog } from './ProfileSummaryDialog';
export { LiveActivityTable } from './LiveActivityTable';

// ============================================================================
// FLOW NODE COMPONENTS
// ============================================================================
export { default as CustomNode } from './nodes/CustomNode';

// ============================================================================
// UTILITIES
// ============================================================================
export {
  PLATFORM_CONFIG,
  LINKEDIN_ACTIONS,
  getChannelsUsed,
  getDetailedActions,
  getChannelBadges,
  renderChannelIcons,
  renderActionChips,
  getConnectedIcon,
  getRepliedIcon,
} from './campaignUtils';
