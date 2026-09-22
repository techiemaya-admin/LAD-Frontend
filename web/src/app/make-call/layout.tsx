'use client';
import { ReactNode } from 'react';
import { RequireFeature } from '@/components/RequireFeature';
import { FEATURE } from '@/lib/page-permissions';

export default function MakeCallLayout({ children }: { children: ReactNode }) {
  return <RequireFeature featureKey={FEATURE.VOICE_AGENT}>{children}</RequireFeature>;
}
