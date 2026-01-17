/**
 * Deals Pipeline Types
 * Type definitions for leads and pipeline management
 */

export interface Lead {
  id: string | number;
  name?: string | null;
  company_name: string;
  company?: string | null;
  contact_name?: string | null;
  email?: string | null;
  phone?: string | null;
  stage: string;
  status: string;
  priority?: string | null;
  source?: string | null;
  value?: number | null;
  amount?: number | null;
  probability?: number | null;
  assigned_to?: string | number | null;
  assigned_to_id?: string | number | null;
  assignee?: string | number | null;
  organization_id: string | number;
  created_at: string;
  updated_at: string;
  last_contacted?: string | null;
  next_followup?: string | null;
  notes?: string | null;
  description?: string | null;
  tags?: string[] | string | null;
  goals?: string[] | string | null;
  metadata?: Record<string, any>;
  is_deleted?: boolean;
  avatar?: string | null;
  // Additional fields
  deal_size?: number | null;
  expected_close_date?: string | null;
  expectedCloseDate?: string | null;
  close_date?: string | null;
  closeDate?: string | null;
  lead_score?: number | null;
  industry?: string | null;
  company_size?: string | null;
  website?: string | null;
  linkedin?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  zip_code?: string | null;
  // Index signature for flexible field access
  [key: string]: any;
}

export interface Note {
  id: string | number;
  lead_id: string | number;
  content: string;
  created_by?: string | number | null;
  created_at: string;
  updated_at?: string;
}

export interface Comment {
  id: string | number;
  lead_id: string | number;
  content: string;
  created_by?: string | number | null;
  created_at: string;
  updated_at?: string;
}

export interface Attachment {
  id: string | number;
  lead_id: string | number;
  filename: string;
  file_path: string;
  file_size?: number;
  mime_type?: string;
  created_by?: string | number | null;
  created_at: string;
}

export interface Activity {
  id: string | number;
  lead_id: string | number;
  type: 'call' | 'email' | 'meeting' | 'note' | 'status_change' | 'stage_change';
  description: string;
  created_by?: string | number | null;
  created_at: string;
  metadata?: Record<string, any>;
}
