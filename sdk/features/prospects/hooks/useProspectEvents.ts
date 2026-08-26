/**
 * Prospects feature - useProspectEvents hook.
 */
import { useQuery } from '@tanstack/react-query';

import * as api from '../api';
import type { ListProspectEventsParams, ProspectEvent } from '../types';

export function useProspectEvents(
  id: string | undefined,
  params?: ListProspectEventsParams,
  enabled = true,
) {
  return useQuery<ProspectEvent[]>({
    queryKey: ['prospect-events', id, params],
    queryFn: () => api.listProspectEvents(id as string, params),
    staleTime: 15_000,
    enabled: enabled && Boolean(id),
  });
}
