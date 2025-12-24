import { keyframes } from '@mui/material/styles';

// Common theme-aligned animations
export const fadeIn = keyframes`
  from { 
    opacity: 0; 
    transform: translateY(8px); 
  }
  to { 
    opacity: 1; 
    transform: translateY(0); 
  }
`;

export const pulseAnimation = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
`;

export const rippleKeyframes = keyframes`
  0% { 
    transform: scale(.8); 
    opacity: 1; 
  }
  100% { 
    transform: scale(2.4); 
    opacity: 0; 
  }
`;

// Common theme values consistent with dashboard
export const commonTheme = {
  colors: {
    primary: '#3B82F6',
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    textPrimary: '#1E293B',
    textSecondary: '#64748B',
    backgroundPaper: '#FFFFFF',
    backgroundDefault: '#F8F9FE',
    successLight: '#DCFCE7',
    warningLight: '#FEF3C7',
    errorLight: '#FEE2E2',
    grey50: '#F8FAFC',
    grey100: '#F1F5F9',
    grey200: '#E2E8F0',
    grey300: '#CBD5E1',
    grey400: '#94A3B8',
    grey500: '#64748B',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    small: 4,
    medium: 8,
    large: 12,
    xl: 16,
  },
  shadows: {
    light: '0px 1px 2px rgba(0, 0, 0, 0.06)',
    medium: '0px 1px 3px rgba(0, 0, 0, 0.1)',
    strong: '0px 2px 4px rgba(0, 0, 0, 0.1)',
    elevated: '0px 4px 6px -1px rgba(0, 0, 0, 0.1)',
  },
  transitions: {
    fast: '0.2s ease-in-out',
    medium: '0.3s ease-in-out',
    slow: '0.4s ease-in-out',
  }
};

// Common styled system utilities following dashboard pattern
export const commonStyles = {
  // Card styles matching dashboard components
  card: {
    borderRadius: '12px',
    boxShadow: '0px 1px 3px rgba(0,0,0,0.1)',
    bgcolor: 'background.paper',
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-2px)',
      boxShadow: '0px 4px 6px -1px rgba(0, 0, 0, 0.1)',
    },
  },

  // Status chip styles
  statusChip: (status, theme) => ({
    height: '20px',
    m: 0,
    p: 0,
    minWidth: 0,
    bgcolor: getStatusColor(status, theme),
    color: 'white',
    '& .MuiChip-icon': {
      color: 'inherit',
      fontSize: { xs: '0.875rem', sm: '1rem' },
      m: 0,
      p: 0
    },
    '& .MuiChip-label': {
      px: 0.5,
      py: 0,
      fontSize: { xs: '0.7rem', sm: '0.75rem' },
      lineHeight: 1
    }
  }),

  // Badge styles with ripple effect
  priorityBadge: (priority, theme) => ({
    '& .MuiBadge-badge': {
      backgroundColor: getPriorityColor(priority, theme),
      color: theme.palette.common.white,
      '&::after': {
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        animation: `${rippleKeyframes} 1.2s infinite ease-in-out`,
        border: `1px solid ${theme.palette.common.white}`,
        content: '""',
      },
    },
  }),

  // Progress circle styles
  progressCircle: {
    position: 'relative',
    '& .MuiCircularProgress-circle': {
      strokeLinecap: 'round',
    },
  },

  // Dialog styles matching theme
  dialog: {
    '& .MuiDialog-paper': {
      borderRadius: '12px',
      boxShadow: '0px 10px 15px -3px rgba(0, 0, 0, 0.1)',
    },
    '& .MuiDialogTitle-root': {
      padding: '16px 24px',
    },
    '& .MuiDialogContent-root': {
      padding: '16px 24px',
    },
    '& .MuiDialogActions-root': {
      padding: '16px 24px',
    },
  },

  // Animation styles
  animated: {
    animation: `${fadeIn} 0.3s ease-out`,
  },

  // Hover styles
  hoverable: (isHovered) => ({
    transition: 'all 0.3s ease-in-out',
    '&:hover': {
      transform: 'translateY(-2px)',
    },
    animation: isHovered ? `${pulseAnimation} 2s infinite` : 'none',
  }),

  // Scrollbar styles
  customScrollbar: {
    '&::-webkit-scrollbar': {
      width: '4px',
    },
    '&::-webkit-scrollbar-track': {
      background: 'transparent',
    },
    '&::-webkit-scrollbar-thumb': {
      background: '#d1d5db',
      borderRadius: '2px',
      '&:hover': {
        background: '#9ca3af',
      },
    },
  },
};

// Utility functions for consistent styling
export const getStatusColor = (status, theme) => {
  const statusColors = {
    active: theme.palette.success.main,
    pending: theme.palette.warning.main,
    blocked: theme.palette.error.main,
    inactive: theme.palette.grey[500],
    new: theme.palette.info.main,
    completed: theme.palette.success.dark,
  };
  return statusColors[status?.toLowerCase()] || theme.palette.grey[500];
};

export const getPriorityColor = (priority, theme) => {
  const priorityColors = {
    high: theme.palette.error.main,
    medium: theme.palette.warning.main,
    low: theme.palette.success.main,
  };
  return priorityColors[priority?.toLowerCase()] || theme.palette.success.main;
};

export const getProbabilityColor = (probability, theme) => {
  if (probability >= 70) return theme.palette.success.main;
  if (probability >= 40) return theme.palette.warning.main;
  return theme.palette.error.main;
};
