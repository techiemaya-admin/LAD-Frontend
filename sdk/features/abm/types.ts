/**
 * ABM Feature — TypeScript types
 */

// ── Request shapes ─────────────────────────────────────────────────────────

export interface ABMResearchRequest {
  /** Natural-language query: "provide detailed insights about Salesforce" */
  query?: string;
  /** Explicit company name (overrides parsing from query) */
  company_name?: string;
  /** Optional domain hint to sharpen Serper searches */
  domain?: string;
  /** Force re-enrichment even if the company was already researched */
  force_refresh?: boolean;
  /** Tenant's connected Unipile LinkedIn account ID (for LinkedIn posts) */
  unipile_account_id?: string | null;
}

export interface ABMListParams {
  limit?: number;
  offset?: number;
  search?: string;
}

// ── Decision maker ─────────────────────────────────────────────────────────

export type SeniorityLevel = 'c_suite' | 'vp' | 'director' | 'manager' | 'senior' | 'mid' | 'entry';
export type Department = 'Sales' | 'Marketing' | 'Engineering' | 'Product' | 'Finance' | 'HR' | 'Operations' | 'Legal' | 'Executive' | 'General';

export interface DecisionMaker {
  name:            string | null;
  title:           string | null;
  linkedin_url:    string | null;
  email:           string | null;
  photo_url:       string | null;
  seniority_level: SeniorityLevel;
  department:      Department;
  icp_score:       number;        // 0–100
  icp_rationale:   string | null;
  snippet:         string | null;
}

// ── LinkedIn post ──────────────────────────────────────────────────────────

export interface LinkedInPost {
  text:       string;
  posted_at:  string | null;
  likes:      number;
  comments:   number;
  shares:     number;
  post_url:   string | null;
  media_type: string | null;
}

// ── Social presence ────────────────────────────────────────────────────────

export interface SocialPresence {
  linkedin_url:        string | null;
  linkedin_followers:  number | null;
  twitter_url:         string | null;
  twitter_followers:   number | null;
  instagram_url:       string | null;
  instagram_followers: number | null;
  facebook_url:        string | null;
  youtube_url:         string | null;
}

// ── Funding round ──────────────────────────────────────────────────────────

export interface FundingRound {
  title:      string;
  snippet:    string;
  source_url: string | null;
  date:       string | null;
}

// ── Activity / Achievement ─────────────────────────────────────────────────

export interface CompanyActivity {
  title:   string;
  snippet: string;
  source:  string;
  date:    string | null;
  url:     string | null;
}

export interface CompanyAchievement {
  title:       string;
  description: string;
  source_url:  string | null;
}

export interface ClientServed {
  name:           string;
  case_study_url: string | null;
  snippet:        string;
}

// ── Next best action (ABSD) ───────────────────────────────────────────────

export type ABSDChannel = 'LinkedIn' | 'Email' | 'Phone' | 'Research';

export interface NextBestAction {
  priority:               number;
  action:                 string;
  rationale:              string;
  channel:                ABSDChannel;
  target_person:          string | null;
  suggested_message_hook: string | null;
}

// ── Prospect company (main entity) ────────────────────────────────────────

export type EnrichmentStatus = 'pending' | 'in_progress' | 'complete' | 'partial' | 'failed';

export interface ProspectCompany {
  id:                      string;
  company_name:            string;
  domain:                  string | null;
  website:                 string | null;
  headquarters:            string | null;
  description:             string | null;
  industry:                string | null;
  sub_industry:            string | null;
  company_size_range:      string | null;
  employee_count_estimate: number | null;
  founded_year:            number | null;
  company_age_years:       number | null;
  specializations:         string[];
  funding_stage:           string | null;
  total_funding_raised:    string | null;
  recent_funding:          FundingRound[];
  social:                  SocialPresence;
  linkedin_posts:          LinkedInPost[];
  company_overview:        string | null;
  recent_activities:       CompanyActivity[];
  recent_achievements:     CompanyAchievement[];
  clients_served:          ClientServed[];
  web_presence:            Record<string, unknown>;
  key_decision_makers:     DecisionMaker[];
  enrichment_status:       EnrichmentStatus;
  last_enriched_at:        string | null;
  search_query:            string | null;
  created_at:              string;
  updated_at:              string;
}

// ── API response shapes ────────────────────────────────────────────────────

export interface ABMResearchResponse {
  success:           boolean;
  data:              ProspectCompany;
  next_best_actions: NextBestAction[];
}

export interface ABMListResponse {
  success:    boolean;
  data:       ProspectCompany[];
  pagination: {
    total:    number;
    limit:    number;
    offset:   number;
    has_more: boolean;
  };
}

export interface ABMParseIntentResponse {
  success: boolean;
  data: {
    company_name: string | null;
    domain:       string | null;
    intent:       'all' | 'insights' | 'decision_makers' | 'funding' | 'news';
  };
}
