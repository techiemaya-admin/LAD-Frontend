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
  /** Per-channel agent summary (Step 6); absent on backends that predate it. */
  channels?: StudioChannelSummary[];
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

/* ------------------------------------------------------------------ */
/* Step 6 — how your agents talk (channel profiles + writing style)     */
/* ------------------------------------------------------------------ */

export type StudioChannel = BriefChannel;

/** What a channel profile can still be missing before it counts as ready. */
export type ChannelMissing = 'opener' | 'handover';

export interface PushbackRow {
  say: string;
  answer: string;
}

/** One channel's agent: who it is, how it talks, when it hands over. */
export interface ChannelProfile {
  channel: StudioChannel;
  isOn: boolean;
  agentName: string | null;
  agentTitle: string | null;
  /** Tone chips; emoji preference rides along as `emoji:none|rarely|sometimes`. */
  tone: string[];
  opener: string | null;
  pushback: PushbackRow[];
  handover: string[];
  neverSay: string[];
  generatedPromptAt: string | null;
  /** Backend-computed: on, with an opener and at least one hand-over rule. */
  ready: boolean;
  missing: ChannelMissing[];
}

/** The editable subset of a ChannelProfile — PUT body, camelCase, partial. */
export type ChannelProfileInput = Partial<Pick<ChannelProfile, 'isOn' | 'agentName' | 'agentTitle' | 'tone' | 'opener' | 'pushback' | 'handover' | 'neverSay'>>;

/** The slice of a ChannelProfile the studio state carries for the rooms view. */
export type StudioChannelSummary = Pick<ChannelProfile, 'channel' | 'isOn' | 'ready' | 'missing' | 'agentName' | 'agentTitle'>;

/** How the tenant sounds, distilled from real threads they shared. */
export interface StyleProfile {
  summary: string;
  greeting: string;
  sentenceLength: string;
  openers: string[];
  closers: string[];
  objectionAnswers: PushbackRow[];
  neverWords: string[];
  sampleCount: number;
  sources: string[];
}

export type StyleSampleSource = 'paste' | 'whatsapp_export' | 'linkedin_export';

export interface StyleSample {
  source: StyleSampleSource;
  text: string;
}

export type MailboxSource = 'gmail' | 'outlook';

export interface StyleImportResult {
  style: StyleProfile;
  sampleCount: number;
  sources: string[];
  persisted: boolean;
}

/** 409/501 reasons the mailbox import returns as `{ success:false, error, reason }`. */
export type MailboxImportReason = 'not_connected' | 'unsupported';

/** A field a channel prompt still needs (from the generate-prompt route). */
export interface ChannelPromptMissingField {
  key: string;
  label: string;
  placeholder?: string;
  severity?: 'required' | 'optional';
}

/** POST /api/ai-playground/generate-prompt with publish:true — not enveloped. */
export interface ChannelPromptResult {
  success: boolean;
  prompt_text: string | null;
  missing_fields?: ChannelPromptMissingField[];
  published: { saved: boolean; readBy: string; note: string };
}

/** 400 validation errors come back as `{ success:false, error, errors:[{path,message}] }`. */
export interface FieldError {
  path: string;
  message: string;
}
