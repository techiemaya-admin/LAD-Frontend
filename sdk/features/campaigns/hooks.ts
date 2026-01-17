/**
 * Campaigns Feature - Hooks Re-exports
 * 
 * Re-exports all hooks for convenient importing.
 * This file provides a single import point for all campaign hooks.
 * 
 * USAGE:
 * ```typescript
 * import { useCampaigns, useCampaign, useCampaignStats } from '@/sdk/features/campaigns/hooks';
 * ```
 */

export { useCampaigns } from './hooks/useCampaigns';
export { useCampaign } from './hooks/useCampaign';
export { useCampaignStats } from './hooks/useCampaignStats';
export { useCampaignAnalytics } from './hooks/useCampaignAnalytics';
export { useCampaignLeads } from './hooks/useCampaignLeads';

// Export hook return types
export type { UseCampaignsReturn } from './hooks/useCampaigns';
export type { UseCampaignReturn } from './hooks/useCampaign';
export type { UseCampaignStatsReturn } from './hooks/useCampaignStats';
export type { UseCampaignAnalyticsReturn } from './hooks/useCampaignAnalytics';
export type { UseCampaignLeadsReturn } from './hooks/useCampaignLeads';

