'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Link from 'next/link';

export default function EnterprisePlans() {
  const enterprisePlans = [
    {
      name: "Enterprise Starter",
      description: "Foundation for enterprises",
      price: "$49",
      credits: "1,000 credits included",
      features: [
        "AI Chat Agent",
        "LinkedIn outreach",
        "Lead Data Enrichment",
        "Google & Outlook integration",
        "Calendar management",
        "Unlimited users",
        "AI powered chat-based campaign setup",
        "CRM pipeline",
        "Dedicated Support",
      ],
    },
    {
      name: "Enterprise Professional",
      description: "Advanced capabilities",
      price: "$149",
      credits: "3,000 credits included",
      features: [
        { text: "Everything in Enterprise Starter", bold: true },
        "AI Voice Agent",
        "AI Chat Agent",
        "WhatsApp integration",
        "Inbound leads collection into pipeline",
        "Campaign analytics",
        "AI Recommendations for deal closure",
        "Dedicated Support",
      ],
      recommended: true
    },
    {
      name: "Enterprise Business",
      description: "Full automation & customization",
      price: "$399",
      credits: "12,000 credits included",
      features: [
        { text: "Everything in Enterprise Professional", bold: true },
        "AI Voice Agent",
        "AI Chat Agent for LinkedIn, WhatsApp",
        "Custom CRM integrations",
        "Third-party app integrations",
        "App customization",
        "Dedicated Support",
      ],
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
    hidden: { y: 60, opacity: 0, rotateX: -15 },
    visible: {
      y: 0,
      opacity: 1,
      rotateX: 0,
      transition: {
        duration: 0.7,
        type: "spring" as "spring",
        stiffness: 100
      }
    }
  };

  return (
    <motion.div 
      className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-3xl p-8 border-2 border-purple-300"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      <motion.div 
        variants={cardVariants}
        className="text-center mb-8"
      >
        <motion.div 
          className="inline-block bg-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4"
          whileHover={{ scale: 1.05 }}
        >
          ENTERPRISE
        </motion.div>
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">
          Complete Sales Pipeline Automation with Customizations
        </h3>
        <p className="text-gray-600">
          One-time agent setup and training:{" "}
          <span className="font-bold text-purple-600">$3,000</span>
        </p>
      </motion.div>

      <motion.div 
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
        variants={containerVariants}
      >
        {enterprisePlans.map((plan, index) => (
          <motion.div
            key={plan.name}
            variants={cardVariants}
            whileHover={{ 
              scale: 1.03,
              rotateY: 3,
              boxShadow: "0 20px 40px -12px rgba(147, 51, 234, 0.25)"
            }}
            className={`bg-white rounded-2xl border-2 p-6 transition-all duration-200 flex flex-col relative ${
              plan.recommended
                ? "border-purple-400 hover:shadow-xl transform scale-105"
                : "border-purple-200 hover:border-purple-500 hover:shadow-xl"
            }`}
          >
            {plan.recommended && (
              <motion.div 
                className="absolute -top-4 left-1/2 transform -translate-x-1/2"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.5, type: "spring" }}
              >
                <span className="bg-purple-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                  Recommended
                </span>
              </motion.div>
            )}

            <div className="mb-4">
              <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
              <p className="text-sm text-gray-600 mt-1">{plan.description}</p>
            </div>

            <div className="mb-6">
              <div className="flex items-baseline">
                <span className="text-4xl font-bold text-gray-900">
                  {plan.price}
                </span>
              </div>
              <div className="text-lg font-semibold text-purple-600 mt-2">
                {plan.credits}
              </div>
            </div>

            <ul className="space-y-3 mb-6 flex-grow">
              {plan.features.map((feature, featureIndex) => (
                <motion.li
                  key={featureIndex}
                  className="flex items-start text-sm"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * featureIndex }}
                >
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0" />
                  <span className={typeof feature === 'object' && feature.bold ? 'font-bold' : ''}>
                    {typeof feature === 'string' ? feature : feature.text}
                  </span>
                </motion.li>
              ))}
            </ul>

            <Link href="/contact">
              <motion.button 
                className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition-colors cursor-pointer mt-auto"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Contact Sales
              </motion.button>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
}