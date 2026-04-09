'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { CheckCircle2, Shield, Zap, Calendar } from 'lucide-react';
import { useState } from 'react';

export default function CTASection() {
  const [selectedCTA, setSelectedCTA] = useState(0);

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
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 20
      }
    }
  };

  const ctaOptions = [
    {
      type: 'primary',
      label: 'Start Free Trial',
      description: 'Get 1000 credits to test',
      icon: <Zap className="w-6 h-6" />,
      action: '/onboarding',
      highlight: true
    },
    {
      type: 'secondary',
      label: 'Schedule Demo',
      description: 'See it in action (15 min)',
      icon: <Calendar className="w-6 h-6" />,
      action: '/demo',
      highlight: false
    },
    {
      type: 'tertiary',
      label: 'Ask Questions',
      description: 'Chat with our team',
      icon: <Shield className="w-6 h-6" />,
      action: '/contact',
      highlight: false
    }
  ];

  const trustPoints = [
    { icon: '🔐', text: 'No credit card required' },
    { icon: '⏱️', text: '30-day free trial' },
    { icon: '🔄', text: 'Money-back guarantee' },
    { icon: '🙅', text: 'Cancel anytime' }
  ];

  return (
    <motion.section
      className="py-20 relative overflow-hidden"
      id="contact"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      {/* Background with gradient and animation */}
      <div className="absolute inset-0 bg-indigo-600" />
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'linear'
        }}
        style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(59, 130, 246, 0.3), transparent 50%)',
          backgroundSize: '200% 200%'
        }}
      />
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: 'radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.3), transparent 50%)',
        }}
      />

      <motion.div
        className="container mx-auto px-4 relative z-10"
        variants={containerVariants}
      >
        {/* Header */}
        <motion.div
          variants={itemVariants}
          className="text-center mb-12"
        >
          <h2 className="text-4xl lg:text-5xl font-bold text-white mb-4">
            Ready to Let <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">AI Close Deals</span>?
          </h2>
          <p className="text-xl text-white/80 max-w-2xl mx-auto">
            Join 500+ businesses automating their sales and closing 10x more deals
          </p>
        </motion.div>

        {/* Multi-Option CTA Buttons */}
        <motion.div
          className="grid md:grid-cols-3 gap-6 mb-12 max-w-3xl mx-auto"
          variants={containerVariants}
        >
          {ctaOptions.map((cta, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.05, y: -10 }}
            >
              <Link href={cta.action}>
                <motion.button
                  className={`w-full p-6 rounded-2xl font-semibold transition-all relative group ${
                    cta.highlight
                      ? 'bg-white text-indigo-600 shadow-2xl'
                      : 'bg-white/10 backdrop-blur-md text-white border border-white/20 hover:border-white/40'
                  }`}
                  whileHover={{
                    boxShadow: cta.highlight
                      ? '0 25px 50px -12px rgba(255, 255, 255, 0.4)'
                      : '0 25px 50px -12px rgba(255, 255, 255, 0.2)'
                  }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="flex items-center justify-center mb-3 text-2xl">
                    {cta.icon}
                  </div>
                  <div className="text-lg font-bold mb-1">{cta.label}</div>
                  <div className={`text-sm ${cta.highlight ? 'text-[#8F9BB3]' : 'text-white/70'}`}>
                    {cta.description}
                  </div>
                  {cta.highlight && (
                    <motion.div
                      className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.7, 1]
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity
                      }}
                    />
                  )}
                </motion.button>
              </Link>
            </motion.div>
          ))}
        </motion.div>

        {/* Trust Points */}
        <motion.div
          variants={itemVariants}
          className="max-w-3xl mx-auto mb-12"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {trustPoints.map((point, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.1 }}
                className="text-center p-3 rounded-lg bg-white/5 backdrop-blur border border-white/10"
              >
                <div className="text-2xl mb-2">{point.icon}</div>
                <p className="text-xs text-white/80 font-medium">{point.text}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Social Proof Counter */}
        <motion.div
          variants={itemVariants}
          className="text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.05, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="inline-block p-4 rounded-lg bg-white/10 backdrop-blur border border-white/20"
          >
            <p className="text-white/80 text-sm mb-2">
              ✨ <span className="font-bold text-white">500+ businesses</span> already saved on average <span className="font-bold text-blue-400">$50,000/year</span>
            </p>
          </motion.div>
        </motion.div>
      </motion.div>
    </motion.section>
  );
}