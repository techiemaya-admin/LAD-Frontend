/**
 * useCampaignSteps Hook
 * 
 * Manages campaign steps with auto-sorting by step_order
 */

import { useState, useCallback } from 'react';
import * as api from '../api';
import type {
  CampaignStep,
  CampaignStepInput,
} from '../types';

export function useCampaignSteps(campaignId: string) {
  const [steps, setSteps] = useState<CampaignStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCampaignSteps(campaignId);
      setSteps(data.sort((a, b) => a.step_order - b.step_order));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load campaign steps'));
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const add = useCallback(async (step: CampaignStepInput) => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const newStep = await api.addCampaignStep(campaignId, step);
      setSteps(prev => [...prev, newStep].sort((a, b) => a.step_order - b.step_order));
      return newStep;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add campaign step'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const update = useCallback(async (stepId: string, data: Partial<CampaignStepInput>) => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const updated = await api.updateCampaignStep(campaignId, stepId, data);
      setSteps(prev =>
        prev.map(s => (s.id === stepId ? updated : s)).sort((a, b) => a.step_order - b.step_order)
      );
      return updated;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to update campaign step'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const remove = useCallback(async (stepId: string) => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      await api.deleteCampaignStep(campaignId, stepId);
      setSteps(prev => prev.filter(s => s.id !== stepId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to delete campaign step'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  return {
    steps,
    loading,
    error,
    load,
    add,
    update,
    remove,
  };
}
