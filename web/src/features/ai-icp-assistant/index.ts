/**
 * AI ICP Assistant Feature - Web Layer Barrel Re-export
 * 
 * This file serves as a barrel re-export of SDK ai-icp-assistant functionality.
 * 
 * ARCHITECTURE NOTE: Per LAD Architecture Guidelines:
 * - Business logic (api.ts, types.ts, hooks.ts, services) lives in: sdk/features/ai-icp-assistant/
 * - UI components live in: web/src/components/ai-icp-assistant/
 * - This barrel simply re-exports from SDK for convenience
 * 
 * USAGE:
 * Import SDK types and hooks from here:
 * ```typescript
 * import { fetchICPQuestions, type ICPQuestion } from '@/features/ai-icp-assistant';
 * ```
 * 
 * Import UI components from web/src/components/ai-icp-assistant directly:
 * ```typescript
 * import { ICPAssistantPanel } from '@/components/ai-icp-assistant';
 * ```
 */

// Re-export everything from SDK
export {
  // API Functions
  fetchICPQuestions,
  fetchICPQuestionByStep,
  processICPAnswer,
  downloadLeadsTemplate,
  getLeadsTemplateColumns,
  uploadLeadsFile,
  uploadLeadsContent,
  analyzeLeads,
  getPlatformQuestions,
  validateLeadsForExecution,
  // Hooks
  useICPQuestions,
  useProcessICPAnswer,
  useUploadLeads,
  useLeadsAnalysis,
  // Types
  type ICPQuestion,
  type ICPQuestionsResponse,
  type ICPAnswerRequest,
  type ICPAnswerResponse,
  type LeadsTemplateColumn,
  type LeadsUploadResponse,
  type LeadsAnalysisResponse,
} from '@lad/frontend-features/ai-icp-assistant';

