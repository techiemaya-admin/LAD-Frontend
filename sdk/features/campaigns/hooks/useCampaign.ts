/**
 * useCampaign Hook
 * 
 * Manages single campaign with update, activation, and execution actions
 */

import { useState, useCallback } from 'react';
import * as api from '../api';
import type {
  Campaign,
  CampaignUpdateInput,
  CampaignExecuteOptions,
} from '../types';

export function useCampaign(campaignId: string) {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCampaign(campaignId);
      setCampaign(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load campaign'));
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const update = useCallback(async (data: CampaignUpdateInput) => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await api.updateCampaign(campaignId, data);
      setCampaign(updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update campaign'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const activate = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await api.activateCampaign(campaignId);
      setCampaign(updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to activate campaign'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const pause = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await api.pauseCampaign(campaignId);
      setCampaign(updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to pause campaign'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const archive = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await api.archiveCampaign(campaignId);
      setCampaign(updated);
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to archive campaign'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const execute = useCallback(async (options?: CampaignExecuteOptions) => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.executeCampaign(campaignId, options);
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to execute campaign'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  return {
    campaign,
    loading,
    error,
    load,
    update,
    activate,
    pause,
    archive,
    execute,
  };
}
