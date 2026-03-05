/**
 * Inbound Campaign Service
 * 
 * Handles inbound lead data submission and Gemini analysis
 */
import { apiPost } from '@/lib/api';
import { InboundLeadData, InboundAnalysisResult } from '@/store/onboardingStore';
import { logger } from '@/lib/logger';
export interface InboundAnalysisRequest {
  inboundData: InboundLeadData;
  category?: string;
}
export interface InboundAnalysisResponse {
  success: boolean;
  analysis: InboundAnalysisResult;
  error?: string;
}
export interface InboundQuestionRequest {
  inboundData: InboundLeadData;
  analysis: InboundAnalysisResult;
  collectedAnswers: Record<string, any>;
  currentStepIndex: number;
}
export interface InboundQuestionResponse {
  success: boolean;
  nextQuestion?: {
    stepIndex: number;
    intentKey: string;
    questionText: string;
    questionType: 'text' | 'select' | 'boolean' | 'multi-select';
    options?: { label: string; value: string }[];
    platform?: string;
    helperText?: string;
    validation?: {
      required: boolean;
      minLength?: number;
      maxLength?: number;
    };
  };
  completed?: boolean;
  message?: string;
  error?: string;
}
/**
 * Analyze inbound lead data using Gemini AI
 */
export async function analyzeInboundData(
  inboundData: InboundLeadData
): Promise<InboundAnalysisResponse> {
  try {
    logger.debug('Analyzing inbound data', { inboundData });
    // Use local analysis for now (AI endpoint not yet implemented)
    logger.debug('Using local analysis (AI endpoint not available)');
    const localAnalysis = generateLocalAnalysis(inboundData);
    return {
      success: true,
      analysis: localAnalysis,
    };
    // TODO: Enable when AI ICP Assistant backend is ready
    // const response = await apiPost<InboundAnalysisResponse>(
    //   '/api/ai-icp-assistant/inbound/analyze',
    //   { inboundData }
    // );
    // return response;
  } catch (error: any) {
    logger.error('Error analyzing inbound data', error);
    // Fallback: Generate local analysis if API fails
    const localAnalysis = generateLocalAnalysis(inboundData);
    return {
      success: true,
      analysis: localAnalysis,
    };
  }
}
/**
 * Get next question for inbound flow based on available platforms
 */
export async function getNextInboundQuestion(
  request: InboundQuestionRequest
): Promise<InboundQuestionResponse> {
  try {
    logger.debug('Getting next inbound question', { request });
    const response = await apiPost<InboundQuestionResponse>(
      '/api/ai-icp-assistant/inbound/next-question',
      request
    );
    logger.debug('Next inbound question response', { response });
    return response;
  } catch (error: any) {
    logger.error('Error getting next inbound question', error);
    // Fallback: Generate local question if API fails
    const localQuestion = generateLocalNextQuestion(request);
    return localQuestion;
  }
}
/**
 * Generate local analysis as fallback
 */
