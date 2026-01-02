/**
 * ICP to Campaign Mapper
 * 
 * Maps ICP onboarding answers (from ChatStepController) to campaign creation format
 * Handles conversion between different key naming conventions
 */

export interface ICPAnswers {
  // ICP onboarding keys (from ChatStepController)
  icp_industries?: string | string[];
  icp_locations?: string | string[];
  icp_roles?: string | string[];
  selected_platforms?: string | string[];
  campaign_name?: string;
  campaign_days?: number | string;
  working_days?: string | string[];
  campaign_goal?: string;
  leads_per_day?: number | string;
  
  // Platform-specific actions
  linkedin_actions?: string | string[];
  whatsapp_actions?: string | string[];
  email_actions?: string | string[];
  voice_actions?: string | string[];
  
  // Platform-specific templates
  linkedin_template?: string;
  whatsapp_template?: string;
  email_template?: string;
  voice_template?: string;
  
  // Workflow settings
  workflow_delays?: string | Record<string, any>;
  workflow_conditions?: string;
  
  // Legacy keys (from GuidedFlowPanel)
  industries?: string | string[];
  location?: string;
  roles?: string | string[];
  platforms?: string | string[];
  
  // Other fields
  [key: string]: any;
}

export interface CampaignFormattedAnswers {
  // Lead generation filters
  industries?: string[];
  location?: string;
  roles?: string[];
  
  // Platform selection
  platforms?: string[];
  
  // Campaign settings
  campaign_name?: string;
  campaign_days?: number;
  working_days?: string[];
  campaign_goal?: string;
  leads_per_day?: number;
  
  // Platform actions
  linkedin_actions?: string[];
  whatsapp_actions?: string[];
  email_actions?: string[];
  voice_actions?: string[];
  
  // Platform templates
  linkedin_template?: string;
  whatsapp_template?: string;
  email_template?: string;
  voice_template?: string;
  
  // Workflow settings
  workflow_delays?: Record<string, any>;
  workflow_conditions?: string;
  
  // Keep all other fields
  [key: string]: any;
}

/**
 * Normalize array or string to array
 */
function normalizeToArray(value: string | string[] | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(v => v && String(v).trim() !== '');
  if (typeof value === 'string') {
    // Handle comma-separated strings
    if (value.includes(',')) {
      return value.split(',').map(v => v.trim()).filter(v => v !== '');
    }
    return [value.trim()].filter(v => v !== '');
  }
  return [];
}

/**
 * Normalize to single string (for location)
 */
function normalizeToString(value: string | string[] | undefined): string | undefined {
  if (!value) return undefined;
  if (typeof value === 'string') return value.trim() || undefined;
  if (Array.isArray(value)) {
    // For location, join with comma if multiple
    const filtered = value.filter(v => v && String(v).trim() !== '').map(v => String(v).trim());
    return filtered.length > 0 ? filtered.join(', ') : undefined;
  }
  return undefined;
}

/**
 * Normalize to number
 */
function normalizeToNumber(value: number | string | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return isNaN(parsed) ? undefined : parsed;
  }
  return undefined;
}

/**
 * Map ICP onboarding answers to campaign creation format
 * 
 * @param icpAnswers - Answers from ChatStepController (with icp_* keys)
 * @returns Formatted answers compatible with GuidedFlowPanel and campaign creation
 */
