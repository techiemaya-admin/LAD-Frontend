// Using UI proxy routes that set/read httpOnly cookies
import { safeStorage } from '../utils/storage';

export type Credentials = {
  email: string;
  password: string;
};

export type AuthUser = {
  id: string;
  name?: string;
  role?: string;
  email?: string;
  avatar?: string;
  [key: string]: unknown;
};

export type LoginResponse = {
  user?: AuthUser;
  token?: string; // optional for backward compat, but not used
  [key: string]: unknown;
};

// Helper to set cookie
function setCookie(name: string, value: string, days: number = 7) {
  if (typeof window === 'undefined') return;
  const expires = new Date();
  expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
  document.cookie = `${name}=${value};expires=${expires.toUTCString()};path=/;SameSite=Lax`;
}

// Helper to delete cookie
function deleteCookie(name: string) {
  if (typeof window === 'undefined') return;
  document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
}

const authService = {
  login: async (credentials: Credentials): Promise<LoginResponse> => {
    // Call backend directly so it can set cookies on its domain
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';
    const response = await fetch(`${backendUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include', // Important: send and receive cookies
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error || 'Invalid credentials');
    }

    // Backend sets httpOnly cookie and returns token + user data
    const data: LoginResponse = await response.json();
    if (typeof window !== 'undefined' && data.token) {
      safeStorage.setItem('token', data.token);
      safeStorage.setItem('auth_token', data.token);
    }
    return data;
  },

  logout: async (): Promise<unknown> => {
    // Call backend directly to clear cookie
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';
    const response = await fetch(`${backendUrl}/api/auth/logout`, { 
      method: 'POST',
      credentials: 'include' 
    });
    if (!response.ok) {
      throw new Error('Logout failed');
    }
    if (typeof window !== 'undefined') {
      safeStorage.removeItem('token');
      safeStorage.removeItem('auth_token');
    }
    return await response.json();
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3004';
    const token = safeStorage.getItem('auth_token');
    const response = await fetch(`${backendUrl}/api/auth/me`, { 
      cache: 'no-store',
      credentials: 'include',
      headers: token ? {
        'Authorization': `Bearer ${token}`
      } : {}
    });
    if (response.status === 401) {
      throw new Error('Not authenticated');
    }
    if (!response.ok) {
      throw new Error('Failed to get current user');
    }
    const data = await response.json();
    // Backend returns { success: true, user: {...} }, extract the user
    return (data.user || data) as AuthUser;
  },
};

export default authService;

