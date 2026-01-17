'use client';

import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock } from 'lucide-react';

interface RequireFeatureProps {
  featureKey: string;
  children: ReactNode;
  fallback?: ReactNode;
  showMessage?: boolean;
}

/**
 * RequireFeature - Guard component for tenant-level feature enablement
 * 
 * Checks if the tenant has a feature enabled (plan/entitlement check).
 * Use this to show/hide UI elements based on tenant's subscription.
 * 
 * @param featureKey - Required feature key (e.g., "billing", "apollo-leads")
 * @param children - Content to render if feature is enabled
 * @param fallback - Optional custom fallback UI
 * @param showMessage - Whether to show default upgrade message (default: true)
 */
export const RequireFeature: React.FC<RequireFeatureProps> = ({
  featureKey,
  children,
  fallback,
  showMessage = true,
}) => {
  const { hasFeature } = useAuth();

  if (hasFeature(featureKey)) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (!showMessage) {
    return null;
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
      <Lock className="h-12 w-12 mx-auto text-blue-600 mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">Feature Not Available</h3>
      <p className="text-gray-600 mb-4">
        This feature is not included in your current plan.
        <br />
        Upgrade your subscription to unlock <strong>{featureKey}</strong>.
      </p>
      <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
        Upgrade Plan
      </button>
    </div>
  );
};
