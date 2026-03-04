/**
 * Deals Pipeline Feature SDK
 * Main entry point for frontend applications
 * 
 * Usage:
 *   import { DealsPipelineAPI, usePipeline, useLeads } from '@maya/features/deals-pipeline';
 */

// Export API client
export { DealsPipelineAPI, dealsPipelineAPI } from './api';

// Export API functions (for direct service calls)
export {
  getLeads,
  getLeadById,
  getLeadsWithConversations,
  getLeadsByStage,
  getPipelineData,
  getPipelineStats,
  createLead,
  updateLead,
  deleteLead,
  moveLeadToStage,
  updateLeadStatus,
  assignLeadsToUser,
  getLeadActivities,
  getLeadComments,
  getLeadNotes,
  addLeadComment,
  addLeadNote,
  updateLeadComment,
  updateLeadNote,
  deleteLeadComment,
  deleteLeadNote,
  getLeadAttachments,
  uploadLeadAttachment,
  deleteLeadAttachment,
  getStatuses,
  getSources,
  getPriorities,
  getStages,
  createStage,
  updateStage,
  deleteStage,
  reorderStages,
  createTag,
  getLeadTags,
  addTagToLead,
  deleteTagFromLead,
} from './api';

// Export React hooks
export {
  usePipelineBoard,
  useLeads,
  useLead,
  useStages,
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useMoveLeadToStage,
  useUpdateLeadStatus,
  useAssignLeadsToUser,
  useStatuses,
  useSources,
  usePriorities,
  useLeadStats,
  usePipelineStats,
  useLeadComments,
  useAddLeadComment,
  useUpdateLeadComment,
  useDeleteLeadComment,
  useLeadNotes,
  useAddLeadNote,
  useUpdateLeadNote,
  useDeleteLeadNote,
  useLeadAttachments,
  useUploadLeadAttachment,
  useDeleteLeadAttachment,
  useLeadActivities,
  useLeadTags,
  useAddTagToLead,
} from './hooks';

// Export TypeScript types
export type {
  Lead,
  Stage,
  Status,
  Source,
  Priority,
  Note,
  PipelineBoard,
  LeadStats,
  CreateLeadPayload,
  UpdateLeadPayload,
  CreateStagePayload,
  UpdateStagePayload,
  ApiError,
  ApiResponse,
  Activity,
  Attachment,
  Comment,
  Tag,
} from './types';
