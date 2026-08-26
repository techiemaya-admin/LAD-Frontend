/**
 * Instagram Message Templates - TypeScript Type Definitions
 *
 * Instagram DMs are free-form (no Meta template approval like WhatsApp Business),
 * so these templates are reusable saved messages with {{placeholder}} variables.
 * Backed by the unified communication_templates table (channel = 'instagram').
 */

/**
 * Instagram Message Template
 */
export interface InstagramMessageTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  content: string;
  category: string; // 'instagram_dm'
  tags: string[] | null;
  is_default: boolean;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  metadata: Record<string, any>; // { media_url?: string }
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Request to create new template
 */
export interface CreateInstagramTemplateRequest {
  name: string;
  content: string;
  description?: string;
  tags?: string[];
  is_default?: boolean;
  media_url?: string;
}

/**
 * Request to update template
 */
export interface UpdateInstagramTemplateRequest {
  name?: string;
  content?: string;
  description?: string;
  tags?: string[];
  is_default?: boolean;
  is_active?: boolean;
  media_url?: string;
}

/**
 * Filters for querying templates
 */
export interface InstagramTemplateFilters {
  is_active?: boolean;
}

/**
 * Variable placeholders for personalization
 */
export const INSTAGRAM_MESSAGE_VARIABLES = {
  FIRST_NAME: '{{first_name}}',
  LAST_NAME: '{{last_name}}',
  FULL_NAME: '{{full_name}}',
  USERNAME: '{{username}}',
  COMPANY: '{{company}}',
} as const;

/**
 * Instagram DM soft length guidance.
 * Instagram has no fixed template character cap (unlike LinkedIn's 300 for
 * connection requests), but very long DMs perform poorly - this is advisory.
 */
export const INSTAGRAM_DM_RECOMMENDED_MAX_LENGTH = 1000;
