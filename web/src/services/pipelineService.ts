/**
 * Pipeline Service - Web Layer
 * Contains web-specific pipeline operations and API calls
 */
import { logger } from '../lib/logger';
import api from './api';
import { enhanceLeadsWithLabels, getStatusOptions } from '../utils/statusMappings';
import { Lead } from '../features/deals-pipeline/types';
import { Stage } from '../features/deals-pipeline/store/slices/pipelineSlice';
import { Status, Priority, Source } from '../store/slices/masterDataSlice';
const API_ENDPOINTS = {
  stages: '/api/deals-pipeline/stages',
  statuses: '/api/deals-pipeline/reference/statuses', 
  pipeline: '/api/deals-pipeline/pipeline/board',
  leads: '/api/deals-pipeline/leads'
};
let stagesCache: Stage[] | null = null;
let stagesCachePromise: Promise<Stage[]> | null = null;
let statusOptionsCache: unknown[] | null = null;
let stagesCacheExpiry: number | null = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
interface PipelineData {
  leads: Lead[];
  stages: Stage[];
  [key: string]: unknown;
}
interface StageOrders {
  key: string;
  order: number;
}
// ========================
// PIPELINE BOARD OPERATIONS
// ========================
// Get complete pipeline board data (stages + leads)
export const fetchPipelineData = async (): Promise<PipelineData> => {
  try {
    const response = await api.get(API_ENDPOINTS.pipeline);
    const data = response.data as PipelineData;
    if (Array.isArray(data.leads)) {
      data.leads = data.leads.map((rawLead: any) => {
        const firstName = rawLead.first_name || rawLead.firstName || '';
        const lastName = rawLead.last_name || rawLead.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        return {
          ...rawLead,
          name: rawLead.name || fullName || undefined,
        } as Lead;
      });
    }
    // Enhance leads with status and stage labels
    if (data.leads && data.stages) {
      data.leads = enhanceLeadsWithLabels(data.leads, data.stages) as Lead[];
    }
    return data;
  } catch (error) {
    logger.error('Error fetching pipeline data', error);
    throw error;
  }
};
// Get pipeline overview/statistics
export const fetchPipelineOverview = async (): Promise<unknown> => {
  const response = await api.get('/api/deals-pipeline/leads/stats');
  return response.data;
};
// Move lead between pipeline stages
export const moveLeadToStage = async (leadId: string | number, newStage: string): Promise<Lead> => {
  // Prefer the feature-scoped routes
  const preferredUrls = [
    `/api/deals-pipeline/pipeline/leads/${leadId}/stage`,
  ];
  for (const url of preferredUrls) {
    try {
      try {
        const response = await api.put(url, { stage: newStage });
        return response.data as Lead;
      } catch (error: any) {
        const status = error?.response?.status;
        const message = String(error?.response?.data?.error || error?.response?.data?.message || '');
        if (status === 400 && message.toLowerCase().includes('stagekey')) {
          const retry = await api.put(url, { stageKey: newStage, stage: newStage });
          return retry.data as Lead;
        }
        throw error;
      }
    } catch (error: any) {
      const status = error?.response?.status;
      if (status === 404) continue;
      throw error;
    }
  }
  throw new Error('Failed to update lead stage (no matching endpoint)');
};
// Update lead status
export const updateLeadStatus = async (leadId: string | number, status: string): Promise<Lead> => {
  try {
    if (!status) {
      throw new Error('Status is required');
    }
    logger.debug('Updating lead status', { leadId, status });
    const preferredUrls = [
      `/api/deals-pipeline/pipeline/leads/${leadId}/status`,
    ];
    for (const url of preferredUrls) {
      try {
        try {
          const response = await api.put(url, { status });
          logger.debug('Lead status updated', { statusCode: response.status });
          return response.data as Lead;
        } catch (error: any) {
          const statusCode = error?.response?.status;
          const message = String(error?.response?.data?.error || error?.response?.data?.message || '');
          if (statusCode === 400 && message.toLowerCase().includes('statuskey')) {
            const retry = await api.put(url, { statusKey: status, status });
            logger.debug('Lead status updated (retry)', { statusCode: retry.status });
            return retry.data as Lead;
          }
          throw error;
        }
      } catch (error: any) {
        const statusCode = error?.response?.status;
        if (statusCode === 404) continue;
        throw error;
      }
    }
    throw new Error('Failed to update lead status (no matching endpoint)');
  } catch (error) {
    logger.error('Error updating lead status', error);
    throw error;
  }
};
// ========================
// STAGE MANAGEMENT
// ========================
// Get all pipeline stages
export const fetchStages = async (): Promise<Stage[]> => {
  if (stagesCache) {
    return stagesCache;
  }
  if (stagesCachePromise) {
    return stagesCachePromise;
  }
  try {
    stagesCachePromise = api
      .get(API_ENDPOINTS.stages)
      .then((response) => {
        stagesCache = response.data as Stage[];
        return stagesCache;
      })
      .finally(() => {
        stagesCachePromise = null;
      });
    return await stagesCachePromise;
  } catch (error) {
    logger.error('Error fetching stages', error);
    throw error;
  }
};
// Get status options (using client-side mappings)
export const getStatusOptionsForUI = (): unknown[] => {
  if (!statusOptionsCache) {
    statusOptionsCache = getStatusOptions();
  }
  return statusOptionsCache;
};
// Create new stage
export const addStage = async (name: string, positionStageId: string | null = null, positionType: 'before' | 'after' = 'after'): Promise<Stage> => {
  // Generate a key from the name
  const key = name.toLowerCase()
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50); // Limit length
  const stageData: Partial<Stage> & { displayOrder?: number } = {
    key,
    label: name
  };
  // Handle positioning
  if (positionStageId) {
    // Always fetch fresh stages data (don't use cache) to avoid stale data
    stagesCache = null;
    stagesCachePromise = null;
    const stages = await fetchStages();
    logger.debug('All stages fetched', { stageCount: stages.length });
    logger.debug('Looking for position stage', { positionStageId });
    logger.debug('Available stage count', { count: stages.length });
    const referenceStage = stages.find(s => (s as { id?: string }).id === positionStageId || s.key === positionStageId);
    logger.debug('Reference stage search result', { found: !!referenceStage });
    logger.debug('Position type', { positionType });
    if (referenceStage) {
      const referenceOrder = referenceStage.order || referenceStage.display_order || 0;
      const newOrder = positionType === 'before' 
        ? referenceOrder 
        : referenceOrder + 1;
      logger.debug('Calculated new order for stage', { newOrder, positionType, referenceOrder });
      stageData.displayOrder = newOrder;
    } else {
      logger.error('Reference stage not found', new Error(`positionStageId: ${positionStageId}`));
    }
  } else {
    // If no position specified, add at the end
    const stages = await fetchStages();
    const maxOrder = Math.max(...stages.map(s => s.order || s.display_order || 0), 0);
    stageData.displayOrder = maxOrder + 1;
  }
  logger.debug('Sending stage data to backend');
  const response = await api.post('/api/deals-pipeline/stages', stageData);
  logger.debug('Stage created successfully');
  // Invalidate cache
  stagesCache = null;
  stagesCachePromise = null;
  return response.data as Stage;
};
// Update stage
export const updateStage = async (stageKey: string, updates: Partial<Stage> | string): Promise<Stage> => {
  // Handle both old format (just label) and new format (object)
  const updateData: Partial<Stage> = typeof updates === 'string' 
    ? { label: updates }
    : updates;
  const response = await api.put(`/api/deals-pipeline/stages/${stageKey}`, updateData);
  // Invalidate cache
  stagesCache = null;
  stagesCachePromise = null;
  return response.data as Stage;
};
// Delete stage
export const deleteStage = async (stageKey: string): Promise<void> => {
  await api.delete(`/api/deals-pipeline/stages/${stageKey}`);
  // Invalidate cache
  stagesCache = null;
  stagesCachePromise = null;
};
// Reorder stages
export const reorderStages = async (stageOrders: StageOrders[]): Promise<void> => {
  await api.put('/api/deals-pipeline/stages/reorder', { stageOrders });
  // Invalidate cache
  stagesCache = null;
  stagesCachePromise = null;
};
// Create stage (alias for consistency)
export const createStage = addStage;
// ========================
// MASTER DATA (using /leads endpoints)
// ========================
// Get all statuses for dropdowns
export const fetchStatuses = async (): Promise<Status[]> => {
  const response = await api.get('/api/deals-pipeline/reference/statuses');
  return response.data as Status[];
};
// Get all sources for dropdowns  
export const fetchSources = async (): Promise<Source[]> => {
  const response = await api.get('/api/deals-pipeline/reference/sources');
  return response.data as Source[];
};
// Get all priorities for dropdowns
export const fetchPriorities = async (): Promise<Priority[]> => {
  const response = await api.get('/api/deals-pipeline/reference/priorities');
  return response.data as Priority[];
};
// ========================
// LEAD OPERATIONS (delegates to /leads)
// ========================
// Fetch leads
export const fetchLeads = async (): Promise<Lead[]> => {
  try {
    const { data } = await api.get('/api/deals-pipeline/leads');
    if (!Array.isArray(data)) {
      return [];
    }
    // Normalize API payload to ensure a combined `name` field exists
    const normalizedLeads = data.map((rawLead: any) => {
      const firstName = rawLead.first_name || rawLead.firstName || '';
      const lastName = rawLead.last_name || rawLead.lastName || '';
      const fullName = `${firstName} ${lastName}`.trim();
      return {
        ...rawLead,
        // Prefer explicit name if already present, otherwise fall back to combined
        name: rawLead.name || fullName || undefined,
      } as Lead;
    });
    // Get stages for label mapping
    const stages = await fetchStages();
    // Enhance leads with status and stage labels
    return enhanceLeadsWithLabels(normalizedLeads, stages) as Lead[];
  } catch (error) {
    throw error;
  }
};
// Create lead
export const createLead = async (leadData: Partial<Lead>): Promise<Lead> => {
  const { data } = await api.post('/api/deals-pipeline/leads', leadData);
  return data as Lead;
};
// Update lead
export const updateLead = async (leadId: string | number, leadData: Partial<Lead>): Promise<Lead> => {
  try {
    const response = await api.put(`/api/deals-pipeline/leads/${leadId}`, leadData);
    // Invalidate caches after successful update
    stagesCache = null;
    return response.data as Lead;
  } catch (error) {
    logger.error('Error updating lead', error);
    throw error;
  }
};
// Update lead stage (legacy support)
export const updateLeadStage = async (leadId: string | number, stageName: string): Promise<Lead> => {
  return await moveLeadToStage(leadId, stageName);
};
// Delete lead
export const deleteLead = async (leadId: string | number): Promise<void> => {
  try {
    await api.delete(`/api/deals-pipeline/leads/${leadId}`);
  } catch (error) {
    const axiosError = error as { response?: { data?: { error?: string } } };
    throw new Error(axiosError.response?.data?.error || 'Failed to delete lead');
  }
}; 
// Legacy deals pipeline board (maps to new endpoint)
export const fetchDealsPipelineBoard = async (): Promise<PipelineData> => {
  try {
    return await fetchPipelineData();
  } catch (error) {
    logger.error('Error fetching deals pipeline board', error);
    throw error;
  }
};
// Legacy alias for fetchPipelineData
export const fetchPipelineBoard = fetchPipelineData;
// Comments operations (you'll need to add these to routes/leads.js)
export const getComments = async (leadId: string | number): Promise<unknown[]> => {
  try {
    const { data } = await api.get(`/api/comments/${leadId}`);
    return data as unknown[];
  } catch (error) {
    logger.error('Failed to fetch comments', error);
    throw error;
  }
};
export const postComment = async (leadId: string | number, commentText: string): Promise<unknown> => {
  try {
    const { data } = await api.post(`/api/comments/${leadId}`, { comment: commentText });
    return data;
  } catch (error) {
    logger.error('Failed to post comment', error);
    throw error;
  }
};
// Get all attachments for a lead
export const fetchAttachments = async (leadId: string | number): Promise<unknown[]> => {
  try {
    const { data } = await api.get(`/api/deals-pipeline/leads/${leadId}/attachments`);
    return data as unknown[];
  } catch (error) {
    logger.error('Failed to fetch attachments', error);
    throw error;
  }
};
// Upload a new attachment for a lead
export const uploadAttachment = async (leadId: string | number, file: File): Promise<unknown> => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    const { data } = await api.post(`/api/deals-pipeline/leads/${leadId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  } catch (error) {
    logger.error('Failed to upload attachment', error);
    throw error;
  }
};