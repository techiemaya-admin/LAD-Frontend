'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { safeStorage } from '../utils/storage';

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

  // Load token from localStorage on mount
  useEffect(() => {
    console.log('[AuthContext] Loading token from localStorage...');
    const storedToken = safeStorage.getItem('auth_token');
    console.log('[AuthContext] Stored token found:', !!storedToken, storedToken?.substring(0, 20) + '...');
    
    if (storedToken) {
      setToken(storedToken);
      fetchCurrentUser(storedToken);
    } else {
      console.log('[AuthContext] No stored token found');
      setIsLoading(false);
    }
  }, []);

  const fetchCurrentUser = async (authToken: string) => {
    try {
      if (!authToken) {
        console.error('[AuthContext] No auth token provided to fetchCurrentUser');
        setIsLoading(false);
        return;
      }
      
      console.log('[AuthContext] Fetching current user with token:', authToken.substring(0, 20) + '...');
      
      // Call the Next.js API route instead of directly calling the backend
      // This avoids CORS issues with Safari stripping Authorization headers
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
      });

      console.log('[AuthContext] Response status:', response.status);

      if (response.ok) {
        const userData = await response.json();
        console.log('[AuthContext] User data received:', userData);
        const user = userData.user || userData;
        console.log('[AuthContext] Setting user:', user);
        setUser(user);
      } else {
        // Token is invalid, clear it
        safeStorage.removeItem('auth_token');
        setToken(null);
        setUser(null);
      }
    } catch (error) {
      console.error('Failed to fetch current user:', error);
      safeStorage.removeItem('auth_token');
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
        : `${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3004'}/api/auth/login`;
      
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
      safeStorage.setItem('auth_token', authToken);
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
    safeStorage.removeItem('auth_token');
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
