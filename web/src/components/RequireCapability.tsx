'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Shield } from 'lucide-react';

interface RequireCapabilityProps {
  capability: string;
  children: ReactNode;
  fallback?: ReactNode;
  showMessage?: boolean;
}

/**
 * RequireCapability - Guard component for capability-based access control
 * 
 * Enforces user-level permissions (RBAC). User must have the required capability.
 * Use this for actions like viewing sensitive data, modifying settings, etc.
 * 
 * @param capability - Required capability string (e.g., "billing.view", "billing.admin")
 * @param children - Content to render if user has capability
 * @param fallback - Optional custom fallback UI
 * @param showMessage - Whether to show default access denied message (default: true)
 */
export const RequireCapability: React.FC<RequireCapabilityProps> = ({
  capability,
  children,
  fallback,
  showMessage = true,
}) => {
  const { hasCapability } = useAuth();

  if (hasCapability(capability)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showMessage) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
      <Shield className="h-12 w-12 mx-auto text-yellow-600 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Access Restricted</h3>
      <p className="text-gray-600">
        You don't have permission to access this feature.
        <br />
        Contact your administrator to request the <strong>{capability}</strong> capability.
      </p>
    </div>
  );
};
