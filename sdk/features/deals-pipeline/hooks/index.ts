// Deals Pipeline Hooks - Barrel Export
export { useLeadActivities } from './useActivities';
export {
  useLeadAttachments,
  useUploadLeadAttachment,
  useDeleteLeadAttachment,
} from './useAttachments';
export {
  useLeadComments,
  useAddLeadComment,
  useUpdateLeadComment,
  useDeleteLeadComment,
} from './useComments';
export {
  useCreateLead,
  useUpdateLead,
  useDeleteLead,
  useMoveLeadToStage,
  useUpdateLeadStatus,
  useAssignLeadsToUser,
} from './useLeadMutations';
export { useLeads, useLead, useLeadsWithConversations, useLeadsByStage } from './useLeads';
export {
  useLeadNotes,
  useAddLeadNote,
  useUpdateLeadNote,
  useDeleteLeadNote,
} from './useNotes';
export { usePipelineData, usePipelineStats } from './usePipeline';
export { useStatuses, useSources, usePriorities } from './useReferenceData';
export { useStages, useCreateStage, useUpdateStage, useDeleteStage, useReorderStages } from './useStages';
export { useLeadTags, useAddTagToLead } from './useTags';

// Backward compatibility aliases
export { usePipelineData as usePipelineBoard } from './usePipeline';
export { usePipelineStats as useLeadStats } from './usePipeline';
