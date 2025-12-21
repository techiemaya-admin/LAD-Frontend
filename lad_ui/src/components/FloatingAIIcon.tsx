'use client';

import React from 'react';
import { Box, styled } from '@mui/material';
import { SmartToy } from '@mui/icons-material';

interface FloatingAIIconProps {
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  onClick?: () => void;
}

const FloatingContainer = styled(Box)<{ position?: string }>(({ position = 'bottom-right' }) => {
  const positions = {
    'bottom-right': {
      bottom: '120px',
      right: '24px',
    },
    'bottom-left': {
      bottom: '120px',
      left: '24px',
    },
    'top-right': {
      top: '120px',
      right: '24px',
    },
    'top-left': {
      top: '120px',
      left: '24px',
    },
  };
  
  return {
    position: 'fixed',
    ...positions[position as keyof typeof positions],
    zIndex: 1000,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };
});

const IconWrapper = styled(Box)({
  position: 'relative',
  width: '64px',
  height: '64px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  animation: 'float 3s ease-in-out infinite',
  
  '@keyframes float': {
    '0%, 100%': {
      transform: 'translateY(0px)',
    },
    '50%': {
      transform: 'translateY(-12px)',
    },
  },
});

const IconCircle = styled(Box)({
  position: 'relative',
  width: '64px',
  height: '64px',
  borderRadius: '50%',
  background: '#ffffff',
  border: '2px solid #0b1957',
  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.3s ease',
  
  '&:hover': {
    transform: 'scale(1.05)',
    boxShadow: '0 4px 12px rgba(11, 25, 87, 0.2)',
    borderColor: '#1a2d7a',
  },
});

const IconContent = styled(Box)({
  position: 'relative',
  zIndex: 2,
  color: '#0b1957',
  transition: 'all 0.3s ease',
  
  [`${IconCircle}:hover &`]: {
    color: '#1a2d7a',
  },
});

export const FloatingAIIcon: React.FC<FloatingAIIconProps> = ({ 
  position = 'bottom-right',
  onClick 
}) => {
  return (
    <FloatingContainer position={position} onClick={onClick}>
      <IconWrapper>
        <IconCircle>
          <IconContent>
            <SmartToy sx={{ fontSize: 32 }} />
          </IconContent>
        </IconCircle>
      </IconWrapper>
    </FloatingContainer>
  );
};

