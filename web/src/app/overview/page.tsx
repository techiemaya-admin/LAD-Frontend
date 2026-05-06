
"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/overview/DashboardHeader';
import { DashboardGrid } from '@/components/overview/DashboardGrid';
import { WidgetLibrary } from '@/components/overview/WidgetLibrary';

const DashboardSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6 auto-rows-min">
      {/* Row 1: 3 Stat Cards (w:4 each) */}
      <div className="md:col-span-4 h-36 rounded-xl bg-white dark:bg-[#1A2A43] p-4 shadow-sm">
        <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
        <div className="mt-4 h-8 w-32 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
        <div className="mt-3 h-4 w-20 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
      </div>
      <div className="md:col-span-4 h-36 rounded-xl bg-white dark:bg-[#1A2A43] p-4 shadow-sm">
        <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
        <div className="mt-4 h-8 w-36 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
        <div className="mt-3 h-4 w-24 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
      </div>
      <div className="md:col-span-4 h-36 rounded-xl bg-white dark:bg-[#1A2A43] p-4 shadow-sm">
        <div className="h-4 w-20 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
        <div className="mt-4 h-8 w-28 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
        <div className="mt-3 h-4 w-16 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
      </div>

      {/* Row 2: Calls Chart (w:6 h:4) + Voice Agents (w:6 h:4) */}
      <div className="md:col-span-6 h-80 rounded-xl bg-white dark:bg-[#1A2A43] p-4 shadow-sm">
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
        <div className="mt-5 h-60 w-full rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
      </div>
      <div className="md:col-span-6 h-80 rounded-xl bg-white dark:bg-[#1A2A43] p-4 shadow-sm">
        <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
        <div className="mt-4 space-y-3">
          <div className="h-12 w-full rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
          <div className="h-12 w-full rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
          <div className="h-12 w-full rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
          <div className="h-12 w-full rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
        </div>
      </div>

      {/* Row 3: Credits Overview (w:6 h:4) + Latest Calls (w:6 h:4) */}
      <div className="md:col-span-6 h-80 rounded-xl bg-white dark:bg-[#1A2A43] p-4 shadow-sm">
        <div className="h-4 w-32 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="h-20 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
          <div className="h-20 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
        </div>
        <div className="mt-4 h-24 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
      </div>
      <div className="md:col-span-6 h-80 rounded-xl bg-white dark:bg-[#1A2A43] p-4 shadow-sm">
        <div className="h-4 w-28 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
        <div className="mt-4 space-y-3">
          <div className="h-14 w-full rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
          <div className="h-14 w-full rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
          <div className="h-14 w-full rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
          <div className="h-14 w-full rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
        </div>
      </div>

      {/* Row 4: Calendar (w:12 h:5) */}
      <div className="md:col-span-12 h-96 rounded-xl bg-white dark:bg-[#1A2A43] p-4 shadow-sm">
        <div className="h-4 w-40 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
        <div className="mt-4 grid grid-cols-7 gap-2">
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="h-8 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
          ))}
        </div>
        <div className="mt-3 grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="h-16 rounded bg-gray-200 dark:bg-gray-700/40 animate-pulse" />
          ))}
        </div>
      </div>
    </div>
  );
};

const Dashboard: React.FC = () => {
  const [isDashboardLoading, setIsDashboardLoading] = React.useState(true);

  return (
    <div className="min-h-screen bg-white dark:bg-[#000724]">
      <main className="min-h-screen bg-gray-50 dark:bg-[#0a0e1f] p-4 sm:p-6">
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
          <div className="relative">
            <div className={isDashboardLoading ? 'invisible' : undefined}>
              <DashboardGrid onLoadingChange={setIsDashboardLoading} />
            </div>
            {isDashboardLoading && (
              <div className="absolute inset-0">
                <DashboardSkeleton />
              </div>
            )}
          </div>
        </motion.div>
        {/* Widget Library Drawer */}
        <WidgetLibrary />
      </main>
    </div>
  );
};
export default Dashboard;
