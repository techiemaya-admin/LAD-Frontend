import { useState, useEffect, useCallback } from 'react';
import { getMonitorTenants } from '../api';
import type { TenantHealth, DateRangeParams } from '../types';

export function useMonitorTenants(
  params?: DateRangeParams & { includeConversations?: boolean }
) {
  const [data, setData] = useState<TenantHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const startDate = params?.startDate;
  const endDate = params?.endDate;
  const includeConversations = params?.includeConversations !== false;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getMonitorTenants({ startDate, endDate, includeConversations }));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load tenants'));
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, includeConversations]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, loading, error, refetch: fetch };
}
