"use client";
import React from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { rehydrateAuth } from '@/store/slices/authSlice';
import { rehydrateSettings } from '@/store/slices/settingsSlice';
import { StripeProvider } from '../contexts/StripeContext';
import { AuthProvider } from '../contexts/AuthContext';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

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
  // Create a stable QueryClient instance that persists across renders
  // Using useState ensures the same instance is used for the lifetime of the component
  const [queryClient] = React.useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  }));

  // Rehydrate Redux state from localStorage on client-side mount
  React.useEffect(() => {
    store.dispatch(rehydrateAuth());
    store.dispatch(rehydrateSettings());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <AuthProvider>
          <StripeProvider>
            {children}
          </StripeProvider>
        </AuthProvider>
      </Provider>
    </QueryClientProvider>
  );
}
