/**
 * Get the API base URL based on environment configuration
 * Returns the configured backend URL or defaults to localhost:3004
 */
export const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';
};
