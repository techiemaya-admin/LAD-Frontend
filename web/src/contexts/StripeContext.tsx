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
        // Fetch Stripe config from backend via Next.js API route in dev, direct in production
        const apiUrl = process.env.NEXT_PUBLIC_USE_API_PROXY === 'true' 
          ? '/api/stripe/config'
          : `${process.env.NEXT_PUBLIC_API_BASE || ''}/api/stripe/config`;
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
          throw new Error('Failed to fetch Stripe configuration');
        }
        
        const config = await response.json();
        setStripeConfig(config);

        // Load Stripe with publishable key
        if (config.publishableKey) {
          const stripeInstance = await loadStripe(config.publishableKey);
          setStripe(stripeInstance);
        } else {
          throw new Error('No Stripe publishable key found');
        }
      } catch (err) {
        console.error('Error initializing Stripe:', err);
        setError(err instanceof Error ? err.message : 'Failed to initialize Stripe');
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