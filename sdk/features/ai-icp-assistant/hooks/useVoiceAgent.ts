/**
 * useVoiceAgent Hook
 *
 * Manages voice agent configuration:
 * - Fetching available voice agents
 * - Fetching available phone numbers
 * - Voice agent selection and number assignment
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

export interface VoiceAgent {
  id: string;
  name: string;
  agent_id?: string | number;
  voice_id?: string;
  description?: string;
}

export interface PhoneNumber {
  id: string;
  number: string;
  name?: string;
  from_number?: string;
  status?: string;
}

export interface VoiceAgentState {
  isLoading: boolean;
  error: string | null;
  agents: VoiceAgent[];
  numbers: PhoneNumber[];
  selectedAgent?: VoiceAgent;
  selectedNumber?: PhoneNumber;
}

const initialState: VoiceAgentState = {
  isLoading: false,
  error: null,
  agents: [],
  numbers: [],
};

export function useVoiceAgent(autoFetch: boolean = true) {
  const [state, setState] = useState<VoiceAgentState>(initialState);

  /**
   * Fetch available voice agents
   */
  const fetchAgents = useCallback(async (): Promise<VoiceAgent[] | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `${API_BASE}/api/voice-agent/user/available-agents`,
        {
          method: 'GET',
          headers: headers(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch voice agents: ${response.statusText}`);
      }

      const data = await response.json();
      const agents = Array.isArray(data) ? data : data.agents || data.data || [];

      setState(prev => ({
        ...prev,
        isLoading: false,
        agents,
      }));

      return agents;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch voice agents';
      setState(prev => ({ ...prev, isLoading: false, error }));
      return null;
    }
  }, []);

  /**
   * Fetch available phone numbers
   */
  const fetchNumbers = useCallback(async (): Promise<PhoneNumber[] | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await fetch(
        `${API_BASE}/api/voice-agent/user/available-numbers`,
        {
          method: 'GET',
          headers: headers(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch phone numbers: ${response.statusText}`);
      }

      const data = await response.json();
      const numbers = Array.isArray(data) ? data : data.numbers || data.data || [];

      setState(prev => ({
        ...prev,
        isLoading: false,
        numbers,
      }));

      return numbers;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch phone numbers';
      setState(prev => ({ ...prev, isLoading: false, error }));
      return null;
    }
  }, []);

  /**
   * Fetch both agents and numbers in parallel
   */
  const fetchAll = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [agentsRes, numbersRes] = await Promise.all([
        fetch(`${API_BASE}/api/voice-agent/user/available-agents`, {
          method: 'GET',
          headers: headers(),
        }),
        fetch(`${API_BASE}/api/voice-agent/user/available-numbers`, {
          method: 'GET',
          headers: headers(),
        }),
      ]);

      if (!agentsRes.ok || !numbersRes.ok) {
        throw new Error('Failed to fetch voice configuration');
      }

      const agentsData = await agentsRes.json();
      const numbersData = await numbersRes.json();

      const agents = Array.isArray(agentsData) ? agentsData : agentsData.agents || agentsData.data || [];
      const numbers = Array.isArray(numbersData) ? numbersData : numbersData.numbers || numbersData.data || [];

      setState(prev => ({
        ...prev,
        isLoading: false,
        agents,
        numbers,
        selectedAgent: agents.length > 0 ? agents[0] : undefined,
        selectedNumber: numbers.length > 0 ? numbers[0] : undefined,
      }));

      return true;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to fetch voice configuration';
      setState(prev => ({ ...prev, isLoading: false, error }));
      return false;
    }
  }, []);

  /**
   * Select a voice agent
   */
  const selectAgent = useCallback((agent: VoiceAgent) => {
    setState(prev => ({ ...prev, selectedAgent: agent }));
  }, []);

  /**
   * Select a phone number
   */
  const selectNumber = useCallback((number: PhoneNumber) => {
    setState(prev => ({ ...prev, selectedNumber: number }));
  }, []);

  /**
   * Auto-fetch on mount if enabled
   */
  useEffect(() => {
    if (autoFetch && typeof window !== 'undefined') {
      fetchAll().catch(err => console.warn('Failed to auto-fetch voice config:', err));
    }
  }, [autoFetch, fetchAll]);

  return {
    // State
    ...state,
    // Actions
    fetchAgents,
    fetchNumbers,
    fetchAll,
    selectAgent,
    selectNumber,
  };
}

export default useVoiceAgent;
