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
  EducationStudent,
  Counsellor,
  StudentAppointment,
  CreateStudentPayload,
  UpdateStudentPayload,
  AssignCounsellorPayload,
  StudentWithLead,
  StudentListFilter,
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

// ==================== EDUCATION VERTICAL HOOKS ====================

/**
 * Hook to use students list (education vertical)
 */
export function useStudents(filters?: StudentListFilter, options: UseAPIOptions = {}) {
  const api = options.api || dealsPipelineAPI;
  const [state, setState] = useState<AsyncState<StudentWithLead[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchStudents = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const data = await api.listStudents(filters);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api, filters]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  return { ...state, refetch: fetchStudents };
}

/**
 * Hook to use a single student (education vertical)
 */
export function useStudent(id: string, options: UseAPIOptions = {}) {
  const api = options.api || dealsPipelineAPI;
  const [state, setState] = useState<AsyncState<StudentWithLead>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchStudent = useCallback(async () => {
    if (!id) {
      setState({ data: null, loading: false, error: new Error('Student ID is required') });
      return;
    }
    
    setState(prev => ({ ...prev, loading: true }));
    try {
      const data = await api.getStudent(id);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api, id]);

  useEffect(() => {
    fetchStudent();
  }, [fetchStudent]);

  return { ...state, refetch: fetchStudent };
}

/**
 * Hook for student mutations (education vertical)
 */
export function useStudentMutations(options: UseAPIOptions = {}) {
  const api = options.api || dealsPipelineAPI;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createStudent = useCallback(async (payload: CreateStudentPayload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.createStudent(payload);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [api]);

  const updateStudent = useCallback(async (id: string, payload: UpdateStudentPayload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.updateStudent(id, payload);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [api]);

  const deleteStudent = useCallback(async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await api.deleteStudent(id);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [api]);

  const assignCounsellor = useCallback(async (studentId: string, payload: AssignCounsellorPayload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.assignCounsellor(studentId, payload);
      setLoading(false);
      return result;
    } catch (err) {
      setError(err as Error);
      setLoading(false);
      throw err;
    }
  }, [api]);

  return {
    createStudent,
    updateStudent,
    deleteStudent,
    assignCounsellor,
    loading,
    error,
  };
}

/**
 * Hook to use counsellors list (education vertical)
 */
export function useCounsellors(options: UseAPIOptions = {}) {
  const api = options.api || dealsPipelineAPI;
  const [state, setState] = useState<AsyncState<Counsellor[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchCounsellors = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));
    try {
      const data = await api.listCounsellors();
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api]);

  useEffect(() => {
    fetchCounsellors();
  }, [fetchCounsellors]);

  return { ...state, refetch: fetchCounsellors };
}

/**
 * Hook to use student appointments (education vertical)
 */
export function useStudentAppointments(studentId: string, options: UseAPIOptions = {}) {
  const api = options.api || dealsPipelineAPI;
  const [state, setState] = useState<AsyncState<StudentAppointment[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchAppointments = useCallback(async () => {
    if (!studentId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    
    setState(prev => ({ ...prev, loading: true }));
    try {
      const data = await api.getStudentAppointments(studentId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api, studentId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return { ...state, refetch: fetchAppointments };
}

/**
 * Hook to use counsellor appointments (education vertical)
 */
export function useCounsellorAppointments(counsellorId: string, options: UseAPIOptions = {}) {
  const api = options.api || dealsPipelineAPI;
  const [state, setState] = useState<AsyncState<StudentAppointment[]>>({
    data: null,
    loading: true,
    error: null,
  });

  const fetchAppointments = useCallback(async () => {
    if (!counsellorId) {
      setState({ data: [], loading: false, error: null });
      return;
    }
    
    setState(prev => ({ ...prev, loading: true }));
    try {
      const data = await api.getCounsellorAppointments(counsellorId);
      setState({ data, loading: false, error: null });
    } catch (error) {
      setState({ data: null, loading: false, error: error as Error });
    }
  }, [api, counsellorId]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  return { ...state, refetch: fetchAppointments };
}
