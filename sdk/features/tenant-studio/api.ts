/**
 * Tenant Studio — API functions.
 *
 * Everything goes through the Next.js catch-all proxy at /api/[feature]/*,
 * which forwards `snapshot` to LAD_backend /api/snapshot/*. Tenant scoping is
 * the caller's token, applied server-side — never sent from here.
 *
 * The rooms write only through `applyOverlay`, which is the same PUT a
 * hand-made customisation takes and is admin-only on the backend. The Setup
 * flow adds its own small writes (setup progress, goals, and the brief
 * apply that saves the profile keys the tenant approved on the review card).
 */
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '../../shared/apiClient';
import { apiErrorFromResponse } from '../../shared/apiError';
import { safeStorage } from '../../shared/storage';
import type {
  ChatSendInput,
  ChatSendResult,
  ChatThreadPage,
  AgentQuestion,
  AgentQuestionContext,
  AnswerQuestionResult,
  ApplyAndUpdateResult,
  ApplyResult,
  ApprovalMode,
  GoLiveResult,
  HistoryEntry,
  LaunchStatus,
  QuestionStatus,
  QuestionsResponse,
  TestRun,
  TestRunChannel,
  TestRunFeedback,
  TestRunFeedbackInput,
  UndoAction,
  UndoResult,
  BrandInput,
  BrandProfile,
  BrandStoryAnswers,
  FirstCampaignChannel,
  FirstCampaignDraft,
  FirstCampaignInput,
  FirstCampaignResult,
  PostsPullResult,
  PostsSource,
  ReferenceItem,
  ReferencePurpose,
  ReferencesResponse,
  ChannelProfile,
  ChannelProfileInput,
  ChannelPromptResult,
  MailboxSource,
  StudioChannel,
  StyleImportResult,
  StyleProfile,
  StyleSample,
  BriefPlan,
  BriefResult,
  ChatTurn,
  Goal,
  GoalInput,
  IcpScoreResult,
  IcpTrainResult,
  Overlay,
  OverlayVersion,
  Persona,
  RefineResult,
  RefineTarget,
  RehearsalResult,
  SampleLead,
  StudioSetup,
  StudioState,
  TailorTurn,
  TrainingSample,
  TranscriptTurn,
} from './types';

const BASE = '/api/snapshot';

interface Envelope<T> {
  success: boolean;
  data: T;
}

export const studioKeys = {
  all: ['tenantStudio'] as const,
  state: () => [...studioKeys.all, 'state'] as const,
  versions: () => [...studioKeys.all, 'versions'] as const,
  goals: () => [...studioKeys.all, 'goals'] as const,
  channels: () => [...studioKeys.all, 'channels'] as const,
  style: () => [...studioKeys.all, 'style'] as const,
  firstCampaign: () => [...studioKeys.all, 'firstCampaign'] as const,
  references: () => [...studioKeys.all, 'references'] as const,
  launch: () => [...studioKeys.all, 'launch'] as const,
  history: (limit?: number) => [...studioKeys.all, 'history', limit ?? 50] as const,
  questions: (status?: QuestionStatus) => [...studioKeys.all, 'questions', status ?? 'open'] as const,
  chat: () => [...studioKeys.all, 'chat'] as const,
};

/**
 * Multipart POST. Bypasses the shared client because it must NOT set a JSON
 * Content-Type — the browser has to generate the boundary. Same origin, same
 * cookie/bearer auth, same ApiError on failure. `path` is absolute
 * (`/api/snapshot/…`), exactly as the JSON calls pass it.
 */
async function postForm<T>(path: string, form: FormData): Promise<T> {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const headers: Record<string, string> = {};
  const token = typeof window !== 'undefined' ? safeStorage.getItem('token') : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`${origin}${path}`, { method: 'POST', credentials: 'include', headers, body: form });
  if (!response.ok) throw await apiErrorFromResponse(response, `HTTP ${response.status}: ${response.statusText}`);
  const parsed = (await response.json()) as Envelope<T>;
  return parsed.data;
}

export async function getStudioState(): Promise<StudioState> {
  const res = await apiGet<Envelope<StudioState>>(`${BASE}/studio`);
  return res.data.data;
}

export async function rehearse(input: {
  persona?: Persona;
  history: TranscriptTurn[];
  message: string;
}): Promise<RehearsalResult> {
  const res = await apiPost<Envelope<RehearsalResult>>(`${BASE}/studio/rehearse`, input);
  return res.data.data;
}

