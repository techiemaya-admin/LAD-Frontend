'use client';
import React from 'react';
import { cn } from '@/lib/utils';

interface PremiumGlossyCardProps {
  children: React.ReactNode;
  selected?: boolean;
  glowIntensity?: 'low' | 'medium' | 'high';
  className?: string;
  onClick?: () => void;
}

const glowClasses = {
  low: 'shadow-[0_20px_60px_0_rgba(0,0,0,0.5),0_0_40px_rgba(124,58,237,0.1)]',
  medium: 'shadow-[0_20px_60px_0_rgba(0,0,0,0.5),0_0_60px_rgba(124,58,237,0.15)]',
  high: 'shadow-[0_20px_60px_0_rgba(0,0,0,0.5),0_0_80px_rgba(124,58,237,0.2)]',
};

export const PremiumGlossyCard: React.FC<PremiumGlossyCardProps> = ({ 
  children, 
  selected = false, 
  glowIntensity = 'high',
  className,
  ...props 
}) => {
  return (
    <div 
      className={cn(
        'relative rounded-3xl p-8 transition-all duration-500 overflow-hidden cursor-pointer',
        'bg-gradient-to-br from-[rgba(10,14,39,0.95)] via-[rgba(20,27,45,0.95)] to-[rgba(10,14,39,0.95)]',
        'backdrop-blur-[30px] backdrop-saturate-[200%]',
        'shadow-[0_20px_60px_0_rgba(0,0,0,0.5),0_0_0_1px_rgba(255,255,255,0.05)_inset,0_1px_0_0_rgba(255,255,255,0.1)_inset]',
        selected ? 'border-2 border-cyan-400/60 shadow-[0_0_40px_rgba(0,234,255,0.3)]' : 'border border-white/12',
        glowClasses[glowIntensity],
        // Animated gradient border (before pseudo-element)
        'before:content-[""] before:absolute before:inset-[-2px] before:rounded-3xl before:p-0.5',
        'before:bg-gradient-to-br before:from-cyan-400 before:via-purple-600 before:via-pink-500 before:to-cyan-400',
        'before:bg-[length:400%_400%] before:animate-[gradient-border-flow_4s_ease_infinite]',
        'before:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] before:[mask-composite:exclude]',
        'before:z-0 before:transition-opacity before:duration-500',
        selected ? 'before:opacity-80' : 'before:opacity-0',
        // Ambient glow ring (after pseudo-element)
        'after:content-[""] after:absolute after:inset-[-4px] after:rounded-3xl after:z-[-1]',
        'after:bg-[radial-gradient(circle_at_50%_50%,rgba(0,234,255,0.15),rgba(124,58,237,0.1),transparent_70%)]',
        'after:opacity-60 after:blur-[20px] after:animate-[glow-pulse_3s_ease-in-out_infinite]',
        // Hover states
        'hover:-translate-y-2 hover:scale-[1.02]',
        'hover:shadow-[0_30px_80px_0_rgba(0,234,255,0.4),0_0_60px_rgba(0,234,255,0.5),0_0_100px_rgba(124,58,237,0.3)]',
        'hover:border-cyan-400/80 hover:before:opacity-100 hover:after:opacity-100 hover:after:blur-[30px]',
        className
      )}
      {...props}
    >
      <div className="relative z-[2] w-full h-full">
        {children}
      </div>
    </div>
  );
};
