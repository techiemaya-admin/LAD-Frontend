/**
 * useCampaignLeads Hook
 * 
 * Manages leads within a campaign
 */

import { useState, useCallback } from 'react';
import * as api from '../api';
import type {
  CampaignLead,
  AddLeadsInput,
} from '../types';

export function useCampaignLeads(campaignId: string) {
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await api.getCampaignLeads(campaignId);
      setLeads(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load campaign leads'));
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const addLeads = useCallback(async (data: AddLeadsInput) => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.addLeadsToCampaign(campaignId, data);
      // Reload leads to get updated list
      await load();
      return result;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to add leads to campaign'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [campaignId, load]);

  const removeLead = useCallback(async (leadId: string) => {
    if (!campaignId) return;
    setLoading(true);
    setError(null);
    try {
      await api.removeLeadFromCampaign(campaignId, leadId);
      setLeads(prev => prev.filter(l => l.lead_id !== leadId));
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to remove lead from campaign'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  return {
    leads,
    loading,
    error,
    load,
    addLeads,
    removeLead,
  };
}
