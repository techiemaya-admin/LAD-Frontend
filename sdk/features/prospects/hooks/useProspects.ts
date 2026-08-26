/**
 * Prospects feature - useProspects hook.
 */
import { useQuery, keepPreviousData } from '@tanstack/react-query';

import * as api from '../api';
import type { ListProspectsResult } from '../api';
import type { ListProspectsParams } from '../types';

export function useProspects(params?: ListProspectsParams, enabled = true) {
  return useQuery<ListProspectsResult>({
    queryKey: ['prospects', params],
    queryFn: () => api.listProspects(params),
    staleTime: 30_000,
    // Keep the previous page visible while the next one loads (no flash of empty).
    placeholderData: keepPreviousData,
    enabled,
  });
}
