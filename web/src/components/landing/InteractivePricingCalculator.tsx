'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import { ArrowRight, Zap } from 'lucide-react';

export default function InteractivePricingCalculator() {
  const [callsPerMonth, setCallsPerMonth] = useState(100);
  const [avgCallDuration, setAvgCallDuration] = useState(5);
  const [leadsToEnrich, setLeadsToEnrich] = useState(50);
  const [integrations, setIntegrations] = useState(2);

  // Calculate credits needed
  const voiceCredits = callsPerMonth * avgCallDuration * 3; // 3 credits per minute
  const enrichmentCredits = leadsToEnrich * 3; // Average 3 credits per lead
  const integrationCredits = integrations * 35; // 20-50 range, average 35
  const totalCredits = voiceCredits + enrichmentCredits + integrationCredits;

  // Determine recommended tier
  const getTier = () => {
    if (totalCredits <= 1000) return 'Starter';
    if (totalCredits <= 3000) return 'Professional';
    if (totalCredits <= 12000) return 'Business';
    return 'Enterprise';
  };

  const getTierColor = () => {
    const tier = getTier();
    switch (tier) {
      case 'Starter':
        return 'from-blue-500 to-cyan-500';
      case 'Professional':
        return 'from-purple-500 to-pink-500';
      case 'Business':
        return 'from-orange-500 to-red-500';
      default:
        return 'from-green-500 to-emerald-500';
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 50 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 100,
        damping: 20
      }
    }
  };

  return (
    <motion.div
      className="my-16 p-8 rounded-2xl py-20 relative bg-gradient-to-b from-background via-background to-background border border-gray-200 dark:border-gray-700"
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
    >
      <div className="max-w-4xl mx-auto">
        <h3 className="text-3xl font-bold text-[#222B45] dark:text-white mb-2">
          Pricing Calculator
        </h3>
        <p className="text-[#8F9BB3] dark:text-gray-400 mb-8">
          Adjust these values to see how many credits you'll need
        </p>

        {/* Sliders Section */}
        <div className="grid md:grid-cols-2 gap-8 mb-12">
          {/* Monthly AI Calls */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <label className="block text-sm font-semibold text-[#222B45] dark:text-white mb-3">
              Monthly AI Calls
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="500"
                value={callsPerMonth}
                onChange={(e) => setCallsPerMonth(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
              />
              <div className="text-2xl font-bold text-[#1A3F7F] dark:text-blue-400 min-w-16 text-right">
                {callsPerMonth}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              {callsPerMonth * 3} credits/call
            </p>
          </motion.div>

          {/* Average Call Duration */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 }}
          >
            <label className="block text-sm font-semibold text-[#222B45] dark:text-white mb-3">
              Average Call Duration (min)
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="1"
                max="30"
                value={avgCallDuration}
                onChange={(e) => setAvgCallDuration(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="text-2xl font-bold text-[#1A3F7F] dark:text-blue-400 min-w-16 text-right">
                {avgCallDuration}m
              </div>
            </div>
          </motion.div>

          {/* Leads to Enrich */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <label className="block text-sm font-semibold text-[#222B45] dark:text-white mb-3">
              Leads to Enrich Monthly
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="500"
                value={leadsToEnrich}
                onChange={(e) => setLeadsToEnrich(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
              />
              <div className="text-2xl font-bold text-[#1A3F7F] dark:text-blue-400 min-w-16 text-right">
                {leadsToEnrich}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              1-10 credits per lead
            </p>
          </motion.div>

          {/* Active Integrations */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
          >
            <label className="block text-sm font-semibold text-[#222B45] dark:text-white mb-3">
              Active Integrations
            </label>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min="0"
                max="10"
                value={integrations}
                onChange={(e) => setIntegrations(Number(e.target.value))}
                className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
              />
              <div className="text-2xl font-bold text-[#1A3F7F] dark:text-blue-400 min-w-16 text-right">
                {integrations}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              LinkedIn, WhatsApp, Email, etc.
            </p>
          </motion.div>
        </div>

        {/* Results Section */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Total Credits */}
          <motion.div
            key={`total-${totalCredits}`}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="p-6 rounded-xl bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-[#1a2f6b] dark:to-gray-900 border border-blue-200 dark:border-gray-700"
          >
            <p className="text-xs font-semibold text-[#8F9BB3] dark:text-gray-400 uppercase mb-2">
              Credits Needed
            </p>
            <div className="text-4xl font-bold text-[#1A3F7F] dark:text-blue-400 mb-2">
              {totalCredits.toLocaleString()}
            </div>
            <div className="space-y-1 text-xs text-[#8F9BB3] dark:text-gray-400">
              <p>Voice: {voiceCredits.toLocaleString()}</p>
              <p>Enrichment: {enrichmentCredits.toLocaleString()}</p>
              <p>Integrations: {integrationCredits.toLocaleString()}</p>
            </div>
          </motion.div>

          {/* Recommended Plan */}
          <motion.div
            key={getTier()}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
            className={`p-6 rounded-xl bg-gradient-to-br ${getTierColor()} text-white border-2 border-white/20`}
          >
            <p className="text-xs font-semibold uppercase opacity-90 mb-2">
              Recommended Plan
            </p>
            <div className="text-4xl font-bold mb-2">{getTier()}</div>
            <motion.div
              animate={{ x: [0, 3, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex items-center gap-1 text-sm"
            >
              <span>Perfect fit</span>
              <ArrowRight className="w-4 h-4" />
            </motion.div>
          </motion.div>

          {/* Monthly Cost */}
          <motion.div
            key={`cost-${totalCredits}`}
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="p-6 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 dark:from-[#1a2f6b] dark:to-gray-900 border border-green-200 dark:border-gray-700"
          >
            <p className="text-xs font-semibold text-[#8F9BB3] dark:text-gray-400 uppercase mb-2">
              Estimated Monthly Cost
            </p>
            <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
              ${(totalCredits / 1000 * 99).toFixed(0)}
            </div>
            <p className="text-xs text-[#8F9BB3] dark:text-gray-400">
              Based on $99 per 1,000 credits
            </p>
          </motion.div>
        </div>

        {/* Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 p-4 rounded-lg bg-blue-50 dark:bg-[#1a2f6b] border border-blue-200 dark:border-gray-700"
        >
          <div className="flex gap-3">
            <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-[#222B45] dark:text-white text-sm mb-1">
                💡 Pro Tip
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Credits never expire! Buy once and use them at your own pace. Pricing shown is based on tier selections, but actual usage may vary based on your needs.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
