'use client';

import { motion } from 'framer-motion';
import HeroSection from './HeroSection';

export function HeroSectionMacbook() {
  return (
    <div className="w-full overflow-hidden bg-transparent transition-colors duration-300">
      {/* Macbook frame container */}
      <div className="relative w-full max-w-6xl mx-auto px-4 py-16">
        {/* Macbook stand/base */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="relative"
        >
          {/* Top notch */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-6 rounded-b-3xl z-20 transition-colors bg-gradient-to-b from-gray-800 to-gray-900 dark:from-gray-950 dark:to-black" />

          {/* Screen bezel - Light mode silver, Dark mode dark */}
          <div className="rounded-t-3xl p-3 shadow-2xl transition-colors bg-gradient-to-b from-gray-400 to-gray-500 dark:from-gray-950 dark:to-black">
            {/* Screen inner bezel */}
            <div className="rounded-t-2xl p-1 transition-colors bg-gray-800 dark:bg-gray-950">
              {/* Screen content */}
              <div className="bg-white dark:bg-[#0b1957] rounded-t-xl overflow-hidden">
                <HeroSection />
              </div>
            </div>
          </div>

          {/* Macbook bottom bezel - Light mode gradient, Dark mode darker */}
          <div className="rounded-b-3xl px-3 py-4 shadow-2xl transition-colors bg-gradient-to-b from-gray-300 to-gray-400 dark:from-gray-800 dark:to-gray-950">
            {/* Stand */}
            <div className="flex justify-center">
              <div className="w-1/3 h-1 rounded-full transition-colors bg-gradient-to-r from-gray-400 to-gray-300 dark:from-gray-700 dark:to-gray-800" />
            </div>
          </div>

          {/* Glow effect */}
          <div className="absolute -inset-8 blur-3xl -z-10 rounded-3xl transition-colors" style={{
            background: 'linear-gradient(to right, rgba(168, 139, 250, 0), rgba(168, 139, 250, 0.1), rgba(34, 211, 238, 0))'
          }} />
        </motion.div>

        {/* MacBook info text */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-center mt-8 space-y-2 transition-colors"
        >
          <h3 className="text-2xl font-bold text-gray-900 dark:text-white transition-colors">
            LAD Hero Section
          </h3>
          <p className="text-gray-600 dark:text-gray-400 transition-colors">
            Premium parallax 3D experience with asymmetric grid design
          </p>
        </motion.div>
      </div>
    </div>
  );
}
