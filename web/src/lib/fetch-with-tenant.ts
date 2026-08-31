import { safeStorage } from '@lad/shared/storage';

/**
 * Tenant-aware fetch utility.
 *
 * Ensures every request includes:
 *  - Authorization header (from safeStorage token)
 *  - X-Tenant-Id header (from safeStorage selectedTenantId or user profile)
 */

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return safeStorage.getItem('token');
}

function getEffectiveTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  const selected = safeStorage.getItem('selectedTenantId');
  if (selected && selected !== 'default') return selected;

  try {
    const raw = safeStorage.getItem('user');
    if (raw) {
      const user = JSON.parse(raw);
      return user?.tenantId || user?.organizationId || null;
    }
  } catch {
    /* ignore parse errors */
  }
  return null;
}

/**
 * Drop-in replacement for `fetch()` that adds tenant + auth headers.
 */
export async function fetchWithTenant(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const body = options.body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  const wantsJson = !isFormData && (body === undefined || body === null || typeof body === 'string');

  const headers: Record<string, string> = {
    ...(wantsJson ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  };

  if (isFormData) {
    for (const k of Object.keys(headers)) {
      if (k.toLowerCase() === 'content-type') delete headers[k];
    }
  }

  const token = getAuthToken();
  const hasAuth = Object.keys(headers).some((k) => k.toLowerCase() === 'authorization');
  if (token && !hasAuth) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const tenantId = getEffectiveTenantId();
  const hasTenantHeader = Object.keys(headers).some((k) => k.toLowerCase() === 'x-tenant-id');
  if (tenantId && !hasTenantHeader) {
    headers['X-Tenant-Id'] = tenantId;
  }

  return fetch(url, { ...options, headers });
}
