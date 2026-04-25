"use client";

import React, { useRef } from "react";
import { cn } from "@/lib/utils";

interface CometCardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * CometCard — wrapper that shows a sweeping comet/shimmer border on hover.
 * Drop-in replacement for any card container; adds no layout of its own.
 */
export function CometCard({ children, className }: CometCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    card.style.setProperty("--comet-x", `${x}%`);
    card.style.setProperty("--comet-y", `${y}%`);
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      className={cn("relative group/comet", className)}
      style={
        {
          "--comet-x": "50%",
          "--comet-y": "50%",
        } as React.CSSProperties
      }
    >
      {/* Comet glow that follows the cursor */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 rounded-3xl opacity-0 transition-opacity duration-300",
          "group-hover/comet:opacity-100",
          // Radial gradient centred on cursor position
          "bg-[radial-gradient(circle_200px_at_var(--comet-x)_var(--comet-y),hsl(var(--primary)/0.18),transparent_70%)]"
        )}
      />
      {children}
    </div>
  );
}
