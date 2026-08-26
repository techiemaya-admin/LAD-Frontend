import { useState, useEffect, useCallback } from 'react';
import { getTenantDetail } from '../api';
import type { TenantDetail } from '../types';

export function useTenantDetail(tenantId: string | null) {
  const [data, setData] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    if (!tenantId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setData(await getTenantDetail(tenantId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load tenant detail'));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
