'use client';

import { motion } from 'framer-motion';
import { Clock, DollarSign, TrendingUp, Zap } from 'lucide-react';

export default function ValuePropositionSection() {
  const metrics = [
    {
      metric: 'Time Saved per Sale',
      before: '2-4 hours',
      after: '15 minutes',
      improvement: '90% reduction',
      icon: <Clock className="w-8 h-8" />,
      color: 'from-blue-500 to-cyan-500',
      comparison: '16x faster'
    },
    {
      metric: 'Cost per Deal Closed',
      before: '$500 (Sales Rep)',
      after: '$20 (AI Credits)',
      improvement: '96% cheaper',
      icon: <DollarSign className="w-8 h-8" />,
      color: 'from-green-500 to-emerald-500',
      comparison: '25x cheaper'
    },
    {
      metric: 'Deals per Month',
      before: '20-30 (manual)',
      after: '200-300 (AI)',
      improvement: '10x increase',
      icon: <TrendingUp className="w-8 h-8" />,
      color: 'from-orange-500 to-red-500',
      comparison: '10-15x more'
    },
    {
      metric: 'Availability',
      before: '9-5 business hours',
      after: '24/7/365',
      improvement: 'Always working',
      icon: <Zap className="w-8 h-8" />,
      color: 'from-purple-500 to-pink-500',
      comparison: 'Infinite capacity'
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

  const itemVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 20
      }
    }
  };

  // Counter animation
  const counterVariants = (value: number) => ({
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { delay: 0.3, duration: 0.5 }
    },
    whileInView: {
      opacity: 1,
      transition: { duration: 0.5 }
    }
  });

  return (
    <motion.section
      className="py-20 relative overflow-hidden bg-[#1A3F7F] dark:bg-gray-950"
      id="value-proposition"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      {/* Background elements */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            The Real <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">ROI</span> of LAD
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            See how LAD transforms your sales process with quantifiable results
          </p>
        </motion.div>

        {/* Metrics Grid */}
        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16"
          variants={containerVariants}
        >
          {metrics.map((item, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -10 }}
              className="group relative"
            >
              {/* Card background gradient */}
              <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${item.color} opacity-0 group-hover:opacity-10 transition-opacity blur-xl`} />

              {/* Card */}
              <div className="relative p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 group-hover:border-white/40 transition-all h-full">
                {/* Icon */}
                <motion.div
                  className={`w-12 h-12 rounded-lg bg-gradient-to-br ${item.color} text-white p-2.5 mb-4`}
                  animate={{
                    y: [0, -5, 0],
                    rotate: [0, 5, 0]
                  }}
                  transition={{
                    duration: 3 + index * 0.3,
                    repeat: Infinity,
                    ease: 'easeInOut'
                  }}
                >
                  {item.icon}
                </motion.div>

                {/* Content */}
                <h3 className="text-white font-bold mb-4 line-clamp-2">{item.metric}</h3>

                {/* Before/After */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-300 uppercase font-semibold">Before</span>
                    <span className="text-sm font-semibold text-red-300 line-through">{item.before}</span>
                  </div>
                  <motion.div
                    animate={{ x: [0, 3, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="flex justify-center"
                  >
                    <span className="text-xs text-gray-400">→</span>
                  </motion.div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-300 uppercase font-semibold">After</span>
                    <span className="text-sm font-bold text-green-300">{item.after}</span>
                  </div>
                </div>

                {/* Improvement */}
                <motion.div
                  className="pt-4 border-t border-white/10"
                  whileInView={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 0.6 }}
                >
                  <p className="text-xs text-blue-300 font-bold">✨ {item.improvement}</p>
                  <p className="text-lg font-bold text-white mt-1">{item.comparison}</p>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Comparison Matrix */}
        <motion.div
          variants={itemVariants}
          className="overflow-x-auto"
        >
          <div className="inline-block min-w-full p-6 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
            <h3 className="text-2xl font-bold text-white mb-6">Manual vs LAD</h3>
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/20">
                  <th className="text-left text-white font-semibold py-3 px-4">Aspect</th>
                  <th className="text-left text-red-300 font-semibold py-3 px-4">Manual Process</th>
                  <th className="text-left text-green-300 font-semibold py-3 px-4">LAD AI</th>
                  <th className="text-left text-blue-300 font-semibold py-3 px-4">Advantage</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    aspect: 'Response Time',
                    manual: '24-48 hours',
                    lad: 'Instant',
                    advantage: '100x faster'
                  },
                  {
                    aspect: 'Availability',
                    manual: 'Business hours only',
                    lad: '24/7 Always on',
                    advantage: 'Infinite'
                  },
                  {
                    aspect: 'Scalability',
                    manual: 'Limited by headcount',
                    lad: 'Unlimited agents',
                    advantage: 'Exponential'
                  },
                  {
                    aspect: 'Cost Per Sale',
                    manual: '$100/hour per rep',
                    lad: '$0.02/minute',
                    advantage: '99% cheaper'
                  },
                  {
                    aspect: 'Consistency',
                    manual: 'Variable quality',
                    lad: 'Always optimal',
                    advantage: '100% reliable'
                  },
                  {
                    aspect: 'Fatigue Factor',
                    manual: 'Impacts quality',
                    lad: 'Never tires',
                    advantage: 'Better results'
                  }
                ].map((row, idx) => (
                  <motion.tr
                    key={idx}
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: idx * 0.1 }}
                    className="border-b border-white/10 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-3 px-4 text-white font-semibold">{row.aspect}</td>
                    <td className="py-3 px-4 text-red-300">{row.manual}</td>
                    <td className="py-3 px-4 text-green-300">{row.lad}</td>
                    <td className="py-3 px-4 text-blue-300 font-bold">{row.advantage}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Key Stats Box */}
        <motion.div
          variants={itemVariants}
          className="mt-12 grid md:grid-cols-2 gap-6"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-8 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 text-white"
          >
            <h4 className="text-4xl font-bold mb-2">250%</h4>
            <p className="text-lg">Average revenue increase in first year</p>
          </motion.div>
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="p-8 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white"
          >
            <h4 className="text-4xl font-bold mb-2">&lt;30 days</h4>
            <p className="text-lg">Average ROI payback period</p>
          </motion.div>
        </motion.div>
      </div>
    </motion.section>
  );
}
