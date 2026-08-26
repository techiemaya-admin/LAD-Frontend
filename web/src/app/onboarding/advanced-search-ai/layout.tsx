'use client';
import { ReactNode } from 'react';
import { RequireFeature } from '@/components/RequireFeature';

export default function AdvancedSearchAiLayout({ children }: { children: ReactNode }) {
  return <RequireFeature featureKey="ai-chat">{children}</RequireFeature>;
}
