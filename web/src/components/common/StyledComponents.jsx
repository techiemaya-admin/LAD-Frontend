// Standard CSS animations (add these to your global CSS or use Tailwind animations)
// For fadeIn: use 'animate-[fadeIn]' with custom animation in tailwind.config.js
// For pulse: use 'animate-pulse' (built-in Tailwind)
// For ripple: use custom animation class

// CSS animations as strings for inline styles or CSS-in-JS
export const animations = `
  @keyframes fadeIn {
    from { 
      opacity: 0; 
      transform: translateY(8px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
  
  @keyframes pulseAnimation {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
  }
  
  @keyframes rippleKeyframes {
    0% { 
      transform: scale(0.8); 
      opacity: 1; 
    }
    100% { 
      transform: scale(2.4); 
      opacity: 0; 
    }
  }
`;

// Animation class names for use with className
export const animationClasses = {
  fadeIn: 'animate-[fadeIn_0.3s_ease-out]',
  pulse: 'animate-pulse', // Tailwind built-in
  ripple: 'animate-[rippleKeyframes_1.2s_infinite_ease-in-out]',
};
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
// Tailwind/CSS class utilities following dashboard pattern
export const commonStyles = {
  // Card styles matching dashboard components - use as className
  card: 'rounded-xl shadow-md bg-white transition-all duration-300 ease-in-out hover:-translate-y-0.5 hover:shadow-lg',
  
  // Status chip styles - returns className string
  statusChip: (status) => {
    const bgColor = getStatusColorClass(status);
    return `inline-flex items-center justify-center h-5 px-2 rounded text-white text-xs ${bgColor}`;
  },
  
  // Badge styles with ripple effect - returns className and style
  priorityBadge: (priority) => ({
    className: `relative inline-flex ${getPriorityColorClass(priority)}`,
    style: {
      // Ripple effect via pseudo-element (add via CSS or use custom class)
    }
  }),
  
  // Progress circle styles - use with custom progress components
  progressCircle: 'relative',
  
  // Dialog/Modal styles matching theme
  dialog: {
    paper: 'rounded-xl shadow-2xl',
    title: 'px-6 py-4',
    content: 'px-6 py-4',
    actions: 'px-6 py-4',
  },
  
  // Animation styles - use as className
  animated: animationClasses.fadeIn,
  
  // Hover styles - returns className based on state
  hoverable: (isHovered) => 
    `transition-all duration-300 ease-in-out hover:-translate-y-0.5 ${isHovered ? 'animate-pulse' : ''}`,
  
  // Scrollbar styles - add to global CSS
  customScrollbar: 'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent hover:scrollbar-thumb-gray-400',
};

// CSS string for custom scrollbar (add to global styles if not using Tailwind scrollbar plugin)
export const customScrollbarCSS = `
  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #d1d5db;
    border-radius: 2px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #9ca3af;
  }
`;
// Utility functions for consistent styling - returns hex colors
export const getStatusColor = (status) => {
  const statusColors = {
    active: commonTheme.colors.success,
    pending: commonTheme.colors.warning,
    blocked: commonTheme.colors.error,
    inactive: commonTheme.colors.grey500,
    new: commonTheme.colors.primary,
    completed: '#059669', // success dark
  };
  return statusColors[status?.toLowerCase()] || commonTheme.colors.grey500;
};

// Returns Tailwind classes for status colors
export const getStatusColorClass = (status) => {
  const statusClasses = {
    active: 'bg-green-500',
    pending: 'bg-yellow-500',
    blocked: 'bg-red-500',
    inactive: 'bg-gray-500',
    new: 'bg-blue-500',
    completed: 'bg-green-600',
  };
  return statusClasses[status?.toLowerCase()] || 'bg-gray-500';
};

export const getPriorityColor = (priority) => {
  const priorityColors = {
    high: commonTheme.colors.error,
    medium: commonTheme.colors.warning,
    low: commonTheme.colors.success,
  };
  return priorityColors[priority?.toLowerCase()] || commonTheme.colors.success;
};

// Returns Tailwind classes for priority colors
export const getPriorityColorClass = (priority) => {
  const priorityClasses = {
    high: 'bg-red-500',
    medium: 'bg-yellow-500',
    low: 'bg-green-500',
  };
  return priorityClasses[priority?.toLowerCase()] || 'bg-green-500';
};

export const getProbabilityColor = (probability) => {
  if (probability >= 70) return commonTheme.colors.success;
  if (probability >= 40) return commonTheme.colors.warning;
  return commonTheme.colors.error;
};

// Returns Tailwind classes for probability colors
export const getProbabilityColorClass = (probability) => {
  if (probability >= 70) return 'bg-green-500';
  if (probability >= 40) return 'bg-yellow-500';
  return 'bg-red-500';
};
