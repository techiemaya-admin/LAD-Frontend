'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { useSearchParams } from 'next/navigation';
import Onboarding3Panel from './Onboarding3Panel';
import WizardShell from './wizard/WizardShell';
interface OnboardingLayoutProps {
  campaignId?: string | null;
}
export default function OnboardingLayout({ campaignId }: OnboardingLayoutProps) {
  // R8 Phase 3 - when ?step=<id> is present, run the linear signup wizard
  // (Welcome → Company → ICP → Review → Integrations). When absent, keep the
  // existing 3-panel flow so direct entries to /onboarding don't regress.
  const searchParams = useSearchParams();
  const stepParam = searchParams.get('step');
  if (stepParam) {
    return <WizardShell />;
  }
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="w-full h-full"
    >
      <Onboarding3Panel campaignId={campaignId} />
    </motion.div>
  );
}
