/**
 * Followups Feature - useInactiveLeads Hook
 */
import { useQuery } from '@tanstack/react-query';
import { getInactiveLeadsOptions } from '../api';
import type { InactiveLead } from '../types';

export function useInactiveLeads() {
  const query = useQuery(getInactiveLeadsOptions());

  return {
    leads: (query.data || []) as InactiveLead[],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}
