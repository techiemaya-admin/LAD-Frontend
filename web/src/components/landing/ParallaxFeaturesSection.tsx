'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Lock, Zap, Users, TrendingUp } from 'lucide-react';
import { StickyScroll } from '@/components/ui/sticky-scroll-reveal';

const StickyScrollFeatures = () => {
  const content = [
    {
      title: 'Safe Connections/Month',
      description:
        'Connect with 1,000+ verified professionals monthly while staying within LinkedIn safe limits. Our algorithm mimics human behavior with randomized volume, speed, and breaks to avoid restrictions.',
      stat: '1,000+',
      icon: <Lock className="w-12 h-12 text-white" />,
      color: 'from-blue-500 to-cyan-500',
      content: (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500">
          <div className="text-center">
            <Lock className="w-16 h-16 text-white mx-auto mb-4" />
            <p className="text-white text-xl font-bold">1,000+</p>
            <p className="text-white/80 text-sm">Safe Connections/Month</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Multi-Channel Outreach',
      description:
        'Reach prospects across LinkedIn, Email, WhatsApp, and SMS with AI-personalized messages. Coordinate campaigns across all channels simultaneously for maximum impact and engagement.',
      stat: '2,000+',
      icon: <Zap className="w-12 h-12 text-white" />,
      color: 'from-cyan-500 to-blue-500',
      content: (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cyan-500 to-blue-500">
          <div className="text-center">
            <Zap className="w-16 h-16 text-white mx-auto mb-4" />
            <p className="text-white text-xl font-bold">2,000+</p>
            <p className="text-white/80 text-sm">Multi-Channel Messages</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Faster Lead Qualification',
      description:
        'AI agents qualify leads in real-time, saving your team hours of manual research. Automatic conversation handling with intelligent objection handling across all channels.',
      stat: '10x',
      icon: <Users className="w-12 h-12 text-white" />,
      color: 'from-purple-500 to-pink-500',
      content: (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-purple-500 to-pink-500">
          <div className="text-center">
            <Users className="w-16 h-16 text-white mx-auto mb-4" />
            <p className="text-white text-xl font-bold">10x</p>
            <p className="text-white/80 text-sm">Faster Qualification</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Revenue Growth Potential',
      description:
        'Scale your sales pipeline exponentially without hiring more reps. Close deals 5-7x faster with AI-assisted negotiations and automated deal tracking with real-time analytics.',
      stat: '5-7x',
      icon: <TrendingUp className="w-12 h-12 text-white" />,
      color: 'from-green-500 to-emerald-500',
      content: (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-500 to-emerald-500">
          <div className="text-center">
            <TrendingUp className="w-16 h-16 text-white mx-auto mb-4" />
            <p className="text-white text-xl font-bold">5-7x</p>
            <p className="text-white/80 text-sm">Revenue Growth</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="py-20 relative bg-white dark:bg-black overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
            Crush LinkedIn
            <br />
            <span className="text-primary">Limits Safe & Fast</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            LAD is built with enterprise-grade safety controls. Connect with thousands of qualified prospects monthly without hitting platform restrictions.
          </p>
        </motion.div>

        {/* Sticky Scroll Section */}
        <StickyScroll content={content} contentClassName="rounded-2xl" />

        {/* Bottom CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-20 pt-12 border-t border-border text-center"
        >
          <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
            Ready to scale without limits?
          </h3>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join teams that are already closing 10-15x more deals with LAD's safe automation platform.
          </p>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block"
          >
            <button className="px-10 py-4 bg-primary text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-shadow">
              Get Started Free
            </button>
          </motion.div>

          <p className="text-xs text-muted-foreground mt-4">
            No credit card required. Setup takes 5 minutes.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

export default StickyScrollFeatures;
