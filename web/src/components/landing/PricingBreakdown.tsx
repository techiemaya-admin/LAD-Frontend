'use client';

import { motion } from 'framer-motion';

export default function PricingBreakdown() {
  const pricingFeatures = [
    {
      title: "Voice Calls",
      emoji: "📞",
      credits: "3",
      unit: "credits per minute",
      subtitle: "(Cartesia TTS)",
      examples: [
        { duration: "5 mins", cost: "15 cr" },
        { duration: "10 mins", cost: "30 cr" },
        { duration: "20 mins", cost: "60 cr" }
      ],
      note: "Includes analytics report",
      gradient: "from-blue-50 to-blue-100",
      border: "border-blue-200",
      accent: "text-blue-600"
    },
    {
      title: "Premium Voice",
      emoji: "🎙️",
      credits: "4",
      unit: "credits per minute",
      subtitle: "(ElevenLabs TTS)",
      examples: [
        { duration: "5 mins", cost: "20 cr" },
        { duration: "10 mins", cost: "40 cr" },
        { duration: "20 mins", cost: "80 cr" }
      ],
      note: "Higher quality voice + analytics",
      gradient: "from-purple-50 to-purple-100",
      border: "border-purple-200",
      accent: "text-purple-600"
    },
    {
      title: "Lead Enrichment",
      emoji: "🎯",
      credits: "2-17",
      unit: "credits per lead",
      examples: [
        { duration: "Email + LinkedIn URL", cost: "2 credits" },
        { duration: "Phone Reveal", cost: "+10 credits" },
        { duration: "Profile Summary", cost: "5 credits" },
        { duration: "Complete Data", cost: "17 credits" }
      ],
      note: "100 leads with phones ≈ 1,700 credits",
      gradient: "from-orange-50 to-orange-100",
      border: "border-orange-200",
      accent: "text-orange-600"
    },
    {
      title: "Connections",
      emoji: "💼",
      credits: "20-50",
      unit: "credits per month",
      examples: [
        { duration: "LinkedIn", cost: "50 cr/mo" },
        { duration: "Google", cost: "20 cr/mo" },
        { duration: "Outlook", cost: "20 cr/mo" }
      ],
      note: "Monthly connection fees",
      gradient: "from-green-50 to-green-100",
      border: "border-green-200",
      accent: "text-green-600"
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.3,
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { y: 50, opacity: 0, scale: 0.9 },
    visible: {
      y: 0,
      opacity: 1,
      scale: 1,
      transition: {
        duration: 0.6,
        type: "spring" as "spring",
        stiffness: 100
      }
    }
  };

  return (
    <motion.div 
      className="py-16 bg-white border-t border-gray-200"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div 
          variants={cardVariants}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Feature Pricing Details
          </h2>
          <p className="text-xl text-gray-600">
            Transparent credit costs for each feature
          </p>
        </motion.div>

        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
          variants={containerVariants}
        >
          {pricingFeatures.map((feature, index) => (
            <motion.div
              key={feature.title}
              variants={cardVariants}
              whileHover={{ 
                scale: 1.05,
                rotateY: 5,
                boxShadow: "0 20px 40px -12px rgba(0, 0, 0, 0.25)"
              }}
              className={`bg-gradient-to-br ${feature.gradient} rounded-xl p-6 border ${feature.border} cursor-pointer`}
            >
              <motion.div 
                className="flex items-center justify-between mb-4"
                whileHover={{ scale: 1.1 }}
              >
                <h3 className="text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <div className="text-2xl">{feature.emoji}</div>
              </motion.div>

              <div className="mb-4">
                <div className={`text-3xl font-bold ${feature.accent}`}>
                  {feature.credits}
                </div>
                <div className="text-sm text-gray-600">{feature.unit}</div>
                {feature.subtitle && (
                  <div className="text-xs text-gray-500 mt-1">
                    {feature.subtitle}
                  </div>
                )}
              </div>

              <div className="space-y-2 text-sm text-gray-700">
                {feature.examples.map((example, exampleIndex) => (
                  <motion.div
                    key={exampleIndex}
                    className="flex justify-between"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 * exampleIndex }}
                  >
                    <span>{example.duration}</span>
                    <span className="font-medium">{example.cost}</span>
                  </motion.div>
                ))}
              </div>

              <motion.div 
                className={`mt-4 pt-4 border-t ${feature.border}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="text-xs text-gray-600">{feature.note}</div>
              </motion.div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}