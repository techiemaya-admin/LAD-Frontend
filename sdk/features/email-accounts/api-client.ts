/**
 * Shared API Client for LAD Frontend SDK
 *
 * This is the centralized HTTP client used by all feature SDKs.
 * It handles authentication, base URL, and common request/response logic.
 */
import { safeStorage } from '@lad/shared/storage';

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
    // In browser environments, always go through the app's own /api routes.
    // This keeps requests same-origin and lets Next.js proxy decide backend targets.
    const isLocalhost =
        window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1';

    if (isLocalhost) {
      // Direct backend call in local development
      this.baseURL = `${process.env.NEXT_PUBLIC_BACKEND_SETTINGS_URL}/api`;
    } else {
      // Production/staging → use same-origin proxy
      this.baseURL = `${window.location.origin}/api`;
    }


    // Server-side resolution is environment-driven and avoids hardcoded deployment URLs.
    const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_SETTINGS_URL ||
        process.env.BACKEND_INTERNAL_URL ||
        process.env.BACKEND_URL ||
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        process.env.NEXT_PUBLIC_API_URL;
    console.log("email account url:: " + backendUrl)
    if (backendUrl) {
      this.baseURL = backendUrl.endsWith('/api') ? backendUrl : `${backendUrl}/api`;
      console.log(" setting base urls in  : "+this.baseURL)

      return;
    }

    if (process.env.NODE_ENV === 'production') {
      throw new Error(
          'Backend URL is required in production (set BACKEND_INTERNAL_URL, BACKEND_URL, or NEXT_PUBLIC_BACKEND_URL)'
      );
    }

    // Local default for development only.
    this.baseURL = 'http://localhost:3004/api';
  }
  private async request<T>(
      method: string,
      path: string,
      body?: any,
      options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    console.log("base url : "+this.baseURL+" path : "+path)
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
      console.log("url in emai l account before fetch : " + url.toString())
      const response = await fetch(url.toString(), config);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
            errorData.error || errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }
      // Check if response has content before parsing JSON (e.g., 204 No Content)
      const contentType = response.headers.get('content-type');
      const hasContent = response.status !== 204 && response.headers.get('content-length') !== '0';
      let data: T;
      if (hasContent && contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = undefined as T;
      }
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
export const apiClientEmail = new ApiClient();
// Export convenience methods
export const apiGet = <T = any>(path: string, options?: RequestOptions) =>
    apiClientEmail.get<T>(path, options);
export const apiPost = <T = any>(path: string, body?: any, options?: RequestOptions) =>
    apiClientEmail.post<T>(path, body, options);
export const apiPut = <T = any>(path: string, body?: any, options?: RequestOptions) =>
    apiClientEmail.put<T>(path, body, options);
export const apiDelete = <T = any>(path: string, options?: RequestOptions) =>
    apiClientEmail.delete<T>(path, options);
export const apiPatch = <T = any>(path: string, body?: any, options?: RequestOptions) =>
    apiClientEmail.patch<T>(path, body, options);
// Export type for use in tests
export type { ApiClient, ApiResponse, RequestOptions };
