/**
 * Campaigns Feature Module
 * 
 * Main exports for Campaigns feature including:
 * - Campaign types
 * - React Query hooks
 * - API functions
 */

// Types
export type { Campaign, CampaignStatus, CampaignStats, CampaignLead } from './types';

// Hooks
export {
  useCampaigns,
  useCampaign,
  useCampaignStats,
  useCampaignLeads,
  useProfileSummary,
  useGenerateProfileSummary,
} from './hooks';

// API functions
export {
  getCampaigns,
  getCampaign,
  getCampaignStats,
  createCampaign,
  updateCampaign,
  startCampaign,
  pauseCampaign,
  stopCampaign,
  deleteCampaign,
  getProfileSummary,
  generateProfileSummary,
} from './api';

// Store
export { useCampaignStore } from './store/campaignStore';

