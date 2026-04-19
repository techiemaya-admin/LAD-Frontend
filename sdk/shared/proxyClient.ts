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
  /**
   * Override the WhatsApp backend routing for this request.
   * 'personal' → LAD_backend (Baileys)
   * 'waba'     → LAD-WABA-Comms (Meta Business API)
   * When omitted, falls back to localStorage.whatsappChannel || 'personal'.
   */
  channel?: 'personal' | 'waba';
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

    // Inject channel param so the proxy routes to the correct backend.
    // Prefer the per-request override; fall back to localStorage for legacy callers.
    if (typeof window !== 'undefined' && !url.searchParams.has('channel')) {
      const channel = options?.channel ?? safeStorage.getItem('whatsappChannel') ?? 'personal';
      url.searchParams.set('channel', channel);
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...options?.headers,
    };

    const isConversationPath = path.includes('/api/whatsapp-conversations/conversations');
    let selectedTenantId = '';

    // Add auth token from SafeStorage
    if (typeof window !== 'undefined') {
      const token = safeStorage.getItem('token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      // Forward selected tenant ID so proxy routes to correct tenant database
      selectedTenantId = safeStorage.getItem('selectedTenantId') || '';

      // Fallback to tenant from cached user profile when explicit tenant switch is not set.
      let userTenantId = '';
      const rawUser = safeStorage.getItem('user');
      if (rawUser) {
        try {
          const parsedUser = JSON.parse(rawUser);
          userTenantId = parsedUser?.tenantId || parsedUser?.organizationId || '';
        } catch {
          userTenantId = '';
        }
      }

      const effectiveTenantId = (selectedTenantId && selectedTenantId !== 'default')
        ? selectedTenantId
        : userTenantId;

      if (effectiveTenantId) {
        headers['X-Tenant-ID'] = effectiveTenantId;
      }

      // Quick end-to-end tenant trace marker for conversations API path.
      if (isConversationPath) {
        const traceId = `conv-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        headers['X-Debug-Trace-Id'] = traceId;
        headers['X-Debug-Client-Tenant'] = effectiveTenantId || 'none';
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

  /**
   * Create a channel-bound client that always sends requests to a specific backend.
   * Used by the tab-scoped useConversations({ channel: 'personal' | 'waba' }) instances.
   */
  withChannel(channel: 'personal' | 'waba'): ChannelBoundClient {
    return new ChannelBoundClient(this, channel);
  }
}

/**
 * A thin wrapper around ProxyClient that hard-wires the channel for every request.
 * This is the backbone of the tab-scoped conversation views — each tab creates
 * its own ChannelBoundClient so queries never share routing state.
 */
export class ChannelBoundClient {
  constructor(
    private readonly parent: ProxyClient,
    private readonly channel: 'personal' | 'waba'
  ) {}

  async get<T = any>(path: string, options?: Omit<RequestOptions, 'channel'>): Promise<ApiResponse<T>> {
    return this.parent.get<T>(path, { ...options, channel: this.channel });
  }

  async post<T = any>(path: string, body?: any, options?: Omit<RequestOptions, 'channel'>): Promise<ApiResponse<T>> {
    return this.parent.post<T>(path, body, { ...options, channel: this.channel });
  }

  async patch<T = any>(path: string, body?: any, options?: Omit<RequestOptions, 'channel'>): Promise<ApiResponse<T>> {
    return this.parent.patch<T>(path, body, { ...options, channel: this.channel });
  }

  async put<T = any>(path: string, body?: any, options?: Omit<RequestOptions, 'channel'>): Promise<ApiResponse<T>> {
    return this.parent.put<T>(path, body, { ...options, channel: this.channel });
  }

  async delete<T = any>(path: string, options?: Omit<RequestOptions, 'channel'>): Promise<ApiResponse<T>> {
    return this.parent.delete<T>(path, { ...options, channel: this.channel });
  }
}

// Export singleton instance
export const proxyClient = new ProxyClient();

// Export types
export type { ProxyClient, ApiResponse, RequestOptions };
