/**
 * SearchDispatcher client - wraps POST /api/ai-icp-assistant/search and the
 * companion read endpoints (`/searches`, `/searches/:id`).
 *
 * Distinct from `definitionsApi.ts`:
 *   - definitionsApi.ts manages the tenant's structured ICP (R8).
 *   - searchApi.ts triggers and reads runs of that ICP (D6/D7).
 *
 * Both backend mounts coexist:
 *   GET  /api/ai-icp-assistant/definitions/searches  → R8 history (older, kept for back-compat)
 *   POST /api/ai-icp-assistant/search                → D6 run
 *   GET  /api/ai-icp-assistant/searches              → D6 list (mirror of R8 list)
 *   GET  /api/ai-icp-assistant/searches/:id          → D6 detail
 *
 * Companion files:
 *   - types.ts            - SearchRunResult, ProspectCandidate, RunSearchInput
 *   - hooks/useRunSearch.ts          - mutation hook
 *   - hooks/useSearch.ts             - single-row hook
 *   - hooks/useDispatchedSearches.ts - list hook
 */
import type {
  IcpSearch,
  ProspectCandidate,
  RunSearchInput,
  SearchRunResult,
} from './types';

// ── HTTP plumbing (mirrors definitionsApi.ts) ────────────────────────────────
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

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    /* no JSON body */
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

// ── API surface ──────────────────────────────────────────────────────────────

/**
 * Run a discovery search synchronously. Resolves when Apollo + Sales Nav (and
 * any other registered backends) have all returned, dedup has happened, fit
 * events have fired to the Master Agent, and the audit row has reached
 * `status='completed'`.
 *
 * For long-running runs, pass `{ async: true }` and poll `getSearchById(id)`
 * until `status === 'completed'`.
 */
export async function runSearch(
  input: RunSearchInput = {},
  opts: { async?: boolean } = {},
): Promise<SearchRunResult> {
  const qs = opts.async ? '?async=1' : '';
  return request<SearchRunResult>(
    `/api/ai-icp-assistant/search${qs}`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
}

/**
 * List the tenant's recent search runs (audit rows), newest first.
 * Mirrors the existing R8 `listIcpSearchHistory` but goes through the D6 mount.
 */
export async function listDispatchedSearches(opts: {
  limit?: number;
  offset?: number;
} = {}): Promise<IcpSearch[]> {
  const params = new URLSearchParams({
    ...(opts.limit !== undefined ? { limit: String(opts.limit) } : {}),
    ...(opts.offset !== undefined ? { offset: String(opts.offset) } : {}),
  });
  const res = await request<{ success: boolean; searches: IcpSearch[]; count: number }>(
    `/api/ai-icp-assistant/searches?${params.toString()}`,
  );
  return res.searches ?? [];
}

/**
 * Fetch a single search audit row, tenant-scoped. Returns null on 404.
 */
export async function getSearchById(id: string): Promise<IcpSearch | null> {
  try {
    const res = await request<{ success: boolean; search: IcpSearch }>(
      `/api/ai-icp-assistant/searches/${encodeURIComponent(id)}`,
    );
    return res.search ?? null;
  } catch (err) {
    if ((err as { status?: number }).status === 404) return null;
    throw err;
  }
}

export type { ProspectCandidate, RunSearchInput, SearchRunResult };
