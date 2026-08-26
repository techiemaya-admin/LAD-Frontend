/**
 * useActiveIcpDefinition
 *
 * Reads the tenant's active canonical ICP for a given variant. Returns null if
 * the tenant hasn't completed signup ICP capture yet - the caller should treat
 * null as "show the empty state / signup CTA," not as an error.
 *
 * Matches the raw-fetch + useState/useEffect convention used by other hooks in
 * this SDK (see useItem.ts, useConversation.ts). TanStack Query is intentionally
 * NOT used here to avoid introducing a second client-state pattern in this
 * feature.
 */
import { useCallback, useEffect, useState } from 'react';

import { getActiveIcpDefinition } from '../definitionsApi';
import type { IcpDefinition } from '../types';

export interface UseActiveIcpDefinitionResult {
  /** The active ICP, or null if none defined yet. */
  definition: IcpDefinition | null;
  loading: boolean;
  error: Error | null;
  /** Re-fetch from the server (use after a create/update). */
  refetch: () => Promise<void>;
}

export function useActiveIcpDefinition(
  variant: string = 'default',
): UseActiveIcpDefinitionResult {
  const [definition, setDefinition] = useState<IcpDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getActiveIcpDefinition(variant);
      setDefinition(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load active ICP'));
    } finally {
      setLoading(false);
    }
  }, [variant]);

  useEffect(() => {
    void load();
  }, [load]);

  return { definition, loading, error, refetch: load };
}
