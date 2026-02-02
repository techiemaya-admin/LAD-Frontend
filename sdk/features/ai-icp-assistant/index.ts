/**
 * AI ICP Assistant Feature Module
 * Export all public APIs for the AI ICP Assistant feature
 */
// ICP Questions API
export {
  fetchICPQuestions,
  fetchICPQuestionByStep,
  processICPAnswer,
} from './api';
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
} from './hooks';
// Leads Upload Hook
export { useLeadsUpload } from './hooks/useLeadsUpload';
export type { LeadsUploadState } from './hooks/useLeadsUpload';
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