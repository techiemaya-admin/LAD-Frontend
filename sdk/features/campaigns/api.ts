/**
 * Campaigns Feature - API Functions
 * 
 * All HTTP API calls for the campaigns feature.
 * Uses the shared apiClient for consistent request handling.
 */

import { apiClient } from '../../shared/apiClient';
import type {
  Campaign,
  CampaignStats,
  CampaignFilters,
  CreateCampaignRequest,
  UpdateCampaignRequest,
  CampaignAnalytics,
  CampaignLead,
} from './types';

/**
 * Get all campaigns with optional filters
 */
export async function getCampaigns(filters?: CampaignFilters): Promise<Campaign[]> {
  const params: Record<string, string> = {};
  if (filters?.search) params.search = filters.search;
  if (filters?.status && filters.status !== 'all') params.status = filters.status;

  const response = await apiClient.get<{ data: Campaign[] }>('/api/campaigns', { params });
  return response.data.data || [];
}

/**
 * Get a single campaign by ID
 */
export async function getCampaign(campaignId: string): Promise<Campaign> {
  const response = await apiClient.get<{ data: Campaign }>(`/api/campaigns/${campaignId}`);
  return response.data.data;
}

/**
 * Get campaign statistics
 */
export async function getCampaignStats(): Promise<CampaignStats> {
  const response = await apiClient.get<{ data: CampaignStats }>('/api/campaigns/stats');
  return response.data.data;
}

/**
 * Create a new campaign
 */
export async function createCampaign(data: CreateCampaignRequest): Promise<Campaign> {
  const response = await apiClient.post<{ data: Campaign }>('/api/campaigns', data);
  return response.data.data;
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(
  campaignId: string,
  data: UpdateCampaignRequest
): Promise<Campaign> {
  const response = await apiClient.put<{ data: Campaign }>(`/api/campaigns/${campaignId}`, data);
  return response.data.data;
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(campaignId: string): Promise<void> {
  await apiClient.delete(`/api/campaigns/${campaignId}`);
}

/**
 * Start a campaign
 */
export async function startCampaign(campaignId: string): Promise<void> {
  await apiClient.post(`/api/campaigns/${campaignId}/start`, {});
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(campaignId: string): Promise<void> {
  await apiClient.post(`/api/campaigns/${campaignId}/pause`, {});
}

/**
 * Stop a campaign
 */
export async function stopCampaign(campaignId: string): Promise<void> {
  await apiClient.post(`/api/campaigns/${campaignId}/stop`, {});
}

/**
 * Get campaign analytics
 */
export async function getCampaignAnalytics(campaignId: string): Promise<CampaignAnalytics> {
  const response = await apiClient.get<{ data: CampaignAnalytics }>(
    `/api/campaigns/${campaignId}/analytics`
  );
  return response.data.data;
}

/**
 * Get campaign leads
 */
export async function getCampaignLeads(
  campaignId: string,
  filters?: { search?: string }
): Promise<CampaignLead[]> {
  const params: Record<string, string> = {};
  if (filters?.search) params.search = filters.search;

  const response = await apiClient.get<{ data: CampaignLead[] }>(
    `/api/campaigns/${campaignId}/leads`,
    { params }
  );
  return response.data.data || [];
}

/**
 * Get or generate lead profile summary
 */
export async function getLeadProfileSummary(
  campaignId: string,
  leadId: string
): Promise<{ summary: string | null; exists: boolean }> {
  const response = await apiClient.get<{ success: boolean; summary: string | null; exists: boolean }>(
    `/api/campaigns/${campaignId}/leads/${leadId}/summary`
  );
  return {
    summary: response.data.summary || null,
    exists: response.data.exists || false,
  };
}

/**
 * Generate lead profile summary
 */
export async function generateLeadProfileSummary(
  campaignId: string,
  leadId: string
): Promise<{ summary: string }> {
  const response = await apiClient.post<{ success: boolean; summary: string }>(
    `/api/campaigns/${campaignId}/leads/${leadId}/summary`,
    {}
  );
  return { summary: response.data.summary };
}

