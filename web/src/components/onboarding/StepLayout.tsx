'use client';

import React from 'react';
import { Box, Typography, IconButton } from '@mui/material';
import { ArrowLeft } from 'lucide-react';

interface StepLayoutProps {
  currentStep: number;
  totalSteps: number;
  stepTitle: string;
  onBack: () => void;
  children: React.ReactNode;
  showProgress?: boolean;
  onStepClick?: (step: number) => void;
}

export default function StepLayout({
  currentStep,
  totalSteps,
  stepTitle,
  onBack,
  children,
  showProgress = true,
  onStepClick,
}: StepLayoutProps) {
  return (
    <Box
      sx={{
        height: '100%',
        maxHeight: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: '#FFFFFF',
        overflow: 'hidden',
      }}
    >
      {/* Header with Back Navigation */}
      <Box
        sx={{
          px: 4,
          py: 3,
          borderBottom: '1px solid #E2E8F0',
          bgcolor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          flexShrink: 0,
        }}
      >
        <IconButton
          onClick={onBack}
          sx={{
            p: 1,
            '&:hover': { bgcolor: '#F1F5F9' },
            transition: 'all 0.2s',
          }}
        >
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </IconButton>
        
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 2 }}>
          {showProgress && (
            <Typography
              variant="caption"
              sx={{
                color: '#64748B',
                fontWeight: 500,
                fontSize: '13px',
                px: 1.5,
                py: 0.5,
                bgcolor: '#F8F9FA',
                borderRadius: '6px',
              }}
            >
              Step {currentStep} of {totalSteps}
            </Typography>
          )}
          
          <Typography
            variant="h6"
            sx={{
              fontWeight: 600,
              fontSize: '18px',
              color: '#1E293B',
            }}
          >
            {stepTitle}
          </Typography>
        </Box>
      </Box>

      {/* Progress Dots */}
      {showProgress && (
        <Box
          sx={{
            px: 4,
            py: 2,
            borderBottom: '1px solid #F1F5F9',
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexShrink: 0,
          }}
        >
          {Array.from({ length: totalSteps }).map((_, index) => {
            const stepNum = index + 1;
            const isActive = stepNum === currentStep;
            const isCompleted = stepNum < currentStep;
            const isClickable = onStepClick && (isCompleted || stepNum === currentStep);
            
            return (
              <Box
                key={stepNum}
                onClick={() => isClickable && onStepClick(stepNum)}
                sx={{
                  flex: 1,
                  height: '3px',
                  borderRadius: '2px',
                  bgcolor: isActive || isCompleted ? '#6366F1' : '#E2E8F0',
                  position: 'relative',
                  transition: 'all 0.3s ease',
                  cursor: isClickable ? 'pointer' : 'default',
                  '&:hover': isClickable ? {
                    height: '4px',
                    transform: 'translateY(-0.5px)',
                  } : {},
                  '&::after': isActive ? {
                    content: '""',
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    height: '100%',
                    width: '100%',
                    bgcolor: '#6366F1',
                    borderRadius: '2px',
                    animation: 'pulse 2s ease-in-out infinite',
                  } : {},
                  '@keyframes pulse': {
                    '0%, 100%': { opacity: 1 },
                    '50%': { opacity: 0.6 },
                  },
                }}
              />
            );
          })}
        </Box>
      )}

      {/* Content Area */}
      <Box
        sx={{
          flex: '1 1 auto',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          px: 4,
          py: 4,
          position: 'relative',
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: '#F1F5F9',
            borderRadius: '4px',
          },
          '&::-webkit-scrollbar-thumb': {
            background: '#CBD5E1',
            borderRadius: '4px',
            '&:hover': {
              background: '#94A3B8',
            },
          },
        }}
      >
        {children}
      </Box>
    </Box>
  );
}

