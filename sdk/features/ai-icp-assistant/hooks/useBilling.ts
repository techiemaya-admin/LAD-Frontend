/**
 * useBilling Hook
 *
 * Manages billing information:
 * - Fetching wallet/credit balance
 * - Tracking available credits
 * - Error handling for billing API
 *
 * Returns raw API wallet data so callers can access all fields.
 */

import { useState, useCallback, useEffect } from 'react';

const API_BASE = (typeof window !== 'undefined' && window.location.origin) ||
  (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://lad-backend-develop-160078175457.us-central1.run.app').replace(/\/+$/, '');

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') || document.cookie.split('token=')[1]?.split(';')[0] || '';
}

function headers(): Record<string, string> {
  const t = getToken();
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export interface WalletData {
  [key: string]: any;
}

export interface BillingState {
  isLoading: boolean;
  error: string | null;
  wallet: WalletData | null;
  lastFetched?: Date;
}

const initialState: BillingState = {
  isLoading: false,
  error: null,
  wallet: null,
};

export function useBilling(autoFetch: boolean = true) {
  const [state, setState] = useState<BillingState>(initialState);

  /**
   * Fetch wallet information.
   * Returns the raw API response wallet data.
   */
  const fetchWallet = useCallback(async (): Promise<WalletData | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `${API_BASE}/api/billing/wallet`,
        {
          method: 'GET',
          headers: headers(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch wallet: ${response.statusText}`);
      }

      const data = await response.json();
      // Store the raw wallet data from the API response
      const wallet = (data.success !== false && data.wallet) ? data.wallet : data;

      setState(prev => ({
        ...prev,
        isLoading: false,
        wallet,
        lastFetched: new Date(),
      }));

      return wallet;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch wallet';
      setState(prev => ({
        ...prev,
        isLoading: false,
        error,
        wallet: null,
      }));
      return null;
    }
  }, []);

  /**
   * Auto-fetch on mount if enabled
   */
  useEffect(() => {
    if (autoFetch && typeof window !== 'undefined') {
      fetchWallet().catch(err => console.warn('Failed to auto-fetch wallet:', err));
    }
  }, [autoFetch, fetchWallet]);

  return {
    // State
    ...state,
    // Actions
    fetchWallet,
  };
}

export default useBilling;