/**
 * Feedback on a rehearsal → one Tailor proposal. `target` names whose
 * sections change: the LinkedIn agent's (default) or, for a curated
 * workspace, the WhatsApp support agent's (`'customer_support'`).
 */
export async function refine(input: {
  transcript: TranscriptTurn[];
  feedback: string;
  persona?: Persona;
  draft?: Overlay;
  target?: RefineTarget;
}): Promise<RefineResult> {
  const res = await apiPost<Envelope<RefineResult>>(`${BASE}/studio/refine`, input);
  return res.data.data;
}

export async function icpScore(lead: SampleLead): Promise<IcpScoreResult> {
  const res = await apiPost<Envelope<IcpScoreResult>>(`${BASE}/studio/icp/score`, { lead });
  return res.data.data;
}

export async function icpTrain(input: { samples: TrainingSample[]; draft?: Overlay }): Promise<IcpTrainResult> {
  const res = await apiPost<Envelope<IcpTrainResult>>(`${BASE}/studio/icp/train`, input);
  return res.data.data;
}

export async function tailorChat(input: {
  message: string;
  history?: ChatTurn[];
  draft?: Overlay;
}): Promise<TailorTurn> {
  const res = await apiPost<Envelope<TailorTurn>>(`${BASE}/tailor/chat`, input);
  return res.data.data;
}

export async function applyOverlay(input: { overlay: Overlay; note?: string }): Promise<OverlayVersion> {
  const res = await apiPut<Envelope<OverlayVersion>>(`${BASE}/tailor/overlay`, { ...input, source: 'tailor' });
  return res.data.data;
}

export async function listOverlayVersions(): Promise<OverlayVersion[]> {
  const res = await apiGet<Envelope<OverlayVersion[]>>(`${BASE}/tailor/overlay/versions`);
  return res.data.data;
}

/* ------------------------------------------------------------------ */
/* Setup flow                                                           */
/* ------------------------------------------------------------------ */

export async function getSetup(): Promise<StudioSetup | undefined> {
  const state = await getStudioState();
  return state.setup;
}

export async function saveSetup(input: Partial<StudioSetup>): Promise<StudioSetup> {
  const res = await apiPut<Envelope<StudioSetup>>(`${BASE}/studio/setup`, input);
  return res.data.data;
}

export async function listGoals(): Promise<Goal[]> {
  const res = await apiGet<Envelope<Goal[]>>(`${BASE}/studio/goals`);
  return res.data.data;
}

export async function upsertGoal(goal: GoalInput): Promise<Goal> {
  const res = await apiPost<Envelope<Goal>>(`${BASE}/studio/goals`, goal);
  return res.data.data;
}

export async function deleteGoal(id: string): Promise<void> {
  await apiDelete<Envelope<unknown>>(`${BASE}/studio/goals/${encodeURIComponent(id)}`);
}

/** The brain-dump → plan turn. LLM-backed: bills the caller, never fire on render. */
export async function proposeBrief(input: { brief: string; links: string[] }): Promise<BriefResult> {
  const res = await apiPost<Envelope<BriefResult>>(`${BASE}/studio/brief`, input);
  return res.data.data;
}

export async function applyBrief(input: {
  plan: BriefPlan;
  answers?: Record<string, string>;
  approvalMode?: ApprovalMode;
  /** Stored with the setup so the proposal can be re-read later. */
  brief?: string;
  links?: string[];
}): Promise<ApplyResult> {
  const res = await apiPost<Envelope<ApplyResult>>(`${BASE}/studio/brief/apply`, input);
  return res.data.data;
}

/* ------------------------------------------------------------------ */
/* Step 6 — channel profiles + writing style                            */
/* ------------------------------------------------------------------ */

export interface ChannelsResponse {
  channels: ChannelProfile[];
  style: StyleProfile | null;
}

export async function getChannels(): Promise<ChannelsResponse> {
  const res = await apiGet<Envelope<ChannelsResponse>>(`${BASE}/studio/channels`);
  return res.data.data;
}

/** Partial update; the backend returns the whole profile with `ready`/`missing` recomputed. */
export async function saveChannel(input: { channel: StudioChannel; patch: ChannelProfileInput }): Promise<ChannelProfile> {
  const res = await apiPut<Envelope<ChannelProfile>>(`${BASE}/studio/channels/${encodeURIComponent(input.channel)}`, input.patch);
  return res.data.data;
}

export async function getStyle(): Promise<StyleProfile | null> {
  const res = await apiGet<Envelope<StyleProfile | null>>(`${BASE}/studio/style`);
  return res.data.data;
}

