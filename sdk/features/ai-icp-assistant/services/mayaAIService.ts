import { proxyClient } from '../../../shared/proxyClient';

// Platform features data (inlined from web/src/lib/platformFeatures to avoid cross-boundary imports)
const PLATFORM_FEATURES = {
  linkedin: [
    { id: 'linkedin_profile_visit', label: 'Profile Visit', description: 'Visit the lead\'s LinkedIn profile' },
    { id: 'linkedin_follow', label: 'Follow', description: 'Follow the lead on LinkedIn' },
    { id: 'linkedin_connect', label: 'Connection Request', description: 'Send a connection request with message' },
    { id: 'linkedin_message', label: 'LinkedIn Message', description: 'Send a message (only if connected)' },
    { id: 'linkedin_scrape_profile', label: 'Scrape Profile', description: 'Scrape LinkedIn profile data' },
    { id: 'linkedin_company_search', label: 'Company Search', description: 'Search for company on LinkedIn' },
    { id: 'linkedin_autopost', label: 'Auto-post', description: 'Automatically post content to LinkedIn' },
    { id: 'linkedin_comment_reply', label: 'Reply-to-comments', description: 'Automatically reply to comments' },
  ],
  instagram: [
    { id: 'instagram_autopost', label: 'Auto-post', description: 'Automatically post content to Instagram' },
    { id: 'instagram_dm', label: 'Auto-DM', description: 'Send automated direct messages' },
    { id: 'instagram_comment_reply', label: 'Auto-comment', description: 'Automatically comment on posts' },
    { id: 'instagram_comment_monitor', label: 'Comment Monitoring', description: 'Monitor and reply to comments' },
  ],
  whatsapp: [
    { id: 'whatsapp_broadcast', label: 'Send Broadcast', description: 'Send broadcast message to multiple contacts' },
    { id: 'whatsapp_send', label: 'Send 1:1 Message', description: 'Send individual WhatsApp message' },
    { id: 'whatsapp_followup', label: 'Follow-up Message', description: 'Send follow-up message' },
    { id: 'whatsapp_template', label: 'Template Message', description: 'Send template-based message' },
  ],
  email: [
    { id: 'email_send', label: 'Send Email', description: 'Send email to leads' },
    { id: 'email_followup', label: 'Email Follow-up', description: 'Send follow-up email sequence' },
    { id: 'email_track', label: 'Track Opens / Clicks', description: 'Track email engagement metrics' },
    { id: 'email_bounce', label: 'Bounced Detection', description: 'Detect and handle bounced emails' },
  ],
  voice: [
    { id: 'voice_agent_call', label: 'Trigger Call', description: 'Trigger automated voice call' },
    { id: 'voice_agent_script', label: 'Call Script', description: 'Use predefined call script' },
  ],
} as const;
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
      const response = await proxyClient.post<MayaResponse>('/api/onboarding/gemini/chat', {
        message,
        history,
        currentQuestionKey,
        selectedPath,
        config,
        context,
      });
      return response.data;
    } catch (error) {
      console.error('[MayaAI] Error sending message:', error);
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
      const response = await proxyClient.post<MayaResponse>('/api/onboarding/gemini/chat', {
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
        ...response.data,
        options: featureOptions,
        nextAction: 'ask_feature_utilities',
        platform,
      };
    } catch (error) {
      console.error('[MayaAI] Error asking platform features:', error);
      return {
        text: `Which ${platform} features do you want? (You can select multiple)`,
        options: featureOptions,
        nextAction: 'ask_feature_utilities',
        platform,
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
    const utilityQuestions = [
      'When should this run? (Immediately, Schedule, Daily, Weekly, Custom)',
      'Add delay before next step? (No delay, Hours, Days)',
      'Add condition? (No condition, If connected, If opened, If replied, If clicked)',
      'Personalization variables needed? (first_name, company_name, title, email)',
    ];
    const prompt = `Ask utility questions for ${platform} feature: ${feature}. Questions: ${utilityQuestions.join('; ')}. Ask one question at a time.`;
    try {
      const response = await proxyClient.post<MayaResponse>('/api/onboarding/gemini/chat', {
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
      return {
        ...response.data,
        nextAction: 'ask_feature_utilities',
        platform,
        feature,
      };
    } catch (error) {
      console.error('[MayaAI] Error asking feature utilities:', error);
      return {
        text: `Let's configure ${feature}. When should this run?`,
        nextAction: 'ask_feature_utilities',
        platform,
        feature,
      };
    }
  }
  /**
   * Build a workflow node from platform, feature, and utilities
   */
  buildWorkflowNode(
    platform: string,
    feature: string,
    utilities: {
      schedule?: string;
      delay?: { type: string; value?: number };
      condition?: string;
      variables?: string[];
    }
  ): any {
    const nodeId = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    // Map feature IDs to step types
    const featureTypeMap: Record<string, string> = {
      linkedin_profile_visit: 'linkedin_visit',
      linkedin_follow: 'linkedin_follow',
      linkedin_connect: 'linkedin_connect',
      linkedin_message: 'linkedin_message',
      linkedin_scrape_profile: 'linkedin_scrape_profile',
      linkedin_company_search: 'linkedin_company_search',
      linkedin_autopost: 'linkedin_autopost',
      linkedin_comment_reply: 'linkedin_comment_reply',
      instagram_autopost: 'instagram_autopost',
      instagram_dm: 'instagram_dm',
      instagram_comment_reply: 'instagram_comment_reply',
      instagram_comment_monitor: 'instagram_comment_reply',
      whatsapp_broadcast: 'whatsapp_send',
      whatsapp_send: 'whatsapp_send',
      whatsapp_followup: 'whatsapp_send',
      whatsapp_template: 'whatsapp_send',
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
