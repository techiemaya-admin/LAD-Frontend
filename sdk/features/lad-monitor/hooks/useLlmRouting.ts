import { useState, useEffect, useCallback } from 'react';
import {
  getLlmRoutingMeta,
  getTenantLlmRouting,
  setLlmRoutingChain,
  clearLlmRoutingChain,
  validateLlmRoutingChain,
} from '../api';
import type { LlmRoutingFeature, LlmRoutingMeta, LlmRoutingEntry } from '../types';

/**
 * Per-tenant, per-feature LLM routing for the admin console.
 *
 * `meta` (providers + which features are provider-locked) is fetched once and
 * kept across tenant switches - it does not vary by tenant, and refetching it
 * on every switch makes the picker flicker.
 *
 * Saving a chain returns the tenant's full routing set, so the caller does not
 * need a follow-up read.
 */
export function useLlmRouting(tenantId: string | null) {
  const [meta, setMeta] = useState<LlmRoutingMeta | null>(null);
  const [features, setFeatures] = useState<LlmRoutingFeature[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let cancelled = false;
    getLlmRoutingMeta()
      .then((m) => !cancelled && setMeta(m))
      .catch((err) => !cancelled && setError(err instanceof Error ? err : new Error('Failed to load routing metadata')));
    return () => {
      cancelled = true;
    };
  }, []);

  const refetch = useCallback(async () => {
    if (!tenantId) {
      setFeatures([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setFeatures(await getTenantLlmRouting(tenantId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load tenant routing'));
      setFeatures([]);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const saveChain = useCallback(
    async (featureKey: string, chain: LlmRoutingEntry[]) => {
      if (!tenantId) return;
      setSaving(true);
      setError(null);
      try {
        setFeatures(await setLlmRoutingChain(tenantId, featureKey, chain));
      } catch (err) {
        // Surfaced rather than swallowed: a rejected save usually means the
        // model has no active pricing, and the admin needs to see why.
        setError(err instanceof Error ? err : new Error('Failed to save routing'));
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [tenantId]
  );

  const clearChain = useCallback(
    async (featureKey: string) => {
      if (!tenantId) return;
      setSaving(true);
      setError(null);
      try {
        await clearLlmRoutingChain(tenantId, featureKey);
        await refetch();
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to clear routing'));
        throw err;
      } finally {
        setSaving(false);
      }
    },
    [tenantId, refetch]
  );

  const validateChain = useCallback(
    (featureKey: string, chain: LlmRoutingEntry[]) =>
      tenantId
        ? validateLlmRoutingChain(tenantId, featureKey, chain)
        : Promise.resolve({ ok: false, error: 'No tenant selected' }),
    [tenantId]
  );

  return { meta, features, loading, saving, error, refetch, saveChain, clearChain, validateChain };
}
