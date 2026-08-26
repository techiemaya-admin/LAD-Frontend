'use client';
import { ReactNode } from 'react';
import { RequireFeature } from '@/components/RequireFeature';

export default function CampaignsLayout({ children }: { children: ReactNode }) {
  return <RequireFeature featureKey="campaigns">{children}</RequireFeature>;
}
