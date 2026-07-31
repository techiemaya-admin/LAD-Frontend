/**
 * Business Profile HTTP client — GET/POST /api/ai-playground.
 *
 * The backend UPSERTs into `ai_icp_profiles.icp_data` (JSONB),
 * keyed by tenant_id + is_active=true + is_deleted=false. Tenant scoping
 * is enforced server-side from the session/JWT — clients never pass
 * tenant_id in the body.
 *
 * Mirrors the raw-fetch convention used by definitionsApi.ts.
 */
import type { BusinessProfile } from './businessProfile';

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

/** Shape returned by GET /api/ai-playground.
 *  Source: LAD_backend/features/ai-playground/routes/index.js:539-549. */
interface GetPlaygroundResponse {
  success?: boolean;
  profile?: BusinessProfile | null;
  conversationId?: string;
  history?: unknown;
}

/**
 * Load the tenant's active business profile.
 * Returns null when no `ai_icp_profiles` row exists yet (fresh tenant).
 */
export async function getBusinessProfile(): Promise<BusinessProfile | null> {
  const res = await request<GetPlaygroundResponse>('/api/ai-playground');
  return (res?.profile as BusinessProfile | null) ?? null;
}

/**
 * Replace the tenant's active business profile.
 *
 * IMPORTANT: the backend (`upsertIcpProfile` at routes/index.js:399) does a
 * FULL replace of `icp_data` JSONB — not a merge. Callers MUST send the
 * complete profile (including chat-only extras like `linkedinAudit`) or
 * those fields will be lost on save. The `useBusinessProfile` hook handles
 * this merge for you; reach for this raw API only if you have already
 * merged client-side.
 *
 * POST response is `{ success: true }` only — we echo back the input so the
 * caller has the canonical stored shape.
 */
export async function saveBusinessProfile(
  full: BusinessProfile,
): Promise<BusinessProfile> {
  await request<{ success: boolean }>('/api/ai-playground', {
    method: 'POST',
    body: JSON.stringify({ profile: full }),
  });
  return full;
}

/**
 * Upload the tenant's company logo.
 *
 * Multipart POST to /api/ai-playground/company-logo. The backend stores the
 * image in GCS and merges the resulting public URL into `icp_data.companyLogoUrl`
 * itself, so callers only need to reflect the returned URL in local state —
 * no follow-up saveBusinessProfile() call.
 *
 * Note: this bypasses `request()` because it must NOT set a JSON Content-Type;
 * the browser has to generate the multipart boundary.
 */
export async function uploadCompanyLogo(file: File): Promise<string> {
  const body = new FormData();
  body.append('file', file);

  const response = await fetch(`${getBackendUrl()}/api/ai-playground/company-logo`, {
    method: 'POST',
    credentials: 'include',
    headers: getAuthHeaders(),
    body,
  });

  let parsed: any = null;
  try {
    parsed = await response.json();
  } catch {
    /* no JSON body */
  }

  if (!response.ok || !parsed?.url) {
    const message =
      parsed?.error || parsed?.message || `HTTP ${response.status} ${response.statusText}`;
    const err = new Error(message) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  return parsed.url as string;
}
