import { apiPost } from '@/lib/api';
import { PLATFORM_FEATURES } from '@/lib/platformFeatures';
import { logger } from '../utils/logger';

// Helper to call Next.js API routes (relative paths, no base URL)
async function callNextApiRoute<T>(path: string, body: any): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  
  if (!res.ok) {
    throw new Error(`POST ${path} ${res.status}`);
  }
  
  return res.json();
}

export interface MayaMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
}

export interface MayaResponse {
  text: string;
  options?: { label: string; value: string }[] | null;
  workflowUpdates?: any[];
  currentState?: 'STATE_1' | 'STATE_2' | 'STATE_3' | 'STATE_4' | 'STATE_5' | null;
  nextQuestion?: string | null;
  nextAction?: 'ask_platform_features' | 'ask_feature_utilities' | 'complete';
  platform?: string;
  feature?: string;
  status?: 'need_input' | 'ready';
  missing?: Record<string, boolean> | string[];
  workflow?: any[];
  schedule?: string;
  searchResults?: any[];
}

export interface OnboardingContext {
  selectedPath: 'automation' | 'leads' | null;
  selectedPlatforms: string[];
  platformsConfirmed?: boolean;
  selectedCategory?: string | null;
  platformFeatures: Record<string, string[]>;
  currentPlatform?: string;
  currentFeature?: string;
  workflowNodes: any[];
  currentState?: 'STATE_1' | 'STATE_2' | 'STATE_3' | 'STATE_4' | 'STATE_5';
}

/**
 * Maya AI Service - AI-powered ICP Assistant
 * Handles conversation flow for onboarding and workflow generation
 */
class MayaAIService {
  /**
   * Send a message to Maya AI
   */
  async sendMessage(
    message: string,
    history: MayaMessage[],
    currentQuestionKey: string | null,
    selectedPath: 'automation' | 'leads' | null,
    config: any,
    context?: OnboardingContext
  ): Promise<MayaResponse> {
    try {
      // Call Next.js API route (relative path, no base URL)
      const response = await callNextApiRoute<MayaResponse>('/api/onboarding/gemini/chat', {
        message,
        history,
        currentQuestionKey,
        selectedPath,
        config,
        context,
      });
      return response;
    } catch (error) {
      logger.error('[MayaAI] Error sending message:', error);
      return {
        text: 'I apologize, but I encountered an error. Please try again.',
        options: null
      };
    }
  }

  /**
   * Ask about platform features
   */
  async askPlatformFeatures(
    platform: string,
    history: MayaMessage[]
  ): Promise<MayaResponse> {
    const platformFeatures = PLATFORM_FEATURES[platform as keyof typeof PLATFORM_FEATURES] || [];
    const featureOptions = platformFeatures.map(f => ({
      label: f.label,
      value: f.id,
    }));

    const prompt = `The user selected ${platform} platform. Present these features as selectable options: ${platformFeatures.map(f => f.label).join(', ')}. Ask: "Which ${platform} features do you want? (You can select multiple)"`;

    try {
      const response = await callNextApiRoute<MayaResponse>('/api/onboarding/gemini/chat', {
        message: prompt,
        history,
        currentQuestionKey: `features_${platform}`,
        selectedPath: 'automation',
        config: {},
        context: {
          selectedPlatforms: [platform],
          platformFeatures: {},
          workflowNodes: [],
        },
      });
      return {
        ...response,
        options: featureOptions,
      };
    } catch (error) {
      logger.error('[MayaAI] Error asking platform features:', error);
      return {
        text: `Which ${platform} features do you want? (You can select multiple)`,
        options: featureOptions,
      };
    }
  }

  /**
   * Ask about feature utilities
   */
  async askFeatureUtilities(
    platform: string,
    feature: string,
    history: MayaMessage[]
  ): Promise<MayaResponse> {
    const prompt = `The user selected ${feature} feature for ${platform} platform. Ask about utilities: schedule (when to run), delay (time between actions), condition (when to trigger), and variables (dynamic data to use).`;

    try {
      const response = await callNextApiRoute<MayaResponse>('/api/onboarding/gemini/chat', {
        message: prompt,
        history,
        currentQuestionKey: `utilities_${platform}_${feature}`,
        selectedPath: 'automation',
        config: {},
        context: {
          selectedPlatforms: [platform],
          platformFeatures: { [platform]: [feature] },
          workflowNodes: [],
        },
      });
      return response;
    } catch (error) {
      logger.error('[MayaAI] Error asking feature utilities:', error);
      return {
        text: `How would you like to configure ${feature} for ${platform}?`,
        options: null,
      };
    }
  }

  /**
   * Build workflow node from feature and utilities
   */
  buildWorkflowNode(
    platform: string,
    feature: string,
    utilities: {
      schedule?: string;
      delay?: { days?: number; hours?: number };
      condition?: string;
      variables?: string[];
    }
  ) {
    const nodeId = `${platform}_${feature}_${Date.now()}`;
    
    const featureTypeMap: Record<string, string> = {
      linkedin_connect: 'linkedin_connect',
      linkedin_message: 'linkedin_message',
      linkedin_visit: 'linkedin_visit',
      linkedin_follow: 'linkedin_follow',
      whatsapp_send: 'whatsapp_send',
      email_send: 'email_send',
      email_followup: 'email_followup',
      email_track: 'email_send',
      email_bounce: 'email_send',
      voice_agent_call: 'voice_agent_call',
      voice_agent_script: 'voice_agent_call',
    };

    const stepType = featureTypeMap[feature] || feature;
    const featureLabel = PLATFORM_FEATURES[platform as keyof typeof PLATFORM_FEATURES]
      ?.find(f => f.id === feature)?.label || feature;

    return {
      id: nodeId,
      type: stepType,
      title: featureLabel,
      platform,
      channel: platform === 'linkedin' ? 'linkedin' :
               platform === 'instagram' ? 'instagram' :
               platform === 'whatsapp' ? 'whatsapp' :
               platform === 'email' ? 'email' : 'voice',
      settings: {
        runWhen: utilities.schedule || 'immediate',
        delay: utilities.delay || { days: 0, hours: 0 },
        condition: utilities.condition || null,
        variables: utilities.variables?.filter(v => v !== 'none') || [],
      },
    };
  }
}

export const mayaAI = new MayaAIService();
export default mayaAI;

