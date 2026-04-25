"use client";

import React, { useRef, useState } from "react";
import { useMotionValueEvent, useScroll, motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface StickyScrollItem {
  title: string;
  description: string;
  /** The visual panel shown on the right (desktop) / below (mobile) */
  content: React.ReactNode;
  [key: string]: unknown;
}

interface StickyScrollProps {
  content: StickyScrollItem[];
  contentClassName?: string;
}

export function StickyScroll({ content, contentClassName }: StickyScrollProps) {
  const [activeCard, setActiveCard] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const cardLength = content.length;

  useMotionValueEvent(scrollYProgress, "change", (latest) => {
    const cardsBreakpoints = content.map((_, index) => index / cardLength);
    const closestBreakpointIndex = cardsBreakpoints.reduce(
      (acc, breakpoint, index) => {
        const distance = Math.abs(latest - breakpoint);
        if (distance < Math.abs(latest - cardsBreakpoints[acc])) {
          return index;
        }
        return acc;
      },
      0
    );
    setActiveCard(closestBreakpointIndex);
  });

  const backgroundColors = [
    "var(--slate-900)",
    "var(--black)",
    "var(--neutral-900)",
  ];

  const gradients = [
    "linear-gradient(to bottom right, hsl(var(--primary)/0.3), hsl(221 83% 53%/0.3))",
    "linear-gradient(to bottom right, hsl(187 100% 42%/0.3), hsl(221 83% 53%/0.3))",
    "linear-gradient(to bottom right, hsl(271 91% 65%/0.3), hsl(330 81% 60%/0.3))",
    "linear-gradient(to bottom right, hsl(142 71% 45%/0.3), hsl(174 72% 56%/0.3))",
  ];

  return (
    <motion.div
      animate={{
        backgroundColor: backgroundColors[activeCard % backgroundColors.length],
      }}
      className="relative flex flex-col md:flex-row gap-10 rounded-2xl p-8 md:p-10"
      ref={ref}
    >
      {/* ── Left: scrolling text ─────────────────────────────── */}
      <div className="relative flex flex-col gap-0 md:w-1/2">
        {content.map((item, index) => (
          <div key={index} className="py-12 md:py-16 first:pt-0 last:pb-0">
            <motion.h3
              initial={{ opacity: 0 }}
              animate={{ opacity: activeCard === index ? 1 : 0.3 }}
              className="text-xl md:text-2xl font-bold text-foreground mb-4"
            >
              {item.title}
            </motion.h3>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: activeCard === index ? 1 : 0.3 }}
              className="text-sm md:text-base text-muted-foreground leading-relaxed max-w-sm"
            >
              {item.description}
            </motion.p>
          </div>
        ))}
        {/* spacer so the sticky panel has room to travel */}
        <div className="h-40" />
      </div>

      {/* ── Right: sticky visual panel ───────────────────────── */}
      <div className="hidden md:block md:w-1/2">
        <div className="sticky top-24">
          <motion.div
            animate={{
              background: gradients[activeCard % gradients.length],
            }}
            className={cn(
              "h-64 md:h-96 w-full overflow-hidden rounded-2xl",
              contentClassName
            )}
          >
            {content[activeCard]?.content}
          </motion.div>
        </div>
      </div>

      {/* ── Mobile: inline panels ────────────────────────────── */}
      <div className="md:hidden flex flex-col gap-6">
        {content.map((item, index) => (
          <div
            key={index}
            className={cn(
              "h-48 w-full overflow-hidden rounded-2xl",
              contentClassName
            )}
          >
            {item.content}
          </div>
        ))}
      </div>
    </motion.div>
  );
}
