"use client";

import { motion } from "framer-motion";
import {
  Linkedin,
  MessageCircle,
  Mail,
  Instagram,
  ArrowRight,
  Zap,
  Clock,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useTheme } from "@/contexts/ThemeContext";

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.2,
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      delay: custom * 0.1,
      stiffness: 100,
      damping: 20,
    },
  }),
};

const cardVariants = {
  hidden: { opacity: 0, x: -50, rotateZ: -5 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    x: 0,
    rotateZ: 0,
    transition: {
      type: "spring",
      delay: custom * 0.15,
      stiffness: 100,
      damping: 20,
    },
  }),
};

const rightCardVariants = {
  hidden: { opacity: 0, x: 50, rotateZ: 5 },
  visible: (custom: number = 0) => ({
    opacity: 1,
    x: 0,
    rotateZ: 0,
    transition: {
      type: "spring",
      delay: custom * 0.15,
      stiffness: 100,
      damping: 20,
    },
  }),
};

const characterVariants = {
  hidden: { opacity: 0, x: 100, rotateY: -10, scale: 0.8 },
  visible: {
    opacity: 1,
    x: 0,
    rotateY: 0,
    scale: 1,
    transition: {
      type: "spring",
      delay: 0.3,
      stiffness: 150,
      damping: 25,
    },
  },
};

// Floating Particles Component - Social Media Icons
interface FloatingParticle {
  id: number;
  icon: React.ReactNode;
  bgColor: string;
  delay: number;
  duration: number;
  x: number;
  y: number;
}

const FloatingParticles = () => {
  const particles: FloatingParticle[] = [
    {
      id: 1,
      icon: <Linkedin className="w-3 h-3 text-white" />,
      bgColor: "bg-blue-600",
      delay: 0,
      duration: 6,
      x: 15,
      y: 25,
    },
    {
      id: 2,
      icon: <MessageCircle className="w-3 h-3 text-white" />,
      bgColor: "bg-green-500",
      delay: 0.5,
      duration: 7,
      x: 75,
      y: 15,
    },
    {
      id: 3,
      icon: <MessageCircle className="w-3 h-3 text-white" />,
      bgColor: "bg-emerald-500",
      delay: 1,
      duration: 8,
      x: 45,
      y: 70,
    },
    {
      id: 4,
      icon: <Instagram className="w-3 h-3 text-white" />,
      bgColor: "bg-pink-500",
      delay: 1.5,
      duration: 6.5,
      x: 85,
      y: 55,
    },
    {
      id: 5,
      icon: <Mail className="w-3 h-3 text-white" />,
      bgColor: "bg-red-500",
      delay: 2,
      duration: 7.5,
      x: 25,
      y: 75,
    },
    {
      id: 6,
      icon: <Linkedin className="w-3 h-3 text-white" />,
      bgColor: "bg-blue-500",
      delay: 0.3,
      duration: 6.8,
      x: 80,
      y: 40,
    },
  ];

  return (
    <>
      {particles.map((particle) => (
        <motion.div
          key={particle.id}
          className="absolute pointer-events-none z-20"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
          }}
          animate={{
            y: [0, -25, 0],
            opacity: [0.6, 1, 0.6],
          }}
          transition={{
            duration: particle.duration,
            delay: particle.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className={`${particle.bgColor} p-1.5 rounded-lg flex items-center justify-center`}>
            {particle.icon}
          </div>
        </motion.div>
      ))}
    </>
  );
};

// Info Card Component
const InfoCard = ({
  icon,
  title,
  description,
  color,
  custom,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  custom: number;
}) => (
  <motion.div
    custom={custom}
    variants={cardVariants}
    initial="hidden"
    animate="visible"
    whileHover={{ y: -5, boxShadow: "0 20px 25px rgba(0,0,0,0.1)" }}
    className="bg-background border border-border rounded-2xl p-6 backdrop-blur-sm"
  >
    <div
      className={`${color} w-12 h-12 rounded-full flex items-center justify-center mb-4`}
    >
      {icon}
    </div>
    <h3 className="text-2xl font-bold text-foreground mb-2">{title}</h3>
    <p className="text-muted-foreground text-sm leading-relaxed">
      {description}
    </p>
  </motion.div>
);

