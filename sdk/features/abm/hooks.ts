/**
 * ABM Feature — React hooks
 * Wraps API calls with loading/error state management.
 * web/ components import from here — never from api.ts directly.
 */
import { useState, useCallback } from 'react';
import * as abmApi from './api';
import type {
  ABMResearchRequest,
  ABMListParams,
  ABMResearchResponse,
  ABMListResponse,
  ProspectCompany,
  NextBestAction,
} from './types';

// ── useABMResearch ─────────────────────────────────────────────────────────
// Hook for researching a company from a natural-language query.

export function useABMResearch() {
  const [loading, setLoading]                   = useState(false);
  const [error, setError]                       = useState<string | null>(null);
  const [company, setCompany]                   = useState<ProspectCompany | null>(null);
  const [nextBestActions, setNextBestActions]   = useState<NextBestAction[]>([]);

  const research = useCallback(async (params: ABMResearchRequest): Promise<ABMResearchResponse | null> => {
    setLoading(true);
    setError(null);
    try {
      const result = await abmApi.researchCompany(params);
      if (result.success) {
        setCompany(result.data);
        setNextBestActions(result.next_best_actions || []);
      }
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Research failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const refresh = useCallback(async (id: string, opts?: { unipile_account_id?: string }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await abmApi.refreshCompany(id, opts);
      if (result.success) {
        setCompany(result.data);
        setNextBestActions(result.next_best_actions || []);
      }
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Refresh failed';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    error,
    company,
    nextBestActions,
    research,
    refresh,
    clearError: () => setError(null),
    clearCompany: () => { setCompany(null); setNextBestActions([]); },
  };
}

// ── useABMCompanyList ──────────────────────────────────────────────────────
// Hook for listing + deleting prospect companies.

export function useABMCompanyList() {
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [companies, setCompanies]     = useState<ProspectCompany[]>([]);
  const [pagination, setPagination]   = useState({ total: 0, limit: 20, offset: 0, has_more: false });

  const fetchList = useCallback(async (params?: ABMListParams) => {
    setLoading(true);
    setError(null);
    try {
      const result: ABMListResponse = await abmApi.listCompanies(params);
      if (result.success) {
        setCompanies(result.data);
        setPagination(result.pagination);
      }
      return result;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load companies';
      setError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const remove = useCallback(async (id: string) => {
    try {
      await abmApi.deleteCompany(id);
      setCompanies(prev => prev.filter(c => c.id !== id));
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Delete failed';
      setError(msg);
      return false;
    }
  }, []);

  return {
    loading,
    error,
    companies,
    pagination,
    fetchList,
    remove,
    clearError: () => setError(null),
  };
}

// ── useABMParseIntent ──────────────────────────────────────────────────────
// Lightweight hook for chat-style intent parsing (typeahead / chat UI).

export function useABMParseIntent() {
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed]   = useState<{ company_name: string | null; domain: string | null; intent: string } | null>(null);

  const parse = useCallback(async (query: string) => {
    if (!query?.trim()) return null;
    setLoading(true);
    try {
      const result = await abmApi.parseIntent(query);
      if (result.success) setParsed(result.data);
      return result.data;
    } catch (_) {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, parsed, parse, clear: () => setParsed(null) };
}
