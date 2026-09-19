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
