"use client";

import React from 'react';
import nextDynamic from 'next/dynamic';
import { CallLogsSkeleton } from '@/components/skeletons/CallLogsSkeleton';
import { PageLoadingSentry } from '@/components/loader/PageLoadingSentry';

export const dynamic = 'force-dynamic';

const CallLogsContent = nextDynamic(
  () => import('./CallLogsContent'),
  {
    loading: () => (
      <>
        <PageLoadingSentry />
        <CallLogsSkeleton />
      </>
    )
  }
);

export default function CallLogsPage() {
  return <CallLogsContent />;
}
