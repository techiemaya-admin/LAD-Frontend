
"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/overview/DashboardHeader';
import { DashboardGrid } from '@/components/overview/DashboardGrid';
import { WidgetLibrary } from '@/components/overview/WidgetLibrary';
const Dashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#f0f6ff] via-[#f5f9ff] to-[#f0f6ff]">
      <main className="min-h-screen bg-gray-50 p-3 md:p-3">
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
      </main>
    </div>
  );
};
export default Dashboard;
