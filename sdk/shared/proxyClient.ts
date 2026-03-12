/**
 * Proxy API Client for Python-backed features
 *
 * Uses relative URLs so requests go through Next.js API routes
 * (which proxy to Python services). This differs from the shared
 * apiClient which makes absolute URL calls to the LAD Node.js backend.
 *
 * Same interface as apiClient for consistency.
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

class ProxyClient {
  private async request<T>(
    method: string,
    path: string,
    body?: any,
    options?: RequestOptions
  ): Promise<ApiResponse<T>> {
    // Build URL with query params - relative URL goes through Next.js
    const url = new URL(path, typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000');

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
      // Forward selected tenant ID so proxy routes to correct tenant database
      const selectedTenantId = safeStorage.getItem('selectedTenantId');
      if (selectedTenantId && selectedTenantId !== 'default') {
        headers['X-Tenant-ID'] = selectedTenantId;
      }
    }

    const config: RequestInit = {
      method,
      headers,
      credentials: 'include',
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
}

// Export singleton instance
export const proxyClient = new ProxyClient();

// Export types
export type { ProxyClient, ApiResponse, RequestOptions };
