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
   * [BACKUP] Perform advanced LinkedIn search via the original /search/advanced endpoint.
   *
   * Preserved as a fallback in case the unified endpoint needs to be reverted (Option B).
   * Used directly for cursor-based pagination ("Get More") since /search/unified does not
   * support cursor pagination.
   *
   * Body: { query, count, targeting, targeting_filters, icp_description, filters: { cursor }, ... }
   * Returns: { results[], total, cursor, intent, activities, icp_applied, ... }
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
   * Perform a fresh lead search via the 6-module unified search endpoint.
   *
   * Routes the query to the correct module automatically:
   *   abm               → person/company name detected  → "Target Specific Account"
   *   signal_detection  → hiring/funding/post signals   → "Intent Signal Search"
   *   competitor_intent → "people who use X"           → "Competitor Prospect Search"
   *   advanced_search   → role / industry / location    → "Multi-Filter Lead Search"
   *
   * The response is normalised to the same shape as `search()` so callers
   * (page.tsx) need zero changes to their result-handling code:
   *   results  ← leads[]          (unified uses "leads", advanced uses "results")
   *   total    ← leads.length     (unified has no cursor pagination)
   *   cursor   ← null             (pagination falls back to /search/advanced)
   *   icp_applied ← false         (scoring handled server-side in unified)
   *
   * Extra fields passed through:
   *   module_used, module_label, subtype, confidence_score, needs_refinement, stats
   *
   * Body accepted: same shape as `search()` — query, count, targeting, filters, etc.
   * Returns: normalised response (same shape as `search()`) or null on failure.
   */
  const searchUnified = useCallback(
    async (body: Record<string, any>): Promise<any | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      try {
        // Map advanced-search body fields to unified endpoint fields.
        // All fields that affect result quality are forwarded so the backend
        // advanced_search case can run the same full pipeline as /search/advanced.
        const unifiedBody: Record<string, any> = {
          query:            body.query,
          filters:          body.filters          || {},
          // Pre-extracted targeting → enables fast path (skip Gemini re-parse)
          ...(body.targeting          ? { targeting:          body.targeting          } : {}),
          // Additional targeting filters (nationality, skills, company size, etc.)
          ...(body.targeting_filters  ? { targeting_filters:  body.targeting_filters  } : {}),
          // ICP description for lead qualification scoring
          ...(body.icp_description    ? { icp_description:    body.icp_description    } : {}),
          // Sales Navigator flag
          ...(body.useSalesNav        ? { useSalesNav:        body.useSalesNav        } : {}),
        };

        const response = await fetch(
          `${API_BASE}/api/campaigns/linkedin/search/unified`,
          {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify(unifiedBody),
          }
        );

        if (!response.ok) {
          throw new Error(`Unified search failed: ${response.statusText}`);
        }

        const data = await response.json();
        setState(prev => ({ ...prev, isLoading: false }));

        // ── Normalise unified response → same shape as /search/advanced ─────────
        // Unified returns `leads[]`; page.tsx reads `results[]`.
        // For advanced_search the backend now returns real total + cursor.
        // For other modules (ABM, signal, competitor) cursor stays null.
        const normalisedData = {
          // Core result fields (mapped for page.tsx compatibility)
          results:    data.leads    || [],
          total:      data.total    ?? (data.leads || []).length,
          cursor:     data.cursor   ?? null,
          icp_applied: data.icp_applied ?? false,

          // Intent fields (same structure in both endpoints)
          intent: data.intent || null,

          // Unified-only metadata — available to page.tsx if it wants to display them
          module_used:      data.module_used      || 'advanced_search',
          module_label:     data.module_label     || 'Multi-Filter Lead Search',
          subtype:          data.subtype          || null,
          confidence:       data.confidence       || null,
          confidence_score: data.confidence_score || null,
          needs_refinement: data.needs_refinement || false,
          stats:            data.stats            || {},
          suggestions:      data.suggestions      || [],

          // Preserve success flag
          success: data.success,
        };

        return normalisedData;
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to search leads (unified)';
        setState(prev => ({ ...prev, isLoading: false, error }));
        return null;
      }
    },
    []
  );

  /**
   * Infer nationality from a list of lead names using LLM batch inference.
   * Body: { leads: [{ id, name }] }
   * Returns: { success, results: [{ id, name, nationality, confidence, reason }] }
   */
  const inferNationality = useCallback(
    async (leads: { id: string; name: string }[]): Promise<any | null> => {
      if (!leads || leads.length === 0) return null;
      try {
        const response = await fetch(
          `${API_BASE}/api/campaigns/linkedin/infer-nationality`,
          {
            method: 'POST',
            headers: headers(),
            body: JSON.stringify({ leads }),
          }
        );
        if (!response.ok) {
          throw new Error(`Nationality inference failed: ${response.statusText}`);
        }
        const data = await response.json();
        return data;
      } catch (err) {
        console.warn('[useLinkedInSearch] inferNationality error:', err);
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
    search,           // ← BACKUP: /search/advanced — use for pagination ("Get More")
    searchUnified,    // ← PRIMARY: /search/unified — 6-module router for fresh searches
    inferNationality,
    reset,
  };
}

export default useLinkedInSearch;
