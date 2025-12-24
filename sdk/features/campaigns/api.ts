/**
 * Campaigns Feature - API Functions
 * 
 * All API paths are feature-prefixed: /campaigns/*
 * Uses shared apiClient from @/sdk/shared/apiClient
 */

import { apiClient } from '../../shared/apiClient';
import type {
  Campaign,
  CampaignStep,
  CampaignLead,
  CampaignLeadActivity,
  CampaignStats,
  CampaignCreateInput,
  CampaignUpdateInput,
  CampaignStepInput,
  AddLeadsInput,
  CampaignExecuteOptions,
  CampaignListParams,
} from './types';

// ============================================================================
// CAMPAIGN CRUD OPERATIONS
// ============================================================================

/**
 * Get list of campaigns
 */
export async function getCampaigns(params?: CampaignListParams): Promise<Campaign[]> {
  const response = await apiClient.get<{ data: Campaign[] }>('/campaigns', { params });
  return response.data;
}

/**
 * Get single campaign by ID
 */
export async function getCampaign(campaignId: string): Promise<Campaign> {
  const response = await apiClient.get<Campaign>(`/campaigns/${campaignId}`);
  return response.data;
}

/**
 * Create a new campaign
 */
export async function createCampaign(data: CampaignCreateInput): Promise<Campaign> {
  const response = await apiClient.post<{ data: Campaign }>('/campaigns', data);
  return response.data;
}

/**
 * Update an existing campaign
 */
export async function updateCampaign(
  campaignId: string,
  data: CampaignUpdateInput
): Promise<Campaign> {
  const response = await apiClient.put<{ data: Campaign }>(`/campaigns/${campaignId}`, data);
  return response.data;
}

/**
 * Delete a campaign
 */
export async function deleteCampaign(campaignId: string): Promise<void> {
  await apiClient.delete(`/campaigns/${campaignId}`);
}

// ============================================================================
// CAMPAIGN ACTIONS
// ============================================================================

/**
 * Activate a campaign
 */
export async function activateCampaign(campaignId: string): Promise<Campaign> {
  const response = await apiClient.post<{ data: Campaign }>(`/campaigns/${campaignId}/activate`);
  return response.data;
}

/**
 * Pause a campaign
 */
export async function pauseCampaign(campaignId: string): Promise<Campaign> {
  const response = await apiClient.post<{ data: Campaign }>(`/campaigns/${campaignId}/pause`);
  return response.data;
}

/**
 * Archive a campaign
 */
export async function archiveCampaign(campaignId: string): Promise<Campaign> {
  const response = await apiClient.post<{ data: Campaign }>(`/campaigns/${campaignId}/archive`);
  return response.data;
}

// ============================================================================
// CAMPAIGN STEPS
// ============================================================================

/**
 * Get all steps for a campaign
 */
export async function getCampaignSteps(campaignId: string): Promise<CampaignStep[]> {
  const response = await apiClient.get<{ data: CampaignStep[] }>(`/campaigns/${campaignId}/steps`);
  return response.data;
}

/**
 * Add a new step to a campaign
 */
export async function addCampaignStep(
  campaignId: string,
  step: CampaignStepInput
): Promise<CampaignStep> {
  const response = await apiClient.post<{ data: CampaignStep }>(
    `/campaigns/${campaignId}/steps`,
    step
  );
  return response.data;
}

/**
 * Update an existing campaign step
 */
export async function updateCampaignStep(
  campaignId: string,
  stepId: string,
  data: Partial<CampaignStepInput>
): Promise<CampaignStep> {
  const response = await apiClient.put<{ data: CampaignStep }>(
    `/campaigns/${campaignId}/steps/${stepId}`,
    data
  );
  return response.data;
}

/**
 * Delete a campaign step
 */
export async function deleteCampaignStep(campaignId: string, stepId: string): Promise<void> {
  await apiClient.delete(`/campaigns/${campaignId}/steps/${stepId}`);
}

// ============================================================================
// CAMPAIGN LEADS
// ============================================================================

/**
 * Get all leads in a campaign
 */
export async function getCampaignLeads(campaignId: string): Promise<CampaignLead[]> {
  const response = await apiClient.get<{ data: CampaignLead[] }>(`/campaigns/${campaignId}/leads`);
  return response.data;
}

/**
 * Add leads to a campaign
 */
export async function addLeadsToCampaign(
  campaignId: string,
  data: AddLeadsInput
): Promise<{ message: string; added: number }> {
  const response = await apiClient.post<{ message: string; added: number }>(
    `/campaigns/${campaignId}/leads`,
    data
  );
  return response.data;
}

/**
 * Remove a lead from a campaign
 */
export async function removeLeadFromCampaign(campaignId: string, leadId: string): Promise<void> {
  await apiClient.delete(`/campaigns/${campaignId}/leads/${leadId}`);
}

/**
 * Get activities for a campaign lead
 */
export async function getCampaignLeadActivities(
  campaignId: string,
  leadId: string
): Promise<CampaignLeadActivity[]> {
  const response = await apiClient.get<{ data: CampaignLeadActivity[] }>(
    `/campaigns/${campaignId}/leads/${leadId}/activities`
  );
  return response.data;
}

// ============================================================================
// CAMPAIGN EXECUTION
// ============================================================================

/**
 * Execute a campaign (run workflow engine)
 */
export async function executeCampaign(
  campaignId: string,
  options?: CampaignExecuteOptions
): Promise<{ message: string; campaignId: string; processed: number }> {
  const response = await apiClient.post<{
    message: string;
    campaignId: string;
    processed: number;
  }>(`/campaigns/${campaignId}/execute`, options);
  return response.data;
}

// ============================================================================
// CAMPAIGN STATISTICS
// ============================================================================

/**
 * Get campaign statistics
 */
export async function getCampaignStats(): Promise<CampaignStats> {
  const response = await apiClient.get<{ data: CampaignStats }>('/campaigns/stats');
  return response.data;
}
