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
  LeadsTemplateColumn,
  LeadsUploadResponse,
  LeadsAIAnalysisResponse,
  PlatformQuestionsResponse,
  LeadsValidation,
  ParsedLead,
  PlatformDetection,
} from './types';

// Re-export types that are used by hooks
export type { ICPQuestion, ICPQuestionsResponse, ICPAnswerRequest, ICPAnswerResponse };

// Simple logger for SDK - avoids Next.js dependency
const logger = {
  debug: (...args: any[]) => console.debug('[ICP-SDK]', ...args),
  info: (...args: any[]) => console.info('[ICP-SDK]', ...args),
  warn: (...args: any[]) => console.warn('[ICP-SDK]', ...args),
  error: (...args: any[]) => console.error('[ICP-SDK]', ...args),
};
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
 * Buffer request/response data in localStorage
 */
interface BufferedMessage {
  role: 'user' | 'assistant';
  content: string;
  messageData?: any;
  timestamp: string;
  stepIndex: number;
}

export type { BufferedMessage };

function getBufferedMessages(sessionId: string): BufferedMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const key = `icp_buffered_messages_${sessionId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    logger.error('[ICP Buffer] Error reading buffered messages', e);
    return [];
  }
}

function addBufferedMessage(sessionId: string, message: BufferedMessage): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `icp_buffered_messages_${sessionId}`;
    const messages = getBufferedMessages(sessionId);
    messages.push(message);
    localStorage.setItem(key, JSON.stringify(messages));
    logger.debug('[ICP Buffer] Stored message', { sessionId, role: message.role, stepIndex: message.stepIndex, totalBuffered: messages.length });
  } catch (e) {
    logger.error('[ICP Buffer] Error storing message', e);
  }
}

function clearBufferedMessages(sessionId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const key = `icp_buffered_messages_${sessionId}`;
    localStorage.removeItem(key);
    logger.debug('[ICP Buffer] Cleared buffered messages for session', { sessionId });
  } catch (e) {
    logger.error('[ICP Buffer] Error clearing buffered messages', e);
  }
}

/**
 * Get buffered messages for display after page refresh
 * Exported for UI components to restore conversation state
 */
export function getBufferedConversation(sessionId: string): BufferedMessage[] {
  return getBufferedMessages(sessionId);
}

/**
 * Get current step index from buffered messages
 */
export function getCurrentStepFromBuffer(sessionId: string): number {
  const messages = getBufferedMessages(sessionId);
  if (messages.length === 0) return 0;
  
  // Get the last message's step index
  const lastMessage = messages[messages.length - 1];
  return lastMessage.stepIndex;
}

/**
 * Check if there are buffered messages for a session
 */
export function hasBufferedMessages(sessionId: string): boolean {
  return getBufferedMessages(sessionId).length > 0;
}

async function saveBufferedMessagesToBackend(sessionId: string, messages: BufferedMessage[]): Promise<void> {
  if (messages.length === 0) return;
  
  const baseUrl = getBackendUrl();
  const url = `${baseUrl}/api/ai-icp-assistant/messages/batch-save`;
  
  try {
    logger.debug('[ICP Buffer] Saving buffered messages to backend', { sessionId, count: messages.length });
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      credentials: 'include',
      body: JSON.stringify({
        sessionId,
        messages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to save buffered messages: ${response.statusText}`);
    }

    logger.debug('[ICP Buffer] Successfully saved all buffered messages to backend');
  } catch (error) {
    logger.error('[ICP Buffer] Failed to save buffered messages to backend', error);
    throw error;
  }
}

/**
 * Save chat messages in batch to backend
 * Public API for saving conversation history
 */
