/**
 * ABM Feature — API client functions
 * All HTTP calls live here. web/ must never call fetch/axios directly.
 */
import { apiClient } from '../../shared/apiClient';
import type {
  ABMResearchRequest,
  ABMListParams,
  ABMResearchResponse,
  ABMListResponse,
  ABMParseIntentResponse,
  ProspectCompany,
} from './types';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://lad-backend-develop-160078175457.us-central1.run.app';
const BASE_PATH    = `${API_BASE_URL}/api/abm`;

/**
 * Research a company from a natural-language query or explicit name.
 * This is the main entry point for the ABM feature.
 *
 * Example: researchCompany({ query: "provide detailed insights about Salesforce" })
 */
export async function researchCompany(params: ABMResearchRequest): Promise<ABMResearchResponse> {
  const response = await apiClient.post(`${BASE_PATH}/research`, params);
  return response.data;
}

/**
 * Parse a natural-language query to extract company name + intent.
 * Useful for chat interfaces before triggering full research.
 */
export async function parseIntent(query: string): Promise<ABMParseIntentResponse> {
  const response = await apiClient.post(`${BASE_PATH}/parse-intent`, { query });
  return response.data;
}

/**
 * List all researched companies for the current tenant.
 */
export async function listCompanies(params?: ABMListParams): Promise<ABMListResponse> {
  const response = await apiClient.get(`${BASE_PATH}/companies`, { params });
  return response.data;
}

/**
 * Get a single prospect company by ID.
 */
export async function getCompany(id: string): Promise<{ success: boolean; data: ProspectCompany; next_best_actions: unknown[] }> {
  const response = await apiClient.get(`${BASE_PATH}/companies/${id}`);
  return response.data;
}

/**
 * Force re-enrichment of an existing prospect company.
 */
export async function refreshCompany(
  id: string,
  opts?: { unipile_account_id?: string }
): Promise<ABMResearchResponse> {
  const response = await apiClient.post(`${BASE_PATH}/companies/${id}/refresh`, opts || {});
  return response.data;
}

/**
 * Soft-delete a prospect company.
 */
export async function deleteCompany(id: string): Promise<{ success: boolean; message: string }> {
  const response = await apiClient.delete(`${BASE_PATH}/companies/${id}`);
  return response.data;
}

/**
 * Feature health check.
 */
export async function checkHealth(): Promise<Record<string, unknown>> {
  const response = await apiClient.get(`${BASE_PATH}/health`);
  return response.data;
}
