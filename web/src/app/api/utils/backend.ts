/**
 * Get backend URL for server-side API calls
 * 
 * Priority:
 * 1. BACKEND_INTERNAL_URL - for local development or internal service mesh
 * 2. NEXT_PUBLIC_BACKEND_URL - public backend URL
 * 3. Default Cloud Run URL based on NODE_ENV
 */
export function getBackendUrl(): string {
  const isProduction = process.env.NODE_ENV === 'production';
  const isLocalUrl = (value?: string) => Boolean(value && /localhost|127\.0\.0\.1/.test(value));
  const internalBackendUrl = process.env.BACKEND_INTERNAL_URL?.replace(/\/$/, '');
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, '');
  const publicBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '');
  console.log('Determining backend URL with config', {
    isProduction,
    internalBackendUrl,
    backendUrl,
    publicBackendUrl
  });
  if (isProduction) {
    // In production, explicit server-side vars take precedence.
    if (internalBackendUrl) {
      return internalBackendUrl;
    }
    if (backendUrl) {
      return backendUrl;
    }
    if (publicBackendUrl) {
      return publicBackendUrl;
    }
    return 'https://lad-backend-develop-160078175457.us-central1.run.app';
  }

  // In local development, prefer explicit localhost overrides first.
  if (isLocalUrl(internalBackendUrl)) {
    return internalBackendUrl as string;
  }
  if (isLocalUrl(backendUrl)) {
    return backendUrl as string;
  }
  if (isLocalUrl(publicBackendUrl)) {
    return publicBackendUrl as string;
  }

  // Allow explicit remote URLs in dev if explicitly configured.
  if (internalBackendUrl) return internalBackendUrl;
  if (backendUrl) return backendUrl;
  if (publicBackendUrl) return publicBackendUrl;

  // Safe local default to prevent accidental remote calls during dev.
  return 'http://localhost:3004';
}

/**
 * VOAG (Voice Agent / OAuth Gateway) helper utilities
 *
 * Frontend ID identifies which integration context is making the request.
 * VOAG uses it to select the correct OAuth redirect URIs and call configs.
 *
 * Env vars (server-side, no NEXT_PUBLIC_ needed — only used in API routes):
 *   VOAG_FRONTEND_ID          → default context (calendar, voice calls)  default: 'settings'
 *   VOAG_ADS_FRONTEND_ID      → ads/social integration context            default: 'group-info'
 *   VOAG_API_KEY              → API key for VOAG service (same as BASE_URL_FRONTEND_APIKEY)
 */
export function getVoagFrontendId(context: 'settings' | 'ads' = 'settings'): string {
  if (context === 'ads') {
    return process.env.VOAG_ADS_FRONTEND_ID || 'group-info';
  }
  return process.env.VOAG_FRONTEND_ID || process.env.BASE_URL_FRONTEND_HEADER || 'settings';
}

export function getVoagApiKey(): string {
  return process.env.VOAG_API_KEY || process.env.BASE_URL_FRONTEND_APIKEY || '';
}

/**
 * Build standard VOAG request headers for server-side API routes.
 * Eliminates the need to hardcode 'X-Frontend-ID' and 'X-API-Key' in each route.
 */
export function getVoagHeaders(
  req: { cookies: { get: (name: string) => { value: string } | undefined }; headers: { get: (name: string) => string | null } },
  context: 'settings' | 'ads' = 'settings'
): Record<string, string> {
  const token =
    req.cookies.get('token')?.value ||
    req.cookies.get('access_token')?.value ||
    req.headers.get('authorization')?.replace('Bearer ', '');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Frontend-ID': getVoagFrontendId(context),
    'X-API-Key': getVoagApiKey(),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}
