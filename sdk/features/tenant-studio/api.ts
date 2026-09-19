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
import { apiDelete, apiGet, apiPost, apiPut } from '../../shared/apiClient';
import type {
  ApplyResult,
  ApprovalMode,
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
};

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

export async function refine(input: {
  transcript: TranscriptTurn[];
  feedback: string;
  persona?: Persona;
  draft?: Overlay;
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
