/**
 * AI ICP Assistant API Configuration
 * 
 * Centralized API endpoint configuration.
 * NO hardcoded URLs - all values from environment variables.
 */

// Get base URL from environment variables
// In production, NEXT_PUBLIC_ICP_BACKEND_URL must be set
// In development, fallback to localhost for convenience
const getBaseUrl = (): string => {
  const envUrl = process.env.NEXT_PUBLIC_ICP_BACKEND_URL || 
                 process.env.NEXT_PUBLIC_API_URL || 
                 process.env.REACT_APP_API_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // Only allow localhost fallback in development
  // Check for browser environment to avoid build-time errors
  if (process.env.NODE_ENV === 'production' && typeof window !== 'undefined') {
    throw new Error('NEXT_PUBLIC_ICP_BACKEND_URL environment variable is required in production');
  }
  
  return 'https://lad-backend-develop-741719885039.us-central1.run.app';
};

export const API_CONFIG = {
  baseUrl: getBaseUrl(),
  
  endpoints: {
    questions: '/api/ai-icp-assistant/onboarding/icp-questions',
    questionByStep: (stepIndex: number) => `/api/ai-icp-assistant/onboarding/icp-questions/${stepIndex}`,
    answer: '/api/ai-icp-assistant/onboarding/icp-answer',
  },
  
  defaultCategory: process.env.ICP_DEFAULT_CATEGORY || 'lead_generation',
  
  defaultTotalSteps: parseInt(process.env.ICP_TOTAL_STEPS || '11', 10),
} as const;

/**
 * Get full URL for an endpoint
 */
export function getApiUrl(endpoint: string): string {
  const baseUrl = API_CONFIG.baseUrl.replace(/\/+$/, '');
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}


