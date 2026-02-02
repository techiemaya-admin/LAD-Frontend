/**
 * Shared API Client for LAD Frontend SDK
 * 
 * This is the centralized HTTP client used by all feature SDKs.
 * It handles authentication, base URL, and common request/response logic.
 */
import { safeStorage } from './storage';

type ApiResponse<T = any> = {
  data: T;
  status: number;
  statusText: string;
};
type RequestOptions = {
  headers?: Record<string, string>;
  params?: Record<string, any>;
};
class ApiClient {
  private baseURL: string;
  constructor() {
    // Use NEXT_PUBLIC_BACKEND_URL (preferred) or NEXT_PUBLIC_API_URL (legacy fallback)
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL;
    
    if (!backendUrl && process.env.NODE_ENV === 'production') {
      throw new Error('NEXT_PUBLIC_BACKEND_URL environment variable is required in production');
    }
    
    // If backend URL is provided, append /api; otherwise use production backend as default
    if (backendUrl) {
      // Check if URL already contains /api suffix
      this.baseURL = backendUrl.endsWith('/api') ? backendUrl : `${backendUrl}/api`;
    } else {
      // Default to production backend instead of localhost
      this.baseURL = `${process.env.NEXT_PUBLIC_BACKEND_URL}/api`;
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
      ...options?.headers,
    };
    
    // Add auth token from SafeStorage
    if (typeof window !== 'undefined') {
      const token = safeStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }
    const config: RequestInit = {
      method,
      headers,
      credentials: 'include', // Include cookies
    };
    if (body) {
      config.body = JSON.stringify(body);
    }
    try {
      const response = await fetch(url.toString(), config);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }
      const data = await response.json();
      return {
        data,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }
  async get<T = any>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, options);
  }
  async post<T = any>(path: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body, options);
  }
  async put<T = any>(path: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body, options);
  }
  async delete<T = any>(path: string, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options);
  }
  async patch<T = any>(path: string, body?: any, options?: RequestOptions): Promise<ApiResponse<T>> {
    return this.request<T>('PATCH', path, body, options);
  }
  setBaseURL(url: string) {
    this.baseURL = url;
  }
  getBaseURL(): string {
    return this.baseURL;
  }
}
// Export singleton instance
export const apiClient = new ApiClient();
// Export convenience methods
export const apiGet = <T = any>(path: string, options?: RequestOptions) => 
  apiClient.get<T>(path, options);
export const apiPost = <T = any>(path: string, body?: any, options?: RequestOptions) => 
  apiClient.post<T>(path, body, options);
export const apiPut = <T = any>(path: string, body?: any, options?: RequestOptions) => 
  apiClient.put<T>(path, body, options);
export const apiDelete = <T = any>(path: string, options?: RequestOptions) => 
  apiClient.delete<T>(path, options);
export const apiPatch = <T = any>(path: string, body?: any, options?: RequestOptions) => 
  apiClient.patch<T>(path, body, options);
// Export type for use in tests
export type { ApiClient, ApiResponse, RequestOptions };
