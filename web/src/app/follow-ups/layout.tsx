'use client';
import { ReactNode } from 'react';
import { RequireFeature } from '@/components/RequireFeature';
import { FEATURE } from '@/lib/page-permissions';

export default function FollowUpsLayout({ children }: { children: ReactNode }) {
  return <RequireFeature featureKey={FEATURE.FOLLOWUPS}>{children}</RequireFeature>;
}
