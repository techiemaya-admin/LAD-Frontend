/**
 * useCampaignStats Hook
 * 
 * Manages campaign statistics and metrics
 */

import { useState, useCallback } from 'react';
import * as api from '../api';
import type { CampaignStats } from '../types';

export function useCampaignStats() {
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCampaignStats();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load campaign stats'));
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    stats,
    loading,
    error,
    load,
  };
}
