'use client';
import React from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import OnboardingLayout from './components/OnboardingLayout';
export default function OnboardingPage() {
  const searchParams = useSearchParams();
  const campaignId = searchParams.get('campaignId');
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
