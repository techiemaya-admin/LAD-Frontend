'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Lock, Zap, Users, TrendingUp } from 'lucide-react';
import { StickyScroll } from '@/components/ui/sticky-scroll-reveal';

const StickyScrollFeatures = () => {
  const content = [
    {
      title: 'Conversations Started/Month',
      description:
        'Mr LAD opens 1,000+ personalized conversations with the right people every month while maintaining a steady, human pace that keeps your accounts in good standing.',
      stat: '1,000+',
      icon: <Lock className="w-12 h-12 text-white" />,
      color: 'from-blue-500 to-cyan-500',
      content: (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-blue-500 to-cyan-500">
          <div className="text-center">
            <Lock className="w-16 h-16 text-white mx-auto mb-4" />
            <p className="text-white text-xl font-bold">1,000+</p>
            <p className="text-white/80 text-sm">Conversations Started/Month</p>
          </div>
        </div>
      ),
    },
    {
      title: 'Every Channel, One Employee',
      description:
        'Mr LAD works across LinkedIn, WhatsApp, Instagram, email, and voice at once, delivering personalized messages across every channel so nothing slips through.',
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
        'Mr LAD qualifies leads in real-time, saving your team hours of manual research. He handles every conversation and answers questions across all channels.',
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
      title: 'A Full Calendar, On Autopilot',
      description:
        'Scale your pipeline without hiring more reps. Mr LAD follows up, qualifies, and books meetings straight onto your calendar while keeping your CRM synced in real time.',
      stat: '5-7x',
      icon: <TrendingUp className="w-12 h-12 text-white" />,
      color: 'from-green-500 to-emerald-500',
      content: (
        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-green-500 to-emerald-500">
          <div className="text-center">
            <TrendingUp className="w-16 h-16 text-white mx-auto mb-4" />
            <p className="text-white text-xl font-bold">5-7x</p>
            <p className="text-white/80 text-sm">More Meetings Booked</p>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section id="features" className="py-20 relative bg-gradient-to-b from-background via-background to-background scroll-mt-24">
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
            What Mr LAD
            <br />
            <span className="text-primary">Does Every Day</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Mr LAD is one AI Sales Employee who works across every channel around the clock, reaching thousands of qualified prospects every month so your calendar stays full.
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
            Ready to hire Mr LAD?
          </h3>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join teams that are already booking 5-7x more meetings with one AI Sales Employee working every channel.
          </p>

          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="inline-block"
          >
            <Link
              href="/onboarding"
              className="inline-block px-10 py-4 bg-primary text-white font-semibold rounded-lg shadow-lg hover:shadow-xl transition-shadow"
            >
              Hire Mr LAD
            </Link>
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