export function mapICPAnswersToCampaign(icpAnswers: ICPAnswers): CampaignFormattedAnswers {
  const mapped: CampaignFormattedAnswers = {
    // Don't spread icpAnswers directly - map fields explicitly to ensure correct types
  };

  // Map industries: icp_industries -> industries
  if (icpAnswers.icp_industries) {
    mapped.industries = normalizeToArray(icpAnswers.icp_industries);
  } else if (icpAnswers.industries) {
    // Support legacy format
    mapped.industries = normalizeToArray(icpAnswers.industries);
  }

  // Map location: icp_locations -> location (single string)
  if (icpAnswers.icp_locations) {
    mapped.location = normalizeToString(icpAnswers.icp_locations);
  } else if (icpAnswers.location) {
    // Support legacy format
    mapped.location = normalizeToString(icpAnswers.location);
  }

  // Map roles: icp_roles -> roles
  if (icpAnswers.icp_roles) {
    mapped.roles = normalizeToArray(icpAnswers.icp_roles);
  } else if (icpAnswers.roles) {
    // Support legacy format
    mapped.roles = normalizeToArray(icpAnswers.roles);
  }

  // Map platforms: selected_platforms -> platforms
  if (icpAnswers.selected_platforms) {
    mapped.platforms = normalizeToArray(icpAnswers.selected_platforms).map(p => {
      // Normalize platform names to lowercase
      const platform = String(p).toLowerCase().trim();
      // Handle variations
      if (platform.includes('linkedin')) return 'linkedin';
      if (platform.includes('whatsapp')) return 'whatsapp';
      if (platform.includes('email')) return 'email';
      if (platform.includes('voice')) return 'voice';
      if (platform.includes('instagram')) return 'instagram';
      return platform;
    });
  } else if (icpAnswers.platforms) {
    // Support legacy format
    mapped.platforms = normalizeToArray(icpAnswers.platforms);
  }

  // Map campaign settings
  if (icpAnswers.campaign_name) {
    mapped.campaign_name = String(icpAnswers.campaign_name).trim();
  }

  if (icpAnswers.campaign_days !== undefined) {
    mapped.campaign_days = normalizeToNumber(icpAnswers.campaign_days);
  }

  if (icpAnswers.working_days) {
    mapped.working_days = normalizeToArray(icpAnswers.working_days);
  }

  if (icpAnswers.campaign_goal) {
    mapped.campaign_goal = String(icpAnswers.campaign_goal).trim();
  }

  if (icpAnswers.leads_per_day !== undefined) {
    mapped.leads_per_day = normalizeToNumber(icpAnswers.leads_per_day);
  }

  // Map platform actions (normalize to arrays)
  if (icpAnswers.linkedin_actions) {
    mapped.linkedin_actions = normalizeToArray(icpAnswers.linkedin_actions);
  }

  if (icpAnswers.whatsapp_actions) {
    mapped.whatsapp_actions = normalizeToArray(icpAnswers.whatsapp_actions);
  }

  if (icpAnswers.email_actions) {
    mapped.email_actions = normalizeToArray(icpAnswers.email_actions);
  }

  if (icpAnswers.voice_actions) {
    mapped.voice_actions = normalizeToArray(icpAnswers.voice_actions);
  }

  // Map platform templates (keep as strings)
  if (icpAnswers.linkedin_template) {
    mapped.linkedin_template = String(icpAnswers.linkedin_template).trim();
  }

  if (icpAnswers.whatsapp_template) {
    mapped.whatsapp_template = String(icpAnswers.whatsapp_template).trim();
  }

  if (icpAnswers.email_template) {
    mapped.email_template = String(icpAnswers.email_template).trim();
  }

  if (icpAnswers.voice_template) {
    mapped.voice_template = String(icpAnswers.voice_template).trim();
  }

  // Map workflow settings
  if (icpAnswers.workflow_delays) {
    if (typeof icpAnswers.workflow_delays === 'string') {
      try {
        mapped.workflow_delays = JSON.parse(icpAnswers.workflow_delays);
      } catch {
        mapped.workflow_delays = { value: icpAnswers.workflow_delays };
      }
    } else {
      mapped.workflow_delays = icpAnswers.workflow_delays;
    }
  }

  if (icpAnswers.workflow_conditions) {
    mapped.workflow_conditions = String(icpAnswers.workflow_conditions).trim();
  }

  return mapped;
}

/**
 * Build lead generation filters from mapped answers
 * This format is expected by the backend LeadGenerationService
 */
export function buildLeadGenerationFilters(mappedAnswers: CampaignFormattedAnswers): {
  roles?: string[];
  industries?: string[];
  location?: string;
} {
  const filters: {
    roles?: string[];
    industries?: string[];
    location?: string;
  } = {};

  if (mappedAnswers.roles && mappedAnswers.roles.length > 0) {
    filters.roles = mappedAnswers.roles;
  }

  if (mappedAnswers.industries && mappedAnswers.industries.length > 0) {
    // Filter out invalid industries (at least 2 characters)
    filters.industries = mappedAnswers.industries.filter(industry => {
      const trimmed = String(industry).trim();
      return trimmed.length >= 2 && !trimmed.match(/^[a-z]$/i);
    });
  }

  if (mappedAnswers.location) {
    filters.location = mappedAnswers.location;
  }

  return filters;
}

