/**
 * Lead Report + Accelerator Sequence types.
 *
 * Shaped to what `/api/campaigns/lead-reports/*` actually returns, which is a
 * deliberately narrower thing than the `campaign_lead_reports` row: the backend
 * serialiser allow-lists columns, so `access_token` and `approval_token` never
 * cross this boundary and have no field here to land in.
 */

/** The report catalogue - mirrors reportTypes.js on the backend. */
export const REPORT_TYPES = [
  'growth_opportunity_audit',
  'competitor_analysis',
  'lead_conversion_assessment',
  'customer_experience_audit',
  'revenue_leakage_report',
  'market_positioning_review',
  'sales_process_review',
  'followup_effectiveness_audit',
  'marketing_performance_snapshot',
  'industry_benchmark_report',
] as const;

export type ReportType = (typeof REPORT_TYPES)[number];

export type ApprovalStatus = 'none' | 'pending' | 'approved' | 'rejected';

/** One section of the PDF body. `body` may contain \n\n paragraph breaks. */
export interface ReportSection {
  heading?: string;
  body?: string;
  points?: string[];
}

/** The exact object the PDF renderer consumes. Every field but the first two is optional. */
export interface ReportContent {
  reportType?: ReportType | string;
  title?: string;
  subtitle?: string;
  headline?: string;
  summary?: string;
  sections?: ReportSection[];
  closing?: string;
}

/**
 * What grounded the report, read off the lead's own research artifacts.
 *
 * Not part of `content` - the generator logs its grounding but never writes it
 * into the document, so this is assembled server-side from
 * `lead_data.web_research` / `web_scrape`.
 */
export interface ReportGrounding {
  research: boolean;
  scrape: boolean;
  researched_at: string | null;
  scraped_at: string | null;
  /** Named URLs, de-duplicated. Empty when nothing citable was recorded. */
  sources: string[];
}

export interface LeadReport {
  id: string;
  campaign_id: string;
  campaign_lead_id: string | null;
  lead_id: string | null;
  step_id: string | null;
  report_type: ReportType | string;
  report_type_label: string;
  title: string | null;
  /** For a campaign-scoped report this holds the INDUSTRY, not a company. */
  company_name: string | null;
  content: ReportContent;
  public_url: string | null;
  delivered_by: 'email' | 'linkedin' | 'landing_page' | null;
  delivered_at: string | null;
  last_error: string | null;
  approval_status: ApprovalStatus;
  approval_channel: 'email' | 'whatsapp' | null;
  approval_to: string | null;
  approval_sent_at: string | null;
  approved_at: string | null;
  reject_reason: string | null;
  created_at: string;
  updated_at: string;
  /** Derived server-side from campaign_lead_id === null. */
  scope: 'lead' | 'campaign';
}

export type SequenceStepStatus = 'done' | 'current' | 'queued';

export interface SequenceStep {
  n: number;
  step_id: string;
  type: string;
  /** Indexes the CRM's existing channel icon map. */
  channel: 'linkedin' | 'email' | 'whatsapp' | 'voice' | 'instagram' | 'research' | 'report' | 'system';
  action: string;
  detail: string | null;
  day: number;
  status: SequenceStepStatus;
  /**
   * An observed outcome beyond "the step ran" - currently only 'accepted', set
   * when a connect step's acceptance was actually recorded. Null means no such
   * fact was observed, NOT that the outcome was negative.
   */
  outcome: 'accepted' | null;
  at: string | null;
  /** This step's copy references {{report_url}}, so it renders blank until approval. */
  uses_report_url: boolean;
  /** Only set on the lead_report step. */
  approval: ApprovalStatus | null;
  /** Attempted and failed with no success row - the lead is parked here. */
  stuck: boolean;
  stuck_attempts: number | null;
  stuck_last_attempt: string | null;
}

export interface AcceleratorSequence {
  name: string;
  goal: string | null;
  status: 'active' | 'paused' | 'completed';
  current_step: number;
  total_steps: number;
  steps: SequenceStep[];
}

/** GET /api/campaigns/lead-reports/by-lead/:leadId */
export interface LeadReportBundle {
  enrolled: boolean;
  campaign_lead_id?: string;
  campaign_id?: string;
  campaign_name?: string;
  has_report_step?: boolean;
  report: LeadReport | null;
  grounding?: ReportGrounding;
  sequence: AcceleratorSequence | null;
}

/**
 * The report card's render state.
 *
 * `needs_research` and `running` are client-side only - they describe the
 * trigger's progress, not a column. Everything else is `approval_status`, with
 * `none` splitting on whether a row exists at all.
 */
export type ReportViewState =
  | 'empty'
  | 'running'
  | 'needs_research'
  | 'none'
  | 'pending'
  | 'approved'
  | 'rejected';

/**
 * May this report be attached to outreach or offered for download?
 *
 * Allow-list, unlike the backend's `isReleasable` which blocks a known-bad set
 * and therefore passes any status it doesn't recognise. A report the client
 * cannot classify is not one it should be linking.
 */
export function isReleasable(report: LeadReport | null | undefined): boolean {
  if (!report) return false;
  return report.approval_status === 'none' || report.approval_status === 'approved';
}

/**
 * A per-lead report is one company's audit. A landing page has ONE public URL
 * shared by every visitor, so attaching a lead-scoped report there hands each
 * visitor someone else's audit. Only campaign-scoped (industry) reports qualify.
 */
export function canAttachToLandingPage(report: LeadReport | null | undefined): boolean {
  if (!report) return false;
  return report.scope === 'campaign' && isReleasable(report);
}
