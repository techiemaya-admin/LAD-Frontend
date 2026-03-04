/**
 * TypeScript Type Definitions for Deals Pipeline
 */

export interface Lead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  value?: number;
  stage: string;
  status: string;
  source?: string;
  priority?: string;
  created_at: Date;
  updated_at: Date;
  tenant_id: string;
}

export interface Stage {
  key: string;
  label: string;
  color?: string;
  order: number;
  created_at: Date;
  tenant_id: string;
}

export interface Status {
  key: string;
  label: string;
  color?: string;
}

export interface Source {
  key: string;
  label: string;
}

export interface Priority {
  key: string;
  label: string;
}

export interface Note {
  id: string;
  lead_id: string;
  content: string;
  created_by: string;
  created_at: Date;
}

export interface PipelineBoard {
  stages: Stage[];
  leads: Lead[];
  leadsByStage: Record<string, Lead[]>;
}

export interface LeadStats {
  total: number;
  byStage: Record<string, number>;
  conversionRate: number;
}

export interface CreateLeadPayload {
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  value?: number;
  stage?: string;
  status?: string;
  source?: string;
  priority?: string;
}

export interface UpdateLeadPayload extends Partial<CreateLeadPayload> {}

export interface CreateStagePayload {
  key: string;
  label: string;
  color?: string;
  order?: number;
}

export interface UpdateStagePayload extends Partial<CreateStagePayload> {}

export interface ApiError {
  error: string;
  details?: string;
}

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

// Backwards-compatible type aliases and additional types expected by hooks
export interface Activity {
  id: string;
  lead_id: string;
  type: string;
  payload?: any;
  created_by?: string;
  created_at: Date;
}

export interface Attachment {
  id: string;
  filename: string;
  url: string;
  created_at: Date;
}

export interface UploadAttachmentParams {
  leadId: string;
  file: File | any;
}

export interface DeleteAttachmentParams {
  leadId: string;
  attachmentId: string;
}

export interface Comment {
  id: string;
  lead_id: string;
  content: string;
  created_by: string;
  created_at: Date;
}

export type CreateCommentParams = { leadId: string; content: string };
export type UpdateCommentParams = { leadId: string; commentId: string; content: string };
export type DeleteCommentParams = { leadId: string; commentId: string };

export type CreateLeadParams = CreateLeadPayload;
export type UpdateLeadParams = { id: string } & UpdateLeadPayload;
export type MoveLeadParams = { leadId: string; stageKey: string };
export type UpdateLeadStatusParams = { leadId: string; status: string };
export type AssignLeadsParams = { leadIds: string[]; userId: string };

export type LeadFilters = { stage?: string; status?: string; search?: string };

export type CreateNoteParams = { leadId: string; content: string; createdBy?: string };
export type UpdateNoteParams = { leadId: string; noteId: string; content: string };
export type DeleteNoteParams = { leadId: string; noteId: string };

export interface PipelineData extends PipelineBoard {}
export interface PipelineStats extends LeadStats {}

export type StatusOption = Status;
export type SourceOption = Source;
export type PriorityOption = Priority;

export type UpdateStageParams = UpdateStagePayload;
export type ReorderStagesParams = { stageOrders: Array<{ key: string; order: number}> };

export interface Tag {
  id: string;
  name: string;
  created_at: Date;
}

export type CreateTagParams = { leadId: string | number; name: string; color?: string };

