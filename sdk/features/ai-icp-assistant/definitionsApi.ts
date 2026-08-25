/**
 * Tenant ICP Definitions - CRUD client for the canonical active ICP.
 *
 * Distinct from the existing profiles endpoints (which manage exploratory
 * drafts). These functions wrap /api/ai-icp-assistant/definitions/* served by
 * LAD_backend's TenantIcpDefinitionController (R8).
 *
 * Companion files:
 *   - types.ts            - IcpDefinition, IcpStructured, SearchStrategy
 *   - hooks/useActiveIcpDefinition.ts
 *   - hooks/useIcpDefinitionMutations.ts
 *   - hooks/useIcpSearchHistory.ts
 *
 * Convention: matches the existing api.ts (raw fetch + getBackendUrl + Bearer
 * token from localStorage). Helpers inlined here to avoid coupling to api.ts
 * internals; if a third file in this SDK needs them, extract to a shared
 * `_http.ts` module.
 */
import type {
  IcpDefinition,
  IcpSearch,
  CreateIcpDefinitionInput,
  UpdateIcpDefinitionInput,
  UpdateIcpTuningInput,
} from './types';

// ── HTTP plumbing (inlined; mirrors api.ts) ──────────────────────────────────
function getBackendUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  const url =
    process.env.NEXT_PUBLIC_ICP_BACKEND_URL ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.REACT_APP_API_URL;
  return url || 'http://localhost:3000';
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  try {
    const token =
      localStorage.getItem('token') || localStorage.getItem('auth_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = `${getBackendUrl()}${path}`;
  const response = await fetch(url, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...(init.headers || {}),
    },
  });

  // Try to parse JSON regardless of status - many endpoints return JSON errors
  let body: any = null;
  try {
    body = await response.json();
  } catch {
    /* no JSON body - fine for 204s */
  }

  if (!response.ok) {
    const message =
      body?.error || body?.message || `HTTP ${response.status} ${response.statusText}`;
    const err = new Error(message) as Error & { status?: number; details?: unknown };
    err.status = response.status;
    err.details = body?.details ?? body;
    throw err;
  }

  return body as T;
}

// ── Read API ─────────────────────────────────────────────────────────────────

/**
 * Get the tenant's active ICP definition for a given variant.
 * Returns null if no active definition exists (signup not complete OR no
 * variant for this name).
 */
export async function getActiveIcpDefinition(
  variant: string = 'default',
): Promise<IcpDefinition | null> {
  const params = new URLSearchParams({ variant });
  const res = await request<{ success: boolean; active: IcpDefinition | null }>(
    `/api/ai-icp-assistant/definitions?${params.toString()}`,
  );
  return res.active;
}

/**
 * List ALL definitions for the tenant (active + inactive, paginated).
 * Used by the "ICP versions" history UI.
 */
export async function listIcpDefinitions(opts: {
  limit?: number;
  offset?: number;
} = {}): Promise<IcpDefinition[]> {
  const params = new URLSearchParams({
    includeAll: 'true',
    ...(opts.limit !== undefined ? { limit: String(opts.limit) } : {}),
    ...(opts.offset !== undefined ? { offset: String(opts.offset) } : {}),
  });
  const res = await request<{ success: boolean; definitions: IcpDefinition[] }>(
    `/api/ai-icp-assistant/definitions?${params.toString()}`,
  );
  return res.definitions ?? [];
}

/**
 * Recent Apollo / Sales Nav search runs for this tenant, ordered newest first.
 * Used by the search-history surface in the prospect-discovery UI.
 */
export async function listIcpSearchHistory(opts: {
  limit?: number;
  offset?: number;
} = {}): Promise<IcpSearch[]> {
  const params = new URLSearchParams({
    ...(opts.limit !== undefined ? { limit: String(opts.limit) } : {}),
    ...(opts.offset !== undefined ? { offset: String(opts.offset) } : {}),
  });
  const res = await request<{ success: boolean; searches: IcpSearch[] }>(
    `/api/ai-icp-assistant/definitions/searches?${params.toString()}`,
  );
  return res.searches ?? [];
}

// ── Write API ────────────────────────────────────────────────────────────────

/**
 * Create a new canonical ICP definition for the tenant. Atomically deactivates
 * any existing active definition for the same variant (handled server-side).
 */
export async function createIcpDefinition(
  input: CreateIcpDefinitionInput,
): Promise<IcpDefinition> {
  const res = await request<{ success: boolean; definition: IcpDefinition }>(
    `/api/ai-icp-assistant/definitions`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return res.definition;
}

/**
 * Promote an exploratory ai_icp_profiles draft into the canonical tenant_icp_definitions.
 * Used by the signup wizard when the tenant confirms "this is my ICP".
 */
export async function promoteProfileToIcpDefinition(input: {
  profile_id: string;
  variant?: string;
}): Promise<IcpDefinition> {
  const res = await request<{ success: boolean; definition: IcpDefinition }>(
    `/api/ai-icp-assistant/definitions/promote`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return res.definition;
}

/** Replace the structured ICP JSON on an existing definition. */
export async function updateIcpDefinition(
  id: string,
  input: UpdateIcpDefinitionInput,
): Promise<IcpDefinition> {
  const res = await request<{ success: boolean; definition: IcpDefinition }>(
    `/api/ai-icp-assistant/definitions/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(input),
    },
  );
  return res.definition;
}

/** Update tuning knobs (min_fit_score, daily_search_cap) without replacing the full ICP. */
export async function updateIcpTuning(
  id: string,
  input: UpdateIcpTuningInput,
): Promise<IcpDefinition> {
  const res = await request<{ success: boolean; definition: IcpDefinition }>(
    `/api/ai-icp-assistant/definitions/${encodeURIComponent(id)}/tuning`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
  return res.definition;
}

/** Soft-delete an ICP definition. */
export async function deleteIcpDefinition(id: string): Promise<void> {
  await request<{ success: boolean }>(
    `/api/ai-icp-assistant/definitions/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    },
  );
}
