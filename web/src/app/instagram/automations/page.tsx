'use client';
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { InstagramAutomations } from '@/components/instagram/InstagramAutomations';

export default function InstagramAutomationsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-neutral-950" />}>
      <InstagramAutomations />
    </Suspense>
  );
}
