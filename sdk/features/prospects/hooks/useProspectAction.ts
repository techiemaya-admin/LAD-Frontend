/**
 * Prospects feature - useProspectAction hook.
 *
 * Applies a CRM "Take action" (do-not-contact / quiet) to a prospect, then
 * refreshes the single-prospect + list caches so the new state renders.
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';

import * as api from '../api';
import type { ProspectActionParams } from '../api';

export function useProspectAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...params }: { id: string } & ProspectActionParams) =>
      api.prospectAction(id, params),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['prospect', vars.id] });
      queryClient.invalidateQueries({ queryKey: ['prospects'] });
    },
  });
}
