/**
 * Campaigns Feature - useCampaignLeads Hook
 * 
 * React hook for fetching campaign leads.
 * Framework-independent (no Next.js imports).
 */

import { useState, useCallback, useEffect } from 'react';
import { getCampaignLeads, getLeadProfileSummary, generateLeadProfileSummary } from '../api';
import type { CampaignLead } from '../types';

export interface UseCampaignLeadsReturn {
  leads: CampaignLead[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getSummary: (leadId: string) => Promise<{ summary: string | null; exists: boolean }>;
  generateSummary: (leadId: string) => Promise<{ summary: string }>;
  clearError: () => void;
}

export function useCampaignLeads(
  campaignId: string | null,
  filters?: { search?: string }
): UseCampaignLeadsReturn {
  const [leads, setLeads] = useState<CampaignLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeads = useCallback(async () => {
    if (!campaignId) {
      setLeads([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getCampaignLeads(campaignId, filters);
      setLeads(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load campaign leads';
      setError(errorMessage);
      console.error('[campaigns] Failed to load leads:', err);
    } finally {
      setLoading(false);
    }
  }, [campaignId, filters]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const getSummary = useCallback(
    async (leadId: string): Promise<{ summary: string | null; exists: boolean }> => {
      if (!campaignId) {
        throw new Error('Campaign ID is required');
      }

      try {
        setError(null);
        return await getLeadProfileSummary(campaignId, leadId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to get lead summary';
        setError(errorMessage);
        throw err;
      }
    },
    [campaignId]
  );

  const generateSummary = useCallback(
    async (leadId: string): Promise<{ summary: string }> => {
      if (!campaignId) {
        throw new Error('Campaign ID is required');
      }

      try {
        setError(null);
        return await generateLeadProfileSummary(campaignId, leadId);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to generate lead summary';
        setError(errorMessage);
        throw err;
      }
    },
    [campaignId]
  );

  return {
    leads,
    loading,
    error,
    refetch: fetchLeads,
    getSummary,
    generateSummary,
    clearError: () => setError(null),
  };
}

