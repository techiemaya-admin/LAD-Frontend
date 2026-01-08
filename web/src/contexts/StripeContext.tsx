'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { loadStripe, Stripe } from '@stripe/stripe-js';

interface StripeContextType {
  stripe: Stripe | null;
  stripeConfig: {
    publishableKey: string;
    successUrl: string;
    cancelUrl: string;
  } | null;
  loading: boolean;
  error: string | null;
}

const StripeContext = createContext<StripeContextType>({
  stripe: null,
  stripeConfig: null,
  loading: true,
  error: null,
});

export const useStripe = () => {
  const context = useContext(StripeContext);
  if (!context) {
    throw new Error('useStripe must be used within a StripeProvider');
  }
  return context;
};

interface StripeProviderProps {
  children: React.ReactNode;
}

export const StripeProvider: React.FC<StripeProviderProps> = ({ children }) => {
  const [stripe, setStripe] = useState<Stripe | null>(null);
  const [stripeConfig, setStripeConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initializeStripe = async () => {
      try {
        // Fetch Stripe config from Next.js API route
        const response = await fetch('/api/stripe/config', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch Stripe configuration: ${response.status} ${response.statusText}`);
        }
        
        const config = await response.json();
        
        // Check if we have a valid publishable key
        if (!config.publishableKey) {
          console.warn('Stripe is not configured: Missing NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable');
          // Don't throw - allow app to work without Stripe
          setLoading(false);
          return;
        }
        
        setStripeConfig(config);

        // Load Stripe with publishable key
        const stripeInstance = await loadStripe(config.publishableKey);
        setStripe(stripeInstance);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to initialize Stripe';
        console.error('Error initializing Stripe:', errorMessage);
        // Set error but still mark loading as false to allow app to continue
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    initializeStripe();
  }, []);

  const value = {
    stripe,
    stripeConfig,
    loading,
    error,
  };

  return (
    <StripeContext.Provider value={value}>
      {children}
    </StripeContext.Provider>
  );
};