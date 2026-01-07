/**
 * ICP Questions TypeScript Types
 * 
 * Type definitions for ICP onboarding questions system.
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
  collectedAnswers?: Record<string, any>;
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

// Legacy interface for backward compatibility
export interface LegacyICPQuestion {
  id: string;
  stepNumber: number;
  question: string;
  example?: string;
  type: 'text' | 'select' | 'multi-select' | 'boolean';
  options?: Array<{ label: string; value: string }>;
  validation?: (answer: any) => boolean;
  answerKey: string;
}

