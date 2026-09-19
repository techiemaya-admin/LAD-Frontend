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
  /** Step 7 — the first campaign draft, `null` when none; absent on backends that predate it. */
  firstCampaign?: FirstCampaignSummary | null;
  /** Step 8 — what the tenant has shared; absent on backends that predate it. */
  references?: ReferencesSummary;
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

/* ------------------------------------------------------------------ */
/* Step 7 — your first campaign                                         */
/* ------------------------------------------------------------------ */

export type FirstCampaignStatus = 'drafted' | 'launched';

/** Channels a first campaign can be drafted on (instagram/voice are not). */
export type FirstCampaignChannel = 'linkedin' | 'email' | 'whatsapp';

export interface FirstCampaignMessage {
  /** Days after the first send: 0, 3, 10. */
  day: number;
  /** Email only. */
  subject?: string | null;
  body: string;
}

export interface FirstCampaignAudience {
  industries: string[];
  locations: string[];
  roles: string[];
  summary: string;
}

/**
 * The builder-ready template the backend drafts alongside the messages —
 * `{ name, tagline, notes, source: { key, cfg }, nodes[] }`. Opaque here: it
 * is handed to `CustomWorkflowBuilder` as `initialAiTemplate` untouched.
 */
export interface FirstCampaignTemplate {
  name?: string;
  tagline?: string;
  notes?: string;
  source?: { key: string; cfg?: Record<string, unknown> };
  nodes: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface FirstCampaignDraft {
  status: FirstCampaignStatus;
  offering: string;
  channel: FirstCampaignChannel;
  count: number;
  audience: FirstCampaignAudience;
  from: { agentName: string | null; agentTitle: string | null };
  messages: FirstCampaignMessage[];
  template: FirstCampaignTemplate | null;
  /** One plain sentence: "50 … leads at …, on LinkedIn, leading with …, three messages over ten days, from Rachana." */
  summary: string;
  draftedAt: string | null;
  launchedCampaignId: string | null;
  updatedAt: string | null;
}

/** The slice `studioService.state()` carries for the checklist and the rooms view. */
export interface FirstCampaignSummary {
  drafted: boolean;
  status: FirstCampaignStatus | null;
  channel: string | null;
  offering: string | null;
  count: number | null;
  launchedCampaignId: string | null;
  /** The same one-sentence summary as the draft's, for the checklist row. */
  summary: string | null;
}

/**
 * What every first-campaign write returns. `warnings` carries
 * `'not_persisted'` when the backend's column is missing — the draft is
 * still usable this session, so the UI toasts and carries on.
 */
export interface FirstCampaignResult {
  draft: FirstCampaignDraft;
  warnings?: string[];
}

/** The editable subset — PUT body, partial. */
export interface FirstCampaignInput {
  offering?: string;
  channel?: FirstCampaignChannel;
  count?: number;
  messages?: FirstCampaignMessage[];
  launchedCampaignId?: string | null;
}

/**
 * Codes the first-campaign routes return as `{ success:false, error: <code>, message, details? }`:
 * 400 `channel_not_draftable | no_offering | validation`, 409 `no_ready_channel`,
 * 404 `no_draft` (edit/rewrite with nothing drafted), 502 `no_draft | no_rewrite` (model gave nothing usable).
 */
export type FirstCampaignErrorReason = 'channel_not_draftable' | 'no_offering' | 'validation' | 'no_ready_channel' | 'no_draft' | 'no_rewrite';

/* ------------------------------------------------------------------ */
/* Step 8 — brand and references                                        */
/* ------------------------------------------------------------------ */

export type ReferenceKind = 'document' | 'link' | 'post' | 'story' | 'logo' | 'brand_guide' | 'font';
export type ReferencePurpose = 'pitch_deck' | 'price_list' | 'case_study' | 'proposal_template' | 'tone_guide' | 'other';
export type ExtractionStatus = 'pending' | 'done' | 'failed' | 'skipped';

/** What the backend pulled out of an item; shape depends on `purpose`/`kind` (see the Phase 3 contract). */
export type ReferenceExtracted = Record<string, unknown> & {
  summary?: string;
  claims?: string[];
  text?: string;
  hook?: string;
  format?: string;
};

/** The `tenant_reference_items` row as the backend returns it — snake_case, not remapped. */
export interface ReferenceItem {
  id: string;
  tenant_id?: string;
  kind: ReferenceKind;
  purpose: ReferencePurpose | null;
  title: string | null;
  source_url: string | null;
  storage_url: string | null;
  storage_path?: string | null;
  mime: string | null;
  size_bytes: number | null;
  note: string | null;
  extracted: ReferenceExtracted;
  extraction_status: ExtractionStatus;
  extraction_error: string | null;
  /** Set once the file is also searchable by the voice agent's knowledge base. */
  kb_document_name: string | null;
  created_by?: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export type PaletteRole = 'primary' | 'secondary' | 'accent' | 'background' | 'text';
export interface PaletteSwatch { hex: string; role: PaletteRole | null }

export type LogoVariant = 'dark' | 'light' | 'default';
export interface BrandLogo { url: string; variant: LogoVariant; fileName: string | null }

export type FontRole = 'headline' | 'body';
export interface BrandFont { family: string; role: FontRole | null; source: 'google' | 'upload'; url?: string | null }

export interface ToneRule { do?: string; dont?: string }

/** The `tenant_brand_profiles` row as the backend returns it — snake_case, not remapped. */
export interface BrandProfile {
  tenant_id?: string;
  palette: PaletteSwatch[];
  logos: BrandLogo[];
  fonts: BrandFont[];
  story: string | null;
  promises: string[];
  never_do: string[];
  known_for: string | null;
  tone_rules: ToneRule[];
  /** One confirmation sentence, regenerated by the backend on every change. */
  summary: string | null;
  updated_at: string | null;
}

/** PUT /studio/brand body — the same snake_case keys as the row, all optional. */
export interface BrandInput {
  palette?: PaletteSwatch[];
  fonts?: BrandFont[];
  story?: string | null;
  promises?: string[];
  never_do?: string[];
  known_for?: string | null;
  tone_rules?: ToneRule[];
}

export interface BrandStoryAnswers {
  why: string;
  promise: string;
  refuse: string;
  knownFor: string;
}

/** The counts `studioService.state().references` carries; also `GET /studio/references` → `summary`. */
export interface ReferencesSummary {
  documents: number;
  links: number;
  posts: number;
  /** Real threads shared in Step 6 (the style profile's sampleCount). */
  conversations: number;
  story: boolean;
  brand: { palette: number; logos: number; fonts: number };
  summary: string | null;
}

export interface ReferencesResponse {
  items: ReferenceItem[];
  brand: BrandProfile | null;
  summary: ReferencesSummary;
}

export type PostsSource = 'linkedin' | 'instagram';
export type PostsPullReason = 'not_connected' | 'unsupported';

export interface PostsPullSourceResult {
  source: PostsSource;
  ok: boolean;
  count: number;
  reason?: PostsPullReason | string;
}

export interface PostsPullResult {
  results: PostsPullSourceResult[];
  items: ReferenceItem[];
}
