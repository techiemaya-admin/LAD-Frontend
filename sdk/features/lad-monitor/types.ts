// lad-monitor (admin observability) SDK — types
// Mirrors the backend /api/admin/monitor/* response shapes.

export interface DateRangeParams {
  startDate?: string;
  endDate?: string;
}

export interface NameValue {
  name: string;
  value: number;
}

export interface ServiceMetrics {
  callSuccessRate: string;
  campaignQueue: string;
  avgCallDuration: string;
  leadEnrichment: string;
}

export interface DashboardStats {
  totalTenants: number;
  totalUsers: number;
  callsToday: number;
  totalCalls: number;
  campaignsToday: number;
  totalCampaigns: number;
  activeCampaigns: number;
  voiceAgents: number;
  pipelineLeads: number;
  totalLeads: number;
  conversations: number;
  totalConversations: number;
  tenantsByPlan: NameValue[];
  voiceCallStatus: NameValue[];
  campaignDistribution: NameValue[];
  serviceMetrics: ServiceMetrics;
  generatedAt: string;
  range: DateRangeParams | null;
}

export interface TenantUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: 'active' | 'inactive';
}

export interface TenantBilling {
  creditsBalance: number;
  totalSpent: number;
  monthlyUsage: number;
  currency: string;
}

export interface TenantIntegration {
  name: string;
  connected: boolean;
  account?: string | null;
  count?: number;
}

export interface ConversationMetrics {
  totalConversations: number;
  totalMessages: number;
  totalContacts: number;
  messagesLast7d: number;
}

export interface TenantSetup {
  hasIntegration: boolean;
  hasCampaign: boolean;
  hasLeads: boolean;
  hasVoiceAgent: boolean;
  percent: number;
}

export interface TenantHealth {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  email?: string;
  phone?: string;
  website?: string;
  campaigns: number;
  activeCampaigns: number;
  calls: number;
  pipelineLeads: number;
  voiceAgentsCount: number;
  users: TenantUser[];
  activeUsers: number;
  lastLoginAt: string | null;
  errorRate: number;
  setup: TenantSetup;
  billing: TenantBilling;
  integrations: TenantIntegration[];
  conversations: ConversationMetrics | null;
}

export interface TenantCampaign {
  id: string;
  name: string;
  status: string;
  executionState?: string;
  createdAt: string;
  leads: number;
  sent: number;
  connected: number;
  replied: number;
}

export interface TenantCallLog {
  id: string;
  startedAt: string;
  endedAt?: string;
  duration?: number;
  status: string;
  direction?: string;
  cost: number;
  agentName?: string | null;
  leadName?: string | null;
}

export interface TenantDetail {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan: string;
  campaigns: TenantCampaign[];
  callLogs: TenantCallLog[];
  conversations: ConversationMetrics;
}

export type LogSeverity = 'DEFAULT' | 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';

export interface CloudLogParams {
  severity?: LogSeverity;
  service?: string;
  limit?: number;
  pageToken?: string;
  startTime?: string;
  endTime?: string;
}

export interface CloudLogEntry {
  id: string | null;
  timestamp: string | null;
  severity: string;
  message: string;
  service: string;
  revision: string;
  location: string;
  httpMethod: string | null;
  httpUrl: string | null;
  httpStatus: number | null;
  latencyMs: number | null;
}

export interface CloudLogsResponse {
  success?: boolean;
  entries: CloudLogEntry[];
  nextPageToken: string | null;
  configured: boolean;
  error?: string;
}

export interface CloudLogsConfig {
  success?: boolean;
  configured: boolean;
  projectId: string | null;
  authMethod: 'service-account-key' | 'adc' | 'none';
}

export interface CronHeartbeat {
  jobName: string;
  lastBeatAt: string | null;
  lastStatus: string;
  expectedIntervalSeconds: number;
  consecutiveFailures: number;
  lastError: string | null;
  secondsSinceBeat: number | null;
  stalenessThresholdSeconds: number;
  stale: boolean;
  healthy: boolean;
}

export interface CronHealth {
  success?: boolean;
  status: string;
  healthy: boolean;
  totalJobs: number;
  staleJobs: string[];
  erroredJobs: string[];
  jobs: CronHeartbeat[];
}

export interface SahSummary {
  sah_count: number;
  total_cost: number;
  avg_cost_per_sah: number;
  total_voice_cost: number;
  total_llm_cost: number;
}

export interface SahByType {
  type: string;
  sah_count: number;
  avg_cost_per_sah: number;
  total_cost: number;
}

export interface SahByTenant {
  tenant_id: string;
  tenant_name: string | null;
  sah_count: number;
  total_cost: number;
  avg_cost_per_sah: number;
  voice_cost: number;
  llm_cost: number;
}

export interface SahCostData {
  summary: SahSummary;
  byType: SahByType[];
  byTenant: SahByTenant[];
  range: DateRangeParams | null;
  generatedAt: string;
}

export interface TaskSummary {
  failed: number;
  dead_letter: number;
  stuck: number;
  pending: number;
  executed: number;
  cancelled: number;
  campaignActivityErrors7d: number;
}

export interface TaskProblem {
  id: string;
  tenantId: string;
  tenantName: string | null;
  leadId: string | null;
  bookingType: string | null;
  taskStatus: string;
  executionAttempts: number;
  lastError: string | null;
  taskScheduledAt: string | null;
  problem: 'failed' | 'stuck' | 'dead_letter';
}

export interface TaskByTenant {
  tenant_id: string;
  tenant_name: string | null;
  failed: number;
  dead_letter: number;
  stuck: number;
}

export interface WabaFollowupHealth {
  stuck: number;
  failed: number;
  pending: number;
  byTenant: Array<{ tenant_id: string; tenant_name: string | null; stuck: number; failed: number; pending: number }>;
  tenantsChecked: number;
}

export interface TaskHealth {
  summary: TaskSummary;
  problems: TaskProblem[];
  byTenant: TaskByTenant[];
  wabaFollowups: WabaFollowupHealth;
  graceMinutes: number;
  stuckAlertThreshold: number;
  generatedAt: string;
}

// ── LLM cost / spend (billing_usage_events) ──────────────────────────────────

/** The dominant cost driver (feature + tenant) for a single day. */
export interface LlmCostDriver {
  feature_key: string;
  tenant_id: string | null;
  tenant_name: string | null;
  cost: number;
  calls: number;
}

/** One calendar day (UTC) of LLM spend, with spike flag + attribution. */
export interface LlmCostDay {
  day: string; // YYYY-MM-DD (UTC)
  total_cost: number;
  calls: number;
  input_tokens: number;
  output_tokens: number;
  providers: Record<string, number>; // e.g. { anthropic: 5.66, gemini: 0 }
  baseline: number;                   // trailing-median baseline for the day
  is_spike: boolean;
  multiple_of_baseline: number | null;
  driver: LlmCostDriver | null;
}

export interface LlmCostByFeature {
  feature_key: string;
  provider: string;
  model: string;
  cost: number;
  calls: number;
  input_tokens: number;
  output_tokens: number;
}

export interface LlmCostByTenant {
  tenant_id: string;
  tenant_name: string | null;
  cost: number;
  calls: number;
}

export interface LlmCostByProvider {
  provider: string;
  cost: number;
  calls: number;
}

export interface LlmCostSummary {
  days: number;
  totalCost: number;
  totalCalls: number;
  avgDailyCost: number;
  todayCost: number;
  maxDayCost: number;
  maxDay: string | null;
  projectedMonthlyCost: number;
  spikeCount: number;
}

export interface LlmCostThresholds {
  baselineWindowDays: number;
  spikeMultiplier: number;
  spikeFloorUsd: number;
}

export interface LlmCostData {
  series: LlmCostDay[];
  spikes: LlmCostDay[];
  byFeature: LlmCostByFeature[];
  byTenant: LlmCostByTenant[];
  byProvider: LlmCostByProvider[];
  summary: LlmCostSummary;
  thresholds: LlmCostThresholds;
  range: { days: number };
  generatedAt: string;
}

// ── R4 migration status (per-tenant migration runner) ───────────────────────
export interface MigrationManifestEntry {
  id: string;
  class: 'core' | 'tenant';
  description: string;
}

export interface MigrationTargetStatus {
  target: string; // 'core' or a tenant_id
  name: string;
  schema: string;
  status: 'current' | 'behind' | 'schema_absent' | 'unreachable';
  schemaExists: boolean | null;
  applied: string[];
  missing: string[];
  ledgerPresent: boolean;
  ledgerVersions: string[];
}

export interface MigrationStatusData {
  env: { coreSchema: string; tenantSchema: string };
  manifest: MigrationManifestEntry[];
  core: MigrationTargetStatus;
  tenants: MigrationTargetStatus[];
  summary: {
    tenantsChecked: number;
    byStatus: Record<string, number>;
    tenantsBehind: number;
    coreStatus: string;
    ledgerAdoption: number;
  };
}

// ── Strategy moderation (published workflow playbooks awaiting review) ───────

export type StrategyReviewStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

/**
 * A tenant-published strategy in the review queue. Carries only the SANITIZED
 * `shared_definition` — the author's private definition is never returned by
 * the moderation endpoint either.
 */
export interface StrategyForReview {
  id: string;
  tenant_id: string;
  tenant_name: string | null;
  name: string;
  description: string | null;
  shared_definition: {
    version?: number;
    source?: { key: string; cfg?: Record<string, any> };
    nodes?: Array<{ type: string; title?: string; cfg?: Record<string, any> }>;
    requiresFile?: boolean;
    meta?: Record<string, any>;
  };
  node_types: string[];
  share_status: StrategyReviewStatus;
  submitted_at: string | null;
  reviewed_at: string | null;
  review_note: string | null;
  import_count: number;
}

// ── Community signups (founding-group applications) ─────────────────────────

export type SignupStatus = 'new' | 'contacted' | 'accepted' | 'declined' | 'spam';

/** Where a signup came from, so InMail can be told apart from organic. */
export type SignupSource = 'landing' | 'inmail' | 'pdf' | 'referral' | 'other';

export interface CommunitySignup {
  id: string;
  full_name: string;
  email: string;
  company: string | null;
  linkedin_url: string | null;
  playbook: string | null;
  client_volume: string | null;
  source: SignupSource;
  status: SignupStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunitySignupsResponse {
  data: CommunitySignup[];
  summary: Partial<Record<SignupStatus, number>>;
  count: number;
}

// ── LLM routing (per-tenant, per-feature model selection) ───────────────────

export type LlmProvider = 'anthropic' | 'openai' | 'gemini' | 'deepseek';

/** One hop in a chain. Index 0 is the primary; the rest are fallbacks in order. */
export interface LlmRoutingEntry {
  provider: LlmProvider;
  model: string;
  /** Present on reads; the API derives it from array order on writes. */
  priority?: number;
  isActive?: boolean;
}

export interface LlmRoutingFeature {
  featureKey: string;
  chain: LlmRoutingEntry[];
  updatedAt?: string;
  updatedBy?: string | null;
}

/** A model the console may offer, with its rate per 1M tokens. */
export interface LlmSelectableModel {
  model: string;
  input: number | null;
  output: number | null;
}

/** A feature the console lists, and whether a rule on it would do anything. */
export interface LlmRoutingFeatureMeta {
  key: string;
  label: string;
  hint: string;
  /**
   * False until the call site goes through generateWithChain(). A rule on an
   * unwired feature would save and be ignored, so the console disables it.
   */
  wired: boolean;
}

export interface LlmRoutingMeta {
  providers: LlmProvider[];
  /** The full catalogue, owned by the backend so the UI cannot drift from it. */
  features: LlmRoutingFeatureMeta[];
  /**
   * provider -> models that provider actually serves. The console renders these
   * as a dropdown, so an admin cannot type a retired or misspelled id, or pair
   * a model with the wrong provider.
   */
  models: Record<LlmProvider, LlmSelectableModel[]>;
  /** feature_key -> why it cannot be routed (provider-locked capability). */
  nonRoutableFeatures: Record<string, string>;
}

/** Verdict from the dry-run endpoint. `ok: false` carries the reason. */
export interface LlmRoutingValidation {
  ok: boolean;
  error?: string;
}
