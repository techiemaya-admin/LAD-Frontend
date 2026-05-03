"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

export default function MRLadsSection() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  // Parallax effect for background blobs
  const blobY = useTransform(scrollYProgress, [0, 1], [100, -100]);
  const textY = useTransform(scrollYProgress, [0, 1], [50, -50]);
  const contentY = useTransform(scrollYProgress, [0, 1], [30, -30]);
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
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 100,
        damping: 20,
      },
    },
  };

  return (
    <motion.section
      ref={containerRef}
      className="relative py-16 md:py-20 overflow-hidden bg-white dark:bg-[#000724]"
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={containerVariants}
    >
      {/* Background Gradient Blobs - Parallax */}
      <motion.div className="absolute inset-0 pointer-events-none overflow-hidden" style={{ y: blobY }}>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/3 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/2 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-500/2 rounded-full blur-3xl" />
      </motion.div>

      <div className="container mx-auto px-4 relative z-10">
        {/* Main Text - Parallax */}
        <motion.div
          variants={itemVariants}
          className="text-center mb-12"
          style={{ y: textY }}
        >
          <h1
            className="font-black mb-8 text-primary dark:text-white whitespace-nowrap"
            style={{
              fontSize: "clamp(17rem, 10vw, 12rem)",
              lineHeight: 1,
              letterSpacing: "-0.03em",
            }}
          >
            Mr LADS
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed font-medium">
            24/7 auto-connect with your dream leads, start conversations, build relationships and create interest and book appointments for your services - assisted by AI.
          </p>
        </motion.div>

        {/* Stats Row - Parallax */}
        <motion.div
          variants={itemVariants}
          className="flex flex-col md:flex-row justify-center items-center gap-8 md:gap-16 mt-16"
          style={{ y: contentY }}
        >
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-foreground">12,000+</p>
            <p className="text-sm md:text-base text-muted-foreground mt-2">Teams using our software</p>
          </div>
          <div className="hidden md:block w-px h-16 bg-border" />
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-foreground">10x</p>
            <p className="text-sm md:text-base text-muted-foreground mt-2">Faster deal closures</p>
          </div>
          <div className="hidden md:block w-px h-16 bg-border" />
          <div className="text-center">
            <p className="text-3xl md:text-4xl font-bold text-foreground">95%</p>
            <p className="text-sm md:text-base text-muted-foreground mt-2">Success rate</p>
          </div>
        </motion.div>

        {/* Company Logos Section - Parallax */}
        <motion.div
          variants={itemVariants}
          className="mt-20"
          style={{ y: contentY }}
        >
          <p className="text-center text-muted-foreground mb-12 text-sm">
            More than 12,000 teams use our software and close deals with companies like:
          </p>
        </motion.div>
      </div>
    </motion.section>
  );
}
