'use client';
import { ReactNode } from 'react';
import { RequireFeature } from '@/components/RequireFeature';

export default function MakeCallLayout({ children }: { children: ReactNode }) {
  return <RequireFeature featureKey="voice-agent">{children}</RequireFeature>;
}
