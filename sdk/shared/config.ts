/**
 * Unified Environment Configuration
 * Centralized configuration for both SDK and Web application
 */

export interface EnvConfig {
  NODE_ENV: 'development' | 'production' | 'staging' | 'local' | 'test';
  BACKEND_URL: string;
  API_URL: string;
  ICP_BACKEND_URL: string;
  CAMPAIGN_BACKEND_URL: string;
  BACKEND_INTERNAL_URL: string;
}

/**
 * Get environment configuration based on current environment
 */
export function getEnvConfig(): EnvConfig {
  const NODE_ENV = (process.env.NODE_ENV as EnvConfig['NODE_ENV']) || 'development';
  
  // Primary backend URL (without /api suffix)
  const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || getDefaultBackendUrl(NODE_ENV);
  
  // API URL with /api suffix - ensure we don't double-append /api
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 
    (BACKEND_URL.endsWith('/api') ? BACKEND_URL : `${BACKEND_URL}/api`);
  
  // ICP backend URL
  const ICP_BACKEND_URL = process.env.NEXT_PUBLIC_ICP_BACKEND_URL || BACKEND_URL;
  
  // Campaign backend URL
  const CAMPAIGN_BACKEND_URL = process.env.NEXT_PUBLIC_CAMPAIGN_BACKEND_URL || BACKEND_URL;
  
  // Internal backend URL for server-side operations
  const BACKEND_INTERNAL_URL = process.env.BACKEND_INTERNAL_URL || BACKEND_URL;
  
  return {
    NODE_ENV,
    BACKEND_URL,
    API_URL,
    ICP_BACKEND_URL,
    CAMPAIGN_BACKEND_URL,
    BACKEND_INTERNAL_URL,
  };
}

/**
 * Get default backend URL based on environment
 */
function getDefaultBackendUrl(nodeEnv: string): string {
   switch (nodeEnv) {
    case 'development':
        return 'https://lad-backend-develop-741719885039.us-central1.run.app';
    case 'staging':
        return 'https://lad-backend-stage-741719885039.us-central1.run.app';
    case 'production':
        return 'https://lad-backend-741719885039.us-central1.run.app';
    case 'local':
        return 'http://localhost:3004';
    default:
      return 'http://localhost:3004';
  }
}

/**
 * Validate required environment variables
 */
export function validateEnv(): void {
  const config = getEnvConfig();
  
  if (config.NODE_ENV === 'production' && !process.env.NEXT_PUBLIC_BACKEND_URL) {
    console.warn('NEXT_PUBLIC_BACKEND_URL is not set in production. Using default backend URL.');
  }
  
  // Log current configuration in development and local environments
  if (config.NODE_ENV === 'development' || config.NODE_ENV === 'local') {
    console.log('🔧 Environment Configuration:', {
      NODE_ENV: config.NODE_ENV,
      BACKEND_URL: config.BACKEND_URL,
      API_URL: config.API_URL,
      ICP_BACKEND_URL: config.ICP_BACKEND_URL,
      CAMPAIGN_BACKEND_URL: config.CAMPAIGN_BACKEND_URL,
      BACKEND_INTERNAL_URL: config.BACKEND_INTERNAL_URL,
    });
  }
}

// Export singleton instance (main export for both SDK and Web)
export const envConfig = getEnvConfig();

// Legacy exports for backward compatibility
export const sdkEnvConfig = envConfig;
export const getSdkEnvConfig = getEnvConfig;
export const validateSdkEnv = validateEnv;

// Validate environment on module load
if (typeof window === 'undefined') {
  // Only validate on server-side to avoid client-side console logs
  validateEnv();
}