/**
 * API Client Utility
 * Centralized fetch wrapper with base endpoint configuration
 */

const getBaseUrl = (): string => {
  // For server-side (middleware, API routes)
  if (typeof window === 'undefined') {
    return process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
  }
  
  // For client-side
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
};

export interface FetchOptions extends RequestInit {
  token?: string;
  includeCredentials?: boolean;
}

/**
 * Centralized fetch wrapper for API calls
 * Handles base URL, headers, and token injection
 */
export async function apiFetch(
  endpoint: string,
  options: FetchOptions = {}
) {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl}${endpoint}`;

  const {
    token,
    includeCredentials = true,
    headers: customHeaders = {},
    ...fetchOptions
  } = options;

  const headers = new Headers(customHeaders as HeadersInit);

  // Set default content type if not provided
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Add authorization header if token is provided
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: includeCredentials ? 'include' : 'omit',
    });

    return response;
  } catch (error) {
    console.error(`[API Client] Error fetching ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Validate authentication token
 * Calls the /api/auth/me endpoint to verify token is valid and authorized
 */
export async function validateAuthToken(token: string): Promise<boolean> {
  try {
    const response = await apiFetch('/api/auth/me', {
      method: 'GET',
      token,
    });

    return response.ok;
  } catch (error) {
    console.error('[API Client] Token validation error:', error);
    return false;
  }
}

/**
 * Get current authenticated user
 * Returns user data if token is valid
 */
export async function getCurrentUser(token: string): Promise<any> {
  try {
    const response = await apiFetch('/api/auth/me', {
      method: 'GET',
      token,
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('[API Client] Get current user error:', error);
    return null;
  }
}

/**
 * Make an API request with automatic token handling
 * Useful for authenticated API calls
 */
export async function apiRequest<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<{ data: T | null; error: Error | null; status: number }> {
  try {
    const response = await apiFetch(endpoint, options);

    if (!response.ok) {
      return {
        data: null,
        error: new Error(`API Error: ${response.status} ${response.statusText}`),
        status: response.status,
      };
    }

    const data = await response.json();
    return {
      data,
      error: null,
      status: response.status,
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error'),
      status: 0,
    };
  }
}
