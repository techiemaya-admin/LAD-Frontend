"use client";
/**
 * The hero-plus-card layout the login page uses, as a shell for the other
 * anonymous auth pages (/register and its steps). Login itself keeps its
 * own copy — this exists so the signup pages match it without touching it.
 */
import React from 'react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';

export default function AuthPageShell({ children, tagline }: { children: React.ReactNode; tagline?: string }) {
  const { isDark } = useTheme();
  const videoSrc = isDark ? '/hero-character-dark.mp4' : '/hero-character.mp4';
  const posterSrc = isDark ? '/hero-character-dark-poster.jpg' : '/hero-character-poster.jpg';

  return (
    <div className="py-8 md:py-12 relative bg-background dark:bg-[#010726] flex flex-col justify-center min-h-[calc(100vh-100px)]">
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col">
          <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-10 sm:gap-14 lg:gap-20 xl:gap-24 items-center justify-items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
              className="w-full hidden lg:flex items-center justify-center h-full min-h-[460px]">
              <div className="relative w-full h-[460px] sm:h-[500px] flex items-center justify-center">
                <video key={videoSrc} src={videoSrc} poster={posterSrc} autoPlay loop muted playsInline preload="metadata" aria-hidden="true"
                  className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-lighten" />
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6 }}
              className="w-full flex items-center justify-center h-full">
              {children}
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.15 }}
            className="w-full text-center space-y-3 mt-10 sm:mt-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-[#0b1957] dark:text-white tracking-tight">LAD - Let Agent Deal</h2>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              {tagline || 'An AI front desk for your studio: answers on WhatsApp, books trials, and follows up — day and night.'}
            </p>
          </motion.div>
        </div>
      </main>
    </div>
  );
}
