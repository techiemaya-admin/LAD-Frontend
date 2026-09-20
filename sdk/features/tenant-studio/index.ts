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
  getFirstCampaign, draftFirstCampaign, updateFirstCampaign, rewriteFirstCampaignMessage, deleteFirstCampaign,
  getReferences, uploadReferences, updateReference, deleteReference, addReferenceLinks, pullReferencePosts,
  saveBrandStory, uploadBrandLogos, saveBrand, uploadBrandGuide, emptyBrand,
  runTestRun, sendTestRunFeedback, applyAndUpdate, getLaunchStatus, goLive,
  getStudioHistory, undoHistory, listQuestions, answerQuestion, dismissQuestion, createQuestion,
} from './api';
export { isPipelineDraft } from './types';
export type { ChannelsResponse } from './api';
export {
  useStudioState, useOverlayVersions, useRehearse, useRefine, useIcpScore, useIcpTrain, useTailorChat, useApplyOverlay,
  useSaveSetup, useGoals, useProposeBrief, useApplyBrief,
  useChannels, useSaveChannel, useStyle, useImportStyle, useImportStyleFromMailbox, useGenerateChannelPrompt,
  useFirstCampaign, useDraftFirstCampaign, useUpdateFirstCampaign, useRewriteFirstCampaign, useDeleteFirstCampaign,
  useReferences, useUploadReferences, useUpdateReference, useDeleteReference, useAddReferenceLinks, usePullReferencePosts,
  useSaveBrandStory, useUploadBrandLogos, useSaveBrand, useUploadBrandGuide,
  useTestRun, useTestRunFeedback, useApplyAndUpdate, useLaunchStatus, useGoLive,
  useStudioHistory, useUndoHistory, useQuestions, useAnswerQuestion, useDismissQuestion, useCreateQuestion,
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
  FirstCampaignStatus, FirstCampaignChannel, FirstCampaignMessage, FirstCampaignAudience, FirstCampaignTemplate,
  FirstCampaignKind, FirstCampaignSequenceDraft, FirstCampaignPipeline, FirstCampaignPipelineDraft,
  FirstCampaignDraft, FirstCampaignSummary, FirstCampaignInput, FirstCampaignResult, FirstCampaignErrorReason,
  PipelineSummary, StudioWorkspace, LaunchRowRoom, GoLiveErrorReason,
  ReferenceKind, ReferencePurpose, ExtractionStatus, ReferenceExtracted, ReferenceItem, PaletteRole, PaletteSwatch,
  LogoVariant, BrandLogo, FontRole, BrandFont, ToneRule, BrandProfile, BrandInput, BrandStoryAnswers, ReferencesSummary,
  ReferencesResponse, PostsSource, PostsPullReason, PostsPullSourceResult, PostsPullResult,
  TestRunChannel, TestRunPersona, TestRunTurn, TestRun, TestRunErrorReason, ReasonKey, TestRunVerdict, TestRunFeedbackInput,
  ProposalLite, TestRunFeedback, PublishOutcome, ApplyAndUpdateResult, LaunchRowStatus, LaunchRowKey, LaunchRowFix, LaunchRow,
  LaunchCostLine, LaunchCredits, LaunchSchedule, LaunchStatus, StudioLaunchSummary, GoLiveResult,
  HistoryKind, UndoAction, HistoryEntry, UndoResult, UndoErrorReason,
  QuestionSource, QuestionStatus, AgentQuestionContext, AgentQuestion, QuestionsResponse, AnswerQuestionResult,
} from './types';
