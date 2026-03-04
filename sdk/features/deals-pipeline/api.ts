/**
 * API Client for Deals Pipeline Feature
 * TypeScript SDK for frontend applications
 */

import type {
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
} from './types';

export class DealsPipelineAPI {
  private baseUrl: string;
  private headers: HeadersInit;

  constructor(baseUrl?: string, headers: HeadersInit = {}) {
    // Use provided baseUrl, or get from environment variables, or use production default
    if (baseUrl) {
      this.baseUrl = baseUrl;
    } else {
      // Try to get from environment variables (NEXT_PUBLIC_BACKEND_URL takes priority)
      const envUrl = typeof window === 'undefined' 
        ? process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL
        : (typeof window !== 'undefined' && (window as any).__ENV?.NEXT_PUBLIC_BACKEND_URL) || 
          (typeof window !== 'undefined' && (window as any).__ENV?.NEXT_PUBLIC_API_URL);
      
      if (envUrl) {
        this.baseUrl = envUrl.endsWith('/api') ? `${envUrl}/deals-pipeline` : `${envUrl}/api/deals-pipeline`;
      } else {
        // Default to Cloud Run backend for production
        const isProduction = typeof window === 'undefined' && process.env.NODE_ENV === 'production';
        const defaultBackend = isProduction 
          ? 'https://lad-backend-741719885039.us-central1.run.app'
          : 'https://lad-backend-develop-741719885039.us-central1.run.app';
        this.baseUrl = `${defaultBackend}/api/deals-pipeline`;
      }
    }
    this.headers = {
      'Content-Type': 'application/json',
      ...headers,
    };
  }

  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    this.headers = {
      ...this.headers,
      Authorization: `Bearer ${token}`,
    };
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      ...options,
      headers: {
        ...this.headers,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const error: ApiError = await response.json();
        throw new Error(error.error || `HTTP ${response.status}`);
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network error');
    }
  }

  // ==================== LEADS ====================

  /**
   * List all leads
   */
  async listLeads(filters?: { stage?: string; status?: string; search?: string }): Promise<Lead[]> {
    const params = new URLSearchParams();
    if (filters?.stage) params.append('stage', filters.stage);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    
    const query = params.toString() ? `?${params}` : '';
    return this.fetch<Lead[]>(`/leads${query}`);
  }

  /**
   * Get a single lead by ID
   */
  async getLead(id: string): Promise<Lead> {
    return this.fetch<Lead>(`/leads/${id}`);
  }

  /**
   * Create a new lead
   */
  async createLead(payload: CreateLeadPayload): Promise<Lead> {
    return this.fetch<Lead>('/leads', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Update a lead
   */
  async updateLead(id: string, payload: UpdateLeadPayload): Promise<Lead> {
    return this.fetch<Lead>(`/leads/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Delete a lead
   */
  async deleteLead(id: string): Promise<void> {
    return this.fetch<void>(`/leads/${id}`, {
      method: 'DELETE',
    });
  }

  /**
   * Get lead statistics
   */
  async getLeadStats(): Promise<LeadStats> {
    return this.fetch<LeadStats>('/leads/stats');
  }

  // ==================== STAGES ====================

  /**
   * List all pipeline stages
   */
  async listStages(): Promise<Stage[]> {
    return this.fetch<Stage[]>('/stages');
  }

  /**
   * Create a new stage
   */
  async createStage(payload: CreateStagePayload): Promise<Stage> {
    return this.fetch<Stage>('/stages', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Update a stage
   */
  async updateStage(key: string, payload: UpdateStagePayload): Promise<Stage> {
    return this.fetch<Stage>(`/stages/${key}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Delete a stage
   */
  async deleteStage(key: string): Promise<void> {
    return this.fetch<void>(`/stages/${key}`, {
      method: 'DELETE',
    });
  }

  /**
   * Reorder stages
   */
  async reorderStages(stages: Array<{ key: string; order: number }>): Promise<Stage[]> {
    return this.fetch<Stage[]>('/stages/reorder', {
      method: 'PUT',
      body: JSON.stringify({ stages }),
    });
  }

  // ==================== PIPELINE ====================

  /**
   * Get complete pipeline board data
   */
  async getPipelineBoard(): Promise<PipelineBoard> {
    return this.fetch<PipelineBoard>('/pipeline/board');
  }

  /**
   * Move a lead to a different stage
   */
  async moveLeadToStage(leadId: string, stageKey: string): Promise<Lead> {
    return this.fetch<Lead>(`/pipeline/leads/${leadId}/stage`, {
      method: 'PUT',
      body: JSON.stringify({ stageKey }),
    });
  }

  /**
   * Update lead status
   */
  async updateLeadStatus(leadId: string, statusKey: string): Promise<Lead> {
    return this.fetch<Lead>(`/pipeline/leads/${leadId}/status`, {
      method: 'PUT',
      body: JSON.stringify({ statusKey }),
    });
  }

  // ==================== REFERENCE DATA ====================

  /**
   * Get all lead statuses
   */
  async getStatuses(): Promise<Status[]> {
    return this.fetch<Status[]>('/reference/statuses');
  }

  /**
   * Get all lead sources
   */
  async getSources(): Promise<Source[]> {
    return this.fetch<Source[]>('/reference/sources');
  }

  /**
   * Get all lead priorities
   */
  async getPriorities(): Promise<Priority[]> {
    return this.fetch<Priority[]>('/reference/priorities');
  }

  // ==================== NOTES ====================

  /**
   * Get all notes for a lead
   */
  async getLeadNotes(leadId: string): Promise<Note[]> {
    return this.fetch<Note[]>(`/leads/${leadId}/notes`);
  }

  /**
   * Create a note for a lead
   */
  async createLeadNote(leadId: string, content: string, createdBy: string): Promise<Note> {
    return this.fetch<Note>(`/leads/${leadId}/notes`, {
      method: 'POST',
      body: JSON.stringify({ content, created_by: createdBy }),
    });
  }

  /**
   * Delete a note
   */
  async deleteLeadNote(leadId: string, noteId: string): Promise<void> {
    return this.fetch<void>(`/leads/${leadId}/notes/${noteId}`, {
      method: 'DELETE',
    });
  }
}

// Export singleton instance
export const dealsPipelineAPI = new DealsPipelineAPI();

// Export for custom instances
export default DealsPipelineAPI;

// Backwards-compatible functional API expected by frontend hooks
export const getLeads = (filters?: { stage?: string; status?: string; search?: string }) =>
  dealsPipelineAPI.listLeads(filters);

export const getLeadById = (id: string | number) => dealsPipelineAPI.getLead(String(id));
export const getLeadsWithConversations = (filters?: any) => dealsPipelineAPI.listLeads(filters);
export const getLeadsByStage = (stageId: string | number) => dealsPipelineAPI.listLeads({ stage: String(stageId) });

export const getPipelineData = (page?: number, limit?: number) => dealsPipelineAPI.getPipelineBoard();
export const getPipelineStats = (filters?: any) => dealsPipelineAPI.getLeadStats();

export const createLead = (params: any) => dealsPipelineAPI.createLead(params);
export const updateLead = (idOrParams: any, maybePayload?: any) => {
  if (typeof idOrParams === 'string' || typeof idOrParams === 'number') return dealsPipelineAPI.updateLead(String(idOrParams), maybePayload);
  return dealsPipelineAPI.updateLead(idOrParams.id, idOrParams);
};
export const deleteLead = (id: string | number) => dealsPipelineAPI.deleteLead(String(id));

export const moveLeadToStage = (leadId: string | number, stageKey: string) => dealsPipelineAPI.moveLeadToStage(String(leadId), stageKey);
export const updateLeadStatus = (leadId: string | number, status: string) => dealsPipelineAPI.updateLeadStatus(String(leadId), status);
export const assignLeadsToUser = async (params: any) => {
  // Not implemented server-side in SDK client; keep a stub for compile-time compatibility
  return Promise.resolve(undefined as any);
};

// Notes / Comments / Activities
export const getLeadActivities = (leadId: string | number) => dealsPipelineAPI.getLeadNotes(String(leadId)) as any;
export const getLeadComments = (leadId: string | number) => dealsPipelineAPI.getLeadNotes(String(leadId));
export const getLeadNotes = (leadId: string | number) => dealsPipelineAPI.getLeadNotes(String(leadId));
export const addLeadComment = (leadId: string | number, content: string, createdBy?: string) =>
  dealsPipelineAPI.createLeadNote(String(leadId), content, createdBy || '');
export const addLeadNote = (leadId: string | number, content: string, createdBy?: string) =>
  dealsPipelineAPI.createLeadNote(String(leadId), content, createdBy || '');
export const updateLeadComment = async (leadId: string | number, commentId: string, content: string) => {
  // Stub - not available in current API client
  return Promise.resolve(undefined as any);
};
export const updateLeadNote = async (leadId: string | number, noteId: string, content: string) => {
  // Stub - not available in current API client
  return Promise.resolve(undefined as any);
};
export const deleteLeadComment = (leadId: string | number, noteId: string) => dealsPipelineAPI.deleteLeadNote(String(leadId), noteId);
export const deleteLeadNote = (leadId: string | number, noteId: string) => dealsPipelineAPI.deleteLeadNote(String(leadId), noteId);

// Attachments (stubs)
export const getLeadAttachments = async (leadId: string | number) => Promise.resolve([] as any);
export const uploadLeadAttachment = async (_leadId: string | number, _file: any) => Promise.resolve(undefined as any);
export const deleteLeadAttachment = async (_leadId: string | number, _attachmentId: string) => Promise.resolve(undefined as any);

// Reference data wrappers
export const getStatuses = () => dealsPipelineAPI.getStatuses();
export const getSources = () => dealsPipelineAPI.getSources();
export const getPriorities = () => dealsPipelineAPI.getPriorities();

// Stages wrappers
export const getStages = () => dealsPipelineAPI.listStages();
export const createStage = (name: string, positionStageId?: string | null, positionType?: 'before' | 'after') => 
  dealsPipelineAPI.createStage({ key: name, label: name, order: 0 });
export const updateStage = (key: string, payload: any) => dealsPipelineAPI.updateStage(key, payload);
export const deleteStage = (key: string) => dealsPipelineAPI.deleteStage(key);
export const reorderStages = (params: any) => dealsPipelineAPI.reorderStages(params.stageOrders || params);

// Tags (stubs)
export const createTag = async (_payload: any) => Promise.resolve(undefined as any);
export const getLeadTags = async (leadId: string | number) => Promise.resolve([] as any);
export const addTagToLead = async (leadId: string | number, tagData: any) => Promise.resolve(undefined as any);
export const deleteTagFromLead = async (leadId: string | number, tagId: string) => Promise.resolve(undefined as any);
