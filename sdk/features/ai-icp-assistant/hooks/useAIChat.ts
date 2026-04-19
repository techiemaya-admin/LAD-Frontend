/**
 * useAIChat Hook
 *
 * Manages AI chat interactions:
 * - General AI chat for message generation
 * - Lead-specific chat with context (history, targeting, pendingIntent)
 *
 * Returns raw API responses so callers can process data as needed.
 */

import { useState, useCallback } from 'react';

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

export interface ChatMessage {
  id: string;
  role: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export interface AIChatState {
  isLoading: boolean;
  error: string | null;
}

const initialState: AIChatState = {
  isLoading: false,
  error: null,
};

export function useAIChat() {
  const [state, setState] = useState<AIChatState>(initialState);

  /**
   * Send a message to the AI chat API.
   * Returns the raw API response: { success, response, text, ... }
   */
  const sendMessage = useCallback(
    async (message: string): Promise<any | null> => {
      if (!message.trim()) {
        setState(prev => ({ ...prev, error: 'Message cannot be empty' }));
        return null;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(
          `${API_BASE}/api/ai-icp-assistant/chat`,
          {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ message: message.trim() }),
          }
        );

        if (!response.ok) {
          throw new Error(`Chat failed: ${response.statusText}`);
        }

        const data = await response.json();
        setState(prev => ({ ...prev, isLoading: false }));
        return data;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to send message';
        setState(prev => ({ ...prev, isLoading: false, error }));
        return null;
      }
    },
    []
  );

  /**
   * Send a message to the lead-specific chat endpoint.
   * Accepts the full request body as an object:
   *   { message, history, currentTargeting, pendingIntent, ... }
   * Returns the raw API response: { response, newSearch, updatedTargeting, pendingIntent, options, ... }
   */
  const sendLeadChatMessage = useCallback(
    async (body: Record<string, any>): Promise<any | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(
          `${API_BASE}/api/ai-icp-assistant/lead-chat`,
          {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          throw new Error(`Lead chat failed: ${response.statusText}`);
        }

        const data = await response.json();
        setState(prev => ({ ...prev, isLoading: false }));
        return data;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to send lead chat message';
        setState(prev => ({ ...prev, isLoading: false, error }));
        return null;
      }
    },
    []
  );

  /**
   * Clear state
   */
  const clearHistory = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    // State
    ...state,
    // Actions
    sendMessage,
    sendLeadChatMessage,
    clearHistory,
  };
}

export default useAIChat;
