/**
 * LinkedIn Message Templates - TypeScript Type Definitions
 */

/**
 * LinkedIn Message Template
 */
export interface LinkedInMessageTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  /** Single message body (canonical). */
  content?: string | null;
  /** Alias of `content` (kept for back-compat with older consumers). */
  message?: string | null;
  connection_message: string | null;
  followup_message: string | null;
  /** Template type: 'linkedin_connection' | 'linkedin_followup'. */
  category: string | null;
  tags: string[] | null;
  is_default: boolean;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  metadata: Record<string, any>;
}

/**
 * Coarse media category for a template attachment.
 */
export type TemplateMediaType = 'image' | 'video' | 'audio' | 'document';

/**
 * Media attachment stored on a template (lives in metadata.media_* on the backend).
 */
export interface TemplateMedia {
  media_url: string;
  media_type?: TemplateMediaType | string | null;
  media_filename?: string | null;
}

/**
 * Result of a template media upload (see uploadTemplateMedia).
 */
export interface TemplateMediaUploadResult {
  success: boolean;
  url: string;
  path: string;
  filename: string;
  media_type: TemplateMediaType | string;
  mime_type: string;
}

/**
 * Request to create new template.
 * Media fields are flat here (media_url/media_type/media_filename); the backend
 * folds them into the template's metadata JSONB.
 */
export interface CreateTemplateRequest {
  name: string;
  description?: string;
  /** Single message body (canonical). */
  content?: string;
  /** Template type. Defaults to 'linkedin_connection' server-side. */
  category?: string;
  /** @deprecated use `content` - still accepted server-side as the body. */
  connection_message?: string;
  /** @deprecated use `content` - still accepted server-side as the body. */
  followup_message?: string;
  tags?: string[];
  is_default?: boolean;
  is_active?: boolean;
  media_url?: string | null;
  media_type?: TemplateMediaType | string | null;
  media_filename?: string | null;
}

/**
 * Request to update template.
 * Set media_url to null to clear an existing attachment.
 */
export interface UpdateTemplateRequest {
  name?: string;
  description?: string;
  /** Single message body (canonical). */
  content?: string;
  /** Template type. */
  category?: string;
  /** @deprecated use `content` - still accepted server-side as the body. */
  connection_message?: string;
  /** @deprecated use `content` - still accepted server-side as the body. */
  followup_message?: string;
  tags?: string[];
  is_default?: boolean;
  is_active?: boolean;
  media_url?: string | null;
  media_type?: TemplateMediaType | string | null;
  media_filename?: string | null;
}

/**
 * Filters for querying templates
 */
export interface TemplateFilters {
  is_active?: boolean;
  category?: string;
}

/**
 * Template with personalized messages (for preview)
 */
export interface PersonalizedTemplate {
  template: LinkedInMessageTemplate;
  personalizedConnectionMessage: string | null;
  personalizedFollowupMessage: string | null;
}

/**
 * Template category options
 */
export const TEMPLATE_CATEGORIES = [
  'sales',
  'recruiting',
  'networking',
  'partnership',
  'custom'
] as const;

export type TemplateCategory = typeof TEMPLATE_CATEGORIES[number];

/**
 * Template type (what the single body is used for). The connection request note
 * is text-only and 300-char capped; the follow-up message allows media and any
 * length.
 */
export const TEMPLATE_TYPES = [
  { value: 'linkedin_connection', label: 'Connection request' },
  { value: 'linkedin_followup', label: 'Follow-up message' },
] as const;

export type TemplateType = typeof TEMPLATE_TYPES[number]['value'];

/** Friendly label for a template's type (`category`). */
export function templateTypeLabel(category?: string | null): string {
  const match = TEMPLATE_TYPES.find((t) => t.value === category);
  return match ? match.label : (category || '');
}

/**
 * Variable placeholders for personalization
 */
export const MESSAGE_VARIABLES = {
  FIRST_NAME: '{{first_name}}',
  LAST_NAME: '{{last_name}}',
  FULL_NAME: '{{full_name}}',
  COMPANY: '{{company}}',
  TITLE: '{{title}}',
  LOCATION: '{{location}}',
} as const;

/**
 * LinkedIn connection message character limit
 */
export const CONNECTION_MESSAGE_MAX_LENGTH = 300;
