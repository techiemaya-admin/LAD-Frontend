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
