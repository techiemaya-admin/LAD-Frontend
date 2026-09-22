/**
 * Sales Playbook feature — React Query hooks.
 *
 * The call sheet must stay usable when the records service is unreachable: a
 * rep on a live call cannot be blocked by a 404. Every hook here surfaces
 * failure rather than throwing, and the UI keeps the in-progress draft locally.
 */
'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteCall, listCalls, salesPlaybookKeys, saveCall } from './api';
import type { CallRecord, ListCallsParams } from './types';

export function useCallRecords(params?: ListCallsParams) {
  return useQuery({
    queryKey: salesPlaybookKeys.callsList(params),
    queryFn: () => listCalls(params),
    staleTime: 30_000,
    retry: 1,
  });
}

export function useSaveCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (record: CallRecord) => saveCall(record),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salesPlaybookKeys.calls() });
    },
  });
}

export function useDeleteCall() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteCall(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: salesPlaybookKeys.calls() });
    },
  });
}
