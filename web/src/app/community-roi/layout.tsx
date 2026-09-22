'use client';
import { ReactNode } from 'react';
import { RequireFeature } from '@/components/RequireFeature';
import { FEATURE } from '@/lib/page-permissions';

export default function CommunityRoiLayout({ children }: { children: ReactNode }) {
  return <RequireFeature featureKey={FEATURE.COMMUNITY_ROI}>{children}</RequireFeature>;
}
