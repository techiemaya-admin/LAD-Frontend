/**
 * Communication & Backend Service URL Utilities
 *
 * Centralized configuration for all external service URLs used by the frontend.
 * Supports both client-side and server-side usage with proper fallbacks.
 */

/**
 * Get the main API/backend service URL
 * Used for: campaigns, leads, pipeline, general backend operations
 *
 * Priority:
 * 1. NEXT_PUBLIC_BACKEND_URL (preferred)
 * 2. NEXT_PUBLIC_API_URL (legacy fallback)
 * 3. localhost:3004 (development default)
 */
export function getApiUrl(): string {
  const backendUrl = typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL
    : (typeof window !== 'undefined' && (window as any).__ENV?.NEXT_PUBLIC_BACKEND_URL) ||
      (typeof window !== 'undefined' && (window as any).__ENV?.NEXT_PUBLIC_API_URL);

  return backendUrl || 'http://localhost:3004';
}

/**
 * Get the WhatsApp/Unified Communications service URL
 * Used for: WhatsApp conversations, messaging services
 *
 * Priority:
 * 1. NEXT_PUBLIC_WHATSAPP_API_URL (preferred)
 * 2. NEXT_PUBLIC_COMMS_SERVICE_URL (alternative name)
 * 3. WHATSAPP_SERVICE_URL (server-side fallback)
 * 4. localhost:8000 (development default)
 */
export function getWhatsAppServiceUrl(): string {
  const whatsappUrl = typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_WHATSAPP_API_URL || 
      process.env.NEXT_PUBLIC_COMMS_SERVICE_URL ||
      process.env.WHATSAPP_SERVICE_URL
    : (typeof window !== 'undefined' && (window as any).__ENV?.NEXT_PUBLIC_WHATSAPP_API_URL) ||
      (typeof window !== 'undefined' && (window as any).__ENV?.NEXT_PUBLIC_COMMS_SERVICE_URL);

  return whatsappUrl || 'http://localhost:8000';
}

/**
 * Get the ICP Assistant service URL
 * Used for: AI-powered company intelligence and classification
 *
 * Priority:
 * 1. NEXT_PUBLIC_ICP_BACKEND_URL
 * 2. NEXT_PUBLIC_BACKEND_URL
 * 3. localhost:3004 (development default)
 */
export function getIcpServiceUrl(): string {
  const icpUrl = typeof window === 'undefined'
    ? process.env.NEXT_PUBLIC_ICP_BACKEND_URL || process.env.NEXT_PUBLIC_BACKEND_URL
    : (typeof window !== 'undefined' && (window as any).__ENV?.NEXT_PUBLIC_ICP_BACKEND_URL) ||
      (typeof window !== 'undefined' && (window as any).__ENV?.NEXT_PUBLIC_BACKEND_URL);

  return icpUrl || 'http://localhost:3004';
}

/**
 * Type-safe service URL getter with fallback
 * @param service - The service name
 * @param fallback - Optional fallback URL
 * @returns The service URL
 */
export function getServiceUrl(service: 'api' | 'whatsapp' | 'icp', fallback?: string): string {
  switch (service) {
    case 'whatsapp':
      return getWhatsAppServiceUrl();
    case 'icp':
      return getIcpServiceUrl();
    case 'api':
    default:
      return getApiUrl();
  }
}

/**
 * Build a full endpoint URL for a service
 * @param service - The service name
 * @param endpoint - The API endpoint path (e.g., '/conversations', '/stats')
 * @returns Full URL to the endpoint
 */
export function buildServiceEndpoint(service: 'api' | 'whatsapp' | 'icp', endpoint: string): string {
  const baseUrl = getServiceUrl(service);
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${baseUrl}${cleanEndpoint}`;
}
