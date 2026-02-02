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
// ==================== STUDENTS ====================
export interface Student {
  id: string;
  lead_id: string;
  country_of_residence?: string;
  country_of_interest?: string;
  education_level?: string;
  field_of_interest?: string;
  financial_capacity?: string;
  timeline_to_start?: string;
  counsellor_id?: string;
  metadata?: Record<string, any>;
  created_at: Date;
  updated_at: Date;
  tenant_id: string;
  // Populated fields from joins
  current_education_level?: string;
  target_countries?: string[];
}
export interface StudentWithLead {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  stage: string;
  status: string;
  created_at: Date;
  updated_at: Date;
  // Student-specific data
  student?: Student;
  // Counsellor data
  counsellor_id?: string;
  counsellor_first_name?: string;
  counsellor_last_name?: string;
}
export interface StudentListFilter {
  stage?: string;
  status?: string;
  search?: string;
  counsellor_id?: string;
  education_level?: string;
  country_of_interest?: string;
}
export interface CreateStudentPayload {
  lead_id: string;
  country_of_residence?: string;
  country_of_interest?: string;
  education_level?: string;
  field_of_interest?: string;
  financial_capacity?: string;
  timeline_to_start?: string;
  counsellor_id?: string;
  metadata?: Record<string, any>;
}
export interface UpdateStudentPayload extends Partial<CreateStudentPayload> {}