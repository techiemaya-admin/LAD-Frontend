'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

export default function HeroSection() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <motion.section 
      className="relative overflow-hidden py-20"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-[#dbdbdb]" />

      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <motion.div
            variants={itemVariants}
            className="space-y-6"
          >
            {/* Logo */}
            <motion.div variants={itemVariants}>
              <h1 className="text-6xl lg:text-7xl font-bold text-[#0b1957] dark:text-white leading-tight">
                LAD
              </h1>
              <p className="text-xl text-gray-600 dark:text-gray-400 font-semibold mt-2">
                Powered by Techiemaya
              </p>
            </motion.div>

            <motion.h2 
              variants={itemVariants}
              className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight"
            >
              AI Agents That{" "}
              <span className="text-[#0b1957]">Close Deals</span>{" "}
              Automatically
            </motion.h2>

            <motion.p 
              variants={itemVariants}
              className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed"
            >
              Revolutionize your sales process with AI-powered agents that
              communicate across all channels—voice, email, chat, and social
              media—to close deals between vendors and consumers, wholesalers
              and traders.
            </motion.p>

            <motion.div 
              variants={itemVariants}
              className="flex flex-wrap gap-4"
            >
              <Link href="/onboarding">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-[#0b1957] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
                >
                  Get Started
                </motion.button>
              </Link>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
              >
                Watch Demo
              </motion.button>
            </motion.div>

            {/* Stats */}
            <motion.div 
              variants={itemVariants}
              className="grid grid-cols-3 gap-6 pt-8"
            >
              {[
                { value: "10x", label: "Faster Closures" },
                { value: "95%", label: "Success Rate" },
                { value: "24/7", label: "AI Availability" },
              ].map((stat, i) => (
                <motion.div
                  key={i}
                  variants={itemVariants}
                  whileHover={{ scale: 1.05 }}
                  className="text-center"
                >
                  <div className="text-3xl font-bold text-[#0b1957]">
                    {stat.value}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: Image */}
          <motion.div
            variants={itemVariants}
            whileHover={{ scale: 1.02 }}
            className="mt-8"
          >
            <Image
              src="/lad.png"
              alt="LAD Platform"
              width={600}
              height={400}
              priority
              className="w-full"
            />
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}