/** LLM-backed: distils pasted / exported threads into a StyleProfile. Never fire on render. */
export async function importStyle(input: { samples: StyleSample[] }): Promise<StyleImportResult> {
  const res = await apiPost<Envelope<StyleImportResult>>(`${BASE}/studio/style/import`, input);
  return res.data.data;
}

/** Same, from the tenant's connected mailbox. 409 `not_connected`, 501 `unsupported`. */
export async function importStyleFromMailbox(input: { source: MailboxSource; days?: number }): Promise<StyleImportResult> {
  const res = await apiPost<Envelope<StyleImportResult>>(`${BASE}/studio/style/import/mailbox`, input);
  return res.data.data;
}

/**
 * Generates and publishes one channel's agent prompt. Lives under
 * ai-playground (the existing prompt generator), so it is not enveloped.
 * LLM-backed: bills the caller.
 */
export async function generateChannelPrompt(input: { channel: StudioChannel; publish: true }): Promise<ChannelPromptResult> {
  const res = await apiPost<ChannelPromptResult>('/api/ai-playground/generate-prompt', input);
  return res.data;
}

/* ------------------------------------------------------------------ */
/* Step 7 — your first campaign                                         */
/* ------------------------------------------------------------------ */

export async function getFirstCampaign(): Promise<FirstCampaignDraft | null> {
  const res = await apiGet<Envelope<{ draft: FirstCampaignDraft | null }>>(`${BASE}/studio/first-campaign`);
  return res.data.data?.draft ?? null;
}

/**
 * LLM-backed: writes three messages and a builder template. Never fire on render.
 * Curated workspaces: pass `pipelineKey` (or nothing — the server picks) and
 * get a `kind:'pipeline'` draft back with no LLM call.
 */
export async function draftFirstCampaign(input: { offering?: string; channel?: FirstCampaignChannel; count?: number; pipelineKey?: string }): Promise<FirstCampaignResult> {
  const res = await apiPost<Envelope<FirstCampaignResult>>(`${BASE}/studio/first-campaign/draft`, input);
  return res.data.data;
}

/** Edits only — the template is rebuilt from the messages without an LLM call. */
export async function updateFirstCampaign(patch: FirstCampaignInput): Promise<FirstCampaignResult> {
  const res = await apiPut<Envelope<FirstCampaignResult>>(`${BASE}/studio/first-campaign`, patch);
  return res.data.data;
}

/** LLM-backed: regenerates one of the three messages. */
export async function rewriteFirstCampaignMessage(input: { index: 0 | 1 | 2; instruction?: string }): Promise<FirstCampaignResult> {
  const res = await apiPost<Envelope<FirstCampaignResult>>(`${BASE}/studio/first-campaign/rewrite`, input);
  return res.data.data;
}

export async function deleteFirstCampaign(): Promise<void> {
  await apiDelete<Envelope<unknown>>(`${BASE}/studio/first-campaign`);
}

/* ------------------------------------------------------------------ */
/* Step 8 — brand and references                                        */
/* ------------------------------------------------------------------ */

export async function getReferences(): Promise<ReferencesResponse> {
  const res = await apiGet<Envelope<ReferencesResponse>>(`${BASE}/studio/references`);
  return res.data.data;
}

/** Multipart `files` (≤10 per call, ≤20 MB each). Extraction runs inline; check each item's `extraction_status`. */
export async function uploadReferences(input: { files: File[]; purpose?: ReferencePurpose; note?: string; kind?: 'document' | 'brand_guide' }): Promise<ReferenceItem[]> {
  const form = new FormData();
  for (const f of input.files) form.append('files', f);
  if (input.purpose) form.append('purpose', input.purpose);
  if (input.note) form.append('note', input.note);
  if (input.kind) form.append('kind', input.kind);
  const d = await postForm<{ items: ReferenceItem[] }>(`${BASE}/studio/references/upload`, form);
  return d.items ?? [];
}

/** A purpose change re-runs extraction server-side. */
export async function updateReference(input: { id: string; patch: { purpose?: ReferencePurpose | null; note?: string; title?: string } }): Promise<ReferenceItem> {
  const res = await apiPatch<Envelope<{ item: ReferenceItem }>>(`${BASE}/studio/references/${encodeURIComponent(input.id)}`, input.patch);
  return res.data.data.item;
}

export async function deleteReference(id: string): Promise<void> {
  await apiDelete<Envelope<unknown>>(`${BASE}/studio/references/${encodeURIComponent(id)}`);
}

