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

  /**
   * Initialize API client
   * PRODUCTION: Requires NEXT_PUBLIC_BACKEND_URL or baseUrl parameter
   * DEVELOPMENT: Falls back to localhost:3004
   */
  constructor(baseUrl?: string, headers: HeadersInit = {}) {
    // Get URL from parameter or environment
    const envUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
    
    // PRODUCTION: Fail fast if no URL provided
    if (process.env.NODE_ENV === 'production' && !baseUrl && !envUrl) {
      throw new Error('NEXT_PUBLIC_BACKEND_URL is required in production for deals-pipeline API');
    }
    
    // Use provided URL, env var, or localhost fallback
    this.baseUrl = baseUrl || (envUrl ? `${envUrl}/api/deals-pipeline` : 'http://localhost:3004/api/deals-pipeline');
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
