"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Bot, Clock, Zap, TrendingUp } from "lucide-react";

const stats = [
  { icon: Clock, label: "Available", value: "24/7", description: "Non-stop outreach" },
  { icon: Bot, label: "AI Agents", value: "100%", description: "Fully automated" },
  { icon: Zap, label: "Response Time", value: "<1s", description: "Instant replies" },
  { icon: TrendingUp, label: "Lead Growth", value: "3x", description: "Pipeline increase" },
];

export default function HeroParallaxSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const blobY = useTransform(scrollYProgress, [0, 1], [80, -80]);
  const textY = useTransform(scrollYProgress, [0, 1], [40, -40]);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { delayChildren: 0.2, staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 20 },
    },
  };

  return (
    <motion.section
      ref={containerRef}
      className="relative py-20 md:py-28 overflow-hidden bg-white dark:bg-black"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      {/* Background blobs */}
      <motion.div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{ y: blobY }}
      >
        <div className="absolute top-1/3 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl" />
      </motion.div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Heading */}
        <motion.div
          variants={itemVariants}
          className="text-center mb-16"
          style={{ y: textY }}
        >
          <motion.span
            variants={itemVariants}
            className="inline-block text-sm font-semibold tracking-widest uppercase text-blue-500 mb-4"
          >
            Always On
          </motion.span>
          <h2 className="text-4xl md:text-6xl font-black text-primary dark:text-white mb-6 leading-tight">
            24/7 AI Sales
            <br />
            <span className="text-blue-500">Automation</span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            While you sleep, your AI agents are prospecting, qualifying, and booking appointments
            — around the clock, without breaks.
          </p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto"
        >
          {stats.map(({ icon: Icon, label, value, description }) => (
            <motion.div
              key={label}
              variants={itemVariants}
              className="flex flex-col items-center text-center p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                <Icon className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-3xl font-black text-primary dark:text-white mb-1">{value}</p>
              <p className="text-sm font-semibold text-foreground mb-1">{label}</p>
              <p className="text-xs text-muted-foreground">{description}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
