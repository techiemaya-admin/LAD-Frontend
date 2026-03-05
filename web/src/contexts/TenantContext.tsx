'use client';
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { safeStorage } from '../utils/storage';

export interface Tenant {
  id: string;
  name: string;
  /** Optional override URL for conversations API (e.g. unified-comms service) */
  conversationsUrl?: string;
}

/** Known tenants. Add new tenants here. */
export const TENANTS: Tenant[] = [
  {
    id: 'default',
    name: 'TPF (Default)',
    // Uses the main backend — no override
  },
  {
    id: '9ca4012a-2e02-5593-8cc1-fd5bd81483f9',
    name: 'BNI Rising Phoenix',
    conversationsUrl:
      process.env.NEXT_PUBLIC_UNIFIED_COMMS_URL ||
      'https://unified-comms-160078175457.us-central1.run.app',
  },
];

interface TenantContextType {
  tenant: Tenant;
  tenantId: string | null;
  setTenantById: (id: string) => void;
  tenants: Tenant[];
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

const STORAGE_KEY = 'selectedTenantId';

export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant, setTenant] = useState<Tenant>(TENANTS[0]);

  useEffect(() => {
    const stored = safeStorage.getItem(STORAGE_KEY);
    if (stored) {
      const found = TENANTS.find((t) => t.id === stored);
      if (found) setTenant(found);
    }
  }, []);

  const setTenantById = (id: string) => {
    const found = TENANTS.find((t) => t.id === id);
    if (found) {
      setTenant(found);
      safeStorage.setItem(STORAGE_KEY, id);
      // Reload conversations when tenant changes
      window.location.reload();
    }
  };

  // tenantId to send as X-Tenant-ID header (null for default tenant)
  const tenantId = tenant.id === 'default' ? null : tenant.id;

  return (
    <TenantContext.Provider value={{ tenant, tenantId, setTenantById, tenants: TENANTS }}>
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
