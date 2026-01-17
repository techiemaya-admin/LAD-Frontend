/**
 * Students API
 * Handles all API calls for student management in education vertical
 */

import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';

// API Client wrapper for consistency
const ApiClient = {
  get: apiGet,
  post: apiPost,
  put: apiPut,
  delete: apiDelete
};

export interface StudentListFilter {
  search?: string;
  stage?: string;
  education_level?: string;
  counsellor_id?: string;
  status?: string;
}

export interface StudentData {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive';
  stage: string;
  created_at: string;
  updated_at: string;
  student?: {
    current_education_level?: string;
    target_countries?: string[];
    gpa?: number;
    graduation_year?: number;
    preferred_fields?: string[];
    budget_min?: number;
    budget_max?: number;
    counsellor_id?: string;
  };
}

export interface StudentWithLead extends StudentData {
  // Extended with lead-specific fields if needed
}

export interface StudentCreateData {
  name: string;
  email?: string;
  phone?: string;
  student?: {
    current_education_level?: string;
    target_countries?: string[];
    gpa?: number;
    graduation_year?: number;
    preferred_fields?: string[];
    budget_min?: number;
    budget_max?: number;
    counsellor_id?: string;
  };
}

export interface StudentUpdateData {
  name?: string;
  email?: string;
  phone?: string;
  status?: 'active' | 'inactive';
  stage?: string;
  student?: {
    current_education_level?: string;
    target_countries?: string[];
    gpa?: number;
    graduation_year?: number;
    preferred_fields?: string[];
    budget_min?: number;
    budget_max?: number;
    counsellor_id?: string;
  };
}

export class StudentsApi {
  static async getStudents(campaignId: string, filters?: StudentListFilter): Promise<StudentWithLead[]> {
    const params = new URLSearchParams();
    
    if (filters?.search) params.append('search', filters.search);
    if (filters?.stage) params.append('stage', filters.stage);
    if (filters?.education_level) params.append('education_level', filters.education_level);
    if (filters?.counsellor_id) params.append('counsellor_id', filters.counsellor_id);
    if (filters?.status) params.append('status', filters.status);

    const queryString = params.toString();
    const url = `/api/deal-pipeline/students${queryString ? `?${queryString}` : ''}`;
    
    return ApiClient.get(url);
  }

  static async getStudent(campaignId: string, studentId: string): Promise<StudentWithLead> {
    return ApiClient.get(`/api/deal-pipeline/students/${studentId}`);
  }

  static async createStudent(campaignId: string, data: StudentCreateData): Promise<StudentWithLead> {
    return ApiClient.post(`/api/deal-pipeline/students`, data);
  }

  static async updateStudent(
    campaignId: string, 
    studentId: string, 
    data: StudentUpdateData
  ): Promise<StudentWithLead> {
    return ApiClient.put(`/api/deal-pipeline/students/${studentId}`, data);
  }

  static async deleteStudent(campaignId: string, studentId: string): Promise<void> {
    return ApiClient.delete(`/api/deal-pipeline/students/${studentId}`);
  }

  static async updateStudentStage(
    campaignId: string,
    studentId: string,
    stage: string,
    notes?: string
  ): Promise<StudentWithLead> {
    return ApiClient.post(`/api/deal-pipeline/students/${studentId}/stage`, {
      stage,
      notes
    });
  }
}