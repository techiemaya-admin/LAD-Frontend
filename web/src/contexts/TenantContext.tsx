'use client';
import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { safeStorage } from '@lad/shared/storage';  

export interface Tenant {
  id: string;
  name: string;
}

interface TenantContextType {
  tenant: Tenant;
  tenantId: string | null;
  setTenantById: (id: string) => void;
  tenants: Tenant[];
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const STORAGE_KEY = 'selectedTenantId';

/**
 * Build the tenants list dynamically from the logged-in user's data
 * (returned by /api/auth/me and stored in safeStorage as 'user').
 */
function loadTenantsFromAuth(): Tenant[] {
  try {
    const raw = safeStorage.getItem('user');
    if (!raw) return [];
    const user = JSON.parse(raw);
    if (Array.isArray(user.tenants)) {
      return user.tenants.map((t: { id: string; name: string }) => ({
        id: t.id,
        name: t.name,
      }));
    }
  } catch { /* ignore parse errors */ }
  return [];
}

import { useAuth } from './AuthContext';

export function TenantProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Load tenants from auth data + restore last selection
  useEffect(() => {
    let loaded: Tenant[] = [];
    
    if (user && Array.isArray(user.tenants)) {
      loaded = user.tenants.map((t: any) => ({
        id: t.id,
        name: t.name,
      }));
    } else {
      loaded = loadTenantsFromAuth();
    }
    
    setTenants(loaded);
    
    const stored = safeStorage.getItem(STORAGE_KEY);
    if (stored && loaded.find((t) => t.id === stored)) {
      setSelectedId(stored);
    } else if (loaded.length > 0) {
      // Default to first tenant
      setSelectedId(loaded[0].id);
    }
  }, [user]);

  // Re-sync when storage changes
  useEffect(() => {
    const onStorage = () => {
      if (!user) {
        const loaded = loadTenantsFromAuth();
        setTenants(loaded);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const tenant = useMemo(
    () => tenants.find((t) => t.id === selectedId) || tenants[0] || { id: 'default', name: 'Default' },
    [tenants, selectedId],
  );

  const setTenantById = (id: string) => {
    const found = tenants.find((t) => t.id === id);
    if (found) {
      setSelectedId(id);
      safeStorage.setItem(STORAGE_KEY, id);
      // Reload so all components refetch with the new tenant
      window.location.reload();
    }
  };

  // tenantId sent as X-Tenant-ID header
  const tenantId = tenant.id === 'default' ? null : tenant.id;

  return (
    <TenantContext.Provider value={{ tenant, tenantId, setTenantById, tenants }}>
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}
