// Using UI proxy routes that set/read httpOnly cookies
// Token is stored ONLY in httpOnly cookies — never in localStorage.

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


const authService = {
  login: async (credentials: Credentials): Promise<LoginResponse> => {
    // Call frontend API route which will set httpOnly cookies
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
      credentials: 'include', // Important: send and receive cookies
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.error || 'Invalid credentials');
    }
    // httpOnly cookie is set by the API route — no localStorage needed
    return await response.json();
  },

  logout: async (): Promise<unknown> => {
    // Call frontend API route to clear cookie
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include'
    });
    if (!response.ok) {
      throw new Error('Logout failed');
    }
    return await response.json();
  },

  getCurrentUser: async (): Promise<AuthUser> => {
    // Token is sent automatically via httpOnly cookie (credentials: 'include')
    const response = await fetch('/api/auth/me', {
      cache: 'no-store',
      credentials: 'include',
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
