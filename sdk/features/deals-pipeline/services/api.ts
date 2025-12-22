import { safeStorage } from '../utils/storage';

// Use backend URL directly
const API_BASE_URL: string = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';

interface RequestConfig {
  method?: string;
  headers?: Record<string, string>;
  body?: any;
}

interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T = any>(endpoint: string, config: RequestConfig = {}): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    // Get auth token
    const token = typeof window !== 'undefined' 
      ? (safeStorage.getItem('token') || safeStorage.getItem('auth_token'))
      : null;

    // Build headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...config.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Build fetch config
    const fetchConfig: RequestInit = {
      method: config.method || 'GET',
      headers,
      credentials: 'include', // Send cookies with requests
    };

    if (config.body) {
      fetchConfig.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, fetchConfig);
      
      // Handle 401 Unauthorized
      if (response.status === 401) {
        if (typeof window !== 'undefined') {
          safeStorage.removeItem('token');
          window.location.href = '/login';
        }
      }

      // Parse response
      let data: T;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text() as any;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return {
        data,
        status: response.status,
        statusText: response.statusText,
      };
    } catch (error) {
      throw error;
    }
  }

  async get<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body: data });
  }

  async put<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body: data });
  }

  async delete<T = any>(endpoint: string, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  async patch<T = any>(endpoint: string, data?: any, config?: RequestConfig): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body: data });
  }
}

const api = new ApiClient(API_BASE_URL);

export default api;

