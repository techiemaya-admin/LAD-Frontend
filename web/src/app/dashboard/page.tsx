
"use client";
import React from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { PageLoadingSentry } from '@/components/loader/PageLoadingSentry';

const DashboardGrid = dynamic(() => import('@/components/dashboard/DashboardGrid').then(mod => mod.DashboardGrid), {
  loading: () => (
    <>
      <PageLoadingSentry />
      <div className="h-screen bg-secondary/10 animate-pulse rounded-2xl" />
    </>
  )
});
const WidgetLibrary = dynamic(() => import('@/components/dashboard/WidgetLibrary').then(mod => mod.WidgetLibrary));
const Index: React.FC = () => {
  return (
    <div className="w-full">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <DashboardHeader />
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="mt-6"
      >
        <DashboardGrid />
      </motion.div>
      {/* Widget Library Drawer */}
      <WidgetLibrary />
    </div>
  );
};
export default Index;
