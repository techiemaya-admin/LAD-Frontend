/**
 * Get the API base URL based on environment configuration
 * Returns the configured backend URL or defaults to cloud backend
 */
export const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'https://lad-backend-develop-741719885039.us-central1.run.app';
};