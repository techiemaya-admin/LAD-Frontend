/**
 * @deprecated Import from '@/features/ai-icp-assistant' instead
 * This file is kept for backward compatibility
 */
import { mayaAI, type MayaMessage, type MayaResponse, type OnboardingContext } from '@/features/ai-icp-assistant';
// Export types with legacy names
export type GeminiMessage = MayaMessage;
export type GeminiResponse = MayaResponse;
export type { OnboardingContext };
// Re-export functions with legacy names (use wrapper functions to defer binding)
export const sendGeminiPrompt = (...args: Parameters<typeof mayaAI.sendMessage>) => 
  mayaAI.sendMessage(...args);
export const askPlatformFeatures = (...args: Parameters<typeof mayaAI.askPlatformFeatures>) => 
  mayaAI.askPlatformFeatures(...args);
export const askFeatureUtilities = (...args: Parameters<typeof mayaAI.askFeatureUtilities>) => 
  mayaAI.askFeatureUtilities(...args);
export const buildWorkflowNode = (...args: Parameters<typeof mayaAI.buildWorkflowNode>) => 
  mayaAI.buildWorkflowNode(...args);
// Export service instance
export { mayaAI };
