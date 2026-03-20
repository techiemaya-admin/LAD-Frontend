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
export type { CampaignStep, CampaignPayload, CampaignCreationState } from './hooks/useCampaignCreation';

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