function generateLocalAnalysis(inboundData: InboundLeadData): InboundAnalysisResult {
  const availablePlatforms: string[] = [];
  const missingPlatforms: string[] = [];
  const platformDetails: InboundAnalysisResult['platformDetails'] = [];
  const suggestedQuestions: InboundAnalysisResult['suggestedQuestions'] = [];
  // Check LinkedIn
  const linkedinData = inboundData.linkedinProfiles.filter(p => p.trim());
  if (linkedinData.length > 0) {
    availablePlatforms.push('linkedin');
    platformDetails.push({
      platform: 'linkedin',
      hasData: true,
      dataCount: linkedinData.length,
      sampleData: linkedinData.slice(0, 2),
    });
    suggestedQuestions.push({
      platform: 'linkedin',
      question: 'What actions would you like to perform on LinkedIn? (e.g., Send connection request, View profile, Send message)',
      intentKey: 'linkedin_actions',
    });
  } else {
    missingPlatforms.push('linkedin');
    platformDetails.push({
      platform: 'linkedin',
      hasData: false,
      dataCount: 0,
    });
  }
  // Check Email
  const emailData = inboundData.emailIds.filter(e => e.trim());
  if (emailData.length > 0) {
    availablePlatforms.push('email');
    platformDetails.push({
      platform: 'email',
      hasData: true,
      dataCount: emailData.length,
      sampleData: emailData.slice(0, 2),
    });
    suggestedQuestions.push({
      platform: 'email',
      question: 'What type of email would you like to send? (e.g., Introduction, Follow-up, Newsletter)',
      intentKey: 'email_type',
    });
  } else {
    missingPlatforms.push('email');
    platformDetails.push({
      platform: 'email',
      hasData: false,
      dataCount: 0,
    });
  }
  // Check WhatsApp
  const whatsappData = inboundData.whatsappNumbers.filter(w => w.trim());
  if (whatsappData.length > 0) {
    availablePlatforms.push('whatsapp');
    platformDetails.push({
      platform: 'whatsapp',
      hasData: true,
      dataCount: whatsappData.length,
      sampleData: whatsappData.slice(0, 2),
    });
    suggestedQuestions.push({
      platform: 'whatsapp',
      question: 'What type of WhatsApp message would you like to send?',
      intentKey: 'whatsapp_message_type',
    });
  } else {
    missingPlatforms.push('whatsapp');
    platformDetails.push({
      platform: 'whatsapp',
      hasData: false,
      dataCount: 0,
    });
  }
  // Check Phone
  const phoneData = inboundData.phoneNumbers.filter(p => p.trim());
  if (phoneData.length > 0) {
    availablePlatforms.push('voice');
    platformDetails.push({
      platform: 'voice',
      hasData: true,
      dataCount: phoneData.length,
      sampleData: phoneData.slice(0, 2),
    });
    suggestedQuestions.push({
      platform: 'voice',
      question: 'Would you like to set up voice agent calls for this lead?',
      intentKey: 'voice_enabled',
    });
  } else {
    missingPlatforms.push('voice');
    platformDetails.push({
      platform: 'voice',
      hasData: false,
      dataCount: 0,
    });
  }
  // Generate validation summary
  const validationSummary = `Found ${availablePlatforms.length} available platforms: ${availablePlatforms.join(', ')}. ` +
    `Missing data for: ${missingPlatforms.length > 0 ? missingPlatforms.join(', ') : 'none'}.`;
  return {
    availablePlatforms,
    missingPlatforms,
    platformDetails,
    suggestedQuestions,
    validationSummary,
  };
}
/**
 * Generate next question locally as fallback
 */
function generateLocalNextQuestion(request: InboundQuestionRequest): InboundQuestionResponse {
  const { analysis, collectedAnswers, currentStepIndex } = request;
  // Get unanswered questions
  const unansweredQuestions = analysis.suggestedQuestions.filter(
    q => !collectedAnswers[q.intentKey]
  );
  if (unansweredQuestions.length === 0) {
    return {
      success: true,
      completed: true,
      message: 'All platform-specific questions have been answered!',
    };
  }
  const nextQ = unansweredQuestions[0];
  // Generate question based on platform
  const questionMap: Record<string, Partial<InboundQuestionResponse['nextQuestion']>> = {
    linkedin_actions: {
      questionType: 'multi-select',
      options: [
        { label: 'Send connection request', value: 'connect' },
        { label: 'View profile', value: 'view' },
        { label: 'Send message (after connection)', value: 'message' },
        { label: 'Like/Comment on posts', value: 'engage' },
      ],
      helperText: 'Select all LinkedIn actions you want to include in your workflow',
    },
    email_type: {
      questionType: 'select',
      options: [
        { label: 'Introduction email', value: 'intro' },
        { label: 'Follow-up email', value: 'followup' },
        { label: 'Promotional email', value: 'promo' },
        { label: 'Custom email', value: 'custom' },
      ],
      helperText: 'Choose the type of email to send',
    },
    whatsapp_message_type: {
      questionType: 'select',
      options: [
        { label: 'Text message', value: 'text' },
        { label: 'Template message', value: 'template' },
        { label: 'Media message (image/video)', value: 'media' },
      ],
      helperText: 'Select the WhatsApp message type',
    },
    voice_enabled: {
      questionType: 'boolean',
      helperText: 'Enable voice agent calls for this campaign?',
    },
  };
  const questionConfig = questionMap[nextQ.intentKey] || {
    questionType: 'text' as const,
    helperText: '',
  };
  return {
    success: true,
    nextQuestion: {
      stepIndex: currentStepIndex + 1,
      intentKey: nextQ.intentKey,
      questionText: nextQ.question,
      questionType: questionConfig.questionType as any,
      options: questionConfig.options,
      platform: nextQ.platform,
      helperText: questionConfig.helperText,
      validation: {
        required: true,
      },
    },
  };
}
/**
 * Check if inbound data has specific platform data
 */
export function hasPlatformData(inboundData: InboundLeadData, platform: string): boolean {
  switch (platform) {
    case 'linkedin':
      return inboundData.linkedinProfiles.some(p => p.trim());
    case 'email':
      return inboundData.emailIds.some(e => e.trim());
    case 'whatsapp':
      return inboundData.whatsappNumbers.some(w => w.trim());
    case 'voice':
    case 'phone':
      return inboundData.phoneNumbers.some(p => p.trim());
    case 'website':
      return !!inboundData.websiteUrl?.trim();
    default:
      return false;
  }
}