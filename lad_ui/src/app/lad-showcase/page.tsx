'use client';

import { Brain, Zap, Users, TrendingUp, MessageSquare, Phone } from 'lucide-react';
import { FloatingCommunicationOrbs, Feature3DCard, LADLogo3D } from '@/components/3d';
import { motion } from 'framer-motion';

export default function LAD3DShowcase() {
  const features = [
    {
      title: 'AI-Powered Conversations',
      description: 'Intelligent agents that understand context and close deals autonomously across all communication channels.',
      icon: <Brain className="w-8 h-8 text-white" />,
      gradient: 'from-blue-500 to-cyan-500',
    },
    {
      title: 'Omnichannel Integration',
      description: 'Seamlessly communicate via calls, emails, chat, and social media from a single unified platform.',
      icon: <MessageSquare className="w-8 h-8 text-white" />,
      gradient: 'from-purple-500 to-pink-500',
    },
    {
      title: 'Instant Deal Closure',
      description: 'Let AI agents negotiate and close deals between vendors, consumers, wholesalers, and traders automatically.',
      icon: <Zap className="w-8 h-8 text-white" />,
      gradient: 'from-orange-500 to-red-500',
    },
    {
      title: 'Smart Lead Management',
      description: 'Track, nurture, and convert leads with AI-driven insights and automated follow-ups.',
      icon: <Users className="w-8 h-8 text-white" />,
      gradient: 'from-green-500 to-emerald-500',
    },
    {
      title: 'Real-time Analytics',
      description: 'Monitor performance, conversion rates, and ROI with comprehensive dashboards and reports.',
      icon: <TrendingUp className="w-8 h-8 text-white" />,
      gradient: 'from-cyan-500 to-blue-500',
    },
    {
      title: 'Voice AI Technology',
      description: 'Natural conversation AI that handles objections, qualifies leads, and books appointments.',
      icon: <Phone className="w-8 h-8 text-white" />,
      gradient: 'from-pink-500 to-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Hero Section with 3D Elements */}
      <section className="relative overflow-hidden py-20">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-purple-600/10 to-pink-600/10" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              {/* 3D Logo */}
              <div className="flex items-center gap-4">
                <LADLogo3D size="sm" animated />
                <div>
                  <h1 className="text-5xl lg:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                    LAD
                  </h1>
                  <p className="text-xl text-gray-600 dark:text-gray-400 font-semibold">
                    Let Agent Deal
                  </p>
                </div>
              </div>

              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                AI Agents That{' '}
                <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Close Deals
                </span>
                {' '}Automatically
              </h2>

              <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                Revolutionize your sales process with AI-powered agents that communicate across all channels—voice, email, chat, and social media—to close deals between vendors and consumers, wholesalers and traders.
              </p>

              <div className="flex flex-wrap gap-4">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
                >
                  Start Free Trial
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow border border-gray-200 dark:border-gray-700"
                >
                  Watch Demo
                </motion.button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-6 pt-8">
                {[
                  { value: '10x', label: 'Faster Closures' },
                  { value: '95%', label: 'Success Rate' },
                  { value: '24/7', label: 'AI Availability' },
                ].map((stat, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 + 0.5 }}
                    className="text-center"
                  >
                    <div className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {stat.label}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Right: 3D Floating Communication Orbs */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
            >
              <FloatingCommunicationOrbs />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section with 3D Cards */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features for{' '}
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Automated Success
              </span>
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-400 max-w-3xl mx-auto">
              Experience the future of sales automation with our comprehensive suite of AI-powered tools
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Feature3DCard
                key={index}
                {...feature}
                index={index}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-90" />
        <motion.div
          className="container mx-auto px-4 relative z-10 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <LADLogo3D size="md" animated />
          
          <h2 className="text-4xl lg:text-5xl font-bold text-white mt-8 mb-4">
            Ready to Let Agents Deal?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses automating their sales with LAD's AI-powered platform
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-10 py-5 bg-white text-blue-600 rounded-xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-shadow"
          >
            Get Started Today
          </motion.button>
        </motion.div>
      </section>
    </div>
  );
}
