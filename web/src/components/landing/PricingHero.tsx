'use client';

import { motion } from 'framer-motion';
import { Shield, Zap, Users } from 'lucide-react';

export default function PricingHero() {
  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.8,
        delayChildren: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6 }
    }
  };

  return (
    <motion.div 
      className="bg-gradient-to-b from-gray-50 to-white dark:from-[#0b1957] dark:to-[#0b1957] py-16"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.h1 
          variants={itemVariants}
          className="text-4xl md:text-6xl font-bold text-gray-900 mb-6"
        >
          Simple, credit-based
          <span className="text-blue-600 ml-3">pricing</span>
        </motion.h1>
        <motion.p 
          variants={itemVariants}
          className="text-xl text-gray-600 max-w-3xl mx-auto mb-8"
        >
          Buy credits once, use them for any feature. No subscriptions, no
          monthly fees, no expiration.
        </motion.p>
        <motion.div 
          variants={itemVariants}
          className="flex flex-wrap justify-center gap-8 text-sm text-gray-500"
        >
          {[
            { icon: Shield, text: "Credits Never Expire" },
            { icon: Zap, text: "Use Across All Features" },
            { icon: Users, text: "No Hidden Fees" }
          ].map((item, index) => (
            <motion.div
              key={index}
              className="flex items-center"
              whileHover={{ scale: 1.05 }}
              variants={itemVariants}
            >
              <item.icon className="h-4 w-4 mr-2" />
              {item.text}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}