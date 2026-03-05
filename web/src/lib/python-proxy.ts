/**
 * Communication Services URL Utilities
 * Handles URL configuration for various backend services including WhatsApp, BNI, and core API
 */

/**
 * Get the WhatsApp API service URL
 * Priority:
 * 1. NEXT_PUBLIC_WHATSAPP_API_URL - public frontend env var
 * 2. WHATSAPP_SERVICE_URL - server-side env var
 * 3. http://localhost:8000 - local development default
 */
export function getWhatsAppServiceUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side
    return (
      process.env.WHATSAPP_SERVICE_URL ||
      process.env.NEXT_PUBLIC_WHATSAPP_API_URL ||
      'http://localhost:8000'
    );
  }
  // Client-side
  return (
    (process.env.NEXT_PUBLIC_WHATSAPP_API_URL as string) ||
    'http://localhost:8000'
  );
}

/**
 * Get the core API URL
 * Priority:
 * 1. NEXT_PUBLIC_API_URL - explicit API URL
 * 2. NEXT_PUBLIC_BACKEND_URL - backend base URL (will append /api if needed)
 * 3. http://localhost:3004 - local development default
 */
export function getApiUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side
    return (
      process.env.NEXT_PUBLIC_API_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:3004'
    );
  }
  // Client-side
  return (
    (process.env.NEXT_PUBLIC_API_URL as string) ||
    (process.env.NEXT_PUBLIC_BACKEND_URL as string) ||
    'http://localhost:3004'
  );
}

/**
 * Get the backend service URL (base, without /api suffix)
 * Priority:
 * 1. NEXT_PUBLIC_BACKEND_URL - backend base URL
 * 2. NEXT_PUBLIC_API_URL - if it contains /api, strip it
 * 3. http://localhost:3004 - local development default
 */
export function getBackendUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side
    let url =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      'http://localhost:3004';
    // Strip /api suffix if present
    return url.replace(/\/api\/?$/, '');
  }
  // Client-side
  let url =
    (process.env.NEXT_PUBLIC_BACKEND_URL as string) ||
    (process.env.NEXT_PUBLIC_API_URL as string) ||
    'http://localhost:3004';
  // Strip /api suffix if present
  return url.replace(/\/api\/?$/, '');
}

/**
 * Get the BNI conversation service URL
 * Priority:
 * 1. NEXT_PUBLIC_BNI_SERVICE_URL - public frontend env var
 * 2. BNI_SERVICE_URL - server-side env var
 * 3. Falls back to whatsapp service (unified comms)
 */
export function getBNIServiceUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side
    return (
      process.env.BNI_SERVICE_URL ||
      process.env.NEXT_PUBLIC_BNI_SERVICE_URL ||
      getWhatsAppServiceUrl()
    );
  }
  // Client-side
  return (
    (process.env.NEXT_PUBLIC_BNI_SERVICE_URL as string) ||
    getWhatsAppServiceUrl()
  );
}

/**
 * Get the ICP assistant backend URL
 * Priority:
 * 1. NEXT_PUBLIC_ICP_BACKEND_URL - dedicated ICP backend
 * 2. NEXT_PUBLIC_BACKEND_URL - main backend
 * 3. http://localhost:3004 - local development default
 */
export function getICPBackendUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side
    return (
      process.env.NEXT_PUBLIC_ICP_BACKEND_URL ||
      process.env.NEXT_PUBLIC_BACKEND_URL ||
      'http://localhost:3004'
    );
  }
  // Client-side
  return (
    (process.env.NEXT_PUBLIC_ICP_BACKEND_URL as string) ||
    (process.env.NEXT_PUBLIC_BACKEND_URL as string) ||
    'http://localhost:3004'
  );
}

/**
 * Construct a full URL for a given endpoint
 * @param service - The service type ('whatsapp', 'api', 'bni', 'icp')
 * @param endpoint - The endpoint path (e.g., '/conversations')
 * @returns Full URL to the endpoint
 */
export function getServiceUrl(
  service: 'whatsapp' | 'api' | 'bni' | 'icp',
  endpoint: string
): string {
  let baseUrl: string;

  switch (service) {
    case 'whatsapp':
      baseUrl = getWhatsAppServiceUrl();
      break;
    case 'bni':
      baseUrl = getBNIServiceUrl();
      break;
    case 'icp':
      baseUrl = getICPBackendUrl();
      break;
    case 'api':
    default:
      baseUrl = getApiUrl();
  }

  // Ensure endpoint starts with /
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  // Remove trailing slashes from baseUrl
  const cleanBase = baseUrl.replace(/\/$/, '');

  return `${cleanBase}${path}`;
}
