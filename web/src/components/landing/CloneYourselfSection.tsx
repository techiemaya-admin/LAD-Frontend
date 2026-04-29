"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Copy, MessageSquare, Calendar, Users } from "lucide-react";

const steps = [
  {
    icon: Copy,
    title: "Train Your Clone",
    description:
      "Feed your agent your pitch, objection handling, and brand voice. It learns exactly how you communicate.",
  },
  {
    icon: MessageSquare,
    title: "Clone Handles Conversations",
    description:
      "Your AI twin reaches out, warms up leads, and holds full conversations — sounding just like you.",
  },
  {
    icon: Calendar,
    title: "Appointments Land in Your Calendar",
    description:
      "When a lead is ready, your clone books the meeting. You show up only for the close.",
  },
  {
    icon: Users,
    title: "Scale Without Hiring",
    description:
      "Run hundreds of simultaneous conversations across LinkedIn, WhatsApp, and email without extra headcount.",
  },
];

export default function CloneYourselfSection() {
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
      transition: { delayChildren: 0.2, staggerChildren: 0.15 },
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
      className="relative py-20 md:py-28 overflow-hidden bg-gray-50 dark:bg-neutral-950"
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
        <div className="absolute top-1/4 right-1/3 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-blue-500/5 rounded-full blur-3xl" />
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
            className="inline-block text-sm font-semibold tracking-widest uppercase text-purple-500 mb-4"
          >
            Your Digital Twin
          </motion.span>
          <h2 className="text-4xl md:text-6xl font-black text-primary dark:text-white mb-6 leading-tight">
            Clone Yourself
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Create an AI version of you that prospects, converses, and books — freeing you to focus
            on what only you can do.
          </p>
        </motion.div>

        {/* Steps */}
        <motion.div
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto"
        >
          {steps.map(({ icon: Icon, title, description }, index) => (
            <motion.div
              key={title}
              variants={itemVariants}
              className="flex gap-5 p-6 rounded-2xl border border-border bg-card hover:shadow-lg transition-shadow"
            >
              <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center">
                <Icon className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-bold text-purple-500">0{index + 1}</span>
                  <h3 className="text-base font-bold text-primary dark:text-white">{title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </motion.section>
  );
}
