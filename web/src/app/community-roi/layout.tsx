'use client';
import { ReactNode } from 'react';
import { RequireFeature } from '@/components/RequireFeature';

export default function CommunityRoiLayout({ children }: { children: ReactNode }) {
  return <RequireFeature featureKey="community-roi">{children}</RequireFeature>;
}
