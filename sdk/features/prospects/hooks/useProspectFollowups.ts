/**
 * Prospects feature - useProspectFollowups hook.
 *
 * Upcoming scheduled automatic follow-ups for a prospect, across channels.
 */
import { useQuery } from '@tanstack/react-query';

import * as api from '../api';
import type { ProspectFollowupsResult } from '../api';

export function useProspectFollowups(id: string | undefined, enabled = true) {
  return useQuery<ProspectFollowupsResult>({
    queryKey: ['prospect-followups', id],
    queryFn: () => api.getProspectFollowups(id as string),
    staleTime: 30_000,
    enabled: enabled && Boolean(id),
  });
}
