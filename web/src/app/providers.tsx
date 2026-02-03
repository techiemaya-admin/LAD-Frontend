"use client";

import React from "react";
import { Provider as ReduxProvider } from "react-redux";
import { store } from "@/store/store";
import { rehydrateAuth } from "@/store/slices/authSlice";
import { rehydrateSettings } from "@/store/slices/settingsSlice";
import { StripeProvider } from "../contexts/StripeContext";
import { AuthProvider } from "../contexts/AuthContext";
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

function ClientOnly({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  React.useEffect(() => setMounted(true), []);
  // Render children only after mount, but DO NOT block provider tree.
  return mounted ? <>{children}</> : null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            gcTime: 5 * 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  React.useEffect(() => {
    store.dispatch(rehydrateAuth());
    store.dispatch(rehydrateSettings());
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ReduxProvider store={store}>
        <AuthProvider>
          {/* Stripe often touches window; gate Stripe only if needed */}
          <ClientOnly>
            <StripeProvider>{children}</StripeProvider>
          </ClientOnly>
        </AuthProvider>
      </ReduxProvider>
    </QueryClientProvider>
  );
}
