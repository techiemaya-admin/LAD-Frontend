/**
 * useBusinessProfile
 *
 * Single hook for the 14-field business profile. Read on mount; write via
 * `save(partial)`; expose computed completeness so wizard / Settings /
 * chat all show the same "X / 14" indicator.
 *
 * Follows the raw useState/useEffect convention used by other hooks in
 * this SDK (see useActiveIcpDefinition.ts — TanStack Query is intentionally
 * NOT used here).
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  BusinessProfile,
  computeCompleteness,
  emptyBusinessProfile,
  type BusinessProfileCompleteness,
} from '../businessProfile';
import { getBusinessProfile, saveBusinessProfile } from '../businessProfileApi';

export interface UseBusinessProfileResult {
  /** The merged profile (server state + any locally-saved partial). Always
   *  defined; starts as `emptyBusinessProfile()` until the first load completes. */
  profile: BusinessProfile;
  /** True while the initial load is in flight. */
  loading: boolean;
  /** True while a save() call is in flight. */
  saving: boolean;
  /** Most recent load OR save error, or null. */
  error: Error | null;
  /** Persist a partial update. Optimistically merges into local state so
   *  the UI reflects the change immediately; rolls back on server error. */
  save: (partial: Partial<BusinessProfile>) => Promise<BusinessProfile>;
  /** Re-fetch from the server. */
  refetch: () => Promise<void>;
  /** Shared completeness math — same source as the discovery drawer. */
  completeness: BusinessProfileCompleteness;
}

export function useBusinessProfile(): UseBusinessProfileResult {
  const [profile, setProfile] = useState<BusinessProfile>(() => emptyBusinessProfile());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Tracks the in-flight initial load so save() can wait for it. Without this a
  // caller that saves before the GET resolves merges its partial onto
  // emptyBusinessProfile() — every canonical key set to '' — and the POST then
  // overwrites the real stored values with blanks. The backend's all-empty
  // guard does not catch it, because the partial supplies at least one
  // non-blank field.
  // Mirror of `profile` that save() can read synchronously.
  const profileRef = useRef<BusinessProfile>(profile);

  const loadPromiseRef = useRef<Promise<void> | null>(null);
  // False until a load actually returns. A fresh tenant with no profile row
  // counts as loaded (getBusinessProfile resolves null); only a thrown request
  // leaves this false.
  const loadedRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const run = (async () => {
      try {
        const result = await getBusinessProfile();
        // Merge server state on top of the empty defaults so the form always
        // has every canonical key (avoids `value={undefined}` warnings on inputs).
        const next = { ...emptyBusinessProfile(), ...(result || {}) };
        profileRef.current = next;
        setProfile(next);
        loadedRef.current = true;
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load business profile'));
      } finally {
        setLoading(false);
      }
    })();
    loadPromiseRef.current = run;
    return run;
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (partial: Partial<BusinessProfile>): Promise<BusinessProfile> => {
      // Never merge onto the empty defaults — wait for the initial load so the
      // POST carries the tenant's real stored values, not blanks.
      if (loadPromiseRef.current) await loadPromiseRef.current;
      if (!loadedRef.current) {
        // The load failed, so `profile` is still all-blank defaults. Saving now
        // would write those blanks over the tenant's real data. Refuse — a
        // visible "couldn't save" beats a silent wipe. One retry first, in case
        // the failure was transient.
        await load();
        if (!loadedRef.current) {
          const e = new Error(
            'Could not load your current profile, so nothing was saved. Check your connection and try again.',
          );
          setError(e);
          throw e;
        }
      }

      // The backend merges icp_data, but we still send a fully-merged object so
      // non-canonical extras (linkedinAudit, blogUrls) survive.
      //
      // The snapshot comes from a ref, not from a functional setState — React
      // does not guarantee the updater runs synchronously, so reading the merged
      // value straight after setProfile() could send the pre-merge object.
      const snapshot = profileRef.current;
      const merged: BusinessProfile = { ...snapshot, ...partial };
      profileRef.current = merged;
      setProfile(merged);
      setSaving(true);
      setError(null);
      try {
        await saveBusinessProfile(merged);
        return merged;
      } catch (err) {
        profileRef.current = snapshot;
        setProfile(snapshot); // rollback
        const e = err instanceof Error ? err : new Error('Failed to save business profile');
        setError(e);
        throw e;
      } finally {
        setSaving(false);
      }
    },
    [load],
  );

  return {
    profile,
    loading,
    saving,
    error,
    save,
    refetch: load,
    completeness: computeCompleteness(profile),
  };
}
