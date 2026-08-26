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
 * LinkedIn Limits Types
 */
export interface LinkedInLimitsResponse {
  success: boolean;
  totalDailyLimit: number;
  remainingDailyLimit: number;
}

export interface LinkedInLimits {
  remaining: number;
  total: number;
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

// ─── R8 - Tenant ICP Definitions ─────────────────────────────────────────────
// Canonical schema for the active per-tenant ICP. See FIT_ENRICHMENT_DESIGN.md
// §2.5 and SEARCH_DISPATCHER_DESIGN.md §3.

/** Structured ICP captured by the wizard / chat, normalised across sources. */
export interface IcpStructured {
  version: '1.0';
  company: {
    size_employees?: { min?: number; max?: number };
    size_revenue_usd?: { min?: number; max?: number };
    industries?: string[];
    industries_exclude?: string[];
    countries?: string[];
    countries_exclude?: string[];
    funding_stages?: string[];
    tech_stack_includes?: string[];
    tech_stack_excludes?: string[];
    growth_signals?: Array<'recently_funded' | 'hiring' | 'leadership_changed'>;
  };
  person: {
    seniorities?: string[];
    job_titles_includes?: string[];
    job_titles_excludes?: string[];
    departments?: string[];
    years_in_role_min?: number;
    years_in_role_max?: number;
  };
  outreach_preferences?: {
    preferred_channels?: Array<'linkedin' | 'email' | 'voice' | 'whatsapp' | 'instagram'>;
    blocked_channels?: string[];
    language_preferences?: string[];
  };
  fit_weights?: {
    industry_match?: number;
    size_match?: number;
    seniority_match?: number;
    title_match?: number;
    geo_match?: number;
    tech_stack_match?: number;
  };
  /** Optional - routes the search dispatcher across Apollo / Sales Nav / ABM. */
  search_strategy?: SearchStrategy;
  metadata?: {
    captured_at?: string;
    chat_session_id?: string;
    tenant_input_summary?: string;
  };
}

export type DiscoveryBackend = 'apollo' | 'sales_navigator' | 'abm';

export interface SearchStrategy {
  discovery_order: DiscoveryBackend[];
  apollo?: {
    enabled: boolean;
    max_results_per_run?: number;
    use_for?: string[];
    credit_cap_per_run?: number;
  };
  sales_navigator?: {
    enabled: boolean;
    max_results_per_run?: number;
    use_for?: string[];
    unipile_account_id?: string | null;
  };
  abm?: {
    enabled: boolean;
    target_accounts?: Array<{
      company_name: string;
      domain?: string;
      apollo_company_id?: string;
    }>;
    research_depth?: 'standard' | 'deep';
  };
  fallback_rules?: {
    if_apollo_returns_zero?: 'try_sales_navigator' | 'stop';
    if_company_has_named_target?: 'use_abm_only' | 'mix_with_apollo';
    if_total_cap_reached?: 'stop';
  };
  deduplication?: {
    /**
     * Order in which candidate identity fields are tried to derive a canonical
     * dedup key. apollo_id + linkedin_member_urn are last-resort fallbacks for
     * candidates whose cross-backend identity (linkedin_url / email / phone)
     * isn't yet revealed - see D7 live-smoke fix.
     */
    key_priority?: Array<
      'linkedin_url' | 'email' | 'phone_e164' | 'apollo_id' | 'linkedin_member_urn'
    >;
    cross_backend_merge?: 'highest_confidence' | 'first_match' | 'merge_fields';
  };
  total_cap_per_run?: number;
  total_cap_per_day?: number;
}

/** A row from the tenant_icp_definitions table. */
export interface IcpDefinition {
  id: string;
  tenant_id: string;
  variant_name: string;
  is_active: boolean;

  icp_definition: IcpStructured;
  apollo_search_payload?: Record<string, any> | null;
  apollo_payload_hash?: string | null;

