/**
 * Pipeline Service - Web Layer
 * Contains web-specific pipeline operations and API calls
 */

import api from './api';
import { enhanceLeadsWithLabels, getStatusOptions } from '../utils/statusMappings';
import { Lead } from '../features/deals-pipeline/components/leads/types';
import { Stage } from '../store/slices/pipelineSlice';
import { Status, Priority, Source } from '../store/slices/masterDataSlice';

const API_ENDPOINTS = {
  stages: '/api/deals-pipeline/stages',
  statuses: '/api/deals-pipeline/statuses', 
  pipeline: '/api/deals-pipeline/pipeline/board',
  leads: '/api/deals-pipeline/leads'
};

let stagesCache: Stage[] | null = null;
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
    
    // Enhance leads with status and stage labels
    if (data.leads && data.stages) {
      data.leads = enhanceLeadsWithLabels(data.leads, data.stages) as Lead[];
    }
    
    return data;
  } catch (error) {
    console.error('Error fetching pipeline data:', error);
    throw error;
  }
};

// Get pipeline overview/statistics
export const fetchPipelineOverview = async (): Promise<unknown> => {
  const response = await api.get('/api/deals-pipeline/stats');
  return response.data;
};

// Move lead between pipeline stages
export const moveLeadToStage = async (leadId: string | number, newStage: string): Promise<Lead> => {
  const response = await api.put(`/api/pipeline/leads/${leadId}/stage`, { stage: newStage });
  return response.data as Lead;
};

// Update lead status
export const updateLeadStatus = async (leadId: string | number, status: string): Promise<Lead> => {
  try {
    if (!status) {
      throw new Error('Status is required');
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log('[pipelineService.updateLeadStatus] ->', { leadId, status });
    }
    const response = await api.put(`/api/pipeline/leads/${leadId}/status`, { status });
    if (process.env.NODE_ENV === 'development') {
      console.log('[pipelineService.updateLeadStatus] <- response', response.status, response.data);
    }
    return response.data as Lead;
  } catch (error) {
    console.error('Error updating lead status:', error);
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
  
  try {
    const response = await api.get(API_ENDPOINTS.stages);
    stagesCache = response.data as Stage[];
    return stagesCache;
  } catch (error) {
    console.error('Error fetching stages:', error);
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
    const stages = await fetchStages();
    console.log('[addStage] All stages ordered by display_order:', stages.map(s => ({ 
      key: s.key, 
      id: (s as { id?: string }).id,
      name: (s as { name?: string }).name, 
      order: s.order || s.display_order 
    })).sort((a, b) => (a.order || 0) - (b.order || 0)));
    
    console.log('[addStage] Looking for positionStageId:', positionStageId);
    console.log('[addStage] Available stage keys:', stages.map(s => s.key));
    console.log('[addStage] Available stage ids:', stages.map(s => (s as { id?: string }).id));
    
    const referenceStage = stages.find(s => (s as { id?: string }).id === positionStageId || s.key === positionStageId);
    console.log('[addStage] Reference stage found:', referenceStage);
    console.log('[addStage] Position type:', positionType);
    
    if (referenceStage) {
      const referenceOrder = referenceStage.order || referenceStage.display_order || 0;
      const newOrder = positionType === 'before' 
        ? referenceOrder 
        : referenceOrder + 1;
      console.log('[addStage] Calculated new order:', newOrder, 'for', positionType, 'reference order:', referenceOrder);
      stageData.displayOrder = newOrder;
    } else {
      console.error('[addStage] Reference stage NOT FOUND for positionStageId:', positionStageId);
    }
  } else {
    // If no position specified, add at the end
    const stages = await fetchStages();
    const maxOrder = Math.max(...stages.map(s => s.order || s.display_order || 0), 0);
    stageData.displayOrder = maxOrder + 1;
  }
  
  console.log('[addStage] Sending stage data to backend:', stageData);
  const response = await api.post('/api/deals-pipeline/stages', stageData);
  console.log('[addStage] Backend response:', response.data);
  // Invalidate cache
  stagesCache = null;
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
  return response.data as Stage;
};

// Delete stage
export const deleteStage = async (stageKey: string): Promise<void> => {
  await api.delete(`/api/deals-pipeline/stages/${stageKey}`);
  // Invalidate cache
  stagesCache = null;
};

// Reorder stages
export const reorderStages = async (stageOrders: StageOrders[]): Promise<void> => {
  await api.put('/api/deals-pipeline/stages/reorder', { stageOrders });
  // Invalidate cache
  stagesCache = null;
};

// Create stage (alias for consistency)
export const createStage = addStage;

// ========================
// MASTER DATA (using /leads endpoints)
// ========================

// Get all statuses for dropdowns
export const fetchStatuses = async (): Promise<Status[]> => {
  const response = await api.get('/api/deals-pipeline/statuses');
  return response.data as Status[];
};

// Get all sources for dropdowns  
export const fetchSources = async (): Promise<Source[]> => {
  const response = await api.get('/api/deals-pipeline/sources');
  return response.data as Source[];
};

// Get all priorities for dropdowns
export const fetchPriorities = async (): Promise<Priority[]> => {
  const response = await api.get('/api/deals-pipeline/priorities');
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
    
    // Get stages for label mapping
    const stages = await fetchStages();
    
    // Enhance leads with status and stage labels
    return enhanceLeadsWithLabels(data, stages) as Lead[];
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
    const response = await api.put(`/api/deals-pipeline/${leadId}`, leadData);
    
    // Invalidate caches after successful update
    stagesCache = null;
    
    return response.data as Lead;
  } catch (error) {
    console.error('Error updating lead:', error);
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
    await api.delete(`/api/deals-pipeline/${leadId}`);
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
    console.error('Error fetching deals pipeline board:', error);
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
    const err = error as Error;
    console.error('Failed to fetch comments:', err.message);
    throw error;
  }
};

export const postComment = async (leadId: string | number, commentText: string): Promise<unknown> => {
  try {
    const { data } = await api.post(`/api/comments/${leadId}`, { comment: commentText });
    return data;
  } catch (error) {
    const err = error as Error;
    console.error('Failed to post comment:', err.message);
    throw error;
  }
};

// Get all attachments for a lead
export const fetchAttachments = async (leadId: string | number): Promise<unknown[]> => {
  try {
    const { data } = await api.get(`/api/deals-pipeline/${leadId}/attachments`);
    return data as unknown[];
  } catch (error) {
    const err = error as Error;
    console.error('Failed to fetch attachments:', err.message);
    throw error;
  }
};

// Upload a new attachment for a lead
export const uploadAttachment = async (leadId: string | number, file: File): Promise<unknown> => {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const { data } = await api.post(`/api/deals-pipeline/${leadId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return data;
  } catch (error) {
    const err = error as Error;
    console.error('Failed to upload attachment:', err.message);
    throw error;
  }
};