/** ≤20 links; each page is read and summarised. */
export async function addReferenceLinks(input: { links: { url: string; note?: string }[] }): Promise<ReferenceItem[]> {
  const res = await apiPost<Envelope<{ items: ReferenceItem[] }>>(`${BASE}/studio/references/links`, input);
  return res.data.data.items ?? [];
}

/** Per-source outcome: a source that is not connected says so instead of failing the call. */
export async function pullReferencePosts(input: { sources: PostsSource[] }): Promise<PostsPullResult> {
  const res = await apiPost<Envelope<PostsPullResult>>(`${BASE}/studio/references/posts/pull`, input);
  const d = res.data.data;
  return { results: d.results ?? [], items: d.items ?? [] };
}

/** LLM-backed: writes the story, promises and never-do list from four answers (blanks allowed); also records a `story` item. */
export async function saveBrandStory(input: { answers: BrandStoryAnswers }): Promise<{ brand: BrandProfile; item: ReferenceItem }> {
  const res = await apiPost<Envelope<{ brand: BrandProfile; item: ReferenceItem }>>(`${BASE}/studio/references/story`, input);
  return res.data.data;
}

/** Multipart `files` (≤3, png/svg/jpg ≤5 MB). PNG/JPG also yield a palette. */
export async function uploadBrandLogos(input: { files: File[] }): Promise<BrandProfile> {
  const form = new FormData();
  for (const f of input.files) form.append('files', f);
  const d = await postForm<{ brand: BrandProfile }>(`${BASE}/studio/brand/logo`, form);
  return d.brand;
}

export async function saveBrand(patch: BrandInput): Promise<BrandProfile> {
  const res = await apiPut<Envelope<{ brand: BrandProfile }>>(`${BASE}/studio/brand`, patch);
  return res.data.data.brand;
}

/** Multipart `file` (pdf/pptx ≤20 MB): colours by regex, tone rules and font names by LLM. */
export async function uploadBrandGuide(input: { file: File }): Promise<{ brand: BrandProfile; item: ReferenceItem }> {
  const form = new FormData();
  form.append('file', input.file);
  return postForm<{ brand: BrandProfile; item: ReferenceItem }>(`${BASE}/studio/brand/guide`, form);
}

/** What the UI shows before the tenant has a brand row. */
export function emptyBrand(): BrandProfile {
  return { palette: [], logos: [], fonts: [], story: null, promises: [], never_do: [], known_for: null, tone_rules: [], summary: null, updated_at: null };
}

/* ------------------------------------------------------------------ */
/* Step 9 — try your agent and go live                                  */
/* ------------------------------------------------------------------ */

/**
 * LLM-backed: invents one prospect and three lines, then lets the agent
 * answer each. Nothing is stored server-side. 400 `channel_not_testable`,
 * 409 `no_ready_channel` | `no_agent_prompt`. Never fire on render.
 */
export async function runTestRun(input: { channel?: TestRunChannel } = {}): Promise<TestRun> {
  const res = await apiPost<Envelope<TestRun>>(`${BASE}/studio/test-run`, input);
  return res.data.data;
}

/** LLM-backed: thumbs + reasons become one Tailor proposal and a one-line summary. All thumbs-up → `proposal: null`. */
export async function sendTestRunFeedback(input: TestRunFeedbackInput): Promise<TestRunFeedback> {
  const res = await apiPost<Envelope<TestRunFeedback>>(`${BASE}/studio/test-run/feedback`, input);
  return res.data.data;
}

/**
 * One press: applies the overlay (same validation as `applyOverlay`), then
 * regenerates and publishes every ON + ready channel's agent. A channel that
 * fails to publish is reported, not rolled back. Admin/owner only.
 */
export async function applyAndUpdate(input: { overlay: Overlay; note?: string }): Promise<ApplyAndUpdateResult> {
  const res = await apiPost<Envelope<ApplyAndUpdateResult>>(`${BASE}/studio/apply-and-update`, input);
  return res.data.data;
}

/** The launch checklist, first-week cost and plain-English summary — computed server-side so every surface agrees. */
export async function getLaunchStatus(): Promise<LaunchStatus> {
  const res = await apiGet<Envelope<LaunchStatus>>(`${BASE}/studio/launch`);
  return res.data.data;
}

