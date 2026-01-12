import { loadingFetch } from "@/lib/loading-fetch";
import { safeStorage } from "@/utils/storage";
import { logger } from "@/lib/logger";

// Use backend URL directly
const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://lad-backend-develop-741719885039.us-central1.run.app").replace(/\/+$/, "");

function authHeaders() {
  if (typeof window === "undefined") {
    logger.debug('[API] authHeaders: Running on server, no token');
    return {} as Record<string, string>;
  }
  const token = safeStorage.getItem("token") || safeStorage.getItem("auth_token");
  logger.debug('[API] authHeaders: Token present:', { hasToken: !!token, preview: token ? `(${token.substring(0, 30)}...)` : '(none)' });
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

export async function apiGet<T>(path: string): Promise<T> {
  const p = path.startsWith("/") ? path : `/${path}`;
  const res = await loadingFetch(`${API_BASE}${p}`, { 
    cache: "no-store", 
    credentials: 'include',
    headers: { ...authHeaders() } 
  });
  if (!res.ok) {
    handleAuthError(res.status, p);
    throw new Error(`GET ${path} ${res.status}`);
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
    
    // Try to extract error message from response body
    let errorMessage = `POST ${path} ${res.status}`;
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorData.error || errorMessage;
    } catch (e) {
      // If response is not JSON, use default error message
    }
    
    throw new Error(errorMessage);
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
    throw new Error(`PUT ${path} ${res.status}`);
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
    throw new Error(`DELETE ${path} ${res.status}`);
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
    throw new Error(`UPLOAD ${path} ${res.status}`);
  }
  return res.json();
}
