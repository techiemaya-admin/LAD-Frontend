/**
 * ICP Onboarding Questions Types
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
  currentIntentKey?: string;
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
  updatedCollectedAnswers?: Record<string, any>;
  error?: string;
}

/**
 * Maya AI Assistant Types (Legacy)
 */

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

export interface WorkflowNode {
  id: string;
  type: string;
  title: string;
  platform: string;
  channel: string;
  settings: {
    runWhen: string;
    delay: { days?: number; hours?: number; type?: string; value?: number };
    condition: string | null;
    variables: string[];
  };
}
