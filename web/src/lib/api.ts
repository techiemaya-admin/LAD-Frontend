import { loadingFetch } from "@/lib/loading-fetch";
import { safeStorage } from '@lad/shared/storage';
import { ApiError, apiErrorFromResponse } from '@lad/shared/apiError';
import { logger } from "@/lib/logger";

// Re-exported so call sites can `import { ApiError } from '@/lib/api'` next to
// the helper they already use.
export { ApiError } from '@lad/shared/apiError';
// Use backend URL directly
const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/+$/, "");
function authHeaders() {
  if (typeof document === "undefined") {
    logger.debug('[API] authHeaders: Running on server, no token');
    return {} as Record<string, string>;
  }

  let token: string | null = null;

  // First try to get token from safeStorage (now prioritizes cookies)
  token = safeStorage.getItem('token');
  logger.debug('[API] authHeaders: Token from safeStorage:', { 
    hasToken: !!token, 
    preview: token ? `${token.substring(0, 30)}...` : '(none)',
    source: 'safeStorage (cookies first)'
  });

  // Also check what's directly in localStorage for debugging
  if (typeof window !== 'undefined' && window.localStorage) {
    const lsToken = localStorage.getItem('token');
    logger.debug('[API] authHeaders: Direct localStorage check:', { 
      hasToken: !!lsToken,
      matchesSafeStorage: lsToken === token 
    });
  }

  logger.debug('[API] authHeaders: Final token:', { 
    hasToken: !!token, 
    preview: token ? `${token.substring(0, 30)}...` : '(none)' 
  });
  return token ? { Authorization: `Bearer ${token}` } : {};
}
function handleAuthError(status: number, path: string) {
  // Only handle auth errors for core auth endpoints
  // For other endpoints, let the component handle the error
  if ((status === 401 || status === 403) && 
      (path.includes('/api/auth/') || path.includes('/api/users/'))) {
    if (typeof window !== "undefined") {
      const hasToken = !!safeStorage.getItem("token");
      if (hasToken) {
        logger.warn('[API] Auth token rejected for core endpoint, clearing');
        safeStorage.removeItem("token");
        safeStorage.removeItem("user");
        safeStorage.removeItem("auth");
      }
    }
  }
}
export async function apiGet<T>(path: string, options?: { signal?: AbortSignal }): Promise<T> {
  const p = path.startsWith("/") ? path : `/${path}`;
  const res = await loadingFetch(`${API_BASE}${p}`, { 
    cache: "no-store", 
    credentials: 'include',
    headers: { ...authHeaders() },
    signal: options?.signal
  });
  if (!res.ok) {
    handleAuthError(res.status, p);
    throw new ApiError(`GET ${path} ${res.status}`, res.status);
  }
  return res.json();
}
export async function apiPost<T>(path: string, body: any): Promise<T> {
  const p = path.startsWith("/") ? path : `/${path}`;
  const res = await loadingFetch(`${API_BASE}${p}`, {
    method: "POST",
    credentials: 'include',
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    handleAuthError(res.status, p);
    // ApiError carries the status and the backend's `code` (e.g.
    // CAMPAIGN_NAME_TAKEN) alongside the same message this used to throw.
    throw await apiErrorFromResponse(res, `POST ${path} ${res.status}`, 'message');
  }
  return res.json();
}
export async function apiPut<T>(path: string, body: any): Promise<T> {
  const p = path.startsWith("/") ? path : `/${path}`;
  const res = await loadingFetch(`${API_BASE}${p}`, {
    method: "PUT",
    credentials: 'include',
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    handleAuthError(res.status, p);
    throw new ApiError(`PUT ${path} ${res.status}`, res.status);
  }
  return res.json();
}

export async function apiPatch<T>(path: string, body: any): Promise<T> {
  const p = path.startsWith("/") ? path : `/${path}`;
  const res = await loadingFetch(`${API_BASE}${p}`, {
    method: "PATCH",
    credentials: 'include',
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    handleAuthError(res.status, p);
    throw new ApiError(`PATCH ${path} ${res.status}`, res.status);
  }
  return res.json();
}

export async function apiDelete<T>(path: string): Promise<T> {
  const p = path.startsWith("/") ? path : `/${path}`;
  const res = await loadingFetch(`${API_BASE}${p}`, {
    method: "DELETE",
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    handleAuthError(res.status, p);
    throw new ApiError(`DELETE ${path} ${res.status}`, res.status);
  }
  return res.json();
}
/**
 * Like apiPost but routes through the Next.js API proxy (relative URL, no BACKEND_URL base).
 * Use this for any endpoint that has a matching /app/api/... proxy route.
 */
export async function proxyPost<T>(path: string, body: any): Promise<T> {
  const p = path.startsWith('/') ? path : `/${path}`;
  const res = await loadingFetch(p, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw await apiErrorFromResponse(res, `POST ${path} ${res.status}`, 'message');
  }
  return res.json();
}

/** GET via Next.js API proxy - relative URL, no BACKEND_URL base. */
export async function proxyGet<T>(path: string, options?: { signal?: AbortSignal }): Promise<T> {
  const p = path.startsWith('/') ? path : `/${path}`;
  const res = await loadingFetch(p, {
    method: 'GET',
    cache: 'no-store',
    credentials: 'include',
    headers: { ...authHeaders() },
    signal: options?.signal,
  });
  if (!res.ok) {
    throw await apiErrorFromResponse(res, `GET ${path} ${res.status}`, 'message');
  }
  return res.json();
}

/** PATCH via Next.js API proxy - relative URL, no BACKEND_URL base. */
export async function proxyPatch<T>(path: string, body: any): Promise<T> {
  const p = path.startsWith('/') ? path : `/${path}`;
  const res = await loadingFetch(p, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw await apiErrorFromResponse(res, `PATCH ${path} ${res.status}`, 'message');
  }
  return res.json();
}

/** PUT via Next.js API proxy - relative URL, no BACKEND_URL base. */
export async function proxyPut<T>(path: string, body: any): Promise<T> {
  const p = path.startsWith('/') ? path : `/${path}`;
  const res = await loadingFetch(p, {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw await apiErrorFromResponse(res, `PUT ${path} ${res.status}`, 'message');
  }
  return res.json();
}

/** DELETE via Next.js API proxy - relative URL, no BACKEND_URL base. */
export async function proxyDelete<T>(path: string): Promise<T> {
  const p = path.startsWith('/') ? path : `/${path}`;
  const res = await loadingFetch(p, {
    method: 'DELETE',
    credentials: 'include',
    headers: { ...authHeaders() },
  });
  if (!res.ok) {
    throw await apiErrorFromResponse(res, `DELETE ${path} ${res.status}`, 'message');
  }
  return res.json();
}

export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const p = path.startsWith("/") ? path : `/${path}`;
  const res = await loadingFetch(`${API_BASE}${p}`, {
    method: "POST",
    credentials: 'include',
    headers: { ...authHeaders() },
    body: form,
  });
  if (!res.ok) {
    handleAuthError(res.status, p);
    throw new ApiError(`UPLOAD ${path} ${res.status}`, res.status);
  }
  return res.json();
}
