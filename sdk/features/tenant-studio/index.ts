/**
 * Tenant Studio Feature - Frontend SDK Exports
 *
 * USAGE:
 * ```typescript
 * import { useStudioState, useRehearse, type Proposal } from '@lad/frontend-features/tenant-studio';
 * ```
 */

export {
  getStudioState, rehearse, refine, icpScore, icpTrain, tailorChat, applyOverlay, listOverlayVersions, studioKeys,
} from './api';
export {
  useStudioState, useOverlayVersions, useRehearse, useRefine, useIcpScore, useIcpTrain, useTailorChat, useApplyOverlay,
} from './hooks';
export type {
  Overlay, StudioState, ReviewChange, ReviewRow, Review, OverlayError, Proposal, ProfileSuggestion, TailorTurn,
  ChatTurn, Persona, TranscriptTurn, RehearsalResult, RefineResult, SampleLead, IcpScoreResult, Verdict,
  TrainingSample, IcpTrainResult, OverlayVersion,
} from './types';
