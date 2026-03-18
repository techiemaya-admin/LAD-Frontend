/**
 * Email Template — SDK Types
 * LAD Architecture: SDK Layer — shared TypeScript contracts
 */

export type EmailCategory = 'email_send' | 'email_followup';

/** Content format of the template */
export type ContentFormat = 'plain_text' | 'html' | 'markdown';

export interface EmailTemplate {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: EmailCategory;
  subject: string;
  /** Content format: plain_text | html | markdown */
  content_format: ContentFormat;
  /** Plain-text body — always present; also the plain-text fallback for HTML emails */
  body: string;
  /** Full HTML markup — present only when content_format = 'html' */
  body_html: string | null;
  tags: string[];
  is_default: boolean;
  is_active: boolean;
  usage_count: number;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateEmailTemplateInput {
  name: string;
  subject: string;
  /** Plain-text body (required; serves as fallback for HTML emails) */
  body: string;
  /** Full HTML markup — supply to create an HTML email template */
  body_html?: string;
  /** Defaults to 'html' when body_html is provided, else 'plain_text' */
  content_format?: ContentFormat;
  category?: EmailCategory;
  description?: string;
  tags?: string[];
  is_default?: boolean;
}

export interface UpdateEmailTemplateInput {
  name?: string;
  subject?: string;
  body?: string;
  /** Pass null to clear HTML and revert to plain_text */
  body_html?: string | null;
  content_format?: ContentFormat;
  category?: EmailCategory;
  description?: string;
  tags?: string[];
  is_default?: boolean;
  is_active?: boolean;
}

export interface EmailTemplateListFilters {
  is_active?: boolean;
  category?: EmailCategory;
}

export interface EmailTemplateApiResponse {
  success: boolean;
  data: EmailTemplate;
}

export interface EmailTemplateListApiResponse {
  success: boolean;
  data: EmailTemplate[];
  count: number;
}