  captured_via: 'chat' | 'manual_form' | 'signup_wizard' | 'api_import';
  chat_session_id?: string | null;
  source_profile_id?: string | null;

  min_fit_score: number;
  daily_search_cap: number;

  created_by_user_id?: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
  deleted_at?: string | null;
}

/** A row from tenant_icp_searches - audit log of Apollo / Sales Nav runs. */
export interface IcpSearch {
  id: string;
  tenant_id: string;
  icp_definition_id: string;

  apollo_search_payload: Record<string, any>;
  apollo_payload_hash: string;

  started_at: string;
  completed_at?: string | null;
  total_matches?: number | null;
  new_prospects?: number | null;
  duplicates?: number | null;
  pages_fetched?: number | null;
  apollo_credits_used?: number | null;

  status: 'running' | 'completed' | 'cost_capped' | 'failed' | 'cancelled';
  failure_reason?: string | null;
  triggered_by: 'cron' | 'manual' | 'icp_changed' | 'api';
  triggered_by_user_id?: string | null;
}

/** Body of POST /api/ai-icp-assistant/definitions */
export interface CreateIcpDefinitionInput {
  variant?: string;
  icp_definition: IcpStructured;
  apollo_search_payload?: Record<string, any>;
  captured_via?: IcpDefinition['captured_via'];
  chat_session_id?: string;
  source_profile_id?: string;
  min_fit_score?: number;
  daily_search_cap?: number;
}

/** Body of PUT /api/ai-icp-assistant/definitions/:id */
export interface UpdateIcpDefinitionInput {
  icp_definition: IcpStructured;
  apollo_search_payload?: Record<string, any>;
}

/** Body of PATCH /api/ai-icp-assistant/definitions/:id/tuning */
export interface UpdateIcpTuningInput {
  min_fit_score?: number;
  daily_search_cap?: number;
}

// ── D6: SearchDispatcher HTTP ────────────────────────────────────────────────

/**
 * One normalised prospect record returned by an adapter (Apollo, Sales Nav, ABM).
 * Mirrors `ProspectCandidate` typedef in
 * LAD_backend/features/ai-icp-assistant/services/searchAdapters/_interface.js.
 */
export interface ProspectCandidate {
  // Identity
  linkedin_url?: string;
  linkedin_member_urn?: string;
  email?: string;
  phone_e164?: string;
  apollo_id?: string;

  // Person
  full_name?: string;
  headline?: string;
  job_title?: string;
  seniority?: string;
  department?: string;

  // Company
  company_name?: string;
  apollo_company_id?: string;
  company_industry?: string;
  company_size_employees?: number;
  company_country?: string;
  company_tech_stack?: string[];

  // Provenance
  source: DiscoveryBackend;
  source_record_id?: string;
  source_confidence: number;

  /** When the dispatcher merged the same person across backends, the union of source names. */
  _merged_sources?: DiscoveryBackend[];
}

/** Per-backend rollup attached to a SearchRunResult. */
export interface BackendRunRollup {
  candidates?: number;
  total_matches?: number | null;
  duration_ms?: number | null;
  cost_usd?: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

/** Body of POST /api/ai-icp-assistant/search */
export interface RunSearchInput {
  icpId?: string;
  maxResults?: number;
  overrideStrategy?: Partial<SearchStrategy>;
  triggeredBy?: 'manual' | 'cron' | 'api' | 'icp_changed';
}

/**
 * Response shape from POST /api/ai-icp-assistant/search (sync mode).
 * For `?async=1`, only `searchId` and `statusUrl` are populated.
 */
export interface SearchRunResult {
  success: boolean;
  searchId: string | null;
  candidates: ProspectCandidate[];
  backendResults: Record<string, BackendRunRollup>;
  totalCostUsd: number;
  emitErrors?: number;
  count?: number;
  /** Only on `?async=1`. */
  status?: 'accepted';
  statusUrl?: string;
  /** Soft errors: `'no_active_icp'` when the tenant has no ICP defined. */
  error?: string;
}
