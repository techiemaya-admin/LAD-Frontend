import { useState, useEffect, useCallback } from 'react';
import { getCloudLogs, getCloudLogServices } from '../api';
import type { CloudLogEntry, CloudLogParams } from '../types';

export function useCloudLogs(params?: CloudLogParams) {
  const [entries, setEntries] = useState<CloudLogEntry[]>([]);
  const [services, setServices] = useState<string[]>([]);
  const [configured, setConfigured] = useState<boolean>(true);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const severity = params?.severity;
  const service = params?.service;
  const limit = params?.limit;

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getCloudLogs({ severity, service, limit });
      setEntries(res.entries || []);
      setNextPageToken(res.nextPageToken || null);
      setConfigured(res.configured !== false);
      if (res.error) setError(new Error(res.error));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load logs'));
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [severity, service, limit]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  // Service-name filter options (load once).
  useEffect(() => {
    getCloudLogServices()
      .then(setServices)
      .catch(() => setServices([]));
  }, []);

  return { entries, services, configured, nextPageToken, loading, error, refetch: fetch };
}
