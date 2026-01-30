"use client";

import React, { useState, useEffect, useContext } from 'react';
import { LoadingContext } from '@/components/providers/loading-provider';
import { cn } from '@/lib/utils';
import { AnimatePresence, motion, Variants } from 'framer-motion';

interface PageLoaderProps {
  className?: string;
  message?: string;
}

const LOADING_MESSAGES = [
  "LAD is loading...",
  "Updating data...",
  "Fetching information...",
  "Optimizing performance...",
  "Preparing AI capabilities...",
  "Syncing workspace data...",
  "Powering up insights...",
  "Fine-tuning neural responses...",
  "Analyzing patterns...",
  "Securing connection...",
];

/**
 * Premium Page Loader Component
 * Claude-inspired design with message cycling and smooth animations.
 * Integrates with global LoadingContext.
 */
export const PageLoader: React.FC<PageLoaderProps> = ({
  className,
  message: initialMessage,
}) => {
  const loadingState = useContext(LoadingContext);
  const isVisible = loadingState.activeCount > 0;
  const hasMinVisibleTime = loadingState.nextHideAt !== null && Date.now() < loadingState.nextHideAt;

  // Show if there are active operations OR if minimum visible time hasn't elapsed
  const shouldShow = isVisible || hasMinVisibleTime;

  const [currentMessage, setCurrentMessage] = useState(initialMessage || LOADING_MESSAGES[0]);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    if (!shouldShow) {
      setCurrentMessage(initialMessage || LOADING_MESSAGES[0]);
      setMessageIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setMessageIndex((prev) => {
        const next = (prev + 1) % LOADING_MESSAGES.length;
        setCurrentMessage(LOADING_MESSAGES[next]);
        return next;
      });
    }, 2800); // Slightly slower for readability

    return () => clearInterval(interval);
  }, [shouldShow, initialMessage]);

  // Prevent scrolling when loader is active
  useEffect(() => {
    const mainElement = document.querySelector('main');
    if (shouldShow) {
      document.body.style.overflow = 'hidden';
      if (mainElement) {
        mainElement.style.overflow = 'hidden';
        mainElement.style.touchAction = 'none';
      }
    } else {
      document.body.style.overflow = '';
      if (mainElement) {
        mainElement.style.overflow = '';
        mainElement.style.touchAction = '';
      }
    }
    return () => {
      document.body.style.overflow = '';
      if (mainElement) {
        mainElement.style.overflow = '';
        mainElement.style.touchAction = '';
      }
    };
  }, [shouldShow]);

  const containerVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: {
        duration: 0.5,
        ease: "easeOut",
        staggerChildren: 0.05,
      }
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.4, ease: "easeIn" }
    }
  };

  const itemVariants: Variants = {
    initial: { y: 20, opacity: 0, scale: 0.95 },
    animate: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20
      }
    }
  };

  const textContainerVariants: Variants = {
    initial: { opacity: 0 },
    animate: {
      opacity: 1,
      transition: { staggerChildren: 0.02, delayChildren: 0.2 }
    }
  };

  const letterVariants: Variants = {
    initial: { opacity: 0, y: 5 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    }
  };

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          variants={containerVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          className={cn(
            "fixed inset-0 md:left-16 w-full md:w-[calc(100%-4rem)] bg-[#0b1957]/60 backdrop-blur-md z-[40] flex items-center justify-center overflow-hidden",
            className
          )}
        >
          {/* Subtle Dynamic Light Leak */}
          <div className="absolute inset-0 opacity-[0.1] pointer-events-none mix-blend-soft-light bg-gradient-to-br from-blue-400 via-transparent to-indigo-900" />

          {/* Liquid Ambient Atmosphere */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              animate={{
                scale: [1, 1.4, 1],
                x: [0, 40, 0],
                y: [0, -40, 0],
                rotate: [0, 180, 360],
              }}
              transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
              className="absolute -top-1/4 -right-1/4 w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[140px]"
            />
            <motion.div
              animate={{
                scale: [1.3, 1, 1.3],
                x: [0, -60, 0],
                y: [0, 60, 0],
                rotate: [360, 180, 0],
              }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute -bottom-1/4 -left-1/4 w-[600px] h-[600px] bg-indigo-400/10 rounded-full blur-[140px]"
            />
          </div>

          <motion.div
            variants={itemVariants}
            className="flex flex-col items-center gap-20 relative z-10"
          >
            {/* Liquid "Magnetic" Loader */}
            <div className="relative group">
              {/* Ethereal Halo */}
              <motion.div
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute inset-0 bg-blue-500/10 rounded-full blur-[100px]"
              />

              <div className="relative w-40 h-40 flex items-center justify-center">
                {/* Precision Orbital Ring */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="48"
                    stroke="currentColor"
                    strokeWidth="0.25"
                    fill="none"
                    className="text-blue-500/20"
                  />
                  <motion.circle
                    cx="50"
                    cy="50"
                    r="48"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray="1 10"
                    strokeLinecap="round"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
                    className="text-blue-500/60"
                  />
                </svg>

                {/* The "Living Core" - Elastic Blob Morphing */}
                <motion.div
                  animate={{
                    borderRadius: [
                      "45% 55% 70% 30% / 30% 60% 40% 70%",
                      "60% 40% 30% 70% / 60% 30% 70% 40%",
                      "45% 55% 70% 30% / 30% 60% 40% 70%"
                    ],
                    rotate: [0, 120, 240, 360],
                    scale: [0.98, 1.05, 0.98]
                  }}
                  transition={{
                    duration: 15,
                    repeat: Infinity,
                    ease: "linear",
                  }}
                  className="w-20 h-20 bg-white shadow-[0_25px_60px_rgba(59,130,246,0.3)] border border-blue-100/50 flex items-center justify-center p-6 overflow-hidden"
                >
                  <motion.div
                    animate={{
                      scale: [1, 1.6, 1],
                      opacity: [0.8, 1, 0.8],
                      borderRadius: ["40%", "50%", "40%"]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="w-5 h-5 bg-gradient-to-br from-blue-400 via-blue-500 to-indigo-600 rounded-full shadow-[0_0_20px_rgba(59,130,246,0.6)]"
                  />
                </motion.div>
              </div>
            </div>

            {/* Cinematic Typography Reveal */}
            <div className="flex flex-col items-center justify-center gap-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentMessage}
                  variants={textContainerVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex gap-[0.25em] whitespace-nowrap"
                >
                  {currentMessage.split("").map((letter, i) => (
                    <motion.span
                      key={i}
                      variants={letterVariants}
                      className="text-white font-light tracking-[0.5em] uppercase text-[11px] antialiased drop-shadow-sm"
                    >
                      {letter === " " ? "\u00A0" : letter}
                    </motion.span>
                  ))}
                </motion.div>
              </AnimatePresence>

              {/* Ultra-Fluid Progress Trace */}
              <div className="w-56 h-[1px] bg-white/10 relative overflow-hidden rounded-full">
                <motion.div
                  animate={{
                    x: ["-100%", "200%"],
                    opacity: [0, 1, 0]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                  className="absolute inset-y-0 w-1/2 bg-gradient-to-r from-transparent via-blue-400 to-transparent"
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PageLoader;
