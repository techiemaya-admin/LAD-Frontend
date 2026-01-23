/**
 * Campaigns Feature - API Functions
 * 
 * All HTTP API calls for the Campaigns feature.
 * LAD Architecture Compliant - Centralized API layer for web components
 */
import { apiGet, apiPost, apiDelete } from '@/lib/api';
/**
 * Get profile summary for a lead
 */
export async function getProfileSummary(leadId: string, campaignId: string): Promise<{ success: boolean; summary: string | null; exists: boolean }> {
  return apiGet<{ success: boolean; summary: string | null; exists: boolean }>(
    `/api/profile-summary/${leadId}?campaignId=${campaignId}`
  );
}
/**
 * Generate profile summary for a lead
 */
export async function generateProfileSummary(leadId: string, campaignId: string, profileData: any): Promise<{ success: boolean; summary: string; generated_at?: string }> {
  return apiPost<{ success: boolean; summary: string; generated_at?: string }>(
    '/api/profile-summary/generate',
    {
      leadId,
      campaignId,
      profileData
    }
  );
}
/**
 * Get all campaigns with optional filters
 */
export async function getCampaigns(filters?: { search?: string; status?: string }): Promise<{ success: boolean; data: any[] }> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  if (filters?.status) params.append('status', filters.status);
  const queryString = params.toString();
  const url = `/api/campaigns${queryString ? `?${queryString}` : ''}`;
  return apiGet<{ success: boolean; data: any[] }>(url);
}
/**
 * Get campaign statistics
 */
export async function getCampaignStats(): Promise<{ success: boolean; data: any }> {
  return apiGet<{ success: boolean; data: any }>('/api/campaigns/stats');
}
/**
 * Start a campaign
 */
export async function startCampaign(campaignId: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`/api/campaigns/${campaignId}/start`, {});
}
/**
 * Pause a campaign
 */
export async function pauseCampaign(campaignId: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`/api/campaigns/${campaignId}/pause`, {});
}
/**
 * Stop a campaign
 */
export async function stopCampaign(campaignId: string): Promise<{ success: boolean }> {
  return apiPost<{ success: boolean }>(`/api/campaigns/${campaignId}/stop`, {});
}
/**
 * Create a new campaign
 */
export async function createCampaign(campaignData: any): Promise<{ success: boolean; data: any }> {
  return apiPost<{ success: boolean; data: any }>('/api/campaigns', campaignData);
}
/**
 * Update a campaign
 */
export async function updateCampaign(campaignId: string, campaignData: any): Promise<{ success: boolean; data: any }> {
  return apiPost<{ success: boolean; data: any }>(`/api/campaigns/${campaignId}`, campaignData);
}
/**
 * Get a single campaign by ID
 */
export async function getCampaign(campaignId: string): Promise<{ success: boolean; data: any }> {
  return apiGet<{ success: boolean; data: any }>(`/api/campaigns/${campaignId}`);
}
/**
 * Delete a campaign
 */
export async function deleteCampaign(campaignId: string): Promise<{ success: boolean }> {
  return apiDelete<{ success: boolean }>(`/api/campaigns/${campaignId}`);
}
/**
 * Get leads for a campaign
 */
export async function getCampaignLeads(campaignId: string, filters?: { search?: string }): Promise<{ success: boolean; data: any[] }> {
  const params = new URLSearchParams();
  if (filters?.search) params.append('search', filters.search);
  const queryString = params.toString();
  const url = `/api/campaigns/${campaignId}/leads${queryString ? `?${queryString}` : ''}`;
  return apiGet<{ success: boolean; data: any[] }>(url);
}