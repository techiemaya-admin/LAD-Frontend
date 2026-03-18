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

  // In local development, only allow explicit localhost overrides.
  if (isLocalUrl(internalBackendUrl)) {
    return internalBackendUrl as string;
  }
  if (isLocalUrl(backendUrl)) {
    return backendUrl as string;
  }
  if (isLocalUrl(publicBackendUrl)) {
    return publicBackendUrl as string;
  }

  // Safe local default to prevent accidental remote calls during dev.
  return 'http://localhost:3004';
}
