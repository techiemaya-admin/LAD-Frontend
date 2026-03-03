'use client';
import React from 'react';
import { cn } from '@/lib/utils';

interface GlossyCardProps {
  children: React.ReactNode;
  animated?: boolean;
  glowIntensity?: 'low' | 'medium' | 'high';
  className?: string;
}

const glowOpacity = {
  low: 'opacity-60',
  medium: 'opacity-80',
  high: 'opacity-100',
};

export const GlossyCard: React.FC<GlossyCardProps> = ({ 
  children, 
  animated = true, 
  glowIntensity = 'medium',
  className,
  ...props 
}) => {
  return (
    <div 
      className={cn(
        'relative bg-white/5 backdrop-blur-[20px] backdrop-saturate-[180%] rounded-[20px]',
        'border border-white/18',
        'shadow-[0_8px_32px_0_rgba(0,0,0,0.37),inset_0_1px_1px_0_rgba(255,255,255,0.2),inset_0_-1px_1px_0_rgba(255,255,255,0.1)]',
        'p-6 transition-all duration-400 overflow-hidden',
        'before:content-[""] before:absolute before:top-0 before:left-0 before:right-0 before:h-0.5',
        'before:bg-gradient-to-r before:from-transparent before:via-cyan-400 before:via-purple-600 before:via-pink-500 before:to-transparent',
        glowOpacity[glowIntensity],
        animated && 'before:animate-[gradient-border_3s_ease_infinite]',
        'after:content-[""] after:absolute after:inset-0 after:rounded-[20px] after:p-0.5',
        'after:bg-gradient-to-br after:from-cyan-400 after:via-purple-600 after:to-pink-500',
        animated && 'after:bg-[length:300%_300%] after:animate-[gradient-rotate_4s_linear_infinite]',
        'after:opacity-0 after:transition-opacity after:duration-400 after:pointer-events-none',
        'after:[mask:linear-gradient(#fff_0_0)_content-box,linear-gradient(#fff_0_0)] after:[mask-composite:exclude]',
        'hover:-translate-y-2 hover:scale-[1.02]',
        'hover:shadow-[0_20px_60px_0_rgba(0,234,255,0.3),0_0_40px_0_rgba(124,58,237,0.2),inset_0_1px_1px_0_rgba(255,255,255,0.3),inset_0_-1px_1px_0_rgba(255,255,255,0.2)]',
        'hover:border-cyan-400/50 hover:after:opacity-100 hover:before:opacity-100 hover:before:h-[3px]',
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
