/**
 * @deprecated Import from '@/features/ai-icp-assistant' instead
 * This file is kept for backward compatibility
 */
import { mayaAI, type MayaMessage, type MayaResponse, type OnboardingContext } from '@/features/ai-icp-assistant';

// Export types with legacy names
export type GeminiMessage = MayaMessage;
export type GeminiResponse = MayaResponse;
export type { OnboardingContext };

// Re-export functions with legacy names
export const sendGeminiPrompt = mayaAI.sendMessage.bind(mayaAI);
export const askPlatformFeatures = mayaAI.askPlatformFeatures.bind(mayaAI);
export const askFeatureUtilities = mayaAI.askFeatureUtilities.bind(mayaAI);
export const buildWorkflowNode = mayaAI.buildWorkflowNode.bind(mayaAI);

// Export service instance
export { mayaAI };
