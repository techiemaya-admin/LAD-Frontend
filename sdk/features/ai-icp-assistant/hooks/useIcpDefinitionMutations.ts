/**
 * useIcpDefinitionMutations
 *
 * Single-hook surface for all write operations against the tenant's canonical
 * ICP. Each operation tracks its own in-flight state and returns the latest
 * result. Use the `loading` flag for a global "any write in progress" UI hint.
 *
 * Consumers typically pair this with useActiveIcpDefinition's refetch:
 *
 *   const { definition, refetch } = useActiveIcpDefinition();
 *   const { create, promote, update, updateTuning, remove, loading } =
 *     useIcpDefinitionMutations({ onSuccess: refetch });
 */
import { useCallback, useState } from 'react';

import {
  createIcpDefinition,
  deleteIcpDefinition,
  promoteProfileToIcpDefinition,
  updateIcpDefinition,
  updateIcpTuning,
} from '../definitionsApi';
import type {
  CreateIcpDefinitionInput,
  IcpDefinition,
  UpdateIcpDefinitionInput,
  UpdateIcpTuningInput,
} from '../types';

export interface UseIcpDefinitionMutationsOptions {
  /** Called after any successful mutation. Use to trigger refetches in the parent. */
  onSuccess?: (definition: IcpDefinition | null) => void;
  /** Called on any error. Defaults to console.error if omitted. */
  onError?: (error: Error) => void;
}

export interface UseIcpDefinitionMutationsResult {
  /** True while any mutation is in flight. */
  loading: boolean;
  /** The most recent error from any mutation, or null. */
  error: Error | null;

  create: (input: CreateIcpDefinitionInput) => Promise<IcpDefinition>;
  promote: (input: { profile_id: string; variant?: string }) => Promise<IcpDefinition>;
  update: (id: string, input: UpdateIcpDefinitionInput) => Promise<IcpDefinition>;
  updateTuning: (id: string, input: UpdateIcpTuningInput) => Promise<IcpDefinition>;
  remove: (id: string) => Promise<void>;
}

export function useIcpDefinitionMutations(
  options: UseIcpDefinitionMutationsOptions = {},
): UseIcpDefinitionMutationsResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleError = useCallback(
    (err: unknown) => {
      const e = err instanceof Error ? err : new Error('ICP mutation failed');
      setError(e);
      if (options.onError) options.onError(e);
      else console.error('[useIcpDefinitionMutations]', e);
      throw e;
    },
    [options],
  );

  const wrap = useCallback(
    async <T,>(op: () => Promise<T>, emitOnSuccess?: T extends IcpDefinition ? true : false) => {
      setLoading(true);
      setError(null);
      try {
        const result = await op();
        if (emitOnSuccess && options.onSuccess) {
          options.onSuccess(result as unknown as IcpDefinition);
        }
        return result;
      } catch (err) {
        return handleError(err) as never;
      } finally {
        setLoading(false);
      }
    },
    [handleError, options],
  );

  const create = useCallback(
    (input: CreateIcpDefinitionInput) =>
      wrap(() => createIcpDefinition(input), true),
    [wrap],
  );

  const promote = useCallback(
    (input: { profile_id: string; variant?: string }) =>
      wrap(() => promoteProfileToIcpDefinition(input), true),
    [wrap],
  );

  const update = useCallback(
    (id: string, input: UpdateIcpDefinitionInput) =>
      wrap(() => updateIcpDefinition(id, input), true),
    [wrap],
  );

  const updateTuningFn = useCallback(
    (id: string, input: UpdateIcpTuningInput) =>
      wrap(() => updateIcpTuning(id, input), true),
    [wrap],
  );

  const remove = useCallback(
    async (id: string) => {
      await wrap(async () => {
        await deleteIcpDefinition(id);
        return null;
      });
      if (options.onSuccess) options.onSuccess(null);
    },
    [wrap, options],
  );

  return {
    loading,
    error,
    create,
    promote,
    update,
    updateTuning: updateTuningFn,
    remove,
  };
}
