'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function PricingCTA() {
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
      className="text-center mt-8 mb-16"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      <Link href="/pricing">
        <motion.button
          variants={itemVariants}
          whileHover={{ 
            scale: 1.05,
            boxShadow: "0 20px 40px -12px rgba(11, 25, 87, 0.3)"
          }}
          whileTap={{ scale: 0.95 }}
          className="px-8 py-4 bg-[#0b1957] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
        >
          View Pricing Calculator
        </motion.button>
      </Link>
    </motion.div>
  );
}