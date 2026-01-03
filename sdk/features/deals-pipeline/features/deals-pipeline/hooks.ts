/**
 * React Hooks for Deals Pipeline Feature
 * Ready-to-use hooks for React applications
 */

import { useState, useEffect, useCallback } from 'react';
import { dealsPipelineAPI, DealsPipelineAPI } from './api';
import type {
  Lead,
  Stage,
  Status,
  Source,
  Priority,
  PipelineBoard,
  LeadStats,
  CreateLeadPayload,
  UpdateLeadPayload,
} from './types';

interface UseAPIOptions {
  api?: DealsPipelineAPI;
}

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

/**
 * Hook to use pipeline board data
 */
export function usePipelineBoard(options: UseAPIOptions = {}) {
  const api = options.api || dealsPipelineAPI;
  const [state, setState] = useState<AsyncState<PipelineBoard>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchBoard = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const data = await api.getPipelineBoard();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

  return { ...state, refetch: fetchBoard };
}

/**
 * Hook to use leads data
 */
export function useLeads(filters?: { stage?: string; status?: string; search?: string }, options: UseAPIOptions = {}) {
  const api = options.api || dealsPipelineAPI;
  const [state, setState] = useState<AsyncState<Lead[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchLeads = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const data = await api.listLeads(filters);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api, filters]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return { ...state, refetch: fetchLeads };
}

/**
 * Hook to use single lead data
 */
export function useLead(id: string, options: UseAPIOptions = {}) {
  const api = options.api || dealsPipelineAPI;
  const [state, setState] = useState<AsyncState<Lead>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchLead = useCallback(async () => {
    if (!id) return;
    setState(prev => ({ ...prev, loading: true }));
    try {
      const data = await api.getLead(id);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api, id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  return { ...state, refetch: fetchLead };
}

/**
 * Hook to use stages data
 */
export function useStages(options: UseAPIOptions = {}) {
  const api = options.api || dealsPipelineAPI;
  const [state, setState] = useState<AsyncState<Stage[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchStages = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const data = await api.listStages();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api]);

  useEffect(() => {
    fetchStages();
  }, [fetchStages]);

  return { ...state, refetch: fetchStages };
}

/**
 * Hook for lead mutations (create, update, delete)
 */
export function useLeadMutations(options: UseAPIOptions = {}) {
  const api = options.api || dealsPipelineAPI;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createLead = useCallback(async (payload: CreateLeadPayload) => {
    setLoading(true);
    setError(null);
    try {
      const lead = await api.createLead(payload);
      setLoading(false);
      return lead;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [api]);

  const updateLead = useCallback(async (id: string, payload: UpdateLeadPayload) => {
    setLoading(true);
    setError(null);
    try {
      const lead = await api.updateLead(id, payload);
      setLoading(false);
      return lead;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [api]);

  const deleteLead = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.deleteLead(id);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [api]);

  const moveLeadToStage = useCallback(async (leadId: string, stageKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const lead = await api.moveLeadToStage(leadId, stageKey);
      setLoading(false);
      return lead;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [api]);

  return {
    createLead,
    updateLead,
    deleteLead,
    moveLeadToStage,
    loading,
    error,
  };
}

/**
 * Hook to use reference data
 */
export function useReferenceData(options: UseAPIOptions = {}) {
  const api = options.api || dealsPipelineAPI;
  const [statuses, setStatuses] = useState<Status[]>([]);
  const [sources, setSources] = useState<Source[]>([]);
  const [priorities, setPriorities] = useState<Priority[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [statusesData, sourcesData, prioritiesData] = await Promise.all([
          api.getStatuses(),
          api.getSources(),
          api.getPriorities(),
        ]);
        setStatuses(statusesData);
        setSources(sourcesData);
        setPriorities(prioritiesData);
      } catch (error) {
        console.error('Failed to fetch reference data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, [api]);

  return { statuses, sources, priorities, loading };
}

/**
 * Hook to use lead statistics
 */
export function useLeadStats(options: UseAPIOptions = {}) {
  const api = options.api || dealsPipelineAPI;
  const [state, setState] = useState<AsyncState<LeadStats>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchStats = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const data = await api.getLeadStats();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { ...state, refetch: fetchStats };
}
