'use client';

import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';
import {
  Search,
  Link2,
  MessageSquare,
  Phone,
  MessageCircle,
  Trophy,
  Check,
} from 'lucide-react';

interface WorkflowStep {
  id: number;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.2,
      staggerChildren: 0.08,
    },
  },
};

const stepVariants = {
  hidden: { opacity: 0, scale: 0.5, y: 20 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      delay: custom * 0.08,
      stiffness: 200,
      damping: 25,
    },
  }),
};

const lineVariants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      duration: 2.5,
      ease: 'easeInOut',
      delay: 0.3,
    },
  },
};

const CustomerJourneyWorkflow = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  const steps: WorkflowStep[] = [
    {
      id: 0,
      icon: <Search className="w-5 h-5 md:w-6 md:h-6 text-white" />,
      label: 'LinkedIn Visit',
      description: 'Find prospects',
      color: 'from-blue-500 to-blue-600',
    },
    {
      id: 1,
      icon: <Link2 className="w-5 h-5 md:w-6 md:h-6 text-white" />,
      label: 'Connect',
      description: 'Build network',
      color: 'from-green-500 to-emerald-500',
    },
    {
      id: 2,
      icon: <MessageSquare className="w-5 h-5 md:w-6 md:h-6 text-white" />,
      label: 'Message',
      description: 'Send pitch',
      color: 'from-purple-500 to-violet-500',
    },
    {
      id: 3,
      icon: <Phone className="w-5 h-5 md:w-6 md:h-6 text-white" />,
      label: 'Call',
      description: 'Have conversation',
      color: 'from-orange-500 to-amber-500',
    },
    {
      id: 4,
      icon: <MessageCircle className="w-5 h-5 md:w-6 md:h-6 text-white" />,
      label: 'Chat',
      description: 'Nurture relationship',
      color: 'from-cyan-500 to-blue-500',
    },
    {
      id: 5,
      icon: <Trophy className="w-5 h-5 md:w-6 md:h-6 text-white" />,
      label: 'Close Deal',
      description: 'Win customer',
      color: 'from-green-600 to-teal-600',
    },
  ];

  // Auto-progression effect
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
      setCompletedSteps((prev) => {
        const newCompleted = [...prev, activeStep];
        return [...new Set(newCompleted)].filter((s) => s !== activeStep + 1);
      });
    }, 4000);

    return () => clearInterval(timer);
  }, [steps.length, activeStep]);

  // Check mobile
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <motion.div
      className="w-full"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.3 }}
      variants={containerVariants}
    >
      {/* Desktop Layout - Horizontal */}
      {!isMobile && (
        <div className="hidden md:block">
          <div className="relative flex items-center justify-center gap-2 lg:gap-4 px-4">
            {/* SVG Progress Line */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ overflow: 'visible' }}
            >
              <motion.line
                x1="5%"
                y1="50%"
                x2="95%"
                y2="50%"
                stroke="url(#progressGradient)"
                strokeWidth="3"
                variants={lineVariants}
                initial="hidden"
                animate="visible"
              />
              <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
            </svg>

            {/* Steps */}
            {steps.map((step) => (
              <motion.div
                key={step.id}
                custom={step.id}
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                onClick={() => setActiveStep(step.id)}
                className="flex flex-col items-center gap-2 cursor-pointer relative z-10"
              >
                {/* Circle */}
                <motion.div
                  className={`w-12 h-12 lg:w-14 lg:h-14 rounded-full flex items-center justify-center
                             shadow-lg border-2 border-background dark:border-slate-800
                             bg-gradient-to-br ${step.color}
                             relative transition-all duration-300`}
                  whileHover={{ scale: 1.15 }}
                  animate={
                    activeStep === step.id
                      ? {
                          boxShadow: [
                            '0 0 0 0px rgba(11, 25, 87, 0.7)',
                            '0 0 0 12px rgba(11, 25, 87, 0)',
                          ],
                        }
                      : {}
                  }
                  transition={{
                    duration: 2,
                    repeat: activeStep === step.id ? Infinity : 0,
                    ease: 'easeInOut',
                  }}
                >
                  {step.icon}
                  {completedSteps.includes(step.id) && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-green-500/40 flex items-center justify-center"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Check className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                    </motion.div>
                  )}
                </motion.div>

                {/* Label */}
                <motion.div className="text-center">
                  <p className="text-xs lg:text-sm font-semibold text-foreground">
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Mobile Layout - Vertical */}
      {isMobile && (
        <div className="md:hidden">
          <div className="relative flex flex-col items-center gap-6 px-4">
            {/* SVG Vertical Line */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ overflow: 'visible' }}
            >
              <motion.line
                x1="50%"
                y1="5%"
                x2="50%"
                y2="95%"
                stroke="url(#progressGradientVertical)"
                strokeWidth="2"
                variants={lineVariants}
                initial="hidden"
                animate="visible"
              />
              <defs>
                <linearGradient id="progressGradientVertical" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="hsl(var(--primary))" />
                  <stop offset="100%" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
            </svg>

            {/* Steps */}
            {steps.map((step) => (
              <motion.div
                key={step.id}
                custom={step.id}
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                onClick={() => setActiveStep(step.id)}
                className="flex flex-col items-center gap-2 cursor-pointer relative z-10"
              >
                {/* Circle */}
                <motion.div
                  className={`w-10 h-10 rounded-full flex items-center justify-center
                             shadow-lg border-2 border-background dark:border-slate-800
                             bg-gradient-to-br ${step.color}
                             relative transition-all duration-300`}
                  whileHover={{ scale: 1.15 }}
                  animate={
                    activeStep === step.id
                      ? {
                          boxShadow: [
                            '0 0 0 0px rgba(11, 25, 87, 0.7)',
                            '0 0 0 10px rgba(11, 25, 87, 0)',
                          ],
                        }
                      : {}
                  }
                  transition={{
                    duration: 2,
                    repeat: activeStep === step.id ? Infinity : 0,
                    ease: 'easeInOut',
                  }}
                >
                  {step.icon}
                  {completedSteps.includes(step.id) && (
                    <motion.div
                      className="absolute inset-0 rounded-full bg-green-500/40 flex items-center justify-center"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Check className="w-4 h-4 text-white" />
                    </motion.div>
                  )}
                </motion.div>

                {/* Label */}
                <motion.div className="text-center">
                  <p className="text-xs font-semibold text-foreground">{step.label}</p>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default CustomerJourneyWorkflow;
