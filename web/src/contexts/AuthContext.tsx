'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { safeStorage } from '../utils/storage';
import { logger } from '@/lib/logger';
interface User {
  id: string;
  email: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
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
  // Load token and user from localStorage on mount
  useEffect(() => {
    logger.debug('[AuthContext] Loading auth data from localStorage...');
    const storedToken = safeStorage.getItem('token');
    const storedUser = safeStorage.getItem('auth');
    
    if (storedToken) {
      logger.debug('[AuthContext] Stored token found');
      setToken(storedToken);
    }
    
    if (storedUser) {
      try {
        logger.debug('[AuthContext] Stored user found');
        const user = JSON.parse(storedUser);
        setUser(user);
      } catch (e) {
        logger.error('[AuthContext] Failed to parse stored user', { error: e });
      }
    }
    
    if (storedToken) {
      fetchCurrentUser(storedToken);
    } else {
      logger.debug('[AuthContext] No stored token found');
      setIsLoading(false);
    }
  }, []);
  const fetchCurrentUser = async (authToken: string) => {
    try {
      if (!authToken) {
        logger.error('[AuthContext] No auth token provided to fetchCurrentUser');
        setIsLoading(false);
        return;
      }
      logger.debug('[AuthContext] Fetching current user');
      // Call the Next.js API route instead of directly calling the backend
      // This avoids CORS issues with Safari stripping Authorization headers
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });
      logger.debug('[AuthContext] Auth response received', { status: response.status });
      if (response.ok) {
        const userData = await response.json();
        logger.debug('[AuthContext] User data received');
        const user = userData.user || userData;
        setUser(user);
        // Store user data in localStorage for persistence
        safeStorage.setItem('user', JSON.stringify(user));
      } else {
        // Token is invalid, clear it
        safeStorage.removeItem('token');
        safeStorage.removeItem('auth');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      safeStorage.removeItem('token');
      safeStorage.removeItem('auth');
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
        : `${process.env.NEXT_PUBLIC_API_BASE || 'https://lad-backend-develop-741719885039.us-central1.run.app'}/api/auth/login`;
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
      const data = await response.json();
      const authToken = data.token;
      // Store token
      safeStorage.setItem('token', authToken);
      setToken(authToken);
      // Fetch user data
      await fetchCurrentUser(authToken);
      // Redirect to dashboard
      router.push('/dashboard');
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };
  const logout = () => {
    safeStorage.removeItem('token');
    safeStorage.removeItem('auth');
    setToken(null);
    setUser(null);
    router.push('/login');
  };
  const getToken = async (): Promise<string | null> => {
    return token;
  };
  // Feature checking based on user capabilities and tenant features
  const hasFeature = (featureKey: string): boolean => {
    if (!user || !token) {
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
    token,
    isAuthenticated: !!user && !!token,
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
