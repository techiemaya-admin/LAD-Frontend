
"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { WidgetLibrary } from '@/components/dashboard/WidgetLibrary';

const Index: React.FC = () => {
  return (
    <div className="min-h-screen">
      <main className="container mx-auto px-4 py-6 max-w-[1600px]">
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
        >
          <DashboardGrid />
        </motion.div>

        {/* Widget Library Drawer */}
        <WidgetLibrary />
      </main>
    </div>
  );
};

export default Index;
