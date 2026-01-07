/**
 * AI ICP Assistant Feature Module
 * 
 * Main exports for ICP onboarding questions system.
 * Clean public exports only.
 */

// API functions
export {
  fetchICPQuestions,
  fetchICPQuestionByStep,
  processICPAnswer,
} from './api';

// Types
export type {
  ICPQuestion,
  ICPQuestionsResponse,
  ICPAnswerRequest,
  ICPAnswerResponse,
} from './types';

// Hooks
export {
  useItem,
  useItems,
  useConversation,
} from './hooks';

