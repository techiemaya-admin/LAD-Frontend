'use client';
import { ReactNode } from 'react';
import { RequireFeature } from '@/components/RequireFeature';
import { FEATURE } from '@/lib/page-permissions';

/**
 * Tenant entitlement gate. The sidebar also hides the nav item, but hiding is
 * not access control — a user who types the URL lands here, so the gate has to
 * live on the route itself. The backend enforces the same feature independently.
 */
export default function SalesPlaybookLayout({ children }: { children: ReactNode }) {
  return <RequireFeature featureKey={FEATURE.SALES_PLAYBOOK}>{children}</RequireFeature>;
}
