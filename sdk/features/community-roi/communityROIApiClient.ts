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
    // Use NEXT_PUBLIC_COMMUNITY_API_URL (preferred) or fall back to NEXT_PUBLIC_BACKEND_URL
    const communityUrl = process.env.NEXT_PUBLIC_COMMUNITY_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
    
    if (!communityUrl && process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_COMMUNITY_API_URL or NEXT_PUBLIC_BACKEND_URL environment variable is required');
    }
    
    // If URL is provided, append /api; otherwise use production backend as default
    if (communityUrl) {
      // Check if URL already contains /api suffix
      this.baseURL = communityUrl.endsWith('/api') ? communityUrl : `${communityUrl}/api`;
    } else {
      // Default to production backend
      this.baseURL = `https://lad-backend-develop-160078175457.us-central1.run.app/api`;
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    const url = new URL(path, this.baseURL);

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

    try {
      const response = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
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
