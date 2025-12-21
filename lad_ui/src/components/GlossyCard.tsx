'use client';

import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { styled } from '@mui/material/styles';

interface GlossyCardProps extends BoxProps {
  children: React.ReactNode;
  animated?: boolean;
  glowIntensity?: 'low' | 'medium' | 'high';
}

const GlossyCardContainer = styled(Box)<{ animated?: boolean; glowIntensity?: string }>(({ animated = true, glowIntensity = 'medium' }) => ({
  position: 'relative',
  background: 'rgba(255, 255, 255, 0.05)',
  backdropFilter: 'blur(20px) saturate(180%)',
  WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  borderRadius: '20px',
  border: '1px solid rgba(255, 255, 255, 0.18)',
  boxShadow: `
    0 8px 32px 0 rgba(0, 0, 0, 0.37),
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.2),
    inset 0 -1px 1px 0 rgba(255, 255, 255, 0.1)
  `,
  padding: '24px',
  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
  overflow: 'hidden',
  
  '&::before': {
    content: '""',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '2px',
    background: animated ? 'linear-gradient(90deg, transparent, #00eaff, #7c3aed, #ff00e0, transparent)' : 'linear-gradient(90deg, #00eaff, #7c3aed, #ff00e0)',
    opacity: glowIntensity === 'high' ? 1 : glowIntensity === 'medium' ? 0.8 : 0.6,
    animation: animated ? 'gradient-border 3s ease infinite' : 'none',
    zIndex: 1,
  },
  
  '&::after': {
    content: '""',
    position: 'absolute',
    inset: 0,
    borderRadius: '20px',
    padding: '2px',
    background: animated 
      ? 'linear-gradient(135deg, #00eaff, #7c3aed, #ff00e0, #00eaff)'
      : 'linear-gradient(135deg, #00eaff, #7c3aed, #ff00e0)',
    backgroundSize: animated ? '300% 300%' : '100% 100%',
    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
    WebkitMaskComposite: 'xor',
    maskComposite: 'exclude',
    opacity: 0,
    transition: 'opacity 0.4s ease',
    animation: animated ? 'gradient-rotate 4s linear infinite' : 'none',
    pointerEvents: 'none',
  },
  
  '&:hover': {
    transform: 'translateY(-8px) scale(1.02)',
    boxShadow: `
      0 20px 60px 0 rgba(0, 234, 255, 0.3),
      0 0 40px 0 rgba(124, 58, 237, 0.2),
      inset 0 1px 1px 0 rgba(255, 255, 255, 0.3),
      inset 0 -1px 1px 0 rgba(255, 255, 255, 0.2)
    `,
    borderColor: 'rgba(0, 234, 255, 0.5)',
    
    '&::after': {
      opacity: 1,
    },
    
    '&::before': {
      opacity: 1,
      height: '3px',
    },
  },
  
  '@keyframes gradient-border': {
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
  
  '@keyframes gradient-rotate': {
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
}));

const GlossyContent = styled(Box)({
  position: 'relative',
  zIndex: 2,
  width: '100%',
  height: '100%',
});

export const GlossyCard: React.FC<GlossyCardProps> = ({ 
  children, 
  animated = true, 
  glowIntensity = 'medium',
  ...props 
}) => {
  return (
    <GlossyCardContainer animated={animated} glowIntensity={glowIntensity} {...props}>
      <GlossyContent>
        {children}
      </GlossyContent>
    </GlossyCardContainer>
  );
};

