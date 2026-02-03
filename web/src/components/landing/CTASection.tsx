'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function CTASection() {
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
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6
      }
    }
  };

  return (
    <motion.section 
      className="py-20 relative overflow-hidden" 
      id="contact"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      <div className="absolute inset-0 bg-[#0b1957] opacity-95" />
      
      <motion.div
        className="container mx-auto px-4 relative z-10 text-center"
        variants={containerVariants}
      >
        <motion.h2 
          variants={itemVariants}
          className="text-4xl lg:text-5xl font-bold text-white mt-8 mb-4"
        >
          Ready to Let Agents Deal?
        </motion.h2>
        
        <motion.p 
          variants={itemVariants}
          className="text-xl text-white/90 mb-8 max-w-2xl mx-auto"
        >
          Join thousands of businesses automating their sales with LAD's
          AI-powered platform
        </motion.p>

        <motion.div variants={itemVariants}>
          <Link href="/onboarding">
            <motion.button
              whileHover={{ 
                scale: 1.05,
                boxShadow: "0 25px 50px -12px rgba(255, 255, 255, 0.3)"
              }}
              whileTap={{ scale: 0.95 }}
              className="px-10 py-5 bg-white text-[#0b1957] rounded-xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-shadow"
            >
              Get Started Today
            </motion.button>
          </Link>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}