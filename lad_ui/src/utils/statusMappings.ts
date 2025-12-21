/**
 * Status and Stage Mapping Utilities
 * Provides label mapping for lead statuses and stages
 */

import { normalizeFieldNames } from './fieldMappings';

interface StatusOption {
  key?: string;
  value?: string;
  label?: string;
  name?: string;
  [key: string]: unknown;
}

interface StageOption {
  key?: string;
  id?: string;
  label?: string;
  name?: string;
  [key: string]: unknown;
}

interface Lead {
  status?: string;
  stage?: string;
  [key: string]: unknown;
}

// Status mappings (key -> label)
export const STATUS_MAPPINGS: Record<string, string> = {
  'active': 'Active',
  'won': 'Won',
  'lost': 'Lost',
  'on_hold': 'On Hold',
  'archived': 'Archived',
  'pending': 'Pending',
  'blocked': 'Blocked',
  'inactive': 'Inactive',
  'new': 'New',
  'completed': 'Completed'
};

// Default stage mappings (key -> label) - can be overridden by dynamic stages
export const DEFAULT_STAGE_MAPPINGS: Record<string, string> = {
  'lead': 'Lead',
  'prospect': 'Prospect', 
  'qualified': 'Qualified',
  'proposal': 'Proposal',
  'negotiation': 'Negotiation',
  'won': 'Won',
  'lost': 'Lost'
};

/**
 * Get status label from status key
 * @param statusKey - The status key (e.g., 'active', 'won')
 * @param statusOptions - Optional array of status objects with key/label properties
 * @returns The display label (e.g., 'Active', 'Won')
 */
export const getStatusLabel = (statusKey: string | null | undefined, statusOptions: StatusOption[] = []): string => {
  if (!statusKey) return 'Unknown';
  
  // First try to find in provided status options (dynamic data)
  if (Array.isArray(statusOptions) && statusOptions.length > 0) {
    const status = statusOptions.find(s => s.key === statusKey || s.value === statusKey);
    if (status) {
      return status.label || status.name || statusKey;
    }
  }
  
  // Fallback to hardcoded mappings
  return STATUS_MAPPINGS[statusKey] || statusKey || 'Unknown';
};

/**
 * Get stage label from stage key and stages data
 * @param stageKey - The stage key
 * @param stages - Array of stage objects with key/label properties
 * @returns The display label
 */
export const getStageLabel = (stageKey: string | null | undefined, stages: StageOption[] = []): string => {
  if (!stageKey) return 'Unknown';
  
  // First try to find in provided stages data
  const stage = stages.find(s => s.key === stageKey || s.id === stageKey);
  if (stage) {
    return stage.label || stage.name || stageKey;
  }
  
  // Fallback to default mappings
  return DEFAULT_STAGE_MAPPINGS[stageKey] || stageKey || 'Unknown';
};

/**
 * Get all available status options for dropdowns
 * @returns Array of {key, label} objects
 */
export const getStatusOptions = (): Array<{ key: string; label: string; value: string }> => {
  return Object.entries(STATUS_MAPPINGS).map(([key, label]) => ({
    key,
    label,
    value: key
  }));
};

/**
 * Get stage options from stages data
 * @param stages - Array of stage objects
 * @returns Array of {key, label} objects
 */
export const getStageOptions = (stages: StageOption[] = []): Array<{ key: string; label: string; value: string }> => {
  return stages.map(stage => ({
    key: stage.key || String(stage.id || ''),
    label: stage.label || stage.name || '',
    value: stage.key || String(stage.id || '')
  }));
};

/**
 * Enhance lead data with display labels and normalize field names
 * @param lead - Lead object with status and stage keys
 * @param stages - Array of stage objects
 * @returns Lead object with additional status_label and stage_label properties and normalized field names
 */
export const enhanceLeadWithLabels = (lead: Lead | null | undefined, stages: StageOption[] = []): Lead => {
  if (!lead) return lead as Lead;
  
  // Use the comprehensive field normalization utility
  const normalizedLead = normalizeFieldNames(lead);
  
  return {
    ...normalizedLead,
    status_label: getStatusLabel(normalizedLead.status, []),
    stage_label: getStageLabel(normalizedLead.stage, stages)
  };
};

/**
 * Enhance multiple leads with display labels
 * @param leads - Array of lead objects
 * @param stages - Array of stage objects
 * @returns Array of enhanced lead objects
 */
export const enhanceLeadsWithLabels = (leads: Lead[] = [], stages: StageOption[] = []): Lead[] => {
  return leads.map(lead => enhanceLeadWithLabels(lead, stages));
};
