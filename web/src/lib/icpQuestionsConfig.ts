/**
 * ICP Questions Configuration for Conversational Onboarding
 * 
 * NOTE: This file is DEPRECATED - questions now come from database via API.
 * See: icpQuestionsApi.ts for API functions.
 * 
 * This file is kept for backward compatibility and type definitions only.
 * All actual question text should be fetched from /api/onboarding/icp-questions
 */

// Re-export from SDK for backward compatibility
import type { 
  ICPQuestion as APIICPQuestionType,
  ICPQuestionsResponse as ICPQuestionsResponseType,
  ICPAnswerRequest as ICPAnswerRequestType,
  ICPAnswerResponse as ICPAnswerResponseType
} from '@/features/ai-icp-assistant';

export type { ICPQuestion as APIICPQuestion } from '@/features/ai-icp-assistant';
export type { ICPQuestionsResponse, ICPAnswerRequest, ICPAnswerResponse } from '@/features/ai-icp-assistant';

// Legacy interface (deprecated - use API types)
export interface ICPQuestion {
  id: string;
  stepNumber: number;
  question: string;
  example?: string;
  type: 'text' | 'select' | 'multi-select' | 'boolean';
  options?: Array<{ label: string; value: string }>;
  validation?: (answer: any) => boolean;
  answerKey: string;
}

/**
 * DEPRECATED: Hardcoded questions removed - all questions now come from database via API.
 * Use fetchICPQuestions() from SDK instead.
 * 
 * This file is kept for backward compatibility and utility functions only.
 * NO hardcoded question text remains.
 */
export const ICP_QUESTIONS: ICPQuestion[] = [];

/**
 * DEPRECATED: Use API to get total steps dynamically
 * This constant is kept for backward compatibility only.
 */
export const TOTAL_ICP_STEPS = 0; // Will be fetched from API

/**
 * Convert API question format to legacy format (for backward compatibility)
 */
export function convertAPIQuestionToLegacy(apiQuestion: APIICPQuestionType): ICPQuestion {
  if (!apiQuestion) {
    // Return a default question if apiQuestion is null/undefined
    return {
      id: 'unknown',
      stepNumber: 1,
      question: 'Please answer the question.',
      example: undefined,
      type: 'text',
      options: undefined,
      validation: () => true,
      answerKey: 'unknown',
    };
  }

  return {
    id: apiQuestion.id || 'unknown',
    stepNumber: apiQuestion.stepIndex || 1,
    question: apiQuestion.question || 'Please answer the question.',
    example: apiQuestion.helperText,
    type: apiQuestion.questionType || 'text',
    options: apiQuestion.options,
    validation: (answer: any) => {
      // Basic validation based on validationRules
      if (apiQuestion.validationRules?.required && (!answer || (typeof answer === 'string' && answer.length === 0) || (Array.isArray(answer) && answer.length === 0))) {
        return false;
      }
      if (apiQuestion.validationRules?.minLength && typeof answer === 'string' && answer.length < apiQuestion.validationRules.minLength) {
        return false;
      }
      if (apiQuestion.validationRules?.maxItems && Array.isArray(answer) && answer.length > apiQuestion.validationRules.maxItems) {
        return false;
      }
      return true;
    },
    answerKey: apiQuestion.intentKey || 'unknown',
  };
}

/**
 * Format question for chat display
 */
export function formatQuestionForChat(question: ICPQuestion, currentStep: number, totalSteps: number): string {
  // Remove any "Step X of Y" prefix if present (user doesn't want to see step numbers)
  let formatted = question.question;
  
  // Remove step prefix if it exists
  formatted = formatted.replace(/^Step\s+\d+\s+of\s+\d+\s*[—:–-]\s*/i, '');
  formatted = formatted.replace(/^Step\s+\d+\s+of\s+\d+\s+/i, '');
  
  if (question.example) {
    formatted += `\n(${question.example})`;
  }
  
  return formatted;
}

/**
 * Parse user answer based on question type
 */
export function parseAnswer(question: ICPQuestion, userInput: string): any {
  // Ensure userInput is a string
  if (!userInput || typeof userInput !== 'string') {
    return userInput || '';
  }
  
  const inputStr = String(userInput).trim();
  
  if (question.type === 'boolean') {
    const lower = inputStr.toLowerCase();
    if (lower === 'yes' || lower === 'y' || lower === 'true' || lower === '1') {
      return true;
    }
    if (lower === 'no' || lower === 'n' || lower === 'false' || lower === '0') {
      return false;
    }
    return undefined;
  }
  
  if (question.type === 'select' && question.options) {
    // Try to match by label or value
    const lower = inputStr.toLowerCase();
    const match = question.options.find(
      opt => {
        const label = opt?.label || '';
        const value = opt?.value || '';
        return label.toLowerCase() === lower || value.toLowerCase() === lower;
      }
    );
    return match ? (match.value || match.label || inputStr) : inputStr;
  }
  
  // Parse comma-separated values for ideal_customer intent (best customers question)
  if (question.answerKey === 'ideal_customer' || question.id === 'best_customers') {
    // Parse comma-separated values
    return inputStr.split(',').map(v => v.trim()).filter(v => v.length > 0);
  }
  
  return inputStr;
}

/**
 * Validate answer
 */
export function validateAnswer(question: ICPQuestion, answer: any): boolean {
  if (!question.validation) return true;
  return question.validation(answer);
}


