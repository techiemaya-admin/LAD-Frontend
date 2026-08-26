/**
 * Prospects feature - useDeleteProspect hook (soft delete).
 *
 * Soft-deletes a prospect ("not a fit"). On success, invalidates the prospects
 * list so the removed row disappears, and drops the single-prospect cache.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import * as api from '../api';

export function useDeleteProspect() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (vars: { id: string; reason?: string }) =>
      api.deleteProspect(vars.id, vars.reason),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
      queryClient.removeQueries({ queryKey: ['prospect', vars.id] });
    },
  });
}
