'use client';

import React from 'react';
import { Box, BoxProps, styled } from '@mui/material';

interface PremiumGlossyCardProps extends BoxProps {
  children: React.ReactNode;
  selected?: boolean;
  glowIntensity?: 'low' | 'medium' | 'high';
}

const PremiumCardContainer = styled(Box)<{ selected?: boolean; glowIntensity?: string }>(({ selected = false, glowIntensity = 'high' }) => ({
  position: 'relative',
  background: 'linear-gradient(135deg, rgba(10, 14, 39, 0.95) 0%, rgba(20, 27, 45, 0.95) 50%, rgba(10, 14, 39, 0.95) 100%)',
  backdropFilter: 'blur(30px) saturate(200%)',
  WebkitBackdropFilter: 'blur(30px) saturate(200%)',
  borderRadius: '24px',
  border: selected ? '2px solid' : '1px solid',
  borderColor: selected ? 'rgba(0, 234, 255, 0.6)' : 'rgba(255, 255, 255, 0.12)',
  boxShadow: `
    0 20px 60px 0 rgba(0, 0, 0, 0.5),
    0 0 0 1px rgba(255, 255, 255, 0.05) inset,
    0 1px 0 0 rgba(255, 255, 255, 0.1) inset,
    ${selected ? '0 0 40px rgba(0, 234, 255, 0.3),' : ''}
    ${glowIntensity === 'high' ? '0 0 80px rgba(124, 58, 237, 0.2)' : glowIntensity === 'medium' ? '0 0 60px rgba(124, 58, 237, 0.15)' : '0 0 40px rgba(124, 58, 237, 0.1)'}
  `,
  padding: '32px',
  transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
  overflow: 'hidden',
  cursor: 'pointer',
  
  // Animated gradient border
  '&::before': {
    content: '""',
    position: 'absolute',
    inset: '-2px',
    borderRadius: '24px',
    padding: '2px',
    background: 'linear-gradient(135deg, #00eaff, #7c3aed, #ff00e0, #00eaff)',
    backgroundSize: '400% 400%',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
    opacity: selected ? 0.8 : 0,
    animation: 'gradient-border-flow 4s ease infinite',
    zIndex: 0,
    transition: 'opacity 0.5s ease',
  },
  
  // Ambient glow ring
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: '-4px',
    borderRadius: '24px',
    background: 'radial-gradient(circle at 50% 50%, rgba(0, 234, 255, 0.15), rgba(124, 58, 237, 0.1), transparent 70%)',
    opacity: 0.6,
    filter: 'blur(20px)',
    zIndex: -1,
    animation: 'glow-pulse 3s ease-in-out infinite',
  },
  
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: `
      0 30px 80px 0 rgba(0, 234, 255, 0.4),
      0 0 0 1px rgba(255, 255, 255, 0.1) inset,
      0 2px 0 0 rgba(255, 255, 255, 0.15) inset,
      0 0 60px rgba(0, 234, 255, 0.5),
      0 0 100px rgba(124, 58, 237, 0.3)
    `,
    borderColor: 'rgba(0, 234, 255, 0.8)',
    
    '&::before': {
      opacity: 1,
    },
    
    '&::after': {
      opacity: 1,
      filter: 'blur(30px)',
    },
  },
  
  '@keyframes gradient-border-flow': {
    '0%': {
      backgroundPosition: '0% 50%',
    },
    '50%': {
      backgroundPosition: '100% 50%',
    },
    '100%': {
      backgroundPosition: '0% 50%',
    },
  },
  
  '@keyframes glow-pulse': {
    '0%, 100%': {
      opacity: 0.4,
      transform: 'scale(1)',
    },
    '50%': {
      opacity: 0.8,
      transform: 'scale(1.05)',
    },
  },
}));

const PremiumCardContent = styled(Box)({
  position: 'relative',
  zIndex: 2,
  width: '100%',
  height: '100%',
});

export const PremiumGlossyCard: React.FC<PremiumGlossyCardProps> = ({ 
  children, 
  selected = false, 
  glowIntensity = 'high',
  ...props 
}) => {
  return (
    <PremiumCardContainer selected={selected} glowIntensity={glowIntensity} {...props}>
      <PremiumCardContent>
        {children}
      </PremiumCardContent>
    </PremiumCardContainer>
  );
};

