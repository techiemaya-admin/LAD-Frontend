'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Brain, Zap, Users, TrendingUp, MessageSquare, Phone, ArrowRight, CheckCircle2 } from 'lucide-react';

const Feature3DCard = dynamic(
  () => import('@/components/3d').then((mod) => mod.Feature3DCard),
  { ssr: false }
);

export default function FeaturesSection() {
  const features = [
    {
      title: "AI-Powered Conversations",
      description:
        "Intelligent agents that understand context and close deals autonomously across all communication channels.",
      icon: <Brain className="w-8 h-8 text-white" />,
      gradient: "from-blue-500 to-cyan-500",
      beforeText: "Manual response to each inquiry",
      afterText: "95% of conversations handled by AI",
      improvement: "100x faster response time"
    },
    {
      title: "Omnichannel Integration",
      description:
        "Seamlessly communicate via calls, emails, chat, and social media from a single unified platform.",
      icon: <MessageSquare className="w-8 h-8 text-white" />,
      gradient: "from-purple-500 to-pink-500",
      beforeText: "Switch between 5 different platforms",
      afterText: "Manage all channels from one dashboard",
      improvement: "70% less context switching"
    },
    {
      title: "Instant Deal Closure",
      description:
        "Let AI agents negotiate and close deals between vendors, consumers, wholesalers, and traders automatically.",
      icon: <Zap className="w-8 h-8 text-white" />,
      gradient: "from-orange-500 to-red-500",
      beforeText: "2-4 hours per deal negotiation",
      afterText: "AI completes negotiations in minutes",
      improvement: "90% time reduction"
    },
    {
      title: "Smart Lead Management",
      description:
        "Track, nurture, and convert leads with AI-driven insights and automated follow-ups.",
      icon: <Users className="w-8 h-8 text-white" />,
      gradient: "from-green-500 to-emerald-500",
      beforeText: "Manual lead tracking and follow-ups",
      afterText: "Automated qualification and nurturing",
      improvement: "10x more leads processed"
    },
    {
      title: "Real-time Analytics",
      description:
        "Monitor performance, conversion rates, and ROI with comprehensive dashboards and reports.",
      icon: <TrendingUp className="w-8 h-8 text-white" />,
      gradient: "from-cyan-500 to-blue-500",
      beforeText: "Spreadsheets and manual reporting",
      afterText: "Real-time dashboards with AI insights",
      improvement: "Instant decision-making"
    },
    {
      title: "Voice AI Technology",
      description:
        "Natural conversation AI that handles objections, qualifies leads, and books appointments.",
      icon: <Phone className="w-8 h-8 text-white" />,
      gradient: "from-pink-500 to-purple-500",
      beforeText: "Human agents during business hours",
      afterText: "24/7 AI voice availability",
      improvement: "Infinite capacity, always available"
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.15
      }
    }
  };

  const itemVariants = {
    hidden: { y: 50, opacity: 0, rotateX: -20 },
    visible: {
      y: 0,
      opacity: 1,
      rotateX: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30,
        duration: 0.8
      }
    },
    rest: {
      scale: 1,
      rotateX: 0,
      rotateY: 0,
      rotateZ: 0
    },
    hover: {
      scale: 1.08,
      rotateX: 5,
      rotateY: 8,
      rotateZ: -2,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 20
      }
    }
  };

  // Icon float animation
  const iconVariants = {
    animate: (index: number) => ({
      y: [-8, 8, -8],
      rotate: [0, 5, 0],
      transition: {
        duration: 3 + index * 0.3,
        repeat: Infinity,
        ease: 'easeInOut'
      }
    })
  };

  return (
    <motion.section 
      className="py-20 relative" 
      id="features"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      <div className="container mx-auto px-4">
        <motion.div
          variants={itemVariants}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-[#222B45] dark:text-white mb-4">
            Powerful Features for{" "}
            <span className="text-indigo-600">Automated Success</span>
          </h2>
          <p className="text-xl text-[#8F9BB3] dark:text-gray-400 max-w-3xl mx-auto">
            Experience the future of sales automation with our comprehensive
            suite of AI-powered tools
          </p>
        </motion.div>

        <motion.div
          className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              initial="rest"
              whileHover="hover"
              animate="visible"
              className="group"
              style={{ perspective: '1000px' }}
            >
              <div className="h-full">
                <Feature3DCard {...feature} index={index} />

                {/* Before/After comparison - visible on hover */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  whileHover={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="mt-4 p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <div className="space-y-3">
                    {/* Before */}
                    <div className="flex gap-2 items-start">
                      <span className="text-xs font-semibold text-red-600 dark:text-red-400 uppercase mt-0.5">Before</span>
                      <p className="text-sm text-[#8F9BB3] dark:text-gray-400 line-through">
                        {feature.beforeText}
                      </p>
                    </div>

                    {/* Arrow transition */}
                    <motion.div
                      animate={{ x: [0, 4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="flex justify-center"
                    >
                      <ArrowRight className="w-4 h-4 text-gray-400 rotate-90" />
                    </motion.div>

                    {/* After */}
                    <div className="flex gap-2 items-start">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                        {feature.afterText}
                      </p>
                    </div>

                    {/* Improvement metric */}
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileHover={{ opacity: 1 }}
                      className="pt-2 border-t border-gray-300 dark:border-gray-700"
                    >
                      <p className="text-xs font-bold text-indigo-600 dark:text-blue-400">
                        ✨ {feature.improvement}
                      </p>
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}