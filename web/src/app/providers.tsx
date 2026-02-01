"use client";
import React from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { StripeProvider } from '../contexts/StripeContext';
import { AuthProvider } from '../contexts/AuthContext';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// Create QueryClient outside component to ensure it's only created once
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Suppress Chrome extension message passing errors
if (typeof window !== 'undefined') {
  // Handle console errors
  const originalError = console.error;
  console.error = function(...args: unknown[]) {
    const errorMessage = args[0]?.toString() || '';
    // Suppress Chrome extension messaging errors that don't affect the app
    if (errorMessage.includes('A listener indicated an asynchronous response')) {
      return;
    }
    originalError.apply(console, args as Parameters<typeof originalError>);
  };
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
    const reason = event.reason?.toString() || '';
    if (reason.includes('A listener indicated an asynchronous response')) {
      event.preventDefault();
    }
  });
}

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Provider store={store}>
          <StripeProvider>
            {children}
          </StripeProvider>
        </Provider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
