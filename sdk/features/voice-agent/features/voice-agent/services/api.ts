import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';

/**
 * Shared API Client for Voice Agent SDK
 * 
 * This is a standalone API client for the SDK layer.
 * It should work independently of the web layer.
 */

class APIClient {
  private instance: AxiosInstance;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || '/api') {
    this.instance = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    // Request interceptor for auth token
    this.instance.interceptors.request.use(
      (config) => {
        // Get token from localStorage or sessionStorage (using the correct key)
        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.instance.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized - trigger auth flow
          // Could dispatch logout event or redirect to login
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('auth:unauthorized'));
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.instance.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.instance.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.instance.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig) {
    return this.instance.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig) {
    return this.instance.delete<T>(url, config);
  }
}

// Export singleton instance
export default new APIClient();
