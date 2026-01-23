/**
 * AI ICP Assistant Types
 * 
 * Shared TypeScript types for the AI ICP Assistant feature.
 * NO business logic - types only.
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
  options?: Array<{ label: string; value: string }> | string[]; // Support both formats
  validationRules?: {
    minLength?: number;
    maxLength?: number;
    required?: boolean;
    maxItems?: number;
  };
  isActive: boolean;
  displayOrder?: number;
  messageId?: string;
  generatedAt?: string;
  preSelectedOptions?: string[]; // Pre-selected options for platform actions
  platformIndex?: number; // For platform actions
  totalPlatforms?: number; // For platform actions
}
export interface ICPQuestionsResponse {
  success: boolean;
  questions: ICPQuestion[];
  totalSteps: number;
  error?: string;
}
export interface ICPAnswerRequest {
  sessionId?: string;
  currentStepIndex: number;
  userAnswer: string;
  category?: string;
  collectedAnswers?: Record<string, any>;
  currentIntentKey?: string;
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
  updatedCollectedAnswers?: Record<string, any>;
  correctedAnswer?: string | null;
  error?: string;
  totalSteps?: number;
  options?: { label: string; value: string; disabled?: boolean }[];
}