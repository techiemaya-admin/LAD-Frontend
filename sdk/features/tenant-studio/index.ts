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
  getSetup, saveSetup, listGoals, upsertGoal, deleteGoal, proposeBrief, applyBrief,
  getChannels, saveChannel, getStyle, importStyle, importStyleFromMailbox, generateChannelPrompt,
} from './api';
export type { ChannelsResponse } from './api';
export {
  useStudioState, useOverlayVersions, useRehearse, useRefine, useIcpScore, useIcpTrain, useTailorChat, useApplyOverlay,
  useSaveSetup, useGoals, useProposeBrief, useApplyBrief,
  useChannels, useSaveChannel, useStyle, useImportStyle, useImportStyleFromMailbox, useGenerateChannelPrompt,
} from './hooks';
export type {
  Overlay, StudioState, ReviewChange, ReviewRow, Review, OverlayError, Proposal, ProfileSuggestion, TailorTurn,
  ChatTurn, Persona, TranscriptTurn, RehearsalResult, RefineResult, SampleLead, IcpScoreResult, Verdict,
  TrainingSample, IcpTrainResult, OverlayVersion,
  ApprovalMode, StudioSetup, GoalHorizon, Goal, GoalInput, BriefChannel, BriefChannelPlan, BriefRoutine,
  BriefRoutineKey, BriefFirstCampaign, BriefQuestion, BriefPlan, BriefResult, BriefErrorReason, ApplyResult,
  StudioChannel, ChannelMissing, PushbackRow, ChannelProfile, ChannelProfileInput, StudioChannelSummary, StyleProfile,
  StyleSampleSource, StyleSample, MailboxSource, StyleImportResult, MailboxImportReason, ChannelPromptMissingField,
  ChannelPromptResult, FieldError,
} from './types';
