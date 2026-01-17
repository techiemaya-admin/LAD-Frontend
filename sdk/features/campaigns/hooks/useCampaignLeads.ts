/**
 * Campaigns Feature - useCampaignLeads Hook
 * 
 * React hook for fetching campaign leads.
 * Framework-independent (no Next.js imports).
 */

import { useState, useCallback, useEffect } from 'react';
import { getCampaignLeads, getLeadProfileSummary, generateLeadProfileSummary, revealLeadEmail, revealLeadPhone } from '../api';
import type { CampaignLead } from '../types';

export interface UseCampaignLeadsReturn {
  leads: CampaignLead[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  getSummary: (leadId: string) => Promise<{ summary: string | null; exists: boolean }>;
  generateSummary: (leadId: string) => Promise<{ summary: string }>;
  revealEmail: (leadId: string, apolloPersonId: string) => Promise<{ email: string; from_cache: boolean; credits_used: number }>;
  revealPhone: (leadId: string, apolloPersonId: string) => Promise<{ phone: string; from_cache: boolean; credits_used: number; processing?: boolean; message?: string }>;
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

  const revealEmail = useCallback(
    async (leadId: string, apolloPersonId: string): Promise<{ email: string; from_cache: boolean; credits_used: number }> => {
      if (!campaignId) {
        throw new Error('Campaign ID is required');
      }

      try {
        setError(null);
        const result = await revealLeadEmail(campaignId, leadId, apolloPersonId);
        
        // Update local state with revealed email
        setLeads(prevLeads => 
          prevLeads.map(lead => 
            lead.id === leadId 
              ? { ...lead, email: result.email }
              : lead
          )
        );
        
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to reveal email';
        setError(errorMessage);
        throw err;
      }
    },
    [campaignId]
  );

  const revealPhone = useCallback(
    async (leadId: string, apolloPersonId: string): Promise<{ phone: string; from_cache: boolean; credits_used: number; processing?: boolean; message?: string }> => {
      if (!campaignId) {
        throw new Error('Campaign ID is required');
      }

      try {
        setError(null);
        const result = await revealLeadPhone(campaignId, leadId, apolloPersonId);
        
        // Update local state with revealed phone (if available immediately)
        if (result.phone && !result.processing) {
          setLeads(prevLeads => 
            prevLeads.map(lead => 
              lead.id === leadId 
                ? { ...lead, phone: result.phone }
                : lead
            )
          );
        }
        
        return result;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to reveal phone';
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
    revealEmail,
    revealPhone,
    clearError: () => setError(null),
  };
}

