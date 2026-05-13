'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import Image from 'next/image';
import { useRef } from 'react';

export default function FourStepsSection() {
  const [activeStep, setActiveStep] = useState(2);
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start']
  });

  const parallaxY = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const parallaxStepsY = useTransform(scrollYProgress, [0, 1], [50, -50]);

  const steps = [
    {
      number: 1,
      title: 'Find Prospects',
      subtitle: 'From LinkedIn & Sales Navigator',
      description: 'Find thousands of LinkedIn prospects in seconds. Connect your data sources and build your target list instantly.',
      icon: '📥',
      image: '/placeholder-step-1.png',
      alt: 'Find prospects interface'
    },
    {
      number: 2,
      title: 'Setup AI Agent',
      subtitle: 'Configure Messaging Templates',
      description: 'Create personalized outreach templates. Define your tone, value proposition, and let AI handle the personalization.',
      icon: '⚙️',
      image: '/placeholder-step-2.png',
      alt: 'AI agent setup interface'
    },
    {
      number: 3,
      title: 'AI Engages',
      subtitle: 'Automatic Conversations & Qualification',
      description: 'Your AI agents automatically send messages, engage in real conversations, and qualify leads based on your criteria.',
      icon: '🤖',
      image: '/placeholder-step-3.png',
      alt: 'AI engagement dashboard'
    },
    {
      number: 4,
      title: 'Close Deals',
      subtitle: 'Analytics & Deal Export',
      description: 'Get detailed insights on all conversations. Export qualified leads to your CRM and close deals faster.',
      icon: '🎯',
      image: '/placeholder-step-4.png',
      alt: 'Analytics and insights dashboard'
    }
  ];

  return (
    <motion.section
      ref={sectionRef}
      className="relative py-32 overflow-hidden bg-gradient-to-b from-[#1A3F7F] via-[#162d5f] to-[#0f2647]"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.6 }}
    >
      {/* Animated Background Gradient Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Gradient Orb 1 */}
        <motion.div
          className="absolute w-96 h-96 bg-blue-600/20 rounded-full blur-3xl"
          style={{
            top: '10%',
            left: '10%',
            y: parallaxY
          }}
          animate={{
            x: [0, 30, 0],
            y: [0, 40, 0]
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Gradient Orb 2 */}
        <motion.div
          className="absolute w-96 h-96 bg-cyan-600/20 rounded-full blur-3xl"
          style={{
            bottom: '10%',
            right: '10%',
            y: useTransform(scrollYProgress, [0, 1], [-100, 100])
          }}
          animate={{
            x: [0, -30, 0],
            y: [0, -40, 0]
          }}
          transition={{
            duration: 10,
            repeat: Infinity,
            ease: 'easeInOut'
          }}
        />

        {/* Starfield */}
        {[...Array(60)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white rounded-full"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.3
            }}
            animate={{ opacity: [0.3, 0.8, 0.3] }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 2
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="relative z-10 px-4 md:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <h2 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="bg-gradient-to-r from-cyan-300 via-blue-300 to-cyan-200 bg-clip-text text-transparent">
              4 Simple Steps
            </span>
          </h2>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto">
            Get started with LAD and transform your sales process in minutes
          </p>
        </motion.div>

        {/* Steps Container */}
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left Column - Step List */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              style={{ y: parallaxStepsY }}
              className="space-y-6"
            >
              {steps.map((step, idx) => (
                <motion.button
                  key={step.number}
                  onClick={() => setActiveStep(idx)}
                  whileHover={{ scale: 1.05, x: 10 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full text-left p-6 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
                    activeStep === idx
                      ? 'bg-gradient-to-r from-cyan-500 to-blue-600 shadow-2xl shadow-cyan-500/40'
                      : 'bg-white/10 backdrop-blur-md border border-white/20 hover:border-cyan-400/50 hover:bg-white/15'
                  }`}
                >
                  {/* Background gradient animation */}
                  <div
                    className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
                      activeStep !== idx ? 'bg-gradient-to-r from-cyan-600/10 to-blue-600/10' : ''
                    }`}
                  />

                  <div className="relative">
                    <div className="flex items-start gap-4">
                      <div
                        className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold transition-all duration-300 ${
                          activeStep === idx
                            ? 'bg-white/20 text-white'
                            : 'bg-cyan-500/30 text-cyan-300 group-hover:bg-cyan-500/50 group-hover:text-cyan-200'
                        }`}
                      >
                        {step.icon}
                      </div>

                      <div className="flex-1">
                        <h3
                          className={`text-xl font-bold mb-1 transition-colors duration-300 ${
                            activeStep === idx ? 'text-white' : 'text-blue-100 group-hover:text-cyan-200'
                          }`}
                        >
                          {step.title}
                        </h3>
                        <p
                          className={`text-sm transition-colors duration-300 ${
                            activeStep === idx ? 'text-blue-100' : 'text-blue-300/70 group-hover:text-blue-200'
                          }`}
                        >
                          {step.subtitle}
                        </p>
                      </div>

                      <div
                        className={`flex-shrink-0 text-3xl font-bold transition-all duration-300 ${
                          activeStep === idx ? 'text-white' : 'text-cyan-400/60 group-hover:text-cyan-300'
                        }`}
                      >
                        {String(step.number).padStart(2, '0')}
                      </div>
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>

            {/* Right Column - Content Card */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: 0.1 }}
              style={{ y: useTransform(scrollYProgress, [0, 1], [-50, 50]) }}
              className="relative"
            >
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeStep}
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -20 }}
                  transition={{ duration: 0.4 }}
                  className="relative"
                >
                  {/* Glow Background */}
                  <div className="absolute -inset-4 bg-gradient-to-r from-cyan-600/20 to-blue-600/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* Card */}
                  <div className="relative bg-gradient-to-br from-white/15 to-blue-900/30 backdrop-blur-xl rounded-3xl p-8 md:p-10 border border-white/20 shadow-2xl overflow-hidden">
                    {/* Card shine effect */}
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 to-transparent opacity-50" />

                    <div className="relative z-10">
                      {/* Step Number Badge */}
                      <div className="inline-flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                          {String(activeStep + 1).padStart(2, '0')}
                        </div>
                        <div className="text-sm font-semibold text-cyan-300">
                          Step {activeStep + 1} of 4
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-4xl md:text-5xl font-bold text-white mb-4 leading-tight">
                        {steps[activeStep].title}
                      </h3>

                      {/* Subtitle */}
                      <p className="text-lg text-cyan-300 font-semibold mb-4">
                        {steps[activeStep].subtitle}
                      </p>

                      {/* Description */}
                      <p className="text-lg text-blue-100/80 mb-10 leading-relaxed">
                        {steps[activeStep].description}
                      </p>

                      {/* Step Preview */}
                      {activeStep === 0 ? (
                        /* Lead Results Preview for "Import Prospects" */
                        <div className="relative rounded-2xl overflow-hidden border border-white/10" style={{ background: '#0b1959', aspectRatio: '16/9' }}>
                          {/* Window chrome */}
                          <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#071245', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                            <div className="flex gap-1.5">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ff5f57' }} />
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#febc2e' }} />
                              <div className="w-2.5 h-2.5 rounded-full" style={{ background: '#28c840' }} />
                            </div>
                            <div className="flex-1 mx-3 rounded" style={{ background: 'rgba(255,255,255,0.08)', height: '16px', display: 'flex', alignItems: 'center', padding: '0 8px' }}>
                              <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '9px' }}>LAD — AI Prospect Search</span>
                            </div>
                          </div>

                          {/* Chat content */}
                          <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', overflow: 'hidden' }}>
                            {/* User message */}
                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                              <div style={{ background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: '#fff', borderRadius: '12px 12px 3px 12px', padding: '6px 10px', fontSize: '10px', maxWidth: '70%' }}>
                                Find Founders in real estate in Dubai
                              </div>
                            </div>

                            {/* AI response */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                              <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'linear-gradient(135deg, #06b6d4, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '7px', fontWeight: 'bold', color: '#fff' }}>AI</div>
                              <div style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.85)', borderRadius: '3px 12px 12px 12px', padding: '6px 10px', fontSize: '10px' }}>
                                Found <span style={{ color: '#22d3ee', fontWeight: 700 }}>30 verified leads</span> via Sales Navigator
                              </div>
                            </div>

                            {/* Lead rows */}
                            {[
                              { name: 'Amir Ahamraoui', role: 'Founder & CEO', company: 'Dubai Realty Group', hue: 210 },
                              { name: 'Islam Alakaly', role: 'Co-Founder', company: 'Gulf Property Ventures', hue: 240 },
                              { name: 'Sarah Al Mansouri', role: 'Founder', company: 'Emirates Real Estate', hue: 195 },
                              { name: 'Khalid Rashid', role: 'Managing Director', company: 'Prime Properties Dubai', hue: 225 },
                            ].map((lead, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '5px 8px' }}>
                                <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: `hsl(${lead.hue}, 65%, 38%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontSize: '9px', fontWeight: 700 }}>
                                  {lead.name[0]}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ color: '#fff', fontSize: '9.5px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.name}</div>
                                  <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: '8.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lead.role} · {lead.company}</div>
                                </div>
                                <div style={{ width: '52px', background: 'rgba(34,211,238,0.15)', border: '1px solid rgba(34,211,238,0.3)', borderRadius: '4px', padding: '2px 5px', fontSize: '7.5px', color: '#22d3ee', textAlign: 'center', flexShrink: 0 }}>Connect</div>
                              </div>
                            ))}

                            <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.25)', fontSize: '8.5px' }}>+26 more leads found</div>
                          </div>
                        </div>
                      ) : (
                        /* Placeholder for other steps */
                        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-900 to-black border border-white/10 aspect-video flex items-center justify-center group">
                          <div className="absolute inset-0 bg-gradient-to-b from-cyan-600/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                          <div className="relative z-10 flex flex-col items-center justify-center space-y-4">
                            <motion.div
                              animate={{ y: [0, -10, 0] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/30 to-blue-600/30 flex items-center justify-center border border-cyan-400/30"
                            >
                              <svg
                                className="w-10 h-10 text-cyan-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                />
                              </svg>
                            </motion.div>
                            <div className="text-center">
                              <p className="text-blue-200 font-semibold text-lg">
                                {steps[activeStep].title}
                              </p>
                              <p className="text-blue-400/70 text-sm">Application Interface</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* CTA Button */}
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className="mt-8 w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg shadow-cyan-500/30 hover:shadow-cyan-500/50"
                      >
                        Learn More →
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* Mobile Step Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex gap-3 justify-center mt-16 lg:hidden"
        >
          {steps.map((_, idx) => (
            <motion.button
              key={idx}
              onClick={() => setActiveStep(idx)}
              whileHover={{ scale: 1.3 }}
              className={`h-4 rounded-full transition-all duration-300 ${
                activeStep === idx
                  ? 'bg-gradient-to-r from-cyan-400 to-blue-600 w-10 shadow-lg shadow-cyan-500/50'
                  : 'bg-white/30 w-4 hover:bg-white/50'
              }`}
            />
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