/**
 * Marks setup complete and stores the (possibly edited) summary. Does NOT
 * launch a sequence campaign — the builder does that through its one proven
 * path. For a curated workspace with a pipeline draft the server switches
 * that pipeline on here (409 `activation_failed` with `reason` if it cannot).
 * 409 `not_ready` with `blocking` when the checklist is not green.
 */
export async function goLive(input: { summary?: string } = {}): Promise<GoLiveResult> {
  const res = await apiPost<Envelope<GoLiveResult>>(`${BASE}/studio/go-live`, input);
  return res.data.data;
}

/* ------------------------------------------------------------------ */
/* History + undo                                                       */
/* ------------------------------------------------------------------ */

export async function getStudioHistory(limit = 50): Promise<HistoryEntry[]> {
  const res = await apiGet<Envelope<{ entries: HistoryEntry[] }>>(`${BASE}/studio/history`, { params: { limit } });
  return res.data.data?.entries ?? [];
}

/** Puts back the previous overlay version (and republishes the agents) or the previous prompt for one channel. Admin/owner only. */
export async function undoHistory(action: UndoAction): Promise<UndoResult> {
  const res = await apiPost<Envelope<UndoResult>>(`${BASE}/studio/history/undo`, action);
  return res.data.data;
}

/* ------------------------------------------------------------------ */
/* Questions Mr LAD has for the owner                                   */
/* ------------------------------------------------------------------ */

export async function listQuestions(status: QuestionStatus = 'open'): Promise<QuestionsResponse> {
  const res = await apiGet<Envelope<QuestionsResponse>>(`${BASE}/studio/questions`, { params: { status } });
  const d = res.data.data;
  return { questions: d?.questions ?? [], openCount: d?.openCount ?? 0 };
}

/** LLM-backed: the answer becomes a Tailor proposal; applying it is a separate press. Admin/owner only. */
export async function answerQuestion(input: { id: string; answer: string }): Promise<AnswerQuestionResult> {
  const res = await apiPost<Envelope<AnswerQuestionResult>>(`${BASE}/studio/questions/${encodeURIComponent(input.id)}/answer`, { answer: input.answer });
  return res.data.data;
}

export async function dismissQuestion(id: string): Promise<AgentQuestion> {
  const res = await apiPost<Envelope<{ question: AgentQuestion }>>(`${BASE}/studio/questions/${encodeURIComponent(id)}/dismiss`, {});
  return res.data.data.question;
}

export async function createQuestion(input: { channel: StudioChannel; question: string; context?: AgentQuestionContext }): Promise<AgentQuestion> {
  const res = await apiPost<Envelope<{ question: AgentQuestion }>>(`${BASE}/studio/questions`, input);
  return res.data.data.question;
}

/* ------------------------------------------------------------------ */
/* Studio chat — one persistent "Mr LAD" thread per tenant              */
/* ------------------------------------------------------------------ */

/**
 * One page of the thread, newest page first: `before` is the oldest message
 * id already on screen. An empty thread comes back seeded with the bot's
 * first message (greeting + state card + a picker), never as `[]`.
 */
export async function getStudioChat(input: { before?: string; limit?: number } = {}): Promise<ChatThreadPage> {
  const res = await apiGet<Envelope<ChatThreadPage>>(`${BASE}/studio/chat`, { params: { before: input.before, limit: input.limit ?? 50 } });
  const d = res.data.data;
  return normaliseThreadPage(d);
}

function normaliseThreadPage(d: ChatThreadPage | undefined): ChatThreadPage {
  return {
    messages: Array.isArray(d?.messages) ? d.messages : [],
    pending: { pickers: d?.pending?.pickers ?? [], reviews: d?.pending?.reviews ?? [], prompts: d?.pending?.prompts ?? [] },
    hasMore: Boolean(d?.hasMore),
  };
}

/**
 * One owner turn: free text (the router classifies it), an explicit intent
 * (the quick actions), or a pick on a pending picker (no model call). Owner-
 * only intents come back 403 for members, with a lad turn explaining who can.
 */
export async function sendStudioChat(input: ChatSendInput): Promise<ChatSendResult> {
  const res = await apiPost<Envelope<ChatSendResult>>(`${BASE}/studio/chat`, input);
  const d = res.data.data;
  return { owner: d.owner, lad: Array.isArray(d?.lad) ? d.lad : [] };
}

/** Owner only: archives the thread and re-seeds it. */
export async function resetStudioChat(): Promise<ChatThreadPage> {
  const res = await apiPost<Envelope<ChatThreadPage | undefined>>(`${BASE}/studio/chat/reset`, {});
  return normaliseThreadPage(res.data.data);
}
