/**
 * AI ICP Assistant Feature Module
 * Export all public APIs for the AI ICP Assistant feature
 */

// Legacy service (if exists)
export { 
  AIICPAssistantService,
  createAIICPAssistantService,
  type AIICPAssistantAPI,
  type ChatMessage,
  type ChatResponse,
  type ICPData
} from './aiICPAssistantService';

// New Maya AI Service
export { mayaAI, default as mayaAIService } from './services/mayaAIService';
export type {
  MayaMessage,
  MayaResponse,
  OnboardingContext,
  WorkflowNode,
} from './types';
