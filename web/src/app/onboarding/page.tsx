'use client';
import React, { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import OnboardingLayout from './components/OnboardingLayout';
export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const campaignId = searchParams.get('campaignId');

  // Campaign EDITING lives in the advanced-search-ai setup flow, which hydrates
  // the saved chat + checkpoint selections from ?campaignId and updates the same
  // campaign on save. This legacy workflow editor kept receiving stale
  // "Edit Campaign" links/bookmarks and opened a disconnected 4-step editor
  // instead - redirect any campaignId deep-link to the real edit experience.
  useEffect(() => {
    if (campaignId) {
      router.replace(`/onboarding/advanced-search-ai?campaignId=${campaignId}`);
    }
  }, [campaignId, router]);
  if (campaignId) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="w-full h-screen overflow-hidden"
    >
      <OnboardingLayout campaignId={campaignId} />
    </motion.div>
  );
}
