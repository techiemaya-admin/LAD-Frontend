/**
 * Tenant Studio — shared types.
 *
 * Mirrors LAD_backend features/snapshots (StudioController, TailorController).
 * An `Overlay` is the tenant's industry-pack customisation document; the
 * backend validates it, this side only carries it between a proposal and
 * the PUT that applies it.
 */

/** The five channel agents whose prompt sections a pack carries. */
export type ChannelPromptKey = 'linkedin' | 'email' | 'whatsapp' | 'instagram' | 'voice';
/** The pipeline prompts of a curated workspace (wellness): the support agent and the admin agent, both on WhatsApp. */
export type PipelinePromptKey = 'customer_support' | 'admin_support';
/** Every `overlay.prompts.<key>` the backend's overlay schema accepts. */
export type PromptKey = ChannelPromptKey | PipelinePromptKey;

/** One prompt section as an overlay adds it. `stage` is BASE or a stage token the pipeline declares (pipeline prompts only). */
export interface OverlayPromptSection {
  key: string;
  body: string;
  stage?: string;
  [extra: string]: unknown;
}

/** The per-prompt patch: sections added (upsert by key) and removed (by key). Locked keys are refused server-side. */
export interface OverlayPromptPatch {
  sections?: { add?: OverlayPromptSection[]; remove?: string[] };
  [extra: string]: unknown;
}

export type OverlayPrompts = Partial<Record<PromptKey, OverlayPromptPatch>>;

/**
 * Opaque to the UI: sections/patches the backend validates. Only `prompts`
 * is typed here, so a curated proposal that touches the pipeline prompts
 * type-checks the same way a channel one does.
 */
export type Overlay = Record<string, unknown> & { prompts?: OverlayPrompts };

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
  /** Step 9 — the cheap launch verdict (keys only; `GET /studio/launch` has the rows and the cost); absent on backends that predate it. */
  launch?: StudioLaunchSummary;
  /** Open questions Mr LAD has for the owner; absent on backends that predate the queue. */
  questions?: { open: number };
  /** The change timeline's headline; absent on backends that predate it. */
  history?: { lastChangeAt: string | null; undoable: boolean };
  /**
   * Whether this tenant runs a curated workspace (an industry edition that
   * ships pipelines) and the pipelines it can switch on; absent on backends
   * that predate it. `curated: false` carries `pipelines: []`.
   */
  workspace?: StudioWorkspace;
}

/* ------------------------------------------------------------------ */
/* Curated workspaces (industry editions with pipelines)                */
/* ------------------------------------------------------------------ */

/** One pipeline as the studio state carries it — enough for a picker, not the knob form (`@lad/frontend-features/snapshots` has that). */
export interface PipelineSummary {
  key: string;
  name: string;
  blurb: string;
  /** The goal event in the manifest's words, e.g. 'trial-booked'. */
  goal: string | null;
  engine: 'stage' | 'sequence' | string | null;
  /** Build state: only `'live'` has an engine behind it; `'planned'` is coming. */
  state: string | null;
  entitled: boolean;
  active: boolean;
  campaignCount: number;
  /** Knob keys with neither a value nor a default — the pipeline cannot run until these are set. */
  knobsMissing: string[];
}

/**
 * Where a curated workspace's WhatsApp agent reads its instructions from:
 * `'template'` = the rendered pack (Studio changes reach it), `'stored'` =
 * its original stored prompt (Studio changes wait until support switches it).
 */
export type PromptSource = 'template' | 'stored';

