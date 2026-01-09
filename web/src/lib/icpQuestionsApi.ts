/**
 * ICP Questions API Service
 * 
 * Fetches ICP questions from backend API (database-driven).
 * NO hardcoded ICP text in frontend.
 */

export interface ICPQuestion {
  id: string;
  stepIndex: number;
  title?: string;
  question: string;
  helperText?: string;
  category: string;
  intentKey: string;
  questionType: 'text' | 'select' | 'multi-select' | 'boolean';
  options?: Array<{ label: string; value: string }>;
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    required?: boolean;
    maxItems?: number;
  };
  isActive: boolean;
  displayOrder?: number;
}

export interface ICPQuestionsResponse {
  success: boolean;
  questions: ICPQuestion[];
  totalSteps: number;
}

export interface ICPAnswerRequest {
  sessionId?: string;
  currentStepIndex: number;
  userAnswer: string;
  category?: string;
}

export interface ICPAnswerResponse {
  success: boolean;
  nextStepIndex: number | null;
  nextQuestion: ICPQuestion | null;
  clarificationNeeded?: boolean;
  completed?: boolean;
  message?: string;
  confidence?: 'high' | 'medium' | 'low';
  extractedData?: Record<string, any>;
  error?: string;
}

/**
 * Fetch all ICP questions for a category
 */
export async function fetchICPQuestions(
  category: string = 'lead_generation',
  apiClient?: any
): Promise<ICPQuestionsResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const url = `${baseUrl}/api/ai-icp-assistant/onboarding/icp-questions?category=${category}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ICP questions: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('[ICPQuestionsAPI] Error fetching questions:', error);
    throw error;
  }
}

/**
 * Fetch a specific question by step index
 */
export async function fetchICPQuestionByStep(
  stepIndex: number,
  category: string = 'lead_generation',
  apiClient?: any
): Promise<ICPQuestion | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const url = `${baseUrl}/api/ai-icp-assistant/onboarding/icp-questions/${stepIndex}?category=${category}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
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
  } catch (error: any) {
    console.error('[ICPQuestionsAPI] Error fetching question:', error);
    throw error;
  }
}

/**
 * Process user answer and get next step
 */
export async function processICPAnswer(
  request: ICPAnswerRequest,
  apiClient?: any
): Promise<ICPAnswerResponse> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  const url = `${baseUrl}/api/ai-icp-assistant/onboarding/icp-answer`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        sessionId: request.sessionId,
        currentStepIndex: request.currentStepIndex,
        userAnswer: request.userAnswer,
        category: request.category || 'lead_generation',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Failed to process answer: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    console.error('[ICPQuestionsAPI] Error processing answer:', error);
    return {
      success: false,
      nextStepIndex: null,
      nextQuestion: null,
      error: error.message || 'Failed to process answer',
    };
  }
}


