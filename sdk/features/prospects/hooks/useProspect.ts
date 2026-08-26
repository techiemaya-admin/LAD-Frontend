/**
 * Prospects feature - useProspect hook.
 */
import { useQuery } from '@tanstack/react-query';

import * as api from '../api';
import type { ProspectState } from '../types';

export function useProspect(id: string | undefined, enabled = true) {
  return useQuery<ProspectState>({
    queryKey: ['prospect', id],
    queryFn: () => api.getProspect(id as string),
    staleTime: 30_000,
    enabled: enabled && Boolean(id),
  });
}
