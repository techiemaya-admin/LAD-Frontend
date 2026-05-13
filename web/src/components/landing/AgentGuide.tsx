'use client';

import { motion, useMotionValue, useScroll, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';

const AgentGuide = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentZone, setCurrentZone] = useState(0);
  const [isWalking, setIsWalking] = useState(false);
  const [scrollTimeout, setScrollTimeout] = useState<NodeJS.Timeout | null>(null);

  // Cursor parallax
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const mouseXSpring = useSpring(x, { stiffness: 150, damping: 15 });
  const mouseYSpring = useSpring(y, { stiffness: 150, damping: 15 });
  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['8deg', '-8deg']);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-8deg', '8deg']);

  // Scroll tracking
  const { scrollYProgress } = useScroll();

  // Map scroll progress to Y position (moves up as user scrolls down)
  const agentY = useTransform(scrollYProgress, [0, 1], [0, -100]);
  const agentYSpring = useSpring(agentY, { stiffness: 80, damping: 20 });

  // Speech bubble messages for each scroll zone
  const zones = [
    {
      threshold: 0,
      message: "👋 Welcome! I'm LAD — your AI sales agent. Let me show you around!",
    },
    {
      threshold: 0.12,
      message: "⚡ These AI features handle conversations, emails & calls automatically!",
    },
    {
      threshold: 0.28,
      message: "🚀 Getting started takes just 5 steps — no technical skills needed!",
    },
    {
      threshold: 0.44,
      message: "📈 Our clients see 10x more deals with zero extra headcount!",
    },
    {
      threshold: 0.6,
      message: "⭐ 500+ businesses already trust LAD to close deals for them!",
    },
    {
      threshold: 0.74,
      message: "💰 Find the plan that fits your team — credits never expire!",
    },
    {
      threshold: 0.9,
      message: "🎯 Ready? Let's automate your sales and close more deals together!",
    },
  ];

  // Update current zone based on scroll progress
  useEffect(() => {
    const unsubscribe = scrollYProgress.onChange((latest) => {
      const newZone = zones.findIndex(
        (zone, idx) =>
          latest >= zone.threshold &&
          (idx === zones.length - 1 || latest < zones[idx + 1].threshold)
      );
      if (newZone !== -1) {
        setCurrentZone(newZone);
      }

      // Trigger walking animation
      setIsWalking(true);
      if (scrollTimeout) clearTimeout(scrollTimeout);
      const timeout = setTimeout(() => setIsWalking(false), 300);
      setScrollTimeout(timeout);
    });

    return () => {
      unsubscribe();
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
  }, [scrollYProgress, scrollTimeout, zones]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const currentMessage = zones[currentZone].message;

  return (
    <motion.div
      ref={containerRef}
      className="fixed right-8 bottom-12 z-50 pointer-events-none"
      style={{ y: agentYSpring }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* 3D parallax wrapper */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
        }}
        className="relative"
      >
        {/* Walking bounce animation */}
        <motion.div
          animate={isWalking ? { y: [0, -12, 0] } : { y: 0 }}
          transition={isWalking ? { repeat: Infinity, duration: 0.5 } : { duration: 0.3 }}
          className="relative"
        >
          <Image
            src="/lad.png"
            alt="LAD Agent Guide"
            width={140}
            height={180}
            priority
            className="drop-shadow-2xl"
            style={{
              transform: 'translateZ(30px)',
            }}
          />
        </motion.div>

        {/* Speech bubble */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentZone}
            initial={{ opacity: 0, scale: 0.8, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -10 }}
            transition={{ duration: 0.3 }}
            className="absolute -top-32 -left-16 w-64 bg-white dark:bg-[#1a2f6b] rounded-2xl p-4 shadow-xl border border-gray-200 dark:border-gray-700"
            style={{
              transform: 'translateZ(50px)',
            }}
          >
            {/* Tail */}
            <div className="absolute -bottom-2 right-8 w-4 h-4 bg-white dark:bg-[#1a2f6b] rounded-full" />
            <div className="absolute -bottom-2 right-6 w-6 h-6 bg-white dark:bg-[#1a2f6b] transform rotate-45" />

            {/* Message text */}
            <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
              <TypedText text={currentMessage} key={currentZone} />
            </p>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
};

// Simple typing effect component
const TypedText = ({ text }: { text: string }) => {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    setDisplayText('');
    let index = 0;
    const interval = setInterval(() => {
      if (index < text.length) {
        setDisplayText(text.substring(0, index + 1));
        index++;
      } else {
        clearInterval(interval);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [text]);

  return <>{displayText}</>;
};

export default AgentGuide;
