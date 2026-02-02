/**
 * Get backend URL for server-side API calls
 * 
 * Priority:
 * 1. BACKEND_INTERNAL_URL - for local development or internal service mesh
 * 2. NEXT_PUBLIC_BACKEND_URL - public backend URL
 * 3. Default Cloud Run URL
 */
export function getBackendUrl(): string {
  const backendUrl = process.env.BACKEND_INTERNAL_URL || 
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    'https://lad-backend-develop-741719885039.us-central1.run.app';
  return backendUrl.replace(/\/$/, '');
}