export interface StudioWorkspace {
  vertical: string | null;
  /** True iff the tenant's edition declares at least one pipeline. A vertical with pack sections only (staffing) is NOT curated. */
  curated: boolean;
  pipelines: PipelineSummary[];
  /** Curated only; absent on backends that predate it (read as unknown, not as `'stored'`). Builder workspaces report `'stored'`. */
  promptSource?: PromptSource;
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
  /** The backend's label for where the change lands ("LinkedIn agent", "Support agent (WhatsApp)", …) — shown verbatim, never mapped here. */
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

/** What `refine` may change: the LinkedIn agent's sections (builder, the default) or the support agent's (curated). */
export type RefineTarget = 'linkedin' | 'customer_support';

export interface RefineResult extends TailorTurn {
  ok: true;
  /** Echoed by backends that accept a target; absent = `'linkedin'`. */
  target?: RefineTarget;
  /** `'next_conversation'`: a curated change reaches the WhatsApp agent on its own (no regenerate). */
  appliesOn: 'next_generate' | 'next_conversation';
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

/**
 * What a first campaign IS: a three-message sequence the builder launches, or
 * (curated workspaces) a prebuilt pipeline the server switches on at go-live.
 * Backends that predate the pipeline shape omit `kind`; read that as `'sequence'`.
 */
export type FirstCampaignKind = 'sequence' | 'pipeline';

interface FirstCampaignDraftBase {
  status: FirstCampaignStatus;
  channel: FirstCampaignChannel;
  from: { agentName: string | null; agentTitle: string | null };
  /** One plain sentence describing the campaign — the confirmation card and the checklist row show it verbatim. */
  summary: string;
  draftedAt: string | null;
  updatedAt: string | null;
}

/** The builder-shaped draft: three messages over ten days plus a template. */
export interface FirstCampaignSequenceDraft extends FirstCampaignDraftBase {
  kind?: 'sequence';
  offering: string;
  count: number;
  audience: FirstCampaignAudience;
  messages: FirstCampaignMessage[];
  template: FirstCampaignTemplate | null;
  launchedCampaignId: string | null;
}

/** The pipeline the draft picked — a slice of the edition's manifest entry. */
export interface FirstCampaignPipeline {
  key: string;
  name: string;
  blurb: string;
  goal: string | null;
  engine: string | null;
  state: string | null;
}

/** The pipeline-shaped draft (curated workspaces): no messages, no template — go-live switches the pipeline on. */
export interface FirstCampaignPipelineDraft extends FirstCampaignDraftBase {
  kind: 'pipeline';
  pipeline: FirstCampaignPipeline;
  /** Knob keys still unset — the launch checklist blocks until this is empty. */
  knobsMissing: string[];
  /** Set once go-live activated the pipeline. */
  launchedPipelineKey: string | null;
  launchedCampaignId?: null;
}

export type FirstCampaignDraft = FirstCampaignSequenceDraft | FirstCampaignPipelineDraft;

export function isPipelineDraft(draft: FirstCampaignDraft | null | undefined): draft is FirstCampaignPipelineDraft {
  return Boolean(draft) && (draft as FirstCampaignPipelineDraft).kind === 'pipeline';
}

/** The slice `studioService.state()` carries for the checklist and the rooms view. */
export interface FirstCampaignSummary {
  drafted: boolean;
  status: FirstCampaignStatus | null;
  /** Absent on backends that predate pipeline drafts — read as `'sequence'`. */
  kind?: FirstCampaignKind;
  channel: string | null;
  /** For a pipeline draft this is the pipeline's name. */
  offering: string | null;
  count: number | null;
  launchedCampaignId: string | null;
  /** Pipeline drafts: set once go-live switched it on. */
  launchedPipelineKey?: string | null;
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
  /** Pipeline drafts only: re-pick the pipeline. Message edits on a pipeline draft are refused (400 `not_applicable`). */
  pipelineKey?: string;
}

/**
 * Codes the first-campaign routes return as `{ success:false, error: <code>, message, details? }`:
 * 400 `channel_not_draftable | no_offering | validation`, 409 `no_ready_channel`,
 * 404 `no_draft` (edit/rewrite with nothing drafted), 502 `no_draft | no_rewrite` (model gave nothing usable).
 */
export type FirstCampaignErrorReason =
  | 'channel_not_draftable' | 'no_offering' | 'validation' | 'no_ready_channel' | 'no_draft' | 'no_rewrite'
  /** Curated: the pipeline asked for is not entitled or not live (400, with `reason`). */
  | 'pipeline_not_available'
  /** Curated: nothing entitled, live and still off (409). */
  | 'no_pipeline_available'
  /** Curated: rewrite / message edits do not apply to a pipeline draft (400). */
  | 'not_applicable';

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

/* ------------------------------------------------------------------ */
/* Step 9 — try your agent and go live                                  */
/* ------------------------------------------------------------------ */

/** Channels a test run can play against (instagram/voice are not testable). */
export type TestRunChannel = 'linkedin' | 'email' | 'whatsapp';

/** The invented prospect a test run plays — generated once per run from the profile's ideal customer. */
export interface TestRunPersona {
  name: string;
  /** Curated WhatsApp runs: "prospective member" | "current member". */
  role: string;
  /** Empty/null for a curated workspace's member persona (a member has no company). */
  company: string | null;
  situation: string;
}

/** One prospect line and the agent's answer to it; `index` is 0, 1, 2. */
export interface TestRunTurn {
  index: number;
  prospect: string;
  reply: string;
}

/** `POST /studio/test-run` — nothing is stored server-side; carry it back into the feedback call. */
export interface TestRun {
  channel: TestRunChannel;
  persona: TestRunPersona;
  turns: TestRunTurn[];
  /** The history array the refine turn expects — pass it back untouched. */
  transcript: TranscriptTurn[];
}

/**
 * Codes the test-run route returns as `{ success:false, error: <code>, message, channel? }`:
 * 400 `channel_not_testable | validation`, 409 `no_ready_channel | no_agent_prompt`,
 * 502 `no_persona | no_reply` (the model gave nothing usable).
 */
export type TestRunErrorReason = 'channel_not_testable' | 'validation' | 'no_ready_channel' | 'no_agent_prompt' | 'no_persona' | 'no_reply';

/** Why a reply got a thumbs-down; the backend turns each into a feedback sentence. */
export type ReasonKey = 'too_pushy' | 'gave_up_too_early' | 'missed_guarantee' | 'should_have_asked_first' | 'wrong_audience_voice' | 'other';

export interface TestRunVerdict {
  index: number;
  thumbs: 'up' | 'down';
  reasons?: ReasonKey[];
  shouldHaveSaid?: string;
}

export interface TestRunFeedbackInput {
  channel: TestRunChannel;
  persona: TestRunPersona;
  transcript: TranscriptTurn[];
  verdicts: TestRunVerdict[];
  /** Which agent's sections the feedback changes; the backend derives it from the channel (a curated WhatsApp run = the support agent) when absent. */
  target?: RefineTarget;
}

/** A Tailor proposal without the validation errors list (the feedback and question routes return this slimmer shape). */
export interface ProposalLite {
  ok: boolean;
  overlay: Overlay;
  review: Review | null;
  errors?: OverlayError[];
}

/** `POST /studio/test-run/feedback` — `proposal` is null when every reply got a thumbs-up. */
export interface TestRunFeedback {
  proposal: ProposalLite | null;
  /** One plain sentence: "The agent will now …" */
  summary: string;
  thumbsDown: number;
  /** The Tailor's own words for the turn, when it had any. */
  reply?: string;
  /** Thumbs-downs without an "it should have said" became questions in the inbox. */
  questionsQueued?: number;
  /** Which agent's sections the proposal changes; absent on backends that do not report it. */
  target?: RefineTarget;
}

/** `readBy` of the entry a curated workspace's WhatsApp agent gets: it reads the pack itself, nothing was generated. */
export const SNAPSHOT_PROMPT_READ_BY = 'snapshot-prompt';

export interface PublishOutcome {
  channel: StudioChannel;
  ok: boolean;
  /** Who reads the published prompt; `'snapshot-prompt'` (curated WhatsApp) comes with a `note` to show instead of "updated". */
  readBy?: string;
  promptId?: string;
  error?: string;
  /** Plain-English timing note, e.g. when the change reaches the next conversation. Show it verbatim. */
  note?: string;
}

/** `POST /studio/apply-and-update` — the overlay applied, then every ON + ready channel's agent regenerated and published. */
export interface ApplyAndUpdateResult {
  overlayVersion: number;
  published: PublishOutcome[];
  /** Channels that are off or not ready — nothing to update there. */
  skipped: StudioChannel[];
}

export type LaunchRowStatus = 'ready' | 'needed' | 'optional';

/** Row keys in the order the backend emits them. */
export type LaunchRowKey = 'company' | 'offering' | 'audience' | 'channel' | 'campaign' | 'credits' | 'goals' | 'references';

/** A Studio room a launch row can send the tenant to instead of a step. */
export type LaunchRowRoom = 'pipelines';

export interface LaunchRowFix {
  /** The setup step (1–8) that fixes this row. */
  step?: number;
  /** A page outside the flow (e.g. `/settings?tab=credits`). */
  href?: string;
  /** A Studio room (curated workspaces: the pipeline's missing settings live in the Pipelines room). */
  room?: LaunchRowRoom;
  label: string;
}

export interface LaunchRow {
  key: LaunchRowKey | string;
  title: string;
  status: LaunchRowStatus;
  detail: string;
  fix?: LaunchRowFix | null;
}

export interface LaunchCostLine {
  item: string;
  qty: number;
  credits: number;
}

export interface LaunchCredits {
  /** null with `unknown: true` when the wallet could not be read — not zero. An unknown wallet blocks go-live. */
  balance: number | null;
  unknown: boolean;
  /** `model` = the tenant's default model the copy cost was priced at. */
  firstWeek: { credits: number; usd: number; model?: string | null; breakdown: LaunchCostLine[] } | null;
  /** null when there is no estimate or no balance to compare; false = ready but the balance runs out mid-week. */
  enough: boolean | null;
  /** Why there is no `firstWeek` (curated: pipelines bill per conversation). Shown in place of the estimate. */
  note?: string | null;
}

export interface LaunchSchedule {
  startsAt: string;
  timezone: string;
  perDay: number;
  businessHours: string | null;
}

/** `GET /studio/launch` — the launch checklist, cost and the plain-English summary, all computed server-side. */
export interface LaunchStatus {
  rows: LaunchRow[];
  blocking: string[];
  optionalMissing: string[];
  credits: LaunchCredits;
  schedule: LaunchSchedule;
  summary: string;
  canGoLive: boolean;
  /** When the tenant went live; null until then. */
  completedAt?: string | null;
}

/** The slice `studioService.state()` carries: the verdict without the LLM/cost parts. */
export interface StudioLaunchSummary {
  canGoLive: boolean;
  blocking: string[];
  completedAt: string | null;
}

export interface GoLiveResult {
  state: StudioState;
}

/**
 * Codes `POST /studio/go-live` returns as `{ success:false, error, ... }`:
 * 409 `not_ready` with `blocking`; 409 `activation_failed` with `reason` when
 * a curated workspace's pipeline could not be switched on.
 */
export type GoLiveErrorReason = 'not_ready' | 'activation_failed';

/* ------------------------------------------------------------------ */
/* History + undo                                                       */
/* ------------------------------------------------------------------ */

export type HistoryKind = 'overlay' | 'prompt' | 'first_campaign' | 'brief' | 'go_live';

export type UndoAction =
  | { type: 'overlay_rollback'; version: number }
  | { type: 'prompt_restore'; channel: StudioChannel; promptId: string };

export interface HistoryEntry {
  id: string;
  at: string;
  kind: HistoryKind;
  title: string;
  detail: string;
  by?: string;
  /** Present only while this entry can still be put back (email prompt entries never are). */
  undo: UndoAction | null;
  /** Overlay entries: the version this entry is, and whether it is the one in use. */
  version?: number;
  active?: boolean;
  /** Prompt entries: which channel's agent, and which `prompts` row. */
  channel?: StudioChannel;
  promptId?: string;
}

/** `POST /studio/history/undo` — the entry's `undo` object goes up verbatim; an overlay rollback also republishes the agents. */
export interface UndoResult {
  entry: HistoryEntry;
  state: StudioState;
  published?: PublishOutcome[];
  skipped?: StudioChannel[];
}

/** 400/404/409 codes the undo route returns. */
export type UndoErrorReason = 'bad_action' | 'invalid' | 'not_found' | 'nothing_to_undo';

/* ------------------------------------------------------------------ */
/* Questions Mr LAD has for the owner                                   */
/* ------------------------------------------------------------------ */

export type QuestionSource = 'handover' | 'rehearsal' | 'test_run' | 'manual';
export type QuestionStatus = 'open' | 'answered' | 'dismissed';

export interface AgentQuestionContext {
  prospectMessage?: string;
  agentReply?: string;
  leadName?: string;
  conversationId?: string;
  reasonChips?: string[];
  [key: string]: unknown;
}

/** A question Mr LAD has for the owner, as the backend returns it (camelCase). */
export interface AgentQuestion {
  id: string;
  channel: StudioChannel;
  source: QuestionSource;
  question: string;
  context: AgentQuestionContext;
  status: QuestionStatus;
  answer: string | null;
  /** The Tailor proposal made from the answer, once answered. */
  proposal: ProposalLite | null;
  /** The overlay version the proposal was applied as, once applied. */
  appliedVersion: number | null;
  createdAt: string;
  answeredAt: string | null;
  updatedAt?: string;
}

export interface QuestionsResponse {
  questions: AgentQuestion[];
  openCount: number;
}

/**
 * `POST /studio/questions/:id/answer` — the answer becomes a Tailor proposal;
 * applying it is a separate press. `proposal` is always an object: with
 * `ok: false` the Tailor asked for a fact or found nothing to change, and
 * `reply` says so (`overlay`/`review` are then null).
 */
export interface AnswerQuestionResult {
  question: AgentQuestion;
  proposal: { ok: boolean; overlay: Overlay | null; review: Review | null; reply: string; errors?: OverlayError[] };
}
