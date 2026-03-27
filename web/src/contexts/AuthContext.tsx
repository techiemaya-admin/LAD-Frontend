'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { safeStorage } from '@lad/shared/storage';  
import { logger } from '@/lib/logger';
interface UserTenant {
  id: string;
  name: string;
  planTier?: string;
  status?: string;
  role?: string;
}

interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  tenantId?: string;
  tenants?: UserTenant[];
  capabilities?: string[];
  tenantFeatures?: string[];
}
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  getToken: () => Promise<string | null>;
  hasFeature: (featureKey: string) => boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  // Load user data from storage on mount; token lives in httpOnly cookie only.
  useEffect(() => {
    logger.debug('[AuthContext] Loading auth data...');
    const storedAuth = safeStorage.getItem('auth');

    if (storedAuth) {
      try {
        logger.debug('[AuthContext] Stored auth data found');
        const parsedAuth = JSON.parse(storedAuth);
        const user = parsedAuth.user || parsedAuth;
        setUser(user);
      } catch (e) {
        logger.error('[AuthContext] Failed to parse stored auth', { error: e });
      }
    }

    // Always try to fetch current user — the httpOnly cookie is sent automatically.
    fetchCurrentUser();
  }, []);
  const fetchCurrentUser = async () => {
    try {
      logger.debug('[AuthContext] Fetching current user');
      // Token is sent automatically via httpOnly cookie (credentials: 'include')
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      logger.debug('[AuthContext] Auth response received', { status: response.status });
      if (response.ok) {
        const userData = await response.json();
        logger.debug('[AuthContext] User data received');
        const user = userData.user || userData;
        setUser(user);
        // Store user profile data for quick rehydration
        safeStorage.setItem('auth', JSON.stringify({
          user,
          isAuthenticated: true,
          theme: 'light'
        }));
        safeStorage.setItem('user', JSON.stringify(user));
      } else {
        safeStorage.removeItem('auth');
        safeStorage.removeItem('user');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      safeStorage.removeItem('auth');
      safeStorage.removeItem('user');
      setToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };
  const login = async (email: string, password: string) => {
    try {
      // Use Next.js API route for local dev, direct backend call for production
      const apiUrl = process.env.NEXT_PUBLIC_USE_API_PROXY === 'true' 
        ? '/api/auth/login' 
        : `${process.env.NEXT_PUBLIC_API_BASE || 'https://lad-backend-develop-160078175457.us-central1.run.app'}/api/auth/login`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Login failed');
      }
      await response.json();
      // Token is set as httpOnly cookie by the API route — fetch user data
      await fetchCurrentUser();
      // Redirect to AI Assistant after login
      router.push('/onboarding/advanced-search-ai');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };
  const logout = () => {
    // httpOnly cookie is cleared by the /api/auth/logout route
    safeStorage.removeItem('auth');
    safeStorage.removeItem('user');
    setToken(null);
    setUser(null);
    router.push('/login');
  };
  const getToken = async (): Promise<string | null> => {
    return token;
  };
  // Feature checking based on user capabilities and tenant features
  const hasFeature = (featureKey: string): boolean => {
    if (!user) {
      return false;
    }
    // Check both capabilities and tenant features
    const userCapabilities = user.capabilities || [];
    const userTenantFeatures = user.tenantFeatures || [];
    // Feature can be enabled via either capabilities or tenant features
    return userCapabilities.includes(featureKey) || userTenantFeatures.includes(featureKey);
  };
  const value = {
    user,
    token, // Token might be null if using cookie-only auth (OAuth)
    isAuthenticated: !!user, // Consider authenticated if user data is present, even without client-side token
    isLoading,
    login,
    logout,
    getToken,
    hasFeature,
  };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
