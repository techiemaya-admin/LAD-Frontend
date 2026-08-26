'use client';
import { ReactNode } from 'react';
import { RequireFeature } from '@/components/RequireFeature';

export default function FollowUpsLayout({ children }: { children: ReactNode }) {
  return <RequireFeature featureKey="follow-ups">{children}</RequireFeature>;
}
