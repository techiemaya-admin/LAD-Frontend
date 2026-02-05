/**
 * Dashboard Hooks
 * React hooks for dashboard features
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { dashboardApiService } from './services/api';
import {
  LeadBooking,
  User,
  GetLeadBookingsParams,
  CreateLeadBookingParams,
  UpdateLeadBookingParams
} from './types';

// Hook: Get Lead Bookings
export function useLeadBookings(params?: GetLeadBookingsParams) {
  const [bookings, setBookings] = useState<LeadBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchBookings = useCallback(async () => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    setLoading(true);
    setError(null);
    try {
      const response = await dashboardApiService.getLeadBookings(params);
      if (response.success && response.data) {
        setBookings(response.data);
      } else {
        // Silently handle API not available - return empty bookings
        setBookings([]);
      }
    } catch (err) {
      // Silently handle errors - don't block UI
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      setBookings([]);
      console.warn('Failed to fetch bookings:', errorObj.message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  return { bookings, loading, error, refetch: fetchBookings };
}

// Hook: Get Single Lead Booking
export function useLeadBooking(bookingId: string | null) {
  const [booking, setBooking] = useState<LeadBooking | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!bookingId) return;

    const fetchBooking = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await dashboardApiService.getLeadBookingById(bookingId);
        if (response.success && response.data) {
          setBooking(response.data);
        } else {
          throw new Error(response.error || 'Failed to fetch booking');
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [bookingId]);

  return { booking, loading, error };
}

// Hook: Create Lead Booking
export function useCreateLeadBooking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const create = useCallback(async (data: CreateLeadBookingParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await dashboardApiService.createLeadBooking(data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to create booking');
      }
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { create, loading, error };
}

// Hook: Update Lead Booking
export function useUpdateLeadBooking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const update = useCallback(async (bookingId: string, data: UpdateLeadBookingParams) => {
    setLoading(true);
    setError(null);
    try {
      const response = await dashboardApiService.updateLeadBooking(bookingId, data);
      if (!response.success) {
        throw new Error(response.error || 'Failed to update booking');
      }
      return response.data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return { update, loading, error };
}

// Hook: Get Tenant Users (for owner role)
export function useTenantUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchUsers = useCallback(async () => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    setLoading(true);
    setError(null);
    try {
      const response = await dashboardApiService.getTenantUsers();
      if (response.success && response.data) {
        setUsers(response.data);
      } else {
        // Silently handle API not available - return empty users
        setUsers([]);
      }
    } catch (err) {
      // Silently handle errors - don't block UI
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      setUsers([]);
      console.warn('Failed to fetch users:', errorObj.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return { users, loading, error, refetch: fetchUsers };
}

// Hook: Get Available Voice Agents
export function useAvailableAgents() {
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchAgents = useCallback(async () => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    setLoading(true);
    setError(null);
    try {
      const response = await dashboardApiService.getAvailableAgents();
      const agentsData = response.data || response.agents || [];
      setAgents(agentsData);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      setAgents([]);
      console.warn('Failed to fetch available agents:', errorObj.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  return { agents, loading, error, refetch: fetchAgents };
}

// Hook: Get Call Logs
export function useCallLogs(params?: { startDate?: string; endDate?: string }) {
  const [calls, setCalls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const fetchedParamsRef = useRef<string>('');

  const fetchCalls = useCallback(async () => {
    const paramsKey = JSON.stringify(params || {});
    
    // Only fetch if params have changed
    if (fetchedParamsRef.current === paramsKey) return;
    fetchedParamsRef.current = paramsKey;
    
    setLoading(true);
    setError(null);
    try {
      const response = await dashboardApiService.getCallLogs(params);
      const callsData = Array.isArray(response) 
        ? response 
        : (response.data || response.logs || response.calls || []);
      setCalls(callsData);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      setCalls([]);
      console.warn('Failed to fetch call logs:', errorObj.message);
    } finally {
      setLoading(false);
    }
  }, [params?.startDate, params?.endDate]);

  useEffect(() => {
    fetchCalls();
  }, [fetchCalls]);

  return { calls, loading, error, refetch: fetchCalls };
}

// Hook: Get Wallet/Credits Data
export function useWallet() {
  const [walletData, setWalletData] = useState<{
    balance: number;
    totalMinutes: number;
    remainingMinutes: number;
    usageThisMonth: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const hasFetchedRef = useRef(false);

  const fetchWallet = useCallback(async () => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;
    
    setLoading(true);
    setError(null);
    try {
      const response = await dashboardApiService.getWallet();
      
      // Try new API response format first, fall back to legacy format
      const balance = response?.wallet?.availableBalance || 
                     response?.wallet?.currentBalance || 
                     response?.credits || 
                     response?.balance || 
                     0;
      
      const usageThisMonth = response?.monthly_usage || 0;
      const totalMinutes = balance * 3.7;
      const remainingMinutes = totalMinutes * (1 - usageThisMonth / 100);

      setWalletData({
        balance,
        totalMinutes,
        remainingMinutes,
        usageThisMonth,
      });
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error('Unknown error');
      setError(errorObj);
      setWalletData({
        balance: 0,
        totalMinutes: 0,
        remainingMinutes: 0,
        usageThisMonth: 0,
      });
      console.warn('Failed to fetch wallet data:', errorObj.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWallet();
  }, [fetchWallet]);

  return { walletData, loading, error, refetch: fetchWallet };
}

