'use client';
import React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PremiumGlowButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'gradient';
  glowColor?: string;
  children: React.ReactNode;
}

const variantClasses = {
  gradient: 'bg-gradient-to-r from-cyan-400 via-purple-600 to-pink-500 bg-[length:200%_200%] text-white border-none shadow-[0_8px_32px_rgba(0,234,255,0.4),0_0_30px_rgba(124,58,237,0.3),inset_0_1px_0_rgba(255,255,255,0.2)] hover:bg-gradient-to-r hover:from-pink-500 hover:via-purple-600 hover:to-cyan-400 hover:shadow-[0_12px_40px_rgba(255,0,224,0.5),0_0_50px_rgba(124,58,237,0.4),inset_0_1px_0_rgba(255,255,255,0.3)]',
  primary: 'bg-cyan-400/15 backdrop-blur-[10px] border border-cyan-400/40 text-cyan-400 shadow-[0_8px_32px_rgba(0,234,255,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-cyan-400/25 hover:border-cyan-400/60 hover:shadow-[0_12px_40px_rgba(0,234,255,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]',
  secondary: 'bg-purple-600/15 backdrop-blur-[10px] border border-purple-600/40 text-purple-400 shadow-[0_8px_32px_rgba(124,58,237,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] hover:bg-purple-600/25 hover:border-purple-600/60 hover:shadow-[0_12px_40px_rgba(124,58,237,0.5),inset_0_1px_0_rgba(255,255,255,0.2)]',
};

export const PremiumGlowButton: React.FC<PremiumGlowButtonProps> = ({ 
  variant = 'gradient',
  glowColor,
  children,
  className,
  ...props 
}) => {
  return (
    <Button
      className={cn(
        'rounded-2xl px-8 py-3.5 text-[0.95rem] font-semibold normal-case tracking-wide relative overflow-hidden',
        'transition-all duration-400 hover:-translate-y-1 active:-translate-y-0.5',
        'text-shadow-[0_0_20px_rgba(255,255,255,0.5)]',
        'before:content-[""] before:absolute before:top-0 before:-left-full before:w-full before:h-full',
        'before:bg-gradient-to-r before:from-transparent before:via-white/30 before:to-transparent',
        'before:transition-[left] before:duration-500 hover:before:left-full',
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </Button>
  );
};
