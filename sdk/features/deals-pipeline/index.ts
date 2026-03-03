/**
 * Deals Pipeline Feature - Frontend SDK Exports
 *
 * Central export point for all deals pipeline-related frontend functionality.
 * Import from this file to use deals pipeline features in your application.
 *
 * USAGE:
 * ```typescript
 * import {
 *   useLeads,
 *   useLead,
 *   useCreateLead,
 *   useUpdateLead,
 *   useDeleteLead,
 *   useDeleteBookingFollowup,
 *   useDownloadAttachment,
 *   useGetAttachmentSignedUrl,
 *   useStages,
 *   usePipelineData,
 *   usePipelineStats,
 *   type Lead,
 *   type Stage,
 *   type PipelineData
 * } from '@/sdk/features/deals-pipeline';
 * ```
 */

// ============================================================================
// API FUNCTIONS
// ============================================================================
export * from "./api";

// ============================================================================
// HOOKS - LEADS
// ============================================================================
export { useLeads, useLead, useLeadsWithConversations, useLeadsByStage } from "./hooks/useLeads";
export {
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useMoveLeadToStage,
  useUpdateLeadStatus,
  useAssignLeadsToUser,
} from "./hooks/useLeadMutations";

// ============================================================================
// HOOKS - STAGES
// ============================================================================
export {
  useStages,
  useCreateStage,
  useUpdateStage,
  useDeleteStage,
  useReorderStages,
} from "./hooks/useStages";

// ============================================================================
// HOOKS - PIPELINE
// ============================================================================
export { usePipelineData, usePipelineStats } from "./hooks/usePipeline";

// ============================================================================
// HOOKS - NOTES
// ============================================================================
export {
  useLeadNotes,
  useAddLeadNote,
  useUpdateLeadNote,
  useDeleteLeadNote,
} from "./hooks/useNotes";

// ============================================================================
// HOOKS - COMMENTS
// ============================================================================
export {
  useLeadComments,
  useAddLeadComment,
  useUpdateLeadComment,
  useDeleteLeadComment,
} from "./hooks/useComments";

// ============================================================================
// HOOKS - ATTACHMENTS
// ============================================================================
export {
  useLeadAttachments,
  useUploadLeadAttachment,
  useDeleteLeadAttachment,
} from "./hooks/useAttachments";
export {
  useGetAttachmentSignedUrl,
  useDownloadAttachment,
} from "./hooks/useAttachmentDownload";

// ============================================================================
// HOOKS - TAGS
// ============================================================================
export { useLeadTags, useAddTagToLead, useUpdateLeadTags } from "./hooks/useTags";

// ============================================================================
// HOOKS - ACTIVITIES
// ============================================================================
export { useLeadActivities } from "./hooks/useActivities";

// ============================================================================
// HOOKS - BOOKING FOLLOWUPS
// ============================================================================
export { useDeleteBookingFollowup } from "./hooks/useBookingFollowups";

// ============================================================================
// HOOKS - REFERENCE DATA
// ============================================================================
export { useStatuses, useSources, usePriorities } from "./hooks/useReferenceData";

// ============================================================================
// TYPES
// ============================================================================
export * from "./types";