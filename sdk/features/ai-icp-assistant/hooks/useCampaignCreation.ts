/**
 * useCampaignCreation Hook
 *
 * Manages campaign creation flow:
 * - Creating new campaigns with steps
 * - Fetching lead summaries
 * - Validation and error handling
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

export interface CampaignStep {
  step_type: string;
  order: number;
  config: Record<string, any>;
}

export interface CampaignPayload {
  [key: string]: any;
}

export interface CampaignCreationState {
  isLoading: boolean;
  error: string | null;
}

const initialState: CampaignCreationState = {
  isLoading: false,
  error: null,
};

export function useCampaignCreation() {
  const [state, setState] = useState<CampaignCreationState>(initialState);

  /**
   * Create a new campaign.
   * Returns the raw API response: { success, data, id, error, ... }
   */
  const createCampaign = useCallback(
    async (payload: Record<string, any>): Promise<any | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(
          `${API_BASE}/api/campaigns`,
          {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          throw new Error(`Campaign creation failed: ${response.statusText}`);
        }

        const data = await response.json();
        setState(prev => ({ ...prev, isLoading: false }));
        return data;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to create campaign';
        setState(prev => ({ ...prev, isLoading: false, error }));
        return null;
      }
    },
    []
  );

  /**
   * Fetch preview of a lead summary.
   * Returns the raw API response: { summary, text, error, ... }
   */
  const fetchLeadSummaryPreview = useCallback(
    async (leadData: any): Promise<any | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await fetch(
          `${API_BASE}/api/campaigns/preview/lead-summary`,
          {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(leadData),
          }
        );

        if (!response.ok) {
          throw new Error(`Lead summary preview failed: ${response.statusText}`);
        }

        const data = await response.json();
        setState(prev => ({ ...prev, isLoading: false }));
        return data;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to fetch lead summary preview';
        setState(prev => ({ ...prev, isLoading: false, error }));
        return null;
      }
    },
    []
  );

  /**
   * Save good/bad feedback for a search result lead.
   */
  const saveProspectFeedback = useCallback(
    async (params: {
      sessionId?: string;
      moduleUsed?: string;
      lead: Record<string, any>;
      feedback: 'good' | 'bad';
      feedbackComment?: string;
    }): Promise<any> => {
      try {
        const response = await fetch(`${API_BASE}/api/campaigns/search-prospects/feedback`, {
          method: 'POST', headers: headers(),
          body: JSON.stringify(params),
        });
        return await response.json();
      } catch (err) {
        console.warn('[useCampaignCreation] saveProspectFeedback error:', err);
        return null;
      }
    }, []
  );

  /**
   * Trigger company research + profile summary for a lead.
   * Debits 1 credit. Returns { company_profile, profile_summary, credit_deducted }.
   */
  const generateProspectSummary = useCallback(
    async (params: {
      sessionId?: string;
      moduleUsed?: string;
      lead: Record<string, any>;
    }): Promise<any> => {
      try {
        const response = await fetch(`${API_BASE}/api/campaigns/search-prospects/generate-summary`, {
          method: 'POST', headers: headers(),
          body: JSON.stringify(params),
        });
        return await response.json();
      } catch (err) {
        console.warn('[useCampaignCreation] generateProspectSummary error:', err);
        return null;
      }
    }, []
  );

  /**
   * Reset state
   */
  const reset = useCallback(() => {
    setState(initialState);
  }, []);

  return {
    // State
    ...state,
    // Actions
    createCampaign,
    fetchLeadSummaryPreview,
    saveProspectFeedback,
    generateProspectSummary,
    reset,
  };
}

export default useCampaignCreation;
