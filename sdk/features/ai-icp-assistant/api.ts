/**
 * AI ICP Assistant API Service
 * 
 * Raw API calls for ICP onboarding.
 * No state logic, no UI logic - only HTTP communication.
 */
import type {
  ICPQuestion,
  ICPQuestionsResponse,
  ICPAnswerRequest,
  ICPAnswerResponse,
} from './types';
/**
 * Get the backend API URL from environment variables
 * PRODUCTION: Fails if no env var set
 * DEVELOPMENT: Falls back to localhost:3000
 */
function getBackendUrl(): string {
  const url = (
    process.env.NEXT_PUBLIC_ICP_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.REACT_APP_API_URL
  );
  // PRODUCTION: Fail fast if env var missing (but only at runtime, not during build)
  if (process.env.NODE_ENV === 'production' && !url && typeof window !== 'undefined') {
    throw new Error('NEXT_PUBLIC_ICP_BACKEND_URL or NEXT_PUBLIC_API_URL is required in production');
  }
  // DEVELOPMENT: Use localhost fallback
  return url || 'https://lad-backend-develop-741719885039.us-central1.run.app';
}
/**
 * Get authorization headers from browser storage
 */
function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') {
    return {};
  }
  try {
    const token = localStorage.getItem('token') || localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch (e) {
    return {};
  }
}
/**
 * Fetch all ICP questions for a category
 */
export async function fetchICPQuestions(
  category: string = 'lead_generation'
): Promise<ICPQuestionsResponse> {
  const baseUrl = getBackendUrl();
  const url = `${baseUrl}/api/ai-icp-assistant/onboarding/icp-questions?category=${encodeURIComponent(category)}`;
  const response = await fetch(url, {
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
  return response.json();
}
/**
 * Fetch a specific question by step index
 */
export async function fetchICPQuestionByStep(
  stepIndex: number,
  category: string = 'lead_generation'
): Promise<ICPQuestion | null> {
  const baseUrl = getBackendUrl();
  const url = `${baseUrl}/api/ai-icp-assistant/onboarding/icp-questions/${stepIndex}?category=${encodeURIComponent(category)}`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
  });
  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`Failed to fetch question: ${response.statusText}`);
  }
  const data = await response.json();
  return data.question || null;
}
/**
 * Process user answer and get next step
 */
export async function processICPAnswer(
  request: ICPAnswerRequest
): Promise<ICPAnswerResponse> {
  const baseUrl = getBackendUrl();
  const url = `${baseUrl}/api/ai-icp-assistant/onboarding/icp-answer`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({
      sessionId: request.sessionId,
      currentStepIndex: request.currentStepIndex,
      currentIntentKey: request.currentIntentKey,
      userAnswer: request.userAnswer,
      category: request.category || 'lead_generation',
      collectedAnswers: request.collectedAnswers || {},
    }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to process answer: ${response.statusText}`);
  }
  return response.json();
}