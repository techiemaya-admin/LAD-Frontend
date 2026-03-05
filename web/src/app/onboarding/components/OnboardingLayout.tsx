'use client';
import React from 'react';
import { motion } from 'framer-motion';
import Onboarding3Panel from './Onboarding3Panel';
interface OnboardingLayoutProps {
  campaignId?: string | null;
}
export default function OnboardingLayout({ campaignId }: OnboardingLayoutProps) {
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
