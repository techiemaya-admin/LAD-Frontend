'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import Link from 'next/link';

export default function StandardPlans() {
  const plans = [
    {
      name: "Starter",
      description: "Get started with essentials",
      price: "$99",
      credits: "1,000 credits included",
      features: [
        "LinkedIn outreach",
        "Lead Data Enrichment",
        "Google & Outlook integration",
        "Calendar management",
        "Unlimited users",
        "AI powered chat-based campaign setup",
        "CRM pipeline",
      ],
      href: "/onboarding"
    },
    {
      name: "Professional",
      description: "For small teams",
      price: "$199",
      credits: "3,000 credits included",
      features: [
        { text: "Everything in Starter", bold: true },
        "WhatsApp integration",
        "Inbound leads collection into pipeline",
        "Campaign analytics",
        "AI Recommendations for deal closure",
      ],
      href: "/onboarding",
      popular: true
    },
    {
      name: "Business",
      description: "For growing businesses",
      price: "$499",
      credits: "12,000 credits included",
      features: [
        { text: "Everything in Professional", bold: true },
        "AI Voice Agent",
        "AI Chat Agent for LinkedIn, WhatsApp",
        "Priority Support",
      ],
      href: "/onboarding"
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
    hidden: { y: 50, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.6
      }
    }
  };

  return (
    <motion.div 
      className="bg-white"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
        <motion.div 
          variants={cardVariants}
          className="text-center mb-12"
        >
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Flexible Pricing Plans
          </h2>
          <p className="text-xl text-gray-600">
            Choose the plan that fits your business needs. Credits included
            with every plan.
          </p>
        </motion.div>

        <div className="mb-16">
          <motion.div 
            variants={cardVariants}
            className="text-center mb-8"
          >
            <h3 className="text-2xl font-semibold text-gray-900 mb-2">
              Standard Plans
            </h3>
            <p className="text-gray-600">
              Perfect for individuals and new beginners
            </p>
          </motion.div>

          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto"
            variants={containerVariants}
          >
            {plans.map((plan, index) => (
              <motion.div
                key={plan.name}
                variants={cardVariants}
                whileHover={{ 
                  scale: 1.05,
                  rotateY: 2,
                  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)"
                }}
                className={`bg-white rounded-2xl border-2 p-6 transition-all duration-200 flex flex-col relative ${
                  plan.popular
                    ? "border-blue-500 hover:shadow-xl transform scale-105"
                    : "border-gray-200 hover:border-blue-500 hover:shadow-xl"
                }`}
              >
                {plan.popular && (
                  <motion.div 
                    className="absolute -top-4 left-1/2 transform -translate-x-1/2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    <span className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-medium">
                      Most Popular
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
                  <div className="text-lg font-semibold text-blue-600 mt-2">
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

                <Link href={plan.href}>
                  <motion.button 
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors cursor-pointer mt-auto"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    Get Started
                  </motion.button>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}