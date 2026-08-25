/**
 * Prospects feature - useEnrichProspect hook (Option C, on-open enrichment).
 *
 * Triggers a LinkedIn profile enrichment for one prospect. On success, refreshes
 * the single-prospect + list caches so the freshly-pulled company / warm-path
 * signals render.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import * as api from '../api';

export function useEnrichProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.enrichProspect(id),
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: ['prospect', id] });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
    },
  });
}
