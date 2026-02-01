"use client";
import React from 'react';
import { Provider } from 'react-redux';
import { store } from '@/store/store';
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

// Create a function to make a new QueryClient
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        gcTime: 5 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined = undefined;

function getQueryClient() {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  } else {
    // Browser: make a new query client if we don't already have one
    // This is very important so we don't re-make a new client if React
    // suspends during the initial render. This may not be needed if we
    // have a suspense boundary BELOW the creation of the query client
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}

export default function Providers({ children }: { children: React.ReactNode }) {
  // NOTE: Avoid useState when initializing the query client if you don't
  //       have a suspense boundary between this and the code that may
  //       suspend because React will throw away the client on the initial
  //       render if it suspends and there is no boundary
  const queryClient = React.useMemo(() => getQueryClient(), []);

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
