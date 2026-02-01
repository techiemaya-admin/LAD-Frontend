import { safeStorage } from '../utils/storage';
import { getApiUrl, defaultFetchOptions } from '../config/api';
import { logger } from '../lib/logger';
import { Lead } from '../features/deals-pipeline/types';
// Cache for performance
interface LeadsCache {
  leads: Lead[] | null;
  lastFetch: number | null;
  cacheDuration: number;
}
let cache: LeadsCache = {
  leads: null,
  lastFetch: null,
  cacheDuration: 5 * 60 * 1000 // 5 minutes
};
interface LeadFilters {
  [key: string]: string | number | null | undefined;
}
interface TagData {
  name: string;
  [key: string]: unknown;
}
interface NoteData {
  content: string;
  [key: string]: unknown;
}
interface CommentData {
  content: string;
  [key: string]: unknown;
}
interface AttachmentData {
  file: File;
  [key: string]: unknown;
}
const buildDealsPipelineLeadSubresourceUrl = (leadId: string | number, subPath: string) => {
  // Preferred (matches backend + Postman): /api/deals-pipeline/leads/:id/...
  const preferred = getApiUrl(`/api/deals-pipeline/leads/${leadId}/${subPath}`);
  // Legacy fallback seen in some older client code: /api/deals-pipeline/:id/...
  const legacy = getApiUrl(`/api/deals-pipeline/${leadId}/${subPath}`);
  return { preferred, legacy };
};
const fetchDealsPipelineLeadSubresource = async (
  leadId: string | number,
  subPath: string,
  init?: RequestInit,
): Promise<Response> => {
  const { preferred, legacy } = buildDealsPipelineLeadSubresourceUrl(leadId, subPath);
  const response = await fetch(preferred, init);
  if (response.status !== 404) return response;
  return fetch(legacy, init);
};
const getAuthToken = () => safeStorage.getItem('token') || safeStorage.getItem('token') || '';
const leadsService = {
  // Get all leads with optional filters
  async getAllLeads(filters: LeadFilters = {}): Promise<Lead[]> {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        const value = filters[key];
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, String(value));
        }
      });
      const queryString = params.toString();
      const url = queryString ? getApiUrl(`/api/deals-pipeline/leads?${queryString}`) : getApiUrl('/api/deals-pipeline/leads');
      const response = await fetch(url, defaultFetchOptions());
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      // Handle case where API returns an object with leads/data property or direct array
      const leadsArray = Array.isArray(data) ? data : (data?.leads || data?.data || []);
      if (!Array.isArray(leadsArray)) {
        logger.warn('Invalid response format from getAllLeads, returning empty array');
        return [];
      }
      return leadsArray;
    } catch (error) {
      logger.error('Error fetching leads', error);
      throw error;
    }
  },
  // Get a single lead by ID
  async getLeadById(id: string | number): Promise<Lead> {
    try {
      const response = await fetch(getApiUrl(`/api/deals-pipeline/leads/${id}`), defaultFetchOptions());
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error fetching lead', error);
      throw error;
    }
  },
  // Create a new lead
  async createLead(leadData: Partial<Lead>): Promise<Lead> {
    try {
      const response = await fetch(getApiUrl('/api/deals-pipeline/leads'), {
        ...defaultFetchOptions(),
        method: 'POST',
        body: JSON.stringify(leadData)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      this.clearCache(); // Clear cache after creating
      return await response.json();
    } catch (error) {
      logger.error('Error creating lead', error);
      throw error;
    }
  },
  // Update an existing lead
  async updateLead(id: string | number, leadData: Partial<Lead>): Promise<Lead> {
    try {
      const response = await fetch(getApiUrl(`/api/deals-pipeline/leads/${id}`), {
        ...defaultFetchOptions(),
        method: 'PUT',
        body: JSON.stringify(leadData)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      this.clearCache(); // Clear cache after updating
      return await response.json();
    } catch (error) {
      logger.error('Error updating lead', error);
      throw error;
    }
  },
  // Delete a lead
  async deleteLead(id: string | number): Promise<void> {
    try {
      const response = await fetch(getApiUrl(`/api/deals-pipeline/leads/${id}`), {
        ...defaultFetchOptions(),
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      this.clearCache(); // Clear cache after deleting
      await response.json();
    } catch (error) {
      logger.error('Error deleting lead', error);
      throw error;
    }
  },
  // Move lead to different stage
  async moveLeadToStage(leadId: string | number, stageKey: string): Promise<Lead> {
    try {
      const response = await fetch(getApiUrl(`/api/deals-pipeline/pipeline/leads/${leadId}/stage`), {
        ...defaultFetchOptions(),
        method: 'PUT',
        body: JSON.stringify({ stage: stageKey, stageKey })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      this.clearCache(); // Clear cache after moving
      return await response.json();
    } catch (error) {
      logger.error('Error moving lead to stage', error);
      throw error;
    }
  },
  // Get leads by stage
  async getLeadsByStage(stageId: string | number): Promise<Lead[]> {
    try {
      const response = await fetch(getApiUrl(`/api/deals-pipeline/leads?stageId=${stageId}`), defaultFetchOptions());
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error fetching leads by stage', error);
      throw error;
    }
  },
  // Get lead tags
  async getLeadTags(leadId: string | number): Promise<unknown[]> {
    try {
      const response = await fetchDealsPipelineLeadSubresource(leadId, 'tags', defaultFetchOptions());
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error fetching lead tags', error);
      throw error;
    }
  },
  // Add tag to lead
  async addTagToLead(leadId: string | number, tagData: TagData): Promise<unknown> {
    try {
      const response = await fetchDealsPipelineLeadSubresource(leadId, 'tags', {
        ...defaultFetchOptions(),
        method: 'POST',
        body: JSON.stringify(tagData)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error adding tag to lead', error);
      throw error;
    }
  },
  // Get lead notes
  async getLeadNotes(leadId: string | number): Promise<unknown[]> {
    try {
      const response = await fetchDealsPipelineLeadSubresource(leadId, 'notes', defaultFetchOptions());
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error fetching lead notes', error);
      throw error;
    }
  },
  // Add note to lead
  async addNoteToLead(leadId: string | number, noteData: NoteData): Promise<unknown> {
    try {
      const response = await fetchDealsPipelineLeadSubresource(leadId, 'notes', {
        ...defaultFetchOptions(),
        method: 'POST',
        body: JSON.stringify(noteData)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error adding note to lead', error);
      throw error;
    }
  },
  // Get lead comments
  async getLeadComments(leadId: string | number): Promise<unknown[]> {
    try {
      const response = await fetchDealsPipelineLeadSubresource(leadId, 'comments', defaultFetchOptions());
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error fetching lead comments', error);
      throw error;
    }
  },
  // Add comment to lead
  async addCommentToLead(leadId: string | number, commentData: CommentData): Promise<unknown> {
    try {
      const response = await fetchDealsPipelineLeadSubresource(leadId, 'comments', {
        ...defaultFetchOptions(),
        method: 'POST',
        body: JSON.stringify(commentData)
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error adding comment to lead', error);
      throw error;
    }
  },
  // Get lead attachments
  async getLeadAttachments(leadId: string | number): Promise<unknown[]> {
    try {
      const response = await fetchDealsPipelineLeadSubresource(leadId, 'attachments', defaultFetchOptions());
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error fetching lead attachments', error);
      throw error;
    }
  },
  // Add attachment to lead
  async addAttachmentToLead(leadId: string | number, attachmentData: AttachmentData): Promise<unknown> {
    try {
      const formData = new FormData();
      formData.append('file', attachmentData.file);
      const response = await fetchDealsPipelineLeadSubresource(leadId, 'attachments', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error adding attachment to lead', error);
      throw error;
    }
  },
  // Add lead note
  async addLeadNote(leadId: string | number, content: string): Promise<unknown> {
    try {
      const response = await fetchDealsPipelineLeadSubresource(leadId, 'notes', {
        ...defaultFetchOptions(),
        method: 'POST',
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error adding lead note', error);
      throw error;
    }
  },
  // Delete note
  async deleteLeadNote(leadId: string | number, noteId: string | number): Promise<void> {
    try {
      const response = await fetchDealsPipelineLeadSubresource(leadId, `notes/${noteId}`, {
        ...defaultFetchOptions(),
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await response.json();
    } catch (error) {
      logger.error('Error deleting lead note', error);
      throw error;
    }
  },
  // Update note
  async updateLeadNote(leadId: string | number, noteId: string | number, content: string): Promise<unknown> {
    try {
      const response = await fetchDealsPipelineLeadSubresource(leadId, `notes/${noteId}`, {
        ...defaultFetchOptions(),
        method: 'PUT',
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error updating lead note', error);
      throw error;
    }
  },
  // Add lead comment
  async addLeadComment(leadId: string | number, content: string): Promise<unknown> {
    try {
      const response = await fetchDealsPipelineLeadSubresource(leadId, 'comments', {
        ...defaultFetchOptions(),
        method: 'POST',
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error adding lead comment', error);
      throw error;
    }
  },
  // Delete comment
  async deleteLeadComment(leadId: string | number, commentId: string | number): Promise<void> {
    try {
      const response = await fetchDealsPipelineLeadSubresource(leadId, `comments/${commentId}`, {
        ...defaultFetchOptions(),
        method: 'DELETE'
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await response.json();
    } catch (error) {
      logger.error('Error deleting lead comment', error);
      throw error;
    }
  },
  // Update comment
  async updateLeadComment(leadId: string | number, commentId: string | number, content: string): Promise<unknown> {
    try {
      const response = await fetchDealsPipelineLeadSubresource(leadId, `comments/${commentId}`, {
        ...defaultFetchOptions(),
        method: 'PUT',
        body: JSON.stringify({ content })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error updating lead comment', error);
      throw error;
    }
  },
  // Upload attachment to lead
  async uploadLeadAttachment(leadId: string | number, file: File): Promise<unknown> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { preferred, legacy } = buildDealsPipelineLeadSubresourceUrl(leadId, 'attachments');
      const init: RequestInit = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        },
        body: formData
      };
      let response = await fetch(preferred, init);
      if (response.status === 404) {
        response = await fetch(legacy, init);
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error uploading lead attachment', error);
      throw error;
    }
  },
  // Delete attachment
  async deleteLeadAttachment(leadId: string | number, attachmentId: string | number): Promise<void> {
    try {
      const { preferred, legacy } = buildDealsPipelineLeadSubresourceUrl(leadId, `attachments/${attachmentId}`);
      const init: RequestInit = {
        ...defaultFetchOptions(),
        method: 'DELETE'
      };
      let response = await fetch(preferred, init);
      if (response.status === 404) {
        response = await fetch(legacy, init);
      }
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      await response.json();
    } catch (error) {
      logger.error('Error deleting lead attachment', error);
      throw error;
    }
  },
  // Get leads with conversation data for assignment
  async getLeadsWithConversations(): Promise<Lead[]> {
    try {
      const response = await fetch(getApiUrl('/api/deals-pipeline/with-conversations'), defaultFetchOptions());
      if (!response.ok) {
        // Handle 404 gracefully - endpoint may not be implemented yet
        if (response.status === 404) {
          logger.warn('Leads with conversations endpoint not found (404) - falling back to basic leads');
          return this.getAllLeads();
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // Handle case where API returns an object with leads/data property or direct array
      const leadsArray = Array.isArray(data) ? data : (data?.leads || data?.data || []);
      if (!Array.isArray(leadsArray)) {
        logger.warn('Invalid response format from getLeadsWithConversations, falling back to basic leads');
        return this.getAllLeads();
      }
      return leadsArray;
    } catch (error) {
      logger.warn('Leads with conversations endpoint not available, falling back to basic leads', error);
      // Fallback to basic leads if the specific endpoint is not available
      return this.getAllLeads();
    }
  },
  // Assign leads to a user (legacy function for backward compatibility)
  async assignLeadsToUser(userId: string, leadIds: (string | number)[]): Promise<unknown> {
    try {
      const response = await fetch(getApiUrl('/api/deals-pipeline/assign-to-user'), {
        ...defaultFetchOptions(),
        method: 'PUT',
        body: JSON.stringify({ userId, leadIds })
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      logger.error('Error assigning leads to user', error);
      throw error;
    }
  },
  // Cache management
  clearCache(): void {
    cache.leads = null;
    cache.lastFetch = null;
  },
  // Check if cache is valid
  isCacheValid(): boolean {
    return cache.leads !== null && cache.lastFetch !== null && 
           (Date.now() - cache.lastFetch) < cache.cacheDuration;
  }
};
export default leadsService;
