/**
 * Tenant Studio — API functions.
 *
 * Everything goes through the Next.js catch-all proxy at /api/[feature]/*,
 * which forwards `snapshot` to LAD_backend /api/snapshot/*. Tenant scoping is
 * the caller's token, applied server-side — never sent from here.
 *
 * Nothing in the studio writes except `applyOverlay`, which is the same PUT a
 * hand-made customisation takes and is admin-only on the backend.
 */
import { apiGet, apiPost, apiPut } from '../../shared/apiClient';
import type {
  ChatTurn,
  IcpScoreResult,
  IcpTrainResult,
  Overlay,
  OverlayVersion,
  Persona,
  RefineResult,
  RehearsalResult,
  SampleLead,
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
