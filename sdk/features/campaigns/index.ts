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
  updateCampaignSteps,
  deleteCampaign,
  startCampaign,
  pauseCampaign,
  stopCampaign,
  resumeCampaign,
  restartCampaign,
  getCampaignAnalytics,
  getCampaignLeads,
  getLeadProfileSummary,
  generateLeadProfileSummary,
  getLeadsSummaries,
  revealLeadEmail,
  revealLeadPhone,
  revealLeadLinkedIn,
  retryConnection,
  withdrawConnection,
  saveInboundLeads,
  getInboundLeads,
  cancelLeadBookingsForReNurturing,
} from './api';
export type { WithdrawConnectionResult } from './api';

// ============================================================================
// HOOKS
// ============================================================================
export { useCampaigns } from './hooks/useCampaigns';
export { useCampaign } from './hooks/useCampaign';
export { useCampaignStats } from './hooks/useCampaignStats';
export { useCampaignAnalytics } from './hooks/useCampaignAnalytics';
export { useCampaignLeads } from './hooks/useCampaignLeads';
export { useLeadsSummaries } from './hooks/useLeadsSummaries';
export { useLeadProfileSummary, useGenerateLeadProfileSummary } from './hooks/useLeadProfileSummary';
export { useRevealLeadEmail, useRevealLeadPhone, useRevealLeadLinkedIn } from './hooks/useLeadReveal';
export { useSaveInboundLeads, useInboundLeads } from './hooks/useInboundLeads';
export { useCampaignActivityFeed } from './hooks/useCampaignActivityFeed';

// ============================================================================
// ERROR HELPERS
// ============================================================================
export {
  CAMPAIGN_NAME_TAKEN,
  isCampaignNameTaken,
  campaignNameTakenMessage,
  campaignSaveErrorMessage,
} from './nameConflict';
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
export type { RetryConnectionResult } from './api';
// ============================================================================
// HOOK RETURN TYPES
// ============================================================================
export type { UseCampaignsReturn } from './hooks/useCampaigns';
export type { UseCampaignReturn } from './hooks/useCampaign';
export type { UseCampaignStatsReturn } from './hooks/useCampaignStats';
export type { UseCampaignAnalyticsReturn } from './hooks/useCampaignAnalytics';
export type { UseCampaignLeadsReturn } from './hooks/useCampaignLeads';

// ============================================================================
// LINKEDIN MESSAGE TEMPLATES (Sub-Feature)
// ============================================================================
export {
  // Types
  type LinkedInMessageTemplate,
  type CreateTemplateRequest as CreateLinkedInTemplateRequest,
  type UpdateTemplateRequest as UpdateLinkedInTemplateRequest,
  type TemplateFilters as LinkedInTemplateFilters,
  type PersonalizedTemplate as PersonalizedLinkedInTemplate,
  type TemplateCategory as LinkedInTemplateCategory,
  type TemplateType as LinkedInTemplateType,
  type TemplateMedia as LinkedInTemplateMedia,
  type TemplateMediaType as LinkedInTemplateMediaType,
  type TemplateMediaUploadResult as LinkedInTemplateMediaUploadResult,
  TEMPLATE_CATEGORIES as LINKEDIN_TEMPLATE_CATEGORIES,
  TEMPLATE_TYPES as LINKEDIN_TEMPLATE_TYPES,
  templateTypeLabel as linkedinTemplateTypeLabel,
  MESSAGE_VARIABLES as LINKEDIN_MESSAGE_VARIABLES,
  CONNECTION_MESSAGE_MAX_LENGTH as LINKEDIN_CONNECTION_MESSAGE_MAX_LENGTH,
  // Hooks
  useMessageTemplates as useLinkedInMessageTemplates,
  useMessageTemplate as useLinkedInMessageTemplate,
  useDefaultMessageTemplate as useDefaultLinkedInMessageTemplate,
  useCreateMessageTemplate as useCreateLinkedInMessageTemplate,
  useUpdateMessageTemplate as useUpdateLinkedInMessageTemplate,
  useDeleteMessageTemplate as useDeleteLinkedInMessageTemplate,
  usePersonalizeMessage as usePersonalizeLinkedInMessage,
  useValidateMessageLength as useValidateLinkedInMessageLength,
  // API Functions
  linkedInMessageTemplateKeys,
  getMessageTemplates as getLinkedInMessageTemplates,
  getMessageTemplatesQueryOptions as getLinkedInMessageTemplatesQueryOptions,
  getMessageTemplateById as getLinkedInMessageTemplateById,
  getMessageTemplateByIdQueryOptions as getLinkedInMessageTemplateByIdQueryOptions,
  getDefaultMessageTemplate as getDefaultLinkedInMessageTemplate,
  getDefaultMessageTemplateQueryOptions as getDefaultLinkedInMessageTemplateQueryOptions,
  createMessageTemplate as createLinkedInMessageTemplate,
  updateMessageTemplate as updateLinkedInMessageTemplate,
  deleteMessageTemplate as deleteLinkedInMessageTemplate,
  uploadTemplateMedia as uploadLinkedInTemplateMedia,
  saveTemplatesToLocalStorage as saveLinkedInTemplatesToLocalStorage,
  loadTemplatesFromLocalStorage as loadLinkedInTemplatesFromLocalStorage,
  clearTemplatesFromLocalStorage as clearLinkedInTemplatesFromLocalStorage,
} from './linkedin-message-templates';

// ============================================================================
// INSTAGRAM MESSAGE TEMPLATES (Sub-Feature)
// ============================================================================
export {
  // Types
  type InstagramMessageTemplate,
  type CreateInstagramTemplateRequest,
  type UpdateInstagramTemplateRequest,
  type InstagramTemplateFilters,
  INSTAGRAM_MESSAGE_VARIABLES,
  INSTAGRAM_DM_RECOMMENDED_MAX_LENGTH,
  // Hooks
  useMessageTemplates as useInstagramMessageTemplates,
  useMessageTemplate as useInstagramMessageTemplate,
  useDefaultMessageTemplate as useDefaultInstagramMessageTemplate,
  useCreateMessageTemplate as useCreateInstagramMessageTemplate,
  useUpdateMessageTemplate as useUpdateInstagramMessageTemplate,
  useDeleteMessageTemplate as useDeleteInstagramMessageTemplate,
  usePersonalizeMessage as usePersonalizeInstagramMessage,
  // API Functions
  instagramMessageTemplateKeys,
  getMessageTemplates as getInstagramMessageTemplates,
  getMessageTemplatesQueryOptions as getInstagramMessageTemplatesQueryOptions,
  getMessageTemplateById as getInstagramMessageTemplateById,
  getMessageTemplateByIdQueryOptions as getInstagramMessageTemplateByIdQueryOptions,
  getDefaultMessageTemplate as getDefaultInstagramMessageTemplate,
  getDefaultMessageTemplateQueryOptions as getDefaultInstagramMessageTemplateQueryOptions,
  createMessageTemplate as createInstagramMessageTemplate,
  updateMessageTemplate as updateInstagramMessageTemplate,
  deleteMessageTemplate as deleteInstagramMessageTemplate,
} from './instagram-message-templates';

// ── Strategies (saved + shareable workflow playbooks) ────────────────────────
// Exported wholesale rather than aliased: unlike the two message-template
// sub-features, these names ("Strategy") don't collide with anything else here.
export * from './strategies';

