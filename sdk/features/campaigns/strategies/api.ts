/**
 * Strategies feature - API functions.
 *
 * All HTTP for saved/shared workflow playbooks lives here, not in the builder
 * component. Uses the shared apiClient for consistent auth + tenant headers.
 *
 * Backend routes: /api/campaigns/strategies/* (LAD_backend features/campaigns).
 * The Phase-2 (`/shared`, publish) endpoints 404 unless STRATEGY_SHARING_ENABLED
 * is set on the backend - callers should treat a 404 there as "sharing is off".
 */
import { apiClient } from '../../../shared/apiClient';
import type {
  CreateStrategyInput,
  ImportStrategyResult,
  PublishPreview,
  SharedStrategy,
  Strategy,
  UpdateStrategyInput,
} from './types';

const BASE = '/api/campaigns/strategies';

/** Query keys for TanStack Query. */
export const strategyKeys = {
  all: ['strategies'] as const,
  lists: () => [...strategyKeys.all, 'list'] as const,
  list: () => [...strategyKeys.lists()] as const,
  details: () => [...strategyKeys.all, 'detail'] as const,
  detail: (id: string) => [...strategyKeys.details(), id] as const,
  shared: () => [...strategyKeys.all, 'shared'] as const,
  publishPreview: (id: string) => [...strategyKeys.all, 'publish-preview', id] as const,
} as const;

// ── Phase 1: own-tenant CRUD ────────────────────────────────────────────────

export async function listStrategies(): Promise<Strategy[]> {
  const res = await apiClient.get<{ data: Strategy[] }>(BASE);
  return res.data.data ?? [];
}

export async function getStrategy(id: string): Promise<Strategy> {
  const res = await apiClient.get<{ data: Strategy }>(`${BASE}/${id}`);
  return res.data.data;
}

export async function createStrategy(input: CreateStrategyInput): Promise<Strategy> {
  const res = await apiClient.post<{ data: Strategy }>(BASE, input);
  return res.data.data;
}

export async function updateStrategy(id: string, input: UpdateStrategyInput): Promise<Strategy> {
  const res = await apiClient.patch<{ data: Strategy }>(`${BASE}/${id}`, input);
  return res.data.data;
}

export async function deleteStrategy(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`);
}

// ── Phase 2: publishing ─────────────────────────────────────────────────────

/**
 * Dry run. Returns the exact payload that would become visible to other
 * tenants plus everything the sanitizer stripped. Changes nothing - this is
 * what the confirmation dialog renders before the tenant commits.
 */
export async function getPublishPreview(id: string): Promise<PublishPreview> {
  const res = await apiClient.get<{ data: PublishPreview }>(`${BASE}/${id}/publish-preview`);
  return res.data.data;
}

/** Submit for super-admin review. The backend re-sanitizes server-side. */
export async function publishStrategy(id: string): Promise<Strategy> {
  const res = await apiClient.post<{ data: Strategy }>(`${BASE}/${id}/publish`);
  return res.data.data;
}

export async function unpublishStrategy(id: string): Promise<Strategy> {
  const res = await apiClient.post<{ data: Strategy }>(`${BASE}/${id}/unpublish`);
  return res.data.data;
}

// ── Phase 2: the shared gallery ─────────────────────────────────────────────

export async function listSharedStrategies(): Promise<SharedStrategy[]> {
  const res = await apiClient.get<{ data: SharedStrategy[] }>(`${BASE}/shared`);
  return res.data.data ?? [];
}

/** Copy a shared strategy into the current tenant as a new, independent row. */
export async function importSharedStrategy(
  id: string,
  name?: string,
): Promise<ImportStrategyResult> {
  const res = await apiClient.post<{ data: Strategy; warnings?: ImportStrategyResult['warnings'] }>(
    `${BASE}/shared/${id}/import`,
    name ? { name } : {},
  );
  return { strategy: res.data.data, warnings: res.data.warnings ?? [] };
}
