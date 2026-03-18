/**
 * Email Templates — SDK API
 * LAD Architecture: SDK Layer — HTTP calls ONLY (no business logic)
 *
 * web/ MUST NOT call fetch/axios directly — use these functions via hooks.ts
 */

import { apiClient } from '../../shared/apiClient';
import type {
  EmailTemplate,
  EmailTemplateListFilters,
  CreateEmailTemplateInput,
  UpdateEmailTemplateInput,
  EmailTemplateApiResponse,
  EmailTemplateListApiResponse,
} from './types';

const BASE = '/api/campaigns/email-templates';

export const emailTemplateKeys = {
  all: ['email-templates'] as const,
  lists: () => [...emailTemplateKeys.all, 'list'] as const,
  list: (filters?: EmailTemplateListFilters) => [...emailTemplateKeys.lists(), filters] as const,
  details: () => [...emailTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...emailTemplateKeys.details(), id] as const,
  default: () => [...emailTemplateKeys.all, 'default'] as const,
};

export async function listEmailTemplates(
  filters?: EmailTemplateListFilters
): Promise<EmailTemplate[]> {
  const params = new URLSearchParams();
  if (filters?.is_active !== undefined) params.set('is_active', String(filters.is_active));
  if (filters?.category) params.set('category', filters.category);

  const query = params.toString();
  const res = await apiClient.get<EmailTemplateListApiResponse>(`${BASE}${query ? `?${query}` : ''}`);
  return res.data.data;
}

export async function getEmailTemplate(id: string): Promise<EmailTemplate> {
  const res = await apiClient.get<EmailTemplateApiResponse>(`${BASE}/${id}`);
  return res.data.data;
}

export async function getDefaultEmailTemplate(): Promise<EmailTemplate | null> {
  try {
    const res = await apiClient.get<EmailTemplateApiResponse>(`${BASE}/default`);
    return res.data.data;
  } catch {
    return null;
  }
}

export async function createEmailTemplate(
  input: CreateEmailTemplateInput
): Promise<EmailTemplate> {
  const res = await apiClient.post<EmailTemplateApiResponse>(BASE, input);
  return res.data.data;
}

export async function updateEmailTemplate(
  id: string,
  input: UpdateEmailTemplateInput
): Promise<EmailTemplate> {
  const res = await apiClient.put<EmailTemplateApiResponse>(`${BASE}/${id}`, input);
  return res.data.data;
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}