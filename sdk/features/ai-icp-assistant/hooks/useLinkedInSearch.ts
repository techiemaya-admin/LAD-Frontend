/**
 * useLinkedInSearch Hook
 *
 * Manages LinkedIn search operations:
 * - Advanced lead search with targeting filters
 * - Intent extraction from natural language queries
 * - Search result processing and filtering
 *
 * Returns raw API responses so callers can process data as needed.
 */

import { useState, useCallback } from 'react';

const API_BASE = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://lad-backend-develop-160078175457.us-central1.run.app').replace(/\/+$/, '');

function getToken(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('token') || document.cookie.split('token=')[1]?.split(';')[0] || '';
}

function headers(): Record<string, string> {
  const t = getToken();
  return { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) };
}

export interface LeadTargeting {
  job_titles?: string[];
  industries?: string[];
  locations?: string[];
  keywords?: string[];
  profile_language?: string[];
  functions?: string[];
  seniority?: string[];
  company_headcount?: string[];
  company_names?: string[];
  decision_maker_nationality?: string[];
  decision_maker_experience_level?: string[];
  company_size?: string[];
  company_age?: string[];
  decision_maker_education?: string[];
  decision_maker_skills?: string[];
}

export interface LeadProfile {
  id: string;
  name: string;
  first_name: string;
  last_name: string;
  headline: string;
  location: string;
  current_company: string;
  profile_url: string;
  profile_picture: string;
  industry: string;
  network_distance: string;
  locked?: boolean;
  icp_score?: number;
  match_level?: 'strong' | 'moderate' | 'weak';
  icp_reasoning?: string;
  enriched_profile?: {
    summary: string | null;
    experience: { title: string; company: string; is_current: boolean }[];
    education: { school: string; degree: string; field_of_study: string }[];
    skills: string[];
  };
}

export interface LinkedInSearchState {
  isLoading: boolean;
  error: string | null;
}

const initialState: LinkedInSearchState = {
  isLoading: false,
  error: null,
};

export function useLinkedInSearch() {
  const [state, setState] = useState<LinkedInSearchState>(initialState);

  /**
   * Extract search intent/targeting from natural language query.
   * Returns the raw API response: { success, intent, ... }
   */
  const extractIntent = useCallback(
    async (query: string): Promise<any | null> => {
      if (!query.trim()) {
        setState(prev => ({ ...prev, error: 'Query cannot be empty' }));
        return null;
      }

      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const response = await fetch(
          `${API_BASE}/api/campaigns/linkedin/search/extract-intent`,
          {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ query }),
          }
        );

        if (!response.ok) {
          throw new Error(`Intent extraction failed: ${response.statusText}`);
        }

        const data = await response.json();
        setState(prev => ({ ...prev, isLoading: false }));
        return data;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to extract intent';
        setState(prev => ({ ...prev, isLoading: false, error }));
        return null;
      }
    },
    []
  );

  /**
   * Perform advanced LinkedIn search.
   * Accepts the full request body as an object:
   *   { query, count, targeting, icp_description, filters: { cursor } }
   * Returns the raw API response: { results, total, cursor, intent, activities, icp_applied, ... }
   */
  const search = useCallback(
    async (body: Record<string, any>): Promise<any | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        const response = await fetch(
          `${API_BASE}/api/campaigns/linkedin/search/advanced`,
          {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(body),
          }
        );

        if (!response.ok) {
          throw new Error(`Search failed: ${response.statusText}`);
        }

        const data = await response.json();
        setState(prev => ({ ...prev, isLoading: false }));
        return data;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to search leads';
        setState(prev => ({ ...prev, isLoading: false, error }));
        return null;
      }
    },
    []
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
    extractIntent,
    search,
    reset,
  };
}

export default useLinkedInSearch;
