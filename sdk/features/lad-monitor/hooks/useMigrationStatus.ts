import { useState, useEffect, useCallback } from 'react';
import { getMigrationStatus } from '../api';
import type { MigrationStatusData } from '../types';

/** R4 - read-only per-tenant migration drift matrix. */
export function useMigrationStatus() {
  const [data, setData] = useState<MigrationStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getMigrationStatus());
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load migration status'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
