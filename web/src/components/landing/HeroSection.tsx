'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';

export default function HeroSection() {
  const [displayedStats, setDisplayedStats] = useState([0, 0, 0]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 20
      }
    }
  };

  // Stat counter animation
  const statVariants = {
    hidden: { opacity: 0, scale: 0.5 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 15
      }
    },
    hover: {
      scale: 1.1,
      transition: { duration: 0.2 }
    }
  };

  // Counter hook for animated numbers
  useEffect(() => {
    const interval = setInterval(() => {
      setDisplayedStats(prev => [
        prev[0] < 10 ? prev[0] + 0.5 : 10,
        prev[1] < 95 ? prev[1] + 2 : 95,
        prev[2] < 24 ? prev[2] + 0.8 : 24
      ]);
    }, 50);

    return () => clearInterval(interval);
  }, []);

  return (
    <motion.section
      className="relative overflow-hidden py-20"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Background gradient matching app theme */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-white via-blue-50 to-white dark:from-gray-800 dark:via-gray-900 dark:to-gray-800"
      />


      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <motion.div
            variants={itemVariants}
            className="space-y-6"
          >
            {/* Logo */}
            <motion.div variants={itemVariants}>
              <h1 className="text-6xl lg:text-7xl font-bold text-[#222B45] dark:text-white leading-tight">
                Mr LAD
              </h1>
              <p className="text-xl text-[#8F9BB3] dark:text-gray-400 font-semibold mt-2">
                Powered by Techiemaya
              </p>
            </motion.div>

            <motion.h2
              variants={itemVariants}
              className="text-4xl lg:text-5xl font-bold text-[#222B45] dark:text-white leading-tight"
            >
              Meet your{" "}
              <span className="text-[#1A3F7F]">AI sales co-pilot</span>
            </motion.h2>

            <motion.p
              variants={itemVariants}
              className="text-xl text-[#8F9BB3] dark:text-gray-400 leading-relaxed"
            >
              Automatically engage leads on LinkedIn, email, WhatsApp, and voice calls. More outreach, more conversations, more closed deals.
            </motion.p>

            <motion.div
              variants={itemVariants}
              className="flex flex-wrap gap-4"
            >
              <Link href="/onboarding">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(79, 70, 229, 0.3)' }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    boxShadow: [
                      '0 10px 20px rgba(79, 70, 229, 0.1)',
                      '0 15px 30px rgba(79, 70, 229, 0.2)',
                      '0 10px 20px rgba(79, 70, 229, 0.1)'
                    ]
                  }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                  className="px-8 py-4 bg-[#1A3F7F] text-white rounded-xl font-semibold shadow-lg hover:shadow-2xl transition-shadow"
                >
                  Get Started
                </motion.button>
              </Link>
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)' }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white dark:bg-gray-800 text-[#222B45] dark:text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
              >
                Watch Demo
              </motion.button>
            </motion.div>

            {/* Stats with animated counters */}
            <motion.div
              variants={itemVariants}
              className="grid grid-cols-3 gap-6 pt-8"
            >
              {[
                { value: displayedStats[0].toFixed(0), suffix: "x", label: "Faster Closures" },
                { value: displayedStats[1].toFixed(0), suffix: "%", label: "Success Rate" },
                { value: displayedStats[2].toFixed(0), suffix: "/7", label: "AI Availability" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  variants={statVariants}
                  whileHover="hover"
                  className="text-center p-4 rounded-xl backdrop-blur-sm bg-white/30 dark:bg-gray-800/30 border border-white/20 dark:border-gray-700/20 transition-colors"
                >
                  <motion.div
                    className="text-3xl font-bold text-[#222B45] dark:text-white"
                    animate={{
                      scale: [1, 1.05, 1],
                    }}
                    transition={{
                      duration: 0.3,
                      ease: 'easeOut'
                    }}
                  >
                    {stat.value}{stat.suffix}
                  </motion.div>
                  <div className="text-sm text-[#8F9BB3] dark:text-gray-400 mt-2 font-medium">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Image */}
           <Image
              src="/lad.png"
              alt="LAD Platform"
              width={600}
              height={400}
              priority
              className="w-full"
            />
        </div>
      </div>
    </motion.section>
  );
}