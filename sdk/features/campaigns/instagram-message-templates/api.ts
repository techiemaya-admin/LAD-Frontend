/**
 * Instagram Message Templates Feature - API Functions
 *
 * All HTTP API calls for Instagram message templates.
 * Uses the shared apiClient for consistent request handling.
 */
import { queryOptions } from '@tanstack/react-query';
import { apiClient } from '../../../shared/apiClient';
import type {
  InstagramMessageTemplate,
  CreateInstagramTemplateRequest,
  UpdateInstagramTemplateRequest,
  InstagramTemplateFilters,
} from './types';

const BASE = '/api/campaigns/instagram/message-templates';

// Query keys for TanStack Query
export const instagramMessageTemplateKeys = {
  all: ['instagram-message-templates'] as const,
  lists: () => [...instagramMessageTemplateKeys.all, 'list'] as const,
  list: (filters?: InstagramTemplateFilters) => [...instagramMessageTemplateKeys.lists(), filters] as const,
  details: () => [...instagramMessageTemplateKeys.all, 'detail'] as const,
  detail: (id: string) => [...instagramMessageTemplateKeys.details(), id] as const,
  default: () => [...instagramMessageTemplateKeys.all, 'default'] as const,
} as const;

// ====================
// Core API Functions
// ====================

/**
 * Get all message templates
 */
export async function getMessageTemplates(filters?: InstagramTemplateFilters): Promise<InstagramMessageTemplate[]> {
  const params: Record<string, string> = {};
  if (filters?.is_active !== undefined) params.is_active = String(filters.is_active);

  const response = await apiClient.get<{
    success: boolean;
    data: InstagramMessageTemplate[];
    count: number;
  }>(BASE, { params });

  return response.data.data || [];
}

/**
 * Query options for getting all templates
 */
export function getMessageTemplatesQueryOptions(filters?: InstagramTemplateFilters) {
  return queryOptions({
    queryKey: instagramMessageTemplateKeys.list(filters),
    queryFn: () => getMessageTemplates(filters),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get single template by ID
 */
export async function getMessageTemplateById(id: string): Promise<InstagramMessageTemplate> {
  const response = await apiClient.get<{
    success: boolean;
    data: InstagramMessageTemplate;
  }>(`${BASE}/${id}`);

  return response.data.data;
}

/**
 * Query options for getting template by ID
 */
export function getMessageTemplateByIdQueryOptions(id: string) {
  return queryOptions({
    queryKey: instagramMessageTemplateKeys.detail(id),
    queryFn: () => getMessageTemplateById(id),
    staleTime: 5 * 60 * 1000,
    enabled: !!id,
  });
}

/**
 * Get default template
 */
export async function getDefaultMessageTemplate(): Promise<InstagramMessageTemplate | null> {
  try {
    const response = await apiClient.get<{
      success: boolean;
      data: InstagramMessageTemplate;
    }>(`${BASE}/default`);

    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Query options for getting default template
 */
export function getDefaultMessageTemplateQueryOptions() {
  return queryOptions({
    queryKey: instagramMessageTemplateKeys.default(),
    queryFn: () => getDefaultMessageTemplate(),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Create new message template
 */
export async function createMessageTemplate(data: CreateInstagramTemplateRequest): Promise<InstagramMessageTemplate> {
  const response = await apiClient.post<{
    success: boolean;
    data: InstagramMessageTemplate;
  }>(BASE, data);

  return response.data.data;
}

/**
 * Update existing message template
 */
export async function updateMessageTemplate(
  id: string,
  data: UpdateInstagramTemplateRequest
): Promise<InstagramMessageTemplate> {
  const response = await apiClient.put<{
    success: boolean;
    data: InstagramMessageTemplate;
  }>(`${BASE}/${id}`, data);

  return response.data.data;
}

/**
 * Delete message template (soft delete)
 */
export async function deleteMessageTemplate(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}
