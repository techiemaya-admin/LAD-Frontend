/**
 * Get backend URL for server-side API calls
 *
 * Priority:
 * 1. BACKEND_INTERNAL_URL - for internal service mesh / server-side only
 * 2. BACKEND_URL - explicit server-side backend URL
 * 3. NEXT_PUBLIC_BACKEND_URL - public backend URL (works client + server)
 * 4. Default Cloud Run URL
 *
 * NOTE: NODE_ENV is always 'development' during `next dev` regardless of .env,
 * so we check env vars directly instead of branching on NODE_ENV.
 */
export function getBackendUrl(): string {
  const internalBackendUrl = process.env.BACKEND_INTERNAL_URL?.replace(/\/$/, '');
  const backendUrl = process.env.BACKEND_URL?.replace(/\/$/, '');
  const publicBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL?.replace(/\/$/, '');

  if (internalBackendUrl) return internalBackendUrl;
  if (backendUrl) return backendUrl;
  if (publicBackendUrl) return publicBackendUrl;

  return 'https://lad-backend-develop-160078175457.us-central1.run.app';
}
