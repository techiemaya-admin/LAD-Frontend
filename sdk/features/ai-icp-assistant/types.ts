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
  conversationId?: string; // Added: Conversation ID when messages are saved on last step
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
/**
 * Leads Upload Types
 */
export interface LeadsTemplateColumn {
  key: string;
  label: string;
  required: boolean;
  example: string;
  platform?: string;
}
export interface ParsedLead {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  industry?: string;
  linkedin_url?: string;
  location?: string;
  company_size?: string;
  website?: string;
  notes?: string;
  whatsapp?: string;
  twitter_url?: string;
  [key: string]: string | undefined;
}
export interface PlatformCoverage {
  count: number;
  percentage: number;
  available: boolean;
}
export interface PlatformDetection {
  available: string[];
  unavailable: string[];
  coverage: Record<string, PlatformCoverage>;
  totalLeads?: number;
}
export interface LeadsAnalysisItem {
  name: string;
  count: number;
  percentage: number;
}
export interface LeadsAnalysis {
  success: boolean;
  totalLeads: number;
  industries: LeadsAnalysisItem[];
  jobTitles: LeadsAnalysisItem[];
  locations: LeadsAnalysisItem[];
  companySizes: LeadsAnalysisItem[];
  uniqueCompanies: number;
  topCompanies: string[];
}
export interface LeadsUploadResponse {
  success: boolean;
  message: string;
  data: {
    leads: ParsedLead[];
    totalRows: number;
    validLeads: number;
    errors: string[];
    headers: string[];
    platforms: PlatformDetection;
    analysis: LeadsAnalysis;
    summary: string;
  };
  error?: string;
}
export interface PlatformQuestionOption {
  value: string;
  label: string;
}
export interface PlatformQuestion {
  id: string;
  platform: string;
  question: string;
  options?: PlatformQuestionOption[];
  type?: 'boolean' | 'number' | 'sequence';
  min?: number;
  max?: number;
  default?: number;
  coverage?: number;
  availablePlatforms?: PlatformQuestionOption[];
}
export interface PlatformQuestionsResponse {
  success: boolean;
  data: {
    questions: PlatformQuestion[];
    availablePlatforms: string[];
    unavailablePlatforms: string[];
    coverage: Record<string, PlatformCoverage>;
  };
}
export interface RecommendedAction {
  platform: string;
  action: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
}
export interface LeadsAIAnalysisResponse {
  success: boolean;
  data: {
    basicAnalysis: LeadsAnalysis;
    platforms: PlatformDetection;
    aiSummary: string;
    recommendedActions: RecommendedAction[];
    suggestedPlatforms: string[];
    excludedPlatforms: string[];
  };
}
export interface LeadsValidation {
  valid: ParsedLead[];
  invalid: Array<{ index: number; lead: ParsedLead; issues: string[] }>;
  totalLeads: number;
  validCount: number;
  invalidCount: number;
  canExecute: boolean;
}
/**
 * Leads-based Context Extension
 */
export interface LeadsFlowContext {
  hasLeadsData: boolean | null;
  leadsData: ParsedLead[] | null;
  leadsAnalysis: LeadsAnalysis | null;
  availablePlatforms: string[];
  unavailablePlatforms: string[];
  platformCoverage: Record<string, PlatformCoverage>;
  selectedPlatforms: string[];
  platformActions: Record<string, string>;
  sequenceOrder: string[];
  delayBetween: number;
}
