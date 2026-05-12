'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Users, MessageSquare, TrendingUp, CheckCircle2, Check, BarChart3, Mail, MessageCircle, Smartphone, Linkedin } from 'lucide-react';

// Inline Mock UI Components
function ConnectMockUI() {
  const channels = [
    { icon: Linkedin, label: 'LinkedIn', connected: true },
    { icon: Mail, label: 'Email', connected: true },
    { icon: MessageCircle, label: 'WhatsApp', connected: true },
    { icon: Smartphone, label: 'SMS', connected: true },
  ];

  return (
    <div className="w-full space-y-4">
      <div className="text-center mb-4">
        <p className="text-xs text-muted-foreground font-semibold tracking-wide">CONNECTED CHANNELS</p>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {channels.map((ch, i) => {
          const Icon = ch.icon;
          return (
            <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-background border border-border">
              <Icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground flex-1">{ch.label}</span>
              {ch.connected && <Check className="w-4 h-4 text-green-500" />}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OutreachMockUI() {
  return (
    <div className="w-full space-y-4">
      <div className="text-center mb-4">
        <p className="text-xs text-muted-foreground font-semibold tracking-wide">TARGET PERSONA</p>
      </div>
      <div className="space-y-3">
        <div className="p-3 rounded-lg bg-background border border-border">
          <p className="text-xs text-muted-foreground">Job Title</p>
          <p className="text-sm font-bold text-foreground">Sales Director</p>
        </div>
        <div className="p-3 rounded-lg bg-background border border-border">
          <p className="text-xs text-muted-foreground">Company Size</p>
          <p className="text-sm font-bold text-foreground">50-500 employees</p>
        </div>
        <div className="p-3 rounded-lg bg-background border border-border">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Template</span>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-600 font-semibold">AI Personalized</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">"Hi [Name], noticed your sales team is using [Platform]..."</p>
        </div>
      </div>
    </div>
  );
}

function AITakeoverMockUI() {
  return (
    <div className="w-full space-y-3">
      <div className="text-center mb-3">
        <p className="text-xs text-muted-foreground font-semibold tracking-wide">LIVE CONVERSATION</p>
      </div>
      <div className="space-y-2 max-h-[160px] overflow-y-auto">
        <div className="flex justify-end">
          <div className="px-3 py-2 rounded-lg bg-blue-500/20 border border-blue-500/30 text-sm text-foreground max-w-[70%]">
            Hi John! Quick question about your process...
          </div>
        </div>
        <div className="flex justify-start">
          <div className="px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground max-w-[70%] flex items-center gap-2">
            <span className="text-xs px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-700 font-semibold">AI Agent</span>
            <span>We use HubSpot...</span>
          </div>
        </div>
        <div className="flex justify-start">
          <div className="px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground flex items-center gap-2">
            <motion.span animate={{ opacity: [0.5, 1, 0.5] }} transition={{ duration: 1.4, repeat: Infinity }} className="text-xs">●</motion.span>
            <span className="text-xs text-muted-foreground">Typing...</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function DealsMockUI() {
  return (
    <div className="w-full space-y-4">
      <div className="text-center mb-4">
        <p className="text-xs text-muted-foreground font-semibold tracking-wide">ACTIVE DEAL</p>
      </div>
      <div className="p-4 rounded-lg bg-background border border-border space-y-3">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-muted-foreground">Deal Value</p>
            <p className="text-lg font-bold text-foreground">$45,000</p>
          </div>
          <div className="px-2 py-1 rounded-full bg-green-500/10 text-green-700 flex items-center gap-1 text-xs font-semibold">
            <Check className="w-3 h-3" /> Qualified
          </div>
        </div>
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <p className="text-xs text-muted-foreground">Progress</p>
            <p className="text-xs font-semibold text-foreground">75%</p>
          </div>
          <div className="w-full h-2 rounded-full bg-border overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: '75%' }} transition={{ duration: 1.5 }} className="h-full bg-gradient-to-r from-blue-500 to-cyan-500" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">Negotiation in progress...</p>
      </div>
    </div>
  );
}

function AnalyticsMockUI() {
  return (
    <div className="w-full space-y-4">
      <div className="text-center mb-4">
        <p className="text-xs text-muted-foreground font-semibold tracking-wide">PERFORMANCE METRICS</p>
      </div>
      <div className="space-y-3">
        <div className="flex items-end gap-1 h-12">
          {[60, 85, 75, 90, 80, 95, 70].map((h, i) => (
            <motion.div key={i} initial={{ height: 0 }} animate={{ height: `${(h / 100) * 48}px` }} transition={{ duration: 1, delay: i * 0.1 }} className="flex-1 bg-gradient-to-t from-blue-500 to-cyan-500 rounded-t-sm" />
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2 rounded-lg bg-background border border-border">
            <p className="text-xs text-muted-foreground">Conversion</p>
            <p className="text-sm font-bold text-foreground">34%</p>
          </div>
          <div className="p-2 rounded-lg bg-background border border-border">
            <p className="text-xs text-muted-foreground">Avg Deal</p>
            <p className="text-sm font-bold text-foreground">$52K</p>
          </div>
          <div className="p-2 rounded-lg bg-background border border-border">
            <p className="text-xs text-muted-foreground">Response</p>
            <p className="text-sm font-bold text-foreground">68%</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isHovering, setIsHovering] = useState(false);

  const steps = [
    {
      id: 0,
      step: '01',
      title: 'Connect Your Channels',
      description: 'Link LinkedIn, email, WhatsApp, SMS in minutes with one-click OAuth',
      icon: <Zap className="w-6 h-6 text-white" />,
      duration: '2 mins',
      color: 'from-blue-500 to-cyan-500',
      bullets: [
        'One-click OAuth for LinkedIn',
        'SMTP for email integration',
        'WhatsApp Business API setup'
      ],
      mockUI: <ConnectMockUI />
    },
    {
      id: 1,
      step: '02',
      title: 'Define Your Outreach',
      description: 'Set target audience, messaging templates, and qualification criteria',
      icon: <Users className="w-6 h-6 text-white" />,
      duration: '5 mins',
      color: 'from-purple-500 to-pink-500',
      bullets: [
        'Target by job title & company size',
        'Custom message templates',
        'Automated qualification rules'
      ],
      mockUI: <OutreachMockUI />
    },
    {
      id: 2,
      step: '03',
      title: 'AI Takes Over',
      description: 'Intelligent agents start conversations and qualify leads automatically',
      icon: <MessageSquare className="w-6 h-6 text-white" />,
      duration: 'Automatic',
      color: 'from-orange-500 to-red-500',
      bullets: [
        'AI agents send personalized messages',
        'Real-time conversation handling',
        'Automatic lead qualification'
      ],
      mockUI: <AITakeoverMockUI />
    },
    {
      id: 3,
      step: '04',
      title: 'Deals Close',
      description: 'AI agents negotiate terms, handle objections, and close transactions',
      icon: <TrendingUp className="w-6 h-6 text-white" />,
      duration: 'Varies',
      color: 'from-green-500 to-emerald-500',
      bullets: [
        'Intelligent objection handling',
        'Dynamic offer negotiation',
        'Deal closing automation'
      ],
      mockUI: <DealsMockUI />
    },
    {
      id: 4,
      step: '05',
      title: 'Review & Optimize',
      description: 'AI provides insights, recommendations, and performance analytics',
      icon: <BarChart3 className="w-6 h-6 text-white" />,
      duration: 'Daily',
      color: 'from-cyan-500 to-blue-500',
      bullets: [
        'Real-time performance analytics',
        'AI-powered optimization tips',
        'Historical win/loss analysis'
      ],
      mockUI: <AnalyticsMockUI />
    }
  ];

  // Auto-progression every 4 seconds (paused when hovering)
  useEffect(() => {
    if (isHovering) return; // Don't auto-advance while hovering

    const timer = setInterval(() => {
      setActiveStep((prev) => {
        const next = (prev + 1) % steps.length;
        setCompletedSteps((c) => [...new Set([...c, prev])]);
        return next;
      });
    }, 4000);
    return () => clearInterval(timer);
  }, [isHovering]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  };

  const stepBubbleVariants = {
    hidden: { opacity: 0, scale: 0.5, y: 20 },
    visible: (i: number) => ({
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 200,
        damping: 25,
        delay: i * 0.08
      }
    })
  };

  const lineVariants = {
    hidden: { pathLength: 0, opacity: 0 },
    visible: {
      pathLength: 1,
      opacity: 1,
      transition: {
        duration: 2.0,
        ease: 'easeInOut',
        delay: 0.3
      }
    }
  };

  const panelVariants = {
    initial: { opacity: 0, y: 20, scale: 0.97 },
    animate: { opacity: 1, y: 0, scale: 1, transition: { type: 'spring', stiffness: 200, damping: 25 } },
    exit: { opacity: 0, y: -20, scale: 0.97, transition: { duration: 0.25 } }
  };

  return (
    <motion.section
      className="py-20 relative bg-gradient-to-b from-background via-background to-background overflow-hidden"
      id="how-it-works"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      {/* Background blobs */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <motion.div className="text-center mb-16" variants={stepBubbleVariants} custom={0}>
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground mb-4">
            How It <span className="text-primary">Works</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Five simple steps to automate your entire sales process and watch deals close on their own
          </p>
        </motion.div>

        {/* Two-Column Layout: Workflow (Left) + Details (Right) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {/* Left: Step Workflow */}
          <motion.div
            className="md:col-span-1"
            variants={stepBubbleVariants}
            custom={1}
          >
            {/* Desktop Vertical Steps */}
            <div className="hidden md:flex flex-col gap-6">
              {steps.map((step, i) => (
                <motion.button
                  key={i}
                  onClick={() => {
                    setActiveStep(i);
                    setCompletedSteps((c) => [...new Set([...c, i])]);
                  }}
                  onMouseEnter={() => {
                    setIsHovering(true);
                    setActiveStep(i);
                    setCompletedSteps((c) => [...new Set([...c, i])]);
                  }}
                  onMouseLeave={() => {
                    setIsHovering(false);
                  }}
                  className="flex gap-4 items-start cursor-pointer text-left p-4 rounded-lg hover:bg-background/50 transition-colors"
                  whileHover={{ x: 4 }}
                >
                  {/* Step Circle */}
                  <motion.div
                    className={`w-12 h-12 rounded-full bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg border-2 border-background flex-shrink-0 relative`}
                    animate={activeStep === i ? { boxShadow: ['0 0 0 0px rgba(11,25,87,0.6)', '0 0 0 12px rgba(11,25,87,0)'] } : {}}
                    transition={{ duration: 1.8, repeat: activeStep === i ? Infinity : 0 }}
                  >
                    {completedSteps.includes(i) ? (
                      <Check className="w-5 h-5 text-white" />
                    ) : (
                      step.icon
                    )}
                  </motion.div>
                  {/* Step Info */}
                  <div className="flex-1 pt-1">
                    <p className="text-sm font-semibold text-foreground">{step.title}</p>
                    <p className="text-xs text-muted-foreground">{step.duration}</p>
                  </div>
                </motion.button>
              ))}
            </div>

            {/* Mobile Step Indicator Dots */}
            <div className="md:hidden flex justify-center gap-2">
              {steps.map((_, i) => (
                <motion.button
                  key={i}
                  onClick={() => {
                    setActiveStep(i);
                    setCompletedSteps((c) => [...new Set([...c, i])]);
                  }}
                  animate={{
                    width: activeStep === i ? 28 : 10,
                    backgroundColor: activeStep === i ? '#0B1957' : '#CBD5E1'
                  }}
                  className="h-2.5 rounded-full"
                  transition={{ type: 'spring', stiffness: 300 }}
                />
              ))}
            </div>
          </motion.div>

          {/* Right: Detail Panel (2 columns on desktop, spans 2) */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="md:col-span-2 bg-background/80 border border-border rounded-3xl p-6 md:p-8 backdrop-blur-sm shadow-xl grid md:grid-cols-2 gap-8"
            >
              {/* Left: Step content */}
              <div>
                <span className="text-6xl md:text-7xl font-black text-primary/10 leading-none">{steps[activeStep].step}</span>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${steps[activeStep].color} flex items-center justify-center shadow-lg -mt-4 mb-4 text-white`}>
                  {steps[activeStep].icon}
                </div>
                <h3 className="text-2xl font-bold text-foreground mb-2">{steps[activeStep].title}</h3>
                <p className="text-muted-foreground mb-4 text-sm md:text-base">{steps[activeStep].description}</p>
                <ul className="space-y-2">
                  {steps[activeStep].bullets.map((bullet, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Right: Inline mock UI */}
              <div className="bg-background rounded-2xl border border-border p-4 flex items-center justify-center min-h-[250px]">
                {steps[activeStep].mockUI}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress indicator dots below */}
        <motion.div className="flex justify-center gap-2 mb-12" variants={stepBubbleVariants} custom={3}>
          {steps.map((_, i) => (
            <motion.button
              key={i}
              onClick={() => setActiveStep(i)}
              animate={{
                width: activeStep === i ? 28 : 10,
                backgroundColor: activeStep === i ? '#0B1957' : '#CBD5E1'
              }}
              className="h-2.5 rounded-full"
              transition={{ type: 'spring', stiffness: 300 }}
            />
          ))}
        </motion.div>

        {/* CTA */}
        <motion.div className="text-center" variants={stepBubbleVariants} custom={4}>
          <p className="text-muted-foreground mb-6 text-lg">
            Ready to automate your sales process?
          </p>
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(11, 25, 87, 0.3)' }}
            whileTap={{ scale: 0.95 }}
            className="px-10 py-4 bg-primary text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-shadow"
          >
            Start Free Trial
          </motion.button>
        </motion.div>
      </div>
    </motion.section>
  );
}
