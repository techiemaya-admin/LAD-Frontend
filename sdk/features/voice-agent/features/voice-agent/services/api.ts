import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { safeStorage } from '../../../../../shared/storage';

/**
 * Shared API Client for Voice Agent SDK
 * 
 * This is a standalone API client for the SDK layer.
 * It should work independently of the web layer.
 * Routes through LAD backend which proxies to voice agent server.
 */

class APIClient {
  private instance: AxiosInstance;

  constructor(baseURL: string = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'https://lad-backend-develop-741719885039.us-central1.run.app') {
    // LAD backend instance (proxies voice agent requests)
    // Default to cloud backend URL if env vars not set
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
        // Get token from SafeStorage
        const token = typeof window !== 'undefined' ? safeStorage.getItem('token') : null;

        if (token) {
          if (!config.headers) {
            config.headers = {} as any;
          }
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