// Character Section
const CharacterSection = () => {
  const { isDark } = useTheme();
  const videoSrc = isDark ? "/hero-character-dark.mp4" : "/hero-character.mp4";

  return (
    <motion.div
      variants={characterVariants}
      initial="hidden"
      animate="visible"
      className="relative w-full h-full flex items-center justify-center"
    >
      {/* Video */}
      <div>
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-70 h-180 object-cover relative z-10"
        >
          <source src={videoSrc} type="video/mp4" />
          Your browser does not support the video tag.
        </video>
      </div>

      {/* Floating Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <FloatingParticles />
      </div>
    </motion.div>
  );
};


// Main Hero Section
export default function NewHeroSection() {
  return (
    <motion.section
      className="relative pt-6 md:pt-6 lg:pt-6 overflow-hidden bg-white dark:bg-black"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >

      {/* Content Container */}
      <div className="container mx-auto px-4 relative z-10">
        {/* Header Section */}
        {/* <motion.div
          custom={0}
          variants={itemVariants}
          className="text-center mb-8 md:mb-12"
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight mb-4">
            Find Your Next Best{' '}
            <span className="text-primary">Customer—Now</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            AI prospecting that surfaces verified contacts and company insights in seconds.
          </p>
        </motion.div> */}

        {/* CTA Button */}
        {/* <motion.div
          custom={1}
          variants={itemVariants}
          className="flex justify-center mb-12 md:mb-16"
        >
          <Link href="/onboarding">
            <motion.button
              whileHover={{ scale: 1.05, boxShadow: '0 20px 40px rgba(11, 25, 87, 0.3)' }}
              whileTap={{ scale: 0.95 }}
              animate={{
                boxShadow: [
                  '0 10px 20px rgba(11, 25, 87, 0.1)',
                  '0 15px 30px rgba(11, 25, 87, 0.2)',
                  '0 10px 20px rgba(11, 25, 87, 0.1)',
                ],
              }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              className="px-8 py-4 bg-primary text-primary-foreground rounded-full font-semibold flex items-center gap-2 hover:gap-3 transition-all shadow-lg"
            >
              Start Free Today
              <ArrowRight className="w-5 h-5" />
            </motion.button>
          </Link>
        </motion.div> */}

        {/* Main Content Grid - Responsive */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 lg:gap-10">
          {/* Left Section - Hero Content */}
          <motion.div
            custom={1}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col justify-center order-1 md:order-1"
          >
            {/* Main Heading */}
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-3 leading-tight">
              Meet your AI sales co-pilot
            </h2>

            {/* Description */}
            <p className="text-muted-foreground mb-6 leading-relaxed">
              Automatically engage leads on LinkedIn, email, WhatsApp, and voice calls. More outreach, more conversations, more closed deals.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Link href="/onboarding">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold flex items-center gap-2 hover:shadow-lg transition-shadow"
                >
                  Get Started
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              </Link>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-3 border border-border bg-background text-foreground rounded-lg font-semibold hover:bg-background/80 transition-colors"
              >
                Watch Demo
              </motion.button>
            </div>

            {/* Stats */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-bold text-foreground">10x</p>
                  <p className="text-sm text-muted-foreground">Faster Closures</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Target className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-bold text-foreground">95%</p>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-primary flex-shrink-0" />
                <div>
                  <p className="font-bold text-foreground">24/7</p>
                  <p className="text-sm text-muted-foreground">AI Availability</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Right Section - Character Video */}
          <motion.div
            variants={characterVariants}
            initial="hidden"
            animate="visible"
            className="order-2 md:order-2 md:flex md:items-center"
          >
            <CharacterSection />
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
