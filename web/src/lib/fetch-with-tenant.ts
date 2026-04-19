/**
 * Tenant-aware fetch utility.
 *
 * Ensures every request to the conversation proxy includes:
 *  - Authorization header (from localStorage token)
 *  - X-Tenant-ID header (from localStorage selectedTenantId or user profile)
 *
 * Use this instead of bare `fetch()` for any call to
 * `/api/whatsapp-conversations/…` endpoints.
 */

function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  // Try cookie first (primary store — LAD uses httpOnly: false cookies)
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split('=');
    const name = rawName?.trim();
    const value = rawValueParts.join('=');
    if (name === 'token') return decodeURIComponent(value || '');
  }

  // Fallback: localStorage (for backwards compatibility)
  const stored = localStorage.getItem('token');
  if (stored) return stored;

  return null;
}

function getEffectiveTenantId(): string | null {
  if (typeof window === 'undefined') return null;
  const selected = localStorage.getItem('selectedTenantId');
  if (selected && selected !== 'default') return selected;
  // Fallback: extract from cached user profile
  try {
    const raw = localStorage.getItem('user');
    if (raw) {
      const user = JSON.parse(raw);
      return user?.tenantId || user?.organizationId || null;
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Drop-in replacement for `fetch()` that adds tenant + auth headers.
 */
export async function fetchWithTenant(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  const token = getAuthToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const tenantId = getEffectiveTenantId();
  if (tenantId) headers['X-Tenant-ID'] = tenantId;

  return fetch(url, { ...options, headers });
}
