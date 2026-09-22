'use client';
import React, { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock } from 'lucide-react';
interface RequireFeatureProps {
  /**
   * One key, or several acceptable spellings of the same entitlement. A list
   * because tenant_features and feature_flags disagree on hyphen vs underscore
   * and these call sites were written in the wrong vocabulary — see
   * lib/page-permissions.ts. Any match passes.
   */
  featureKey: string | readonly string[];
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
  const keys = Array.isArray(featureKey) ? featureKey : [featureKey as string];
  if (keys.some((k) => hasFeature(k))) {
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
        Upgrade your subscription to unlock <strong>{keys[0]}</strong>.
      </p>
      <button className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors">
        Upgrade Plan
      </button>
    </div>
  );
};
