/**
 * Global Error Handler for VAPI - LAD Architecture Compliant
 * Temporarily suppress VAPI routing errors using centralized logging
 */

import { logger } from '@/lib/logger';

// Suppress VAPI-related console errors - LAD compliant approach
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ');
  
  // Suppress VAPI routing errors when disabled
  if (
    message.includes('Agent is not configured for VAPI routing') ||
    message.includes('VAPI') ||
    message.includes('voice agent') ||
    message.includes('voice-agent')
  ) {
    // Use centralized logger instead of console
    if (process.env.NEXT_PUBLIC_DISABLE_VAPI === 'true') {
      logger.debug('VAPI error suppressed (feature disabled)', { originalMessage: message });
      return;
    }
  }
  
  // Call original console.error for all other errors
  originalConsoleError.apply(console, args);
};

// Global error event listener for unhandled VAPI errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    if (
      event.error?.message?.includes('Agent is not configured for VAPI routing') ||
      event.error?.message?.includes('VAPI')
    ) {
      // Prevent the error from showing in console and use logger
      event.preventDefault();
      logger.warn('VAPI feature temporarily disabled', { error: event.error?.message });
    }
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason?.message?.includes('Agent is not configured for VAPI routing') ||
      event.reason?.message?.includes('VAPI')
    ) {
      // Prevent the error from showing in console and use logger
      event.preventDefault();
      logger.warn('VAPI feature temporarily disabled', { reason: event.reason?.message });
    }
  });
}

export {};