'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import nextDynamic from 'next/dynamic';
import { PageSkeleton } from '@/components/skeletons/PageSkeleton';
import { PageLoadingSentry } from '@/components/loader/PageLoadingSentry';

const OnboardingLayout = nextDynamic(
  () => import('./OnboardingLayout'),
  {
    loading: () => (
      <>
        <PageLoadingSentry />
        <PageSkeleton />
      </>
    )
  }
);

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaignId');

  return (
    <div className="w-full h-screen overflow-hidden">
      <OnboardingLayout campaignId={campaignId} />
    </div>
  );
}