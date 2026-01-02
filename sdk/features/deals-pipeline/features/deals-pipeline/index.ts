/**
 * Deals Pipeline Feature SDK
 * Main entry point for frontend applications
 * 
 * Usage:
 *   import { DealsPipelineAPI, usePipeline, useLeads } from '@maya/features/deals-pipeline';
 */

// Export API client
export { DealsPipelineAPI, dealsPipelineAPI } from './api';

// Export React hooks
export {
  usePipelineBoard,
  useLeads,
  useLead,
  useStages,
  useLeadMutations,
  useReferenceData,
  useLeadStats,
  // Education vertical hooks
  useStudents,
  useStudent,
  useStudentMutations,
  useCounsellors,
  useStudentAppointments,
  useCounsellorAppointments,
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
  // Education vertical types
  EducationStudent,
  Counsellor,
  StudentAppointment,
  CreateStudentPayload,
  UpdateStudentPayload,
  AssignCounsellorPayload,
  StudentWithLead,
  StudentListFilter,
} from './types';