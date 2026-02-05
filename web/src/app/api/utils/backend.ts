/**
 * Get backend URL for server-side API calls
 * 
 * Priority:
 * 1. BACKEND_INTERNAL_URL - for local development or internal service mesh
 * 2. NEXT_PUBLIC_BACKEND_URL - public backend URL
 * 3. Default Cloud Run URL based on NODE_ENV
 */
export function getBackendUrl(): string {
  // Check explicit env vars first
  if (process.env.BACKEND_INTERNAL_URL) {
    return process.env.BACKEND_INTERNAL_URL.replace(/\/$/, '');
  }
  if (process.env.NEXT_PUBLIC_BACKEND_URL) {
    return process.env.NEXT_PUBLIC_BACKEND_URL.replace(/\/$/, '');
  }
  
  // Fallback based on environment
  const isProduction = process.env.NODE_ENV === 'production';
  const defaultUrl = isProduction
    ? 'https://lad-backend-741719885039.us-central1.run.app'
    : 'https://lad-backend-develop-741719885039.us-central1.run.app';
  
  return defaultUrl;
}
