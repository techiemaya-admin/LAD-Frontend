'use client';
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { InstagramSettings } from '@/components/instagram/InstagramSettings';

export default function InstagramSettingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-neutral-950" />}>
      <InstagramSettings />
    </Suspense>
  );
}