export async function saveChatMessagesBatch(
  sessionId: string,
  messages: BufferedMessage[],
  conversationId?: string
): Promise<{
  success: boolean;
  conversationId: string;
  savedCount: number;
  messages: any[];
}> {
  const baseUrl = getBackendUrl();
  const url = `${baseUrl}/api/ai-icp-assistant/messages/batch-save`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({
      sessionId,
      messages,
      conversationId,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to save messages: ${response.statusText}`);
  }

  return response.json();
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

  // Buffer user message in localStorage
  const sessionId = request.sessionId || 'default_session';
  addBufferedMessage(sessionId, {
    role: 'user',
    content: request.userAnswer,
    messageData: {
      currentIntentKey: request.currentIntentKey,
      category: request.category,
      collectedAnswers: request.collectedAnswers,
    },
    timestamp: new Date().toISOString(),
    stepIndex: request.currentStepIndex,
  });

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

  const responseData: ICPAnswerResponse = await response.json();

  // Buffer assistant response in localStorage
  if (responseData.nextQuestion) {
    addBufferedMessage(sessionId, {
      role: 'assistant',
      content: responseData.nextQuestion.question,
      messageData: {
        intentKey: responseData.nextQuestion.intentKey,
        options: responseData.nextQuestion.options,
        clarificationNeeded: responseData.clarificationNeeded,
        completed: responseData.completed,
      },
      timestamp: new Date().toISOString(),
      stepIndex: responseData.nextStepIndex || request.currentStepIndex + 1,
    });
  }

  // Check if this is the last step
  const isLastStep = responseData.completed === true || 
                     responseData.nextStepIndex === null ||
                     responseData.nextStepIndex === -1;

  // If last step, save all buffered messages to backend and clear localStorage
  if (isLastStep) {
    const bufferedMessages = getBufferedMessages(sessionId);
    logger.debug('[ICP] Last step reached, saving buffered messages', {
      sessionId,
      messageCount: bufferedMessages.length,
      completed: responseData.completed,
    });

    try {
      await saveBufferedMessagesToBackend(sessionId, bufferedMessages);
      clearBufferedMessages(sessionId);
    } catch (error) {
      logger.error('[ICP] Failed to save buffered messages, keeping in localStorage', error);
      // Keep messages in localStorage for manual retry/debugging
    }
  }

  return responseData;
}
// ============================================================================
// Leads Upload API
// ============================================================================
/**
 * Download leads template CSV
 * Returns the template file as a blob
 */
export async function downloadLeadsTemplate(): Promise<Blob> {
  const baseUrl = getBackendUrl();
  const url = `${baseUrl}/api/ai-icp-assistant/leads/template`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      ...getAuthHeaders(),
    },
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to download template: ${response.statusText}`);
  }
  return response.blob();
}
/**
 * Get template column definitions
 */
export async function getLeadsTemplateColumns(): Promise<{
  success: boolean;
  columns: LeadsTemplateColumn[];
  platformFields: Record<string, string[]>;
}> {
  const baseUrl = getBackendUrl();
  const url = `${baseUrl}/api/ai-icp-assistant/leads/template/columns`;
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Failed to get template columns: ${response.statusText}`);
  }
  return response.json();
}
/**
 * Upload leads CSV file
 */
export async function uploadLeadsFile(file: File): Promise<LeadsUploadResponse> {
  const baseUrl = getBackendUrl();
  const url = `${baseUrl}/api/ai-icp-assistant/leads/upload`;
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: formData,
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to upload file: ${response.statusText}`);
  }
  return response.json();
}
/**
 * Upload leads as CSV content string
 */
export async function uploadLeadsContent(csvContent: string): Promise<LeadsUploadResponse> {
  const baseUrl = getBackendUrl();
  const url = `${baseUrl}/api/ai-icp-assistant/leads/upload`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({ csvContent }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to upload content: ${response.statusText}`);
  }
  return response.json();
}
/**
 * Deep AI analysis of uploaded leads
 */
export async function analyzeLeads(leads: ParsedLead[]): Promise<LeadsAIAnalysisResponse> {
  const baseUrl = getBackendUrl();
  const url = `${baseUrl}/api/ai-icp-assistant/leads/analyze`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({ leads }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to analyze leads: ${response.statusText}`);
  }
  return response.json();
}
/**
 * Get platform-specific questions based on lead data
 */
export async function getPlatformQuestions(
  leads?: ParsedLead[],
  platforms?: PlatformDetection
): Promise<PlatformQuestionsResponse> {
  const baseUrl = getBackendUrl();
  const url = `${baseUrl}/api/ai-icp-assistant/leads/platform-questions`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({ leads, platforms }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to get platform questions: ${response.statusText}`);
  }
  return response.json();
}
/**
 * Validate leads for campaign execution
 */
export async function validateLeadsForExecution(
  leads: ParsedLead[],
  selectedPlatforms: string[]
): Promise<{ success: boolean; data: LeadsValidation }> {
  const baseUrl = getBackendUrl();
  const url = `${baseUrl}/api/ai-icp-assistant/leads/validate`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify({ leads, selectedPlatforms }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Failed to validate leads: ${response.statusText}`);
  }
  return response.json();
}
