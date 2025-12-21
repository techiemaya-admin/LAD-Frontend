'use client';

import React from 'react';
import { Button, ButtonProps, styled } from '@mui/material';

interface PremiumGlowButtonProps extends ButtonProps {
  variant?: 'primary' | 'secondary' | 'gradient';
  glowColor?: string;
}

const StyledPremiumButton = styled(Button)<{ buttonVariant?: string; glowColor?: string }>(({ buttonVariant = 'gradient', glowColor = '#00eaff' }) => {
  const variants = {
    gradient: {
      background: 'linear-gradient(135deg, #00eaff 0%, #7c3aed 50%, #ff00e0 100%)',
      backgroundSize: '200% 200%',
      color: '#ffffff',
      border: 'none',
      boxShadow: `0 8px 32px rgba(0, 234, 255, 0.4), 0 0 30px rgba(124, 58, 237, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
      '&:hover': {
        background: 'linear-gradient(135deg, #ff00e0 0%, #7c3aed 50%, #00eaff 100%)',
        backgroundSize: '200% 200%',
        boxShadow: `0 12px 40px rgba(255, 0, 224, 0.5), 0 0 50px rgba(124, 58, 237, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.3)`,
        animation: 'gradient-shift 2s ease infinite',
      },
    },
    primary: {
      background: 'rgba(0, 234, 255, 0.15)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(0, 234, 255, 0.4)',
      color: '#00eaff',
      boxShadow: `0 8px 32px rgba(0, 234, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
      '&:hover': {
        background: 'rgba(0, 234, 255, 0.25)',
        borderColor: 'rgba(0, 234, 255, 0.6)',
        boxShadow: `0 12px 40px rgba(0, 234, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
      },
    },
    secondary: {
      background: 'rgba(124, 58, 237, 0.15)',
      backdropFilter: 'blur(10px)',
      border: '1px solid rgba(124, 58, 237, 0.4)',
      color: '#9663f0',
      boxShadow: `0 8px 32px rgba(124, 58, 237, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)`,
      '&:hover': {
        background: 'rgba(124, 58, 237, 0.25)',
        borderColor: 'rgba(124, 58, 237, 0.6)',
        boxShadow: `0 12px 40px rgba(124, 58, 237, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.2)`,
      },
    },
  };
  
  const variantStyles = variants[buttonVariant as keyof typeof variants] || variants.gradient;
  
  return {
    ...variantStyles,
    borderRadius: '16px',
    padding: '14px 32px',
    fontSize: '0.95rem',
    fontWeight: 600,
    textTransform: 'none',
    letterSpacing: '0.5px',
    position: 'relative',
    overflow: 'hidden',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    textShadow: '0 0 20px rgba(255, 255, 255, 0.5)',
    
    '&::before': {
      content: '""',
      position: 'absolute',
      top: 0,
      left: '-100%',
      width: '100%',
      height: '100%',
      background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent)',
      transition: 'left 0.5s ease',
    },
    
    '&:hover::before': {
      left: '100%',
    },
    
    '&:hover': {
      transform: 'translateY(-3px)',
      ...variantStyles['&:hover'],
    },
    
    '&:active': {
      transform: 'translateY(-1px)',
    },
    
    '@keyframes gradient-shift': {
      '0%, 100%': {
        backgroundPosition: '0% 50%',
      },
      '50%': {
        backgroundPosition: '100% 50%',
      },
    },
  };
});

export const PremiumGlowButton: React.FC<PremiumGlowButtonProps> = ({ 
  variant = 'gradient',
  glowColor,
  children,
  ...props 
}) => {
  return (
    <StyledPremiumButton buttonVariant={variant} glowColor={glowColor} {...props}>
      {children}
    </StyledPremiumButton>
  );
};

