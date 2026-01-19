'use client';

import React from 'react';
import { useSearchParams } from 'next/navigation';
import OnboardingLayout from './OnboardingLayout';

export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaignId');

  return (
    <div className="w-full h-screen overflow-hidden">
      <OnboardingLayout campaignId={campaignId} />
    </div>
  );
}

