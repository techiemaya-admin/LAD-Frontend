'use client';

import React from 'react';
import Onboarding3Panel from './Onboarding3Panel';

interface OnboardingLayoutProps {
  campaignId?: string | null;
}

export default function OnboardingLayout({ campaignId }: OnboardingLayoutProps) {
  return (
    <div className="w-full h-full">
      <Onboarding3Panel campaignId={campaignId} />
    </div>
  );
}
