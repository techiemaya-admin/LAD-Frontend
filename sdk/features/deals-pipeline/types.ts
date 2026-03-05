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
