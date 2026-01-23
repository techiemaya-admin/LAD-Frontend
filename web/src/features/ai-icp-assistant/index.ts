/**
 * AI ICP Assistant Feature - Public Exports
 * 
 * Clean public API for the feature.
 * Re-exports only what consumers need.
 */
export * from './api';
export * from './types';
export * from './hooks';
export { API_CONFIG, getApiUrl } from './config/api.config';
// Legacy Maya AI Service (for backward compatibility)
export { mayaAI, default as mayaAIService } from './services/mayaAIService';
export type {
  MayaMessage,
  MayaResponse,
  OnboardingContext,
} from './services/mayaAIService';