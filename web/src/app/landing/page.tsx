'use client';

import { Brain, Zap, Users, TrendingUp, MessageSquare, Phone } from 'lucide-react';
import dynamic from 'next/dynamic';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

// Lazy load 3D components to improve initial page load
const FloatingCommunicationOrbs = dynamic(
  () => import('@/components/3d').then(mod => mod.FloatingCommunicationOrbs),
  { ssr: false, loading: () => <div className="h-[700px] md:h-[400px] bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" /> }
);

const Feature3DCard = dynamic(
  () => import('@/components/3d').then(mod => mod.Feature3DCard),
  { ssr: false }
);

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
    <div className="min-h-screen bg-gradient-to-br from-white via-gray-50 to-blue-50 dark:from-[#0b1957] dark:via-[#0b1957] dark:to-[#0b1957]">
      {/* Header */}
      <Header />

      {/* Main Content */}
      {/* Hero Section with 3D Elements */}
      <section className="relative overflow-hidden py-20">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-[#dbdbdb]" />
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-6"
            >
              {/* Logo */}
              <div>
                <h1 className="text-6xl lg:text-7xl font-bold text-[#0b1957] dark:text-white leading-tight">
                  LAD
                </h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 font-semibold mt-2">
                  Powered by Techiemaya
                </p>
              </div>

              <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white leading-tight">
                AI Agents That{' '}
                <span className="text-[#0b1957]">
                  Close Deals
                </span>
                {' '}Automatically
              </h2>

              <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                Revolutionize your sales process with AI-powered agents that communicate across all channels—voice, email, chat, and social media—to close deals between vendors and consumers, wholesalers and traders.
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href="/onboarding">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-8 py-4 bg-[#0b1957] text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
                  >
                    Get Started
                  </motion.button>
                </Link>
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
                    <div className="text-3xl font-bold text-[#0b1957]">
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
              {/* Image */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="mt-8"
              >
                <Image
                  src="/lad.png"
                  alt="LAD Platform"
                  width={600}
                  height={400}
                  priority
                  className="w-full "
                />
              </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section with 3D Cards */}
      <section className="py-20 relative" id="features">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
              Powerful Features for{' '}
              <span className="text-[#0b1957]">
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
      <section className="py-20 relative overflow-hidden" id="contact">
        <div className="absolute inset-0 bg-[#0b1957] opacity-95" />
        <motion.div
          className="container mx-auto px-4 relative z-10 text-center"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-white mt-8 mb-4">
            Ready to Let Agents Deal?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of businesses automating their sales with LAD's AI-powered platform
          </p>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="px-10 py-5 bg-white text-[#0b1957] rounded-xl font-bold text-lg shadow-2xl hover:shadow-3xl transition-shadow"
            onClick={() => window.location.href = '/onboarding'}
          >
            Get Started Today
          </motion.button>
        </motion.div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
