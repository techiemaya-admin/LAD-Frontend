'use client';

import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import { Brain, Zap, Users, TrendingUp, MessageSquare, Phone } from 'lucide-react';

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
    },
    {
      title: "Omnichannel Integration",
      description:
        "Seamlessly communicate via calls, emails, chat, and social media from a single unified platform.",
      icon: <MessageSquare className="w-8 h-8 text-white" />,
      gradient: "from-purple-500 to-pink-500",
    },
    {
      title: "Instant Deal Closure",
      description:
        "Let AI agents negotiate and close deals between vendors, consumers, wholesalers, and traders automatically.",
      icon: <Zap className="w-8 h-8 text-white" />,
      gradient: "from-orange-500 to-red-500",
    },
    {
      title: "Smart Lead Management",
      description:
        "Track, nurture, and convert leads with AI-driven insights and automated follow-ups.",
      icon: <Users className="w-8 h-8 text-white" />,
      gradient: "from-green-500 to-emerald-500",
    },
    {
      title: "Real-time Analytics",
      description:
        "Monitor performance, conversion rates, and ROI with comprehensive dashboards and reports.",
      icon: <TrendingUp className="w-8 h-8 text-white" />,
      gradient: "from-cyan-500 to-blue-500",
    },
    {
      title: "Voice AI Technology",
      description:
        "Natural conversation AI that handles objections, qualifies leads, and books appointments.",
      icon: <Phone className="w-8 h-8 text-white" />,
      gradient: "from-pink-500 to-purple-500",
    },
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

  const itemVariants = {
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
          <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Powerful Features for{" "}
            <span className="text-[#0b1957]">Automated Success</span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
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
              whileHover={{ 
                scale: 1.05,
                rotateY: 5,
                rotateX: 5 
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 20 
              }}
            >
              <Feature3DCard {...feature} index={index} />
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}