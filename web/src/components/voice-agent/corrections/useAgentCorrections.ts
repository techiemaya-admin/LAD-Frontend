import { useCallback, useEffect, useState } from 'react';
import {
  type AgentCorrection,
  type CorrectionInput,
  deleteCorrection,
  listCorrections,
  saveCorrection,
} from './api';

/**
 * Loads and mutates the corrections of one agent. `agentId` may be null while the
 * caller does not know the agent yet (a call log still loading, a new unsaved
 * agent) — the hook then holds an empty list and does nothing.
 *
 * `error` is set when the LIST failed, so a caller can tell "no corrections" from
 * "could not load them" (failure ≠ emptiness).
 */
export function useAgentCorrections(agentId: number | string | null | undefined) {
  const [items, setItems] = useState<AgentCorrection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (agentId === null || agentId === undefined || agentId === '') {
      setItems([]);
      setError(null);
      return;
    }
    setLoading(true);
    try {
      setItems(await listCorrections(agentId));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load corrections');
    } finally {
      setLoading(false);
    }
  }, [agentId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const save = useCallback(
    async (input: CorrectionInput) => {
      if (agentId === null || agentId === undefined || agentId === '') {
        throw new Error('Save the agent first, then add corrections.');
      }
      const row = await saveCorrection(agentId, input);
      // Upsert semantics on the server: replace a row with the same id or same `wrong`.
      setItems((prev) => {
        const rest = prev.filter((c) => c.id !== row.id && c.wrong.toLowerCase() !== row.wrong.toLowerCase());
        return [row, ...rest];
      });
      return row;
    },
    [agentId],
  );

  const remove = useCallback(
    async (correctionId: string) => {
      if (agentId === null || agentId === undefined || agentId === '') return;
      await deleteCorrection(agentId, correctionId);
      setItems((prev) => prev.filter((c) => c.id !== correctionId));
    },
    [agentId],
  );

  return { items, loading, error, refresh, save, remove };
}
