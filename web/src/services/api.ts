import axios, { AxiosInstance, AxiosResponse, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { safeStorage } from '../utils/storage';

// Use backend URL directly
const API_BASE_URL: string = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';
const API_TIMEOUT_MS: number = Number(process.env.NEXT_PUBLIC_API_TIMEOUT_MS) || 120000;

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  // Prevent infinite loading states if the backend hangs.
  // Pipeline loads can be legitimately slow (cold starts / large datasets), so default to 2 minutes.
  timeout: API_TIMEOUT_MS,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = safeStorage.getItem('token') || safeStorage.getItem('auth_token');
      if (token) {
        (config.headers as any).Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error: unknown) => Promise.reject(error)
);

api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        safeStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;

