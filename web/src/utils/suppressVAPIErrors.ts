/**
 * Global Error Handler for VAPI
 * Temporarily suppress VAPI routing errors
 */

// Suppress VAPI-related console errors
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  const message = args.join(' ');
  
  // Suppress VAPI routing errors
  if (
    message.includes('Agent is not configured for VAPI routing') ||
    message.includes('VAPI') ||
    message.includes('voice agent') ||
    message.includes('voice-agent')
  ) {
    // Silently ignore VAPI errors when disabled
    if (process.env.NEXT_PUBLIC_DISABLE_VAPI === 'true') {
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
      // Prevent the error from showing in console
      event.preventDefault();
      console.warn('[VAPI] VAPI feature is temporarily disabled');
    }
  });

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (
      event.reason?.message?.includes('Agent is not configured for VAPI routing') ||
      event.reason?.message?.includes('VAPI')
    ) {
      // Prevent the error from showing in console
      event.preventDefault();
      console.warn('[VAPI] VAPI feature is temporarily disabled');
    }
  });
}

export {};