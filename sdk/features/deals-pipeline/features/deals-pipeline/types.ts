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
  assigned_user_id?: string;
  // For education vertical
  student?: EducationStudent;
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

// ===========================
// Education Vertical Types
// ===========================

export interface EducationStudent {
  id: string;
  lead_id: string;
  tenant_id: string;
  
  // Academic Information
  current_education_level?: string;
  current_institution?: string;
  gpa?: number;
  graduation_year?: number;
  
  // Target Information
  target_degree?: string;
  target_major?: string;
  target_universities?: string[];
  target_countries?: string[];
  
  // Test Scores
  sat_score?: number;
  act_score?: number;
  toefl_score?: number;
  ielts_score?: number;
  gre_score?: number;
  gmat_score?: number;
  
  // Preferences
  budget_range?: string;
  preferred_intake?: string;
  scholarship_interest?: boolean;
  
  // Metadata
  created_at?: Date;
  updated_at?: Date;
}

export interface Counsellor {
  id: string;
  user_id: string;
  tenant_id: string;
  
  // Counsellor Information
  specialization?: string[];
  countries_expertise?: string[];
  languages?: string[];
  experience_years?: number;
  
  // Availability
  is_active?: boolean;
  max_students?: number;
  
  // Metadata
  created_at?: Date;
  updated_at?: Date;
}

export interface StudentAppointment {
  id: string;
  tenant_id: string;
  student_id: string;
  lead_id: string;
  counsellor_id: string;
  assigned_user_id: string;
  
  // Appointment Details
  booking_type: string;
  booking_source: string;
  booking_date: string;
  booking_time: string;
  scheduled_at: string;
  
  // Status
  status?: string;
  retry_count?: number;
  
  // Metadata
  created_by: string;
  created_at?: Date;
  updated_at?: Date;
}

export interface CreateStudentPayload extends CreateLeadPayload {
  // Academic fields
  current_education_level?: string;
  current_institution?: string;
  gpa?: number;
  graduation_year?: number;
  
  // Target fields
  target_degree?: string;
  target_major?: string;
  target_universities?: string[];
  target_countries?: string[];
  
  // Test scores
  sat_score?: number;
  act_score?: number;
  toefl_score?: number;
  ielts_score?: number;
  gre_score?: number;
  gmat_score?: number;
  
  // Preferences
  budget_range?: string;
  preferred_intake?: string;
  scholarship_interest?: boolean;
}

export interface UpdateStudentPayload extends Partial<CreateStudentPayload> {}

export interface AssignCounsellorPayload {
  counsellor_id: string;
  notes?: string;
}

export interface StudentWithLead extends Lead {
  student: EducationStudent;
}

export interface StudentListFilter {
  assigned_user_id?: string;
  target_country?: string;
  education_level?: string;
  status?: string;
  stage?: string;
  search?: string;
}
