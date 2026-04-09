'use client';

import { motion } from 'framer-motion';
import { Zap, Users, MessageSquare, TrendingUp, CheckCircle2, ArrowRight } from 'lucide-react';

export default function HowItWorksSection() {
  const steps = [
    {
      step: 1,
      title: 'Connect Your Channels',
      description: 'Link LinkedIn, email, WhatsApp, SMS, and other platforms in minutes',
      icon: <Zap className="w-6 h-6 text-white" />,
      duration: '2 mins',
      color: 'from-blue-500 to-cyan-500'
    },
    {
      step: 2,
      title: 'Define Your Outreach',
      description: 'Set target audience, messaging templates, and qualification criteria',
      icon: <Users className="w-6 h-6 text-white" />,
      duration: '5 mins',
      color: 'from-purple-500 to-pink-500'
    },
    {
      step: 3,
      title: 'AI Takes Over',
      description: 'Intelligent agents start conversations and qualify leads automatically',
      icon: <MessageSquare className="w-6 h-6 text-white" />,
      duration: 'Automatic',
      color: 'from-orange-500 to-red-500'
    },
    {
      step: 4,
      title: 'Deals Close',
      description: 'AI agents negotiate terms, handle objections, and close transactions',
      icon: <TrendingUp className="w-6 h-6 text-white" />,
      duration: 'Varies',
      color: 'from-green-500 to-emerald-500'
    },
    {
      step: 5,
      title: 'Review & Optimize',
      description: 'AI provides insights, recommendations, and performance analytics',
      icon: <CheckCircle2 className="w-6 h-6 text-white" />,
      duration: 'Daily',
      color: 'from-cyan-500 to-blue-500'
    }
  ];

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

  const stepVariants = {
    hidden: { opacity: 0, y: 50, scale: 0.8 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 25
      }
    }
  };

  const lineVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 1.5,
        ease: 'easeInOut'
      }
    }
  };

  return (
    <motion.section
      className="py-20 relative bg-gradient-to-b from-white via-blue-50 to-white dark:from-gray-800 dark:via-gray-900 dark:to-gray-800"
      id="how-it-works"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <motion.div
          variants={stepVariants}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-[#222B45] dark:text-white mb-4">
            How It <span className="text-[#1A3F7F]">Works</span>
          </h2>
          <p className="text-xl text-[#8F9BB3] dark:text-gray-400 max-w-3xl mx-auto">
            Get started with LAD in 5 simple steps and watch your sales multiply automatically
          </p>
        </motion.div>

        {/* Desktop Timeline - Vertical */}
        <motion.div
          className="hidden lg:block max-w-4xl mx-auto"
          variants={containerVariants}
        >
          {steps.map((item, index) => (
            <motion.div
              key={index}
              variants={stepVariants}
              className="relative mb-12 last:mb-0"
            >
              {/* Vertical line connector */}
              {index < steps.length - 1 && (
                <motion.div
                  className="absolute left-12 top-32 w-0.5 h-20 bg-gradient-to-b from-gray-300 to-transparent dark:from-gray-600"
                  initial={{ scaleY: 0, originY: 0 }}
                  whileInView={{ scaleY: 1 }}
                  transition={{ delay: index * 0.2, duration: 0.8 }}
                  viewport={{ once: true }}
                />
              )}

              <div className="flex gap-8 items-start">
                {/* Step number circle */}
                <motion.div
                  className={`relative z-10 w-24 h-24 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0 shadow-lg`}
                  whileHover={{ scale: 1.1, boxShadow: '0 20px 40px rgba(11, 25, 87, 0.3)' }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  {item.icon}
                  <motion.div
                    className="absolute inset-0 rounded-full bg-white/20"
                    animate={{
                      boxShadow: [
                        '0 0 0 0 rgba(255, 255, 255, 0.7)',
                        '0 0 0 10px rgba(255, 255, 255, 0)'
                      ]
                    }}
                    transition={{
                      duration: 2,
                      repeat: Infinity
                    }}
                  />
                </motion.div>

                {/* Content */}
                <motion.div
                  className="flex-1 pt-4"
                  whileHover={{ x: 10 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-2xl font-bold text-[#222B45] dark:text-white">
                      {item.title}
                    </h3>
                    <span className="px-3 py-1 bg-gray-100 dark:bg-gray-800 text-[#8F9BB3] dark:text-gray-400 text-sm font-semibold rounded-full">
                      {item.duration}
                    </span>
                  </div>
                  <p className="text-[#8F9BB3] dark:text-gray-400 text-lg">
                    {item.description}
                  </p>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Mobile Timeline - Horizontal */}
        <motion.div
          className="lg:hidden space-y-8"
          variants={containerVariants}
        >
          {steps.map((item, index) => (
            <motion.div
              key={index}
              variants={stepVariants}
              className="relative"
            >
              <div className="flex gap-4">
                {/* Step circle */}
                <motion.div
                  className={`w-16 h-16 rounded-full bg-gradient-to-br ${item.color} flex items-center justify-center flex-shrink-0 shadow-lg`}
                  whileHover={{ scale: 1.1 }}
                >
                  {item.icon}
                </motion.div>

                {/* Content */}
                <div className="flex-1 pt-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-[#222B45] dark:text-white">
                      {item.title}
                    </h3>
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-[#8F9BB3] dark:text-gray-400 text-xs font-semibold rounded-full">
                      {item.duration}
                    </span>
                  </div>
                  <p className="text-[#8F9BB3] dark:text-gray-400 text-sm">
                    {item.description}
                  </p>
                </div>
              </div>

              {/* Arrow connector */}
              {index < steps.length - 1 && (
                <motion.div
                  className="flex justify-center my-4"
                  animate={{ y: [0, 4, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  <ArrowRight className="w-5 h-5 text-gray-400 rotate-90" />
                </motion.div>
              )}
            </motion.div>
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div
          variants={stepVariants}
          className="mt-16 text-center"
        >
          <p className="text-[#8F9BB3] dark:text-gray-400 mb-6 text-lg">
            Ready to automate your sales process?
          </p>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(11, 25, 87, 0.3)' }}
            whileTap={{ scale: 0.95 }}
            className="px-10 py-4 bg-[#1A3F7F] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
          >
            Start Free Trial
          </motion.button>
        </motion.div>
      </div>
    </motion.section>
  );
}
