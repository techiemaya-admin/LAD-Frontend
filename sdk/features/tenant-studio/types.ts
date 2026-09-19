/**
 * Tenant Studio — shared types.
 *
 * Mirrors LAD_backend features/snapshots (StudioController, TailorController).
 * An `Overlay` is the tenant's industry-pack customisation document; the
 * backend validates it, this side only carries it between a proposal and
 * the PUT that applies it.
 */

/** Opaque to the UI: sections/patches the backend validates. */
export type Overlay = Record<string, unknown>;

export interface StudioState {
  vertical: string | null;
  overlayVersion: number | null;
  interview: {
    required: number;
    filled: number;
    missing: string[];
    optionalFilled: number;
    optionalTotal: number;
    complete: boolean;
  };
  agentPrompt: { present: boolean; chars: number };
  rehearsal: { ready: boolean; reason: 'no_agent_prompt' | 'profile_incomplete' | null };
  icpTraining: { ready: boolean; reason: 'profile_incomplete' | null };
  /** Onboarding progress; absent on backends that predate the Setup flow. */
  setup?: StudioSetup;
  goals?: Goal[];
}

/* ------------------------------------------------------------------ */
/* Setup flow (onboarding)                                              */
/* ------------------------------------------------------------------ */

export type ApprovalMode = 'ask_first' | 'autopilot';

export interface StudioSetup {
  currentStep: number;
  completedSteps: number[];
  completedAt: string | null;
  approvalMode: ApprovalMode;
}

export type GoalHorizon = '90d' | '1y' | '3y';

export interface Goal {
  id: string;
  horizon: GoalHorizon;
  metric: string;
  target: number;
  unit: string;
  dueDate: string | null;
  notes: string;
  dailyPace: number | null;
}

/** A goal as the brief proposes it — no id yet; `suggested` = the model invented the target. */
export interface GoalInput {
  id?: string;
  horizon: GoalHorizon;
  metric: string;
  target: number;
  unit: string | null;
  dueDate: string | null;
  notes: string | null;
  dailyPace?: number | null;
  suggested?: boolean;
}

export type BriefChannel = 'email' | 'whatsapp' | 'instagram' | 'linkedin' | 'voice';

export interface BriefChannelPlan {
  key: BriefChannel;
  on: boolean;
  reason: string | null;
}

export type BriefRoutineKey = 'daily_summary_8am' | 'weekly_pipeline_review' | 'reply_within_1h' | 'followup_every_3_days';

/** No label from the backend — the FE maps `key` to copy. */
export interface BriefRoutine {
  key: BriefRoutineKey;
  on: boolean;
}

export interface BriefFirstCampaign {
  offering: string;
  channel: string | null;
  audience: string;
  goal: string;
}

export interface BriefQuestion {
  field: string;
  label: string;
  question: string;
  /** Needed before launch — the same set as `blockingMissing` membership. */
  required: boolean;
}

export interface BriefPlan {
  summary: string;
  profile: Record<string, string>;
  goals: GoalInput[];
  channels: BriefChannelPlan[];
  routines: BriefRoutine[];
  firstCampaign: BriefFirstCampaign | null;
  questions: BriefQuestion[];
  /** Profile keys the backend cannot launch without; a subset of questions[].field. */
  blockingMissing: string[];
}

export interface BriefResult {
  plan: BriefPlan;
  sources: { website: boolean; linkedin: boolean; instagram: boolean };
  model: string | null;
  links: string[];
}

/** 400 reasons the brief endpoint returns as `{ success:false, error, reason }`. */
export type BriefErrorReason = 'empty_brief' | 'brief_too_long' | 'too_many_links' | 'bad_url' | 'no_plan';

export interface ApplyResult {
  state: StudioState;
  plan: BriefPlan;
  saved: { profileKeys: number; goals: number; setup: boolean };
}

export type ReviewChange = 'added' | 'removed' | 'reworded';

export interface ReviewRow {
  surface: string;
  change: ReviewChange;
  key: string;
  field?: string;
  before?: unknown;
  after?: unknown;
}

export interface Review {
  rows: ReviewRow[];
  summary: { added: number; removed: number; reworded: number };
}

export interface OverlayError {
  path: string;
  message: string;
}

export interface Proposal {
  overlay: Overlay;
  ok: boolean;
  errors: OverlayError[];
  review: Review | null;
}

export interface ProfileSuggestion {
  field: string;
  suggestion: string;
}

/** What every Tailor-backed turn returns (chat, refine, train). */
export interface TailorTurn {
  reply: string;
  proposal: Proposal | null;
  profileSuggestions?: ProfileSuggestion[];
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

export interface Persona {
  name?: string;
  role?: string;
  company?: string;
  situation?: string;
}

export interface TranscriptTurn {
  role: 'agent' | 'prospect';
  content: string;
}

export interface RehearsalResult {
  ok: true;
  reply: string;
  stopAgent: boolean;
  stopReason: string | null;
  transcript: TranscriptTurn[];
}

export interface RefineResult extends TailorTurn {
  ok: true;
  appliesOn: 'next_generate';
}

export interface SampleLead {
  name?: string;
  title?: string;
  company?: string;
  location?: string;
  industry?: string;
  summary?: string;
}

export interface IcpScoreResult {
  ok: true;
  lead: SampleLead & { headline?: string; current_company?: string };
  icpScore: number | null;
  matchLevel: 'strong' | 'moderate' | 'weak' | null;
  reasoning: string;
}

export type Verdict = 'fit' | 'not_fit';

export interface TrainingSample {
  lead: SampleLead;
  verdict: Verdict;
  reason?: string;
  score?: number | null;
}

export interface IcpTrainResult extends TailorTurn {
  ok: true;
  samples: number;
}

export interface OverlayVersion {
  version: number;
  overlay: Overlay;
  source: 'form' | 'tailor' | 'rollback';
  restoresVersion: number | null;
  note: string | null;
  appliedBy: string | null;
  isActive: boolean;
  createdAt: string;
}
