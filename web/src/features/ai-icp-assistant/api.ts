/**
 * AI ICP Assistant API Service
 * 
 * Raw API calls only - no state logic, no UI logic.
 * All URLs from config - no hardcoded values.
 */
import { getApiUrl, API_CONFIG } from './config/api.config';
import { logger } from './utils/logger';
import { safeStorage } from '@/utils/storage';
import type {
  ICPQuestion,
  ICPQuestionsResponse,
  ICPAnswerRequest,
  ICPAnswerResponse,
} from './types';
/**
 * Get authentication headers
 */
function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }
  const token = safeStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}
/**
 * Fetch all ICP questions for a category
 */
export async function fetchICPQuestions(
  category: string = API_CONFIG.defaultCategory
): Promise<ICPQuestionsResponse> {
  const url = getApiUrl(API_CONFIG.endpoints.questions);
  const fullUrl = `${url}?category=${category}`;
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ICP questions: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error: any) {
    logger.error('[ICPQuestionsAPI] Error fetching questions:', error);
    const isConnectionError = 
      error?.message?.includes('Failed to fetch') || 
      error?.message?.includes('ERR_CONNECTION_REFUSED') ||
      error?.name === 'TypeError';
    if (isConnectionError) {
      return {
        success: false,
        questions: [],
        totalSteps: API_CONFIG.defaultTotalSteps,
        error: `Cannot connect to backend server. Please ensure the ICP backend is running.`,
      };
    }
    throw error;
  }
}
/**
 * Fetch a specific question by step index
 */
export async function fetchICPQuestionByStep(
  stepIndex: number,
  context?: string,
  category: string = API_CONFIG.defaultCategory
): Promise<{ success: boolean; question?: ICPQuestion; error?: string }> {
  const url = getApiUrl(API_CONFIG.endpoints.questionByStep(stepIndex));
  let fullUrl = `${url}?category=${category}`;
  if (context) {
    fullUrl += `&context=${encodeURIComponent(context)}`;
  }
  try {
    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      credentials: 'include',
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch question: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error: any) {
    logger.error('[ICPQuestionsAPI] Error fetching question:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch question',
    };
  }
}
/**
 * Process user answer and get next step
 */
export async function processICPAnswer(
  request: ICPAnswerRequest
): Promise<ICPAnswerResponse> {
  const url = getApiUrl(API_CONFIG.endpoints.answer);
  const requestBody = {
    sessionId: request.sessionId,
    currentStepIndex: request.currentStepIndex,
    userAnswer: request.userAnswer,
    category: request.category || API_CONFIG.defaultCategory,
    collectedAnswers: request.collectedAnswers || {},
    currentIntentKey: request.currentIntentKey,
  };
  logger.debug(`[ICPQuestionsAPI] Sending request to ${url}`, {
    currentStepIndex: requestBody.currentStepIndex,
    userAnswer: requestBody.userAnswer,
    hasCollectedAnswers: Object.keys(requestBody.collectedAnswers).length > 0
  });
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to process answer: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  } catch (error: any) {
    logger.error('[ICPQuestionsAPI] Error processing answer:', error);
    return {
      success: false,
      nextStepIndex: null,
      nextQuestion: null,
      error: error.message || 'Failed to process answer',
    };
  }
}
