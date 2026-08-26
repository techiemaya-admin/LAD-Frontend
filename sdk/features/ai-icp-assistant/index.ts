/**
 * AI ICP Assistant Feature Module
 * Export all public APIs for the AI ICP Assistant feature
 */
// ICP Questions API
export {
  fetchICPQuestions,
  fetchICPQuestionByStep,
  processICPAnswer,
  getBufferedConversation,
  getCurrentStepFromBuffer,
  hasBufferedMessages,
  clearBufferedMessages,
  clearAllBufferedMessages,
} from './api';

// Export BufferedMessage type
export type { BufferedMessage } from './api';
// Leads Upload API
export {
  downloadLeadsTemplate,
  getLeadsTemplateColumns,
  uploadLeadsFile,
  uploadLeadsContent,
  analyzeLeads,
  getPlatformQuestions,
  validateLeadsForExecution,
} from './api';
// ICP Types
export type {
  ICPQuestion,
  ICPQuestionsResponse,
  ICPAnswerRequest,
  ICPAnswerResponse,
} from './types';
// LinkedIn Limits Types
export type {
  LinkedInLimitsResponse,
  LinkedInLimits,
} from './types';
// Leads Types
export type {
  LeadsTemplateColumn,
  ParsedLead,
  PlatformCoverage,
  PlatformDetection,
  LeadsAnalysis,
  LeadsUploadResponse,
  PlatformQuestion,
  PlatformQuestionOption,
  PlatformQuestionsResponse,
  RecommendedAction,
  LeadsAIAnalysisResponse,
  LeadsValidation,
  LeadsFlowContext,
} from './types';
// ICP Hooks
export {
  useItem,
  useItems,
  useConversation,
  useSaveChatMessages
} from './hooks';
// Leads Upload Hook
export { useLeadsUpload } from './hooks/useLeadsUpload';
export type { LeadsUploadState } from './hooks/useLeadsUpload';
// LinkedIn Limits Hook
export { useLinkedInLimits } from './hooks/useLinkedInLimits';

// New API-centralized hooks
export { useLinkedInSearch } from './hooks/useLinkedInSearch';
export type { LeadTargeting, LeadProfile, LinkedInSearchState } from './hooks/useLinkedInSearch';

export { useAIChat } from './hooks/useAIChat';
export type { AIChatState } from './hooks/useAIChat';
export type { ChatMessage as AIChatMessage } from './hooks/useAIChat';

export { useCampaignCreation } from './hooks/useCampaignCreation';
export type {
  CampaignStep,
  CampaignPayload,
  CampaignCreationState,
  CampaignCreationFailure,
} from './hooks/useCampaignCreation';

export { useVoiceAgent } from './hooks/useVoiceAgent';
export type { VoiceAgent, PhoneNumber, VoiceAgentState } from './hooks/useVoiceAgent';

export { useBilling } from './hooks/useBilling';
export type { WalletData, BillingState } from './hooks/useBilling';
// Legacy service (if exists)
export { 
  AIICPAssistantService,
  createAIICPAssistantService,
  type AIICPAssistantAPI,
  type ChatMessage,
  type ChatResponse,
  type ICPData
} from './services/aiICPAssistantService';
// New Maya AI Service
export { mayaAI, default as mayaAIService } from './services/mayaAIService';
export type {
  MayaMessage,
  MayaResponse,
  OnboardingContext,
  WorkflowNode,
} from './types';

// R8 - Tenant ICP Definitions (canonical active ICP)
export type {
  IcpStructured,
  IcpDefinition,
  IcpSearch,
  SearchStrategy,
  DiscoveryBackend,
  CreateIcpDefinitionInput,
  UpdateIcpDefinitionInput,
  UpdateIcpTuningInput,
} from './types';
export {
  getActiveIcpDefinition,
  listIcpDefinitions,
  createIcpDefinition,
  promoteProfileToIcpDefinition,
  updateIcpDefinition,
  updateIcpTuning,
  deleteIcpDefinition,
  listIcpSearchHistory,
} from './definitionsApi';
export { useActiveIcpDefinition } from './hooks/useActiveIcpDefinition';
export type { UseActiveIcpDefinitionResult } from './hooks/useActiveIcpDefinition';

// Business Profile (the 14-field shape stored in ai_icp_profiles.icp_data,
// shared by the wizard's Company step, the ICP Discovery chat, and Settings).
export type {
  BusinessProfile,
  BusinessProfileCompleteness,
} from './businessProfile';
export {
  BUSINESS_PROFILE_OPTIONAL_FIELDS,
  BUSINESS_PROFILE_COMPANY_HALF,
  BUSINESS_PROFILE_ICP_HALF,
  BUSINESS_PROFILE_OFFER_HALF,
  BUSINESS_PROFILE_ALL_FIELDS,
  BUSINESS_PROFILE_BASICS_FIELDS,
  emptyBusinessProfile,
  computeCompleteness,
  computeOfferCompleteness,
} from './businessProfile';
export { getBusinessProfile, saveBusinessProfile, uploadCompanyLogo } from './businessProfileApi';
export { useBusinessProfile } from './hooks/useBusinessProfile';
export type { UseBusinessProfileResult } from './hooks/useBusinessProfile';
export { useIcpDefinitionMutations } from './hooks/useIcpDefinitionMutations';
export type {
  UseIcpDefinitionMutationsOptions,
  UseIcpDefinitionMutationsResult,
} from './hooks/useIcpDefinitionMutations';
export { useIcpSearchHistory } from './hooks/useIcpSearchHistory';
export type { UseIcpSearchHistoryResult } from './hooks/useIcpSearchHistory';

// D6 - SearchDispatcher HTTP client + hooks
export {
  runSearch,
  listDispatchedSearches,
  getSearchById,
} from './searchApi';
export type {
  ProspectCandidate,
  RunSearchInput,
  SearchRunResult,
  BackendRunRollup,
} from './types';
export { useRunSearch } from './hooks/useRunSearch';
export type { UseRunSearchResult } from './hooks/useRunSearch';
export { useSearch } from './hooks/useSearch';
export type { UseSearchResult, UseSearchOpts } from './hooks/useSearch';
export { useDispatchedSearches } from './hooks/useDispatchedSearches';
export type { UseDispatchedSearchesResult } from './hooks/useDispatchedSearches';