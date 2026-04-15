/**
 * Community ROI API Client
 * 
 * Separate API client specifically for community-roi features
 * Uses NEXT_PUBLIC_COMMUNITY_API_URL environment variable
 */
import { safeStorage } from '../../shared/storage';

type ApiResponse<T = any> = {
  data: T;
  status: number;
  statusText: string;
};
type RequestOptions = {
  headers?: Record<string, string>;
  params?: Record<string, any>;
};

class CommunityROIApiClient {
  private baseURL: string;

  constructor() {
    // In development, use localhost proxy
    // In production, use NEXT_PUBLIC_COMMUNITY_API_URL environment variable
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      // Development: use current origin with proxy route path
      this.baseURL = `${window.location.origin}/api/community-roi`;
    } else {
      // Production: use deployed backend or environment variable
      const communityUrl = process.env.NEXT_PUBLIC_COMMUNITY_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
      
      if (!communityUrl && process.env.NODE_ENV === 'production') {
        throw new Error('NEXT_PUBLIC_COMMUNITY_API_URL or NEXT_PUBLIC_BACKEND_URL environment variable is required');
      }
      
      // If URL is provided, append /api/community-roi; otherwise use production backend as default
      if (communityUrl) {
        // Remove trailing slash if present, then append /api/community-roi
        const baseUrl = communityUrl.endsWith('/') ? communityUrl.slice(0, -1) : communityUrl;
        this.baseURL = baseUrl.endsWith('/api/community-roi')
          ? baseUrl
          : `${baseUrl}/api/community-roi`;
      } else {
        // Default to production backend with /api/community-roi prefix
        this.baseURL = `https://lad-backend-develop-160078175457.us-central1.run.app/api/community-roi`;
      }
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    // new URL(path, base) discards the base pathname when path starts with '/'
    // e.g. new URL('/foo', 'http://host/api/community-roi') → http://host/foo  (WRONG)
    // Fix: strip leading slash from path, ensure base ends with '/'
    const normalizedBase = this.baseURL.endsWith('/') ? this.baseURL : `${this.baseURL}/`;
    const normalizedPath = path.startsWith('/') ? path.slice(1) : path;
    const url = new URL(normalizedPath, normalizedBase);

    // Add query parameters
    if (options?.params) {
      Object.entries(options.params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    };

    // Add auth token from SafeStorage - match shared apiClient key name
    if (typeof window !== 'undefined') {
      const token = safeStorage.getItem('token');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    let response: Response | undefined;
    try {
      const fullUrl = url.toString();
      console.debug(`[CommunityROI API] ${method} ${fullUrl}`, { baseURL: this.baseURL, path });
      response = await fetch(fullUrl, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });
    } catch (networkError) {
      // True network failure (offline, DNS, CORS, etc.) — always log
      console.error('[CommunityROI API] Network error:', networkError);
      throw networkError;
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const err = new Error(`API Error: ${response.status} ${response.statusText}`);
      // Log all failed requests to help debug
      console.error(`[CommunityROI API] ${response.status} on ${method} ${url.toString()}`, {
        baseURL: this.baseURL,
        path,
        response: data
      });
      throw err;
    }

    return {
      data,
      status: response.status,
      statusText: response.statusText,
    };
  }

  async get<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, options);
  }

  async post<T>(path: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body, options);
  }

  async put<T>(path: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body, options);
  }

  async patch<T>(path: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, body, options);
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  setAuthToken(token: string) {
    if (token) {
      safeStorage.setItem('token', token);
    } else {
      safeStorage.removeItem('token');
    }
  }

  setBaseURL(url: string) {
    this.baseURL = url;
  }

  getBaseURL(): string {
    return this.baseURL;
  }
}

// Create and export singleton instance
export const communityROIApiClient = new CommunityROIApiClient();
export default communityROIApiClient;
