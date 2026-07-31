/**
 * Workflow templates ("Accelerators") — one-click pipeline recipes shared by:
 *   - CustomWorkflowBuilder's "Start from a template" gallery
 *   - the advanced-search chat panel's Accelerators dropdown (conversational wizard)
 *
 * Each node is either an OUTREACH step (the builder assigns a generated id) or
 * a single-instance macro (uses its fixed *_STEP_ID so the builder's drawers
 * and launch emit find its config). `cfg` seeds the node's drawer.
 *
 * `inputs` drives the chat wizard: each entry is asked as a question and the
 * answer is written onto the template's SOURCE config under `key` — the same
 * keys the builder's source drawer edits, so chat answers and drawer edits are
 * interchangeable.
 */
import type { StepType } from '@/types/campaign';

// Single-instance macro node ids. The builder imports these — keep the strings
// stable, they key drawer configs and the launch emit.
export const SOURCE_STEP_ID = 'src-node';
export const FOLLOWUP_STEP_ID = 'followup-node';
export const ANALYTICS_STEP_ID = 'analytics-node';
export const ZOHO_UPDATE_STEP_ID = 'zoho-update-node';
export const MEDIA_STEP_ID = 'media-gen-node';
export const MULTICOND_STEP_ID = 'multicond-node';
export const AI_STEP_ID = 'ai-agent-node';
export const ENRICH_STEP_ID = 'data-enrich-node';
export const EXPORT_STEP_ID = 'export-results-node';
/** Landing-page node. Campaign-level: ONE public page per campaign, not per lead. */
export const LANDING_STEP_ID = 'landing-page-node';
export const AUTOPOST_STEP_ID = 'linkedin-post-node';
// The posting strategy is three composable nodes: content -> (approval) -> post.
// All three merge into ONE campaigns.config.autopost object at launch.
export const CONTENT_STEP_ID = 'linkedin-content-node';
export const APPROVAL_STEP_ID = 'post-approval-node';
/** Instagram auto-post. Campaign-level: ONE post per campaign, not per lead. */
export const IG_AUTOPOST_STEP_ID = 'instagram-post-node';
/** Human task. Per-lead: pauses the lead until a person confirms. */
export const HUMAN_TASK_STEP_ID = 'human-task-node';
/** Audit report. Per-lead by default; campaign-level when scope='campaign'. */
export const REPORT_STEP_ID = 'lead-report-node';
// Web-intel + flow macros. These lived in CustomWorkflowBuilder until
// Strategies needed one canonical list of "ids that must survive save/restore".
export const SCRAPE_STEP_ID = 'web-scrape-node';
export const RESEARCH_STEP_ID = 'web-research-node';
export const SCORE_STEP_ID = 'lead-score-node';
export const SPLIT_STEP_ID = 'split-test-node';
export const SETFIELD_STEP_ID = 'set-field-node';
export const HTTP_STEP_ID = 'http-request-node';

/**
 * Every fixed, single-instance macro id. A node carrying one of these must keep
 * it across a save → restore round trip: the builder's drawers and `launch()`
 * emit both look configs up by these exact strings, so a regenerated id would
 * silently drop that node's configuration.
 *
 * SOURCE_STEP_ID is deliberately excluded — the source is stored separately on
 * a strategy, not as one of its nodes.
 */
export const MACRO_STEP_IDS: readonly string[] = [
  FOLLOWUP_STEP_ID, ANALYTICS_STEP_ID, ZOHO_UPDATE_STEP_ID, MEDIA_STEP_ID,
  MULTICOND_STEP_ID, AI_STEP_ID, ENRICH_STEP_ID, EXPORT_STEP_ID, AUTOPOST_STEP_ID,
  CONTENT_STEP_ID, APPROVAL_STEP_ID,
  SCRAPE_STEP_ID, RESEARCH_STEP_ID, SCORE_STEP_ID,
  SPLIT_STEP_ID, SETFIELD_STEP_ID, HTTP_STEP_ID,
  IG_AUTOPOST_STEP_ID, LANDING_STEP_ID,
];

/**
 * Router nodes are `type: 'condition'` distinguished ONLY by an `rt-` id
 * prefix (see CustomWorkflowBuilder's `addRouter` / `launch`). Their id is
 * therefore load-bearing too and must be preserved verbatim on restore —
 * otherwise a router silently degrades into a plain wait-for-condition step.
 */
export const ROUTER_ID_PREFIX = 'rt-';

export const AI_DEFAULT_INSTRUCTION =
  'If the job title has multiple or mixed roles, keep the single best-fit, most senior title. Split the full name into first/last and tidy the company name.';

export const EXPORT_DEFAULT_COLUMNS = [
  'full_name', 'title', 'company_name', 'email', 'phone', 'linkedin_url', 'status', 'last_action', 'last_action_at',
];

export type TemplateSourceKey = 'zoho_recurring' | 'zoho_once' | 'ghl_once' | 'linkedin_search' | 'linkedin_signal' | 'file_import';

export type TemplateNode = {
  type: StepType;
  /** Fixed macro id (MEDIA_STEP_ID, AUTOPOST_STEP_ID, …); omit for outreach steps. */
  macroId?: string;
  title: string;
  description: string;
  cfg?: any;
};

export type TemplateInput = {
  /** Answer key. For source inputs this is the source-config key (matches the builder's source drawer). */
  key: string;
  /** Question asked in the chat wizard. */
  question: string;
  /** Row label on the summary card. Defaults to a prettified `key`. */
  label?: string;
  placeholder?: string;
  optional?: boolean;
  /**
   * Where the answer is written. Omitted / 'source' → the source drawer config;
   * 'node' → the cfg of the node named by `nodeKey` (message copy, subjects…);
   * 'gate' → written nowhere, it only decides whether the copy questions run.
   */
  target?: 'source' | 'node' | 'gate';
  /** target:'node' — the receiving node, addressed by `macroId || type`. */
  nodeKey?: string;
  /** target:'node' — dotted cfg path; numeric segments index arrays (e.g. `touches.0.message`). */
  cfgPath?: string;
  /** The copy the template ships with — shown as the value "skip" keeps. */
  suggestion?: string;
  /** Long-form answer (message bodies) — cards truncate these. */
  multiline?: boolean;
};

export type WorkflowTemplate = {
  key: string;
  name: string;
  tagline: string;
  /** Chip labels shown on cards / in chat so users see the pipeline up front. */
  chain: string[];
  /**
   * Omitted for publisher-only pipelines (content -> approval -> post).
   * Those enrol nobody, so asking for a contact source would be noise the
   * user has to configure and then ignore.
   */
  source?: { key: TemplateSourceKey; cfg?: any; title: string; description: string };
  nodes: TemplateNode[];
  /** Chat-wizard questions; empty means nothing to collect conversationally. */
  inputs: TemplateInput[];
  /** Needs a file upload (chat routes these to the builder instead of launching directly). */
  requiresFile?: boolean;
  /** Brand accent used by the chat Accelerators UI (cards, chips, CTAs). */
  accent: string;
  /** Small card badge (e.g. Popular / Daily). */
  badge?: { label: string; tone: 'blue' | 'violet' };
  /** Overview stats shown on template cards and the overview drawer. */
  meta: { cycleDays: number; channels: number };
  /**
   * Gallery grouping. 'general' / 'industry' are the built-in recipes;
   * 'strategy' (the tenant's own saved playbooks) and 'community' (published by
   * another tenant, imported as a copy) are synthesized at runtime from stored
   * Strategies — see strategyAdapter.definitionToTemplate.
   */
  category: 'general' | 'industry' | 'strategy' | 'community';
};

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    key: 'revenue_growth_audit',
    category: 'general',
    badge: { label: 'Flagship', tone: 'violet' },
    meta: { cycleDays: 7, channels: 4 },
    accent: '#0F766E',
    name: 'AI Revenue Growth Audit',
    tagline: 'Audit each account, send them the PDF, then work the reply across four channels',
    chain: [
      'LinkedIn Search', 'Scrape site', 'Research', 'Score', 'Competitors (human)',
      'Audit report', 'Landing page', 'Connect', 'Wait: accepted', 'Email the report',
      'LinkedIn follow-up', 'Follow-ups (report attached)', 'Voice call', 'WhatsApp',
    ],
    source: {
      key: 'linkedin_search',
      title: 'LinkedIn Search', description: 'Industry · title · location',
      cfg: { job_titles: '', industries: '', locations: '' },
    },
    inputs: [
      { key: 'job_titles', question: 'Which **job titles** should I audit? e.g. "VP Sales, Head of Revenue, Founder".' },
      { key: 'industries', question: 'Which **industries**? (e.g. "SaaS, Fintech" — or say **skip**)', optional: true },
      { key: 'locations', question: 'Which **location**? (e.g. "Dubai, United Arab Emirates" — or say **skip**)', optional: true },
    ],
    nodes: [
      // ── Research and qualify ───────────────────────────────────────────────
      // Everything downstream is expensive, so the research that decides who
      // deserves it comes first.
      { type: 'web_scrape', macroId: SCRAPE_STEP_ID, title: 'Scrape their site', description: 'Their positioning and stack' },
      { type: 'web_research', macroId: RESEARCH_STEP_ID, title: 'Research the company', description: 'News, funding, hiring signals' },
      { type: 'lead_score', macroId: SCORE_STEP_ID, title: 'Score the fit', description: 'Hot / warm / cold from buying signals' },

      // Competitor discovery is not automated — research can look up
      // competitors somebody names, but cannot find them. Assigned to a person
      // rather than skipped, so the audit is not quietly missing a section.
      {
        type: 'human_task', macroId: HUMAN_TASK_STEP_ID,
        title: 'Identify their competitors', description: 'Human · pauses the lead',
        cfg: {
          title: 'Identify their top competitors',
          instructions: 'Note this company\'s top 3 competitors and one line on what differentiates each. Paste it back when you confirm — the audit uses it.',
          assignee_channel: 'email', assignee_to: '',
        },
      },

      // ── The thing worth receiving ──────────────────────────────────────────
      // The audit is the reason any of this gets opened. It is written from the
      // scrape and research above, and held for review before it goes out.
      {
        type: 'lead_report', macroId: REPORT_STEP_ID,
        title: 'Audit report', description: 'Per lead · PDF · reviewed',
        cfg: {
          scope: 'lead',
          report_type: 'growth_opportunity_audit',
          context: 'Focus on where outbound capacity could grow without adding headcount.',
          email_now: false,
          require_approval: true, approval_channel: 'email', approval_to: '',
        },
      },
      {
        type: 'landing_page', macroId: LANDING_STEP_ID,
        title: 'Landing page', description: 'A page to send them to',
        cfg: {
          brief: 'A short page for this audit: what we look at, what they get, and an invitation to walk through their own findings on a call.',
          capture_enabled: true, capture_fields: ['name', 'email'], require_approval: true,
        },
      },

      // ── Outreach ───────────────────────────────────────────────────────────
      { type: 'linkedin_connect', title: 'Connection request', description: 'No pitch — just connect', cfg: { message: '' } },

      // Email waits for ACCEPTANCE. Firing it on send would land a cold email
      // and a connection request the same day, which contradicts the no-pitch
      // note above.
      { type: 'condition', title: 'Wait for condition', description: 'Connection accepted', cfg: { condition: 'connection_accepted' } },
      {
        type: 'email_send', title: 'Email the audit', description: 'Curiosity, not a meeting ask',
        cfg: {
          subject: 'A short analysis of {{company_name}}',
          body: 'Hi {{first_name}},\n\nWe put together a short analysis based on publicly available information and thought you might find it useful.\n\n{{report_url}}\n\nWorth a look?\n\n',
        },
      },
      {
        type: 'linkedin_message', title: 'LinkedIn follow-up', description: 'Reference one specific finding',
        cfg: { message: 'Hi {{first_name}}, not sure you saw the analysis we put together for {{company_name}} — one thing that stood out was how quickly the team is scaling. Happy to talk through it.' },
      },

      // Automatic touches if they go quiet. The second one attaches the audit
      // itself — the node above it generated it, so the attachment resolves.
      {
        type: 'followup_sequence', macroId: FOLLOWUP_STEP_ID,
        title: 'Follow-up sequence', description: '2 touches · LinkedIn',
        cfg: {
          channel: 'linkedin',
          touches: [
            { hours: 72 },
            { hours: 168, touch_type: 'lead_report' },
          ],
        },
      },

      // Only worth a call once they have actually engaged.
      { type: 'voice_agent_call', title: 'AI voice call', description: 'Once they reply or fill the form', cfg: {} },
      {
        type: 'whatsapp_send', title: 'WhatsApp', description: 'Last, never first',
        cfg: { message: 'Hi {{first_name}}, thanks for taking a moment earlier. Here is the analysis again — happy to answer anything.' },
      },
    ],
  },
  {
    key: 'linkedin_accelerator',
    category: 'general',
    badge: { label: 'Popular', tone: 'blue' },
    meta: { cycleDays: 14, channels: 3 },
    accent: '#0A66C2',
    name: 'LinkedIn Accelerator',
    tagline: 'Warm up, connect, message — while daily AI posts build your presence',
    chain: ['LinkedIn Search', 'Profile visit', 'Connect', 'Wait: accepted', 'Message', 'AI Media', 'Daily auto-post'],
    source: {
      key: 'linkedin_search',
      title: 'LinkedIn Search', description: 'Industry · title · location',
      cfg: { job_titles: '', industries: '', locations: '' },
    },
    inputs: [
      { key: 'job_titles', question: 'Which **job titles** should I target? Comma-separate several — e.g. "VP Sales, Head of Revenue".' },
      { key: 'industries', question: 'Which **industries**? (e.g. "SaaS, Fintech" — or say **skip**)', optional: true },
      { key: 'locations', question: 'Which **location**? (e.g. "Dubai, United Arab Emirates" — or say **skip**)', optional: true },
    ],
    nodes: [
      { type: 'linkedin_visit', title: 'Profile visit', description: 'Warm up before connecting' },
      { type: 'linkedin_connect', title: 'Connection request', description: 'AI-personalised note', cfg: { message: '' } },
      { type: 'condition', title: 'Wait for condition', description: 'Connection accepted', cfg: { condition: 'connection_accepted' } },
      { type: 'linkedin_message', title: 'Message', description: 'First message after acceptance', cfg: { message: 'Hi {{first_name}}, thanks for connecting! I noticed you lead {{title}} at {{company_name}} — curious how you\'re approaching outbound this quarter?' } },
      { type: 'media_generation', macroId: MEDIA_STEP_ID, title: 'AI Media', description: 'Generate an image for your posts' },
      {
        type: 'linkedin_post', macroId: AUTOPOST_STEP_ID, title: 'LinkedIn auto-post', description: 'Daily · 09:00 · AI-written',
        cfg: {
          content: 'Share one practical, non-salesy insight for leaders in the industry I target — what top performers do differently in outbound this year.',
          ai_generate: true, frequency: 'daily', days: [1, 2, 3, 4, 5], time: '09:00', post_as: 'personal',
        },
      },
    ],
  },
  {
    key: 'cold_list_outreach',
    category: 'general',
    meta: { cycleDays: 10, channels: 2 },
    accent: '#059669',
    name: 'Cold List Outreach',
    tagline: 'Upload a list, clean + enrich it, connect and follow up, export results',
    chain: ['File import', 'AI Agent', 'Enrich', 'Connect', 'Wait: accepted', 'Message', 'Export'],
    source: { key: 'file_import', title: 'File import (CSV / Excel)', description: 'Upload a list and map columns' },
    inputs: [],
    requiresFile: true,
    nodes: [
      { type: 'ai_parse', macroId: AI_STEP_ID, title: 'AI Agent', description: 'Clean & normalise lead data', cfg: { instruction: AI_DEFAULT_INSTRUCTION } },
      { type: 'data_enrich', macroId: ENRICH_STEP_ID, title: 'Enrich contact', description: 'Official email · Phone', cfg: { enrich: ['official_email', 'phone'] } },
      { type: 'linkedin_connect', title: 'Connection request', description: 'AI-personalised note', cfg: { message: '' } },
      { type: 'condition', title: 'Wait for condition', description: 'Connection accepted', cfg: { condition: 'connection_accepted' } },
      { type: 'linkedin_message', title: 'Message', description: 'First message after acceptance', cfg: { message: 'Hi {{first_name}}, thanks for connecting! Would love to hear how things are going at {{company_name}}.' } },
      { type: 'export_results', macroId: EXPORT_STEP_ID, title: 'Export results', description: 'CSV · Download', cfg: { format: 'csv', destinations: ['file'], columns: EXPORT_DEFAULT_COLUMNS, run_on_completion: true } },
    ],
  },
  {
    key: 'inmail_blitz',
    category: 'general',
    meta: { cycleDays: 12, channels: 1 },
    accent: '#7C3AED',
    name: 'InMail Blitz',
    tagline: 'Premium InMail to non-connections, with automatic follow-ups',
    chain: ['LinkedIn Search', 'Profile visit', 'InMail', 'Follow-ups'],
    source: {
      key: 'linkedin_search',
      title: 'LinkedIn Search', description: 'Industry · title · location',
      cfg: { job_titles: '', industries: '', locations: '' },
    },
    inputs: [
      { key: 'job_titles', question: 'Which **job titles** should the InMails target? Comma-separate several.' },
      { key: 'industries', question: 'Which **industries**? (or say **skip**)', optional: true },
      { key: 'locations', question: 'Which **location**? (or say **skip**)', optional: true },
    ],
    nodes: [
      { type: 'linkedin_visit', title: 'Profile visit', description: 'Warm up before the InMail' },
      { type: 'linkedin_inmail', title: 'InMail (Premium)', description: 'Cold InMail to non-connections', cfg: { message: 'Hi {{first_name}}, I came across your profile — I work with {{title}}s on outbound and thought this was worth a short note. Open to a quick exchange?' } },
      { type: 'followup_sequence', macroId: FOLLOWUP_STEP_ID, title: 'Follow-up sequence', description: '3 touches · LinkedIn', cfg: { channel: 'linkedin', touches: [{ hours: 48 }, { hours: 120 }, { hours: 240 }] } },
    ],
  },
  {
    key: 'signal_hunter',
    category: 'general',
    badge: { label: 'Daily', tone: 'violet' },
    meta: { cycleDays: 7, channels: 1 },
    accent: '#D97706',
    name: 'Signal Hunter',
    tagline: 'Catch companies showing buying signals and reach the decision maker',
    chain: ['Signal Search', 'Profile visit', 'Connect', 'Wait: accepted', 'Message'],
    source: {
      key: 'linkedin_signal',
      title: 'LinkedIn Signal Search', description: 'Hiring / buying signals · daily',
      cfg: { signal_query: 'companies hiring for revenue operations or sales development roles', decision_maker_titles: 'VP Sales, Head of Sales, CRO' },
    },
    inputs: [
      { key: 'signal_query', question: 'What **signal** should I watch for? (e.g. "companies posting jobs for Salesforce revenue operations")' },
      { key: 'decision_maker_titles', question: 'Which **decision-maker titles** should I reach at those companies? Comma-separate several.' },
    ],
    nodes: [
      { type: 'linkedin_visit', title: 'Profile visit', description: 'Warm up before connecting' },
      { type: 'linkedin_connect', title: 'Connection request', description: 'AI-personalised note', cfg: { message: '' } },
      { type: 'condition', title: 'Wait for condition', description: 'Connection accepted', cfg: { condition: 'connection_accepted' } },
      { type: 'linkedin_message', title: 'Message', description: 'Signal-aware first message', cfg: { message: 'Hi {{first_name}}, saw {{company_name}} is growing the team — usually a sign outbound is about to scale. Happy to share what\'s working for similar teams if useful.' } },
    ],
  },
  {
    key: 'crm_reengage',
    category: 'general',
    meta: { cycleDays: 30, channels: 2 },
    accent: '#DC2626',
    name: 'CRM Re-Engage',
    tagline: 'Pull new Zoho contacts daily, reach out on LinkedIn, write results back',
    chain: ['Zoho daily', 'AI Agent', 'Connect', 'Wait: accepted', 'Message', 'Zoho write-back'],
    source: {
      key: 'zoho_recurring',
      title: 'Zoho CRM — recurring', description: 'Import new contacts daily',
      cfg: { zoho_modules: 'contacts' },
    },
    inputs: [
      { key: 'zoho_tag', question: 'Only import contacts with a specific **Zoho tag**? Type the tag, or say **skip** to import all new contacts.', optional: true },
    ],
    nodes: [
      { type: 'ai_parse', macroId: AI_STEP_ID, title: 'AI Agent', description: 'Clean & normalise lead data', cfg: { instruction: AI_DEFAULT_INSTRUCTION } },
      { type: 'linkedin_connect', title: 'Connection request', description: 'AI-personalised note', cfg: { message: '' } },
      { type: 'condition', title: 'Wait for condition', description: 'Connection accepted', cfg: { condition: 'connection_accepted' } },
      { type: 'linkedin_message', title: 'Message', description: 'First message after acceptance', cfg: { message: 'Hi {{first_name}}, great to connect! We already have you in our network — wanted to reach out personally.' } },
      { type: 'zoho_update', macroId: ZOHO_UPDATE_STEP_ID, title: 'Update Zoho record', description: 'Write back to Contacts', cfg: { module: 'Contacts', map: {} } },
    ],
  },
  // ── Industry Accelerators ─────────────────────────────────────────────────
  // Titles + industries are pre-filled, so activating one only needs a
  // location. The wizard still offers a title override for anyone who wants
  // to narrow it further.
  {
    key: 'real_estate_dealflow',
    category: 'industry',
    meta: { cycleDays: 14, channels: 1 },
    accent: '#0EA5E9',
    name: 'Real Estate Deal Flow',
    tagline: 'Reach developers, brokers and investment heads, then keep nudging',
    chain: ['LinkedIn Search', 'Profile visit', 'Connect', 'Wait: accepted', 'Message', 'Follow-ups'],
    source: {
      key: 'linkedin_search',
      title: 'LinkedIn Search', description: 'Real estate decision makers',
      cfg: {
        job_titles: 'Managing Director, Head of Acquisitions, Investment Director, Development Manager',
        industries: 'Real Estate, Property Development, Real Estate Investment',
        locations: '',
      },
    },
    inputs: [
      { key: 'locations', question: 'Which **city or country** should I target? (e.g. "Dubai, United Arab Emirates")' },
      { key: 'job_titles', question: 'I\'ll target **Managing Directors, Heads of Acquisitions, Investment Directors and Development Managers**. Type different titles to override, or say **skip** to keep them.', optional: true },
    ],
    nodes: [
      { type: 'linkedin_visit', title: 'Profile visit', description: 'Warm up before connecting' },
      { type: 'linkedin_connect', title: 'Connection request', description: 'AI-personalised note', cfg: { message: '' } },
      { type: 'condition', title: 'Wait for condition', description: 'Connection accepted', cfg: { condition: 'connection_accepted' } },
      { type: 'linkedin_message', title: 'Message', description: 'Deal-flow opener', cfg: { message: 'Hi {{first_name}}, good to connect. I follow what {{company_name}} is building — always interested in how teams here are sourcing and evaluating deals right now. What\'s driving most of your pipeline lately?' } },
      { type: 'followup_sequence', macroId: FOLLOWUP_STEP_ID, title: 'Follow-up sequence', description: '3 touches · LinkedIn', cfg: { channel: 'linkedin', touches: [{ hours: 48 }, { hours: 120 }, { hours: 240 }] } },
    ],
  },
  {
    key: 'saas_pipeline',
    category: 'industry',
    meta: { cycleDays: 16, channels: 2 },
    accent: '#6366F1',
    name: 'SaaS Pipeline Builder',
    tagline: 'Revenue leaders at software companies — LinkedIn first, email as backup',
    chain: ['LinkedIn Search', 'Profile visit', 'Connect', 'Wait: accepted', 'Message', 'Enrich', 'Email'],
    source: {
      key: 'linkedin_search',
      title: 'LinkedIn Search', description: 'SaaS revenue leaders',
      cfg: {
        job_titles: 'VP Sales, Chief Revenue Officer, Head of Growth, Head of Sales',
        industries: 'SaaS, Software Development, Information Technology',
        locations: '',
      },
    },
    inputs: [
      { key: 'locations', question: 'Which **city or country** should I target? (e.g. "United Kingdom")' },
      { key: 'job_titles', question: 'I\'ll target **VP Sales, CROs, Heads of Growth and Heads of Sales**. Type different titles to override, or say **skip** to keep them.', optional: true },
    ],
    nodes: [
      { type: 'linkedin_visit', title: 'Profile visit', description: 'Warm up before connecting' },
      { type: 'linkedin_connect', title: 'Connection request', description: 'AI-personalised note', cfg: { message: '' } },
      { type: 'condition', title: 'Wait for condition', description: 'Connection accepted', cfg: { condition: 'connection_accepted' } },
      { type: 'linkedin_message', title: 'Message', description: 'Revenue-team opener', cfg: { message: 'Hi {{first_name}}, thanks for connecting. Curious how the team at {{company_name}} is splitting effort between outbound and product-led right now — it\'s the trade-off I hear most from {{title}}s this year.' } },
      { type: 'data_enrich', macroId: ENRICH_STEP_ID, title: 'Enrich contact', description: 'Official email', cfg: { enrich: ['official_email'] } },
      { type: 'email_send', title: 'Email', description: 'Backup channel', cfg: { subject: 'Quick thought for {{company_name}}', body: 'Hi {{first_name}},\n\nWe connected on LinkedIn — following up here in case it is easier.\n\nHappy to share what is working for similar teams if useful.\n\nBest', delayDays: 3 } },
    ],
  },
  {
    key: 'hvac_construction',
    category: 'industry',
    meta: { cycleDays: 14, channels: 2 },
    accent: '#F97316',
    name: 'HVAC & Construction Procurement',
    tagline: 'Procurement and project leads in MEP, HVAC and contracting',
    chain: ['LinkedIn Search', 'Profile visit', 'Connect', 'Wait: accepted', 'Message', 'Enrich', 'WhatsApp'],
    source: {
      key: 'linkedin_search',
      title: 'LinkedIn Search', description: 'Procurement & project leads',
      cfg: {
        job_titles: 'Procurement Manager, Purchasing Manager, Project Director, Contracts Manager',
        industries: 'Construction, HVAC, Mechanical Or Industrial Engineering, Facilities Services',
        locations: '',
      },
    },
    inputs: [
      { key: 'locations', question: 'Which **city or country** should I target? (e.g. "Dubai, United Arab Emirates")' },
      { key: 'job_titles', question: 'I\'ll target **Procurement Managers, Purchasing Managers, Project Directors and Contracts Managers**. Type different titles to override, or say **skip** to keep them.', optional: true },
    ],
    nodes: [
      { type: 'linkedin_visit', title: 'Profile visit', description: 'Warm up before connecting' },
      { type: 'linkedin_connect', title: 'Connection request', description: 'AI-personalised note', cfg: { message: '' } },
      { type: 'condition', title: 'Wait for condition', description: 'Connection accepted', cfg: { condition: 'connection_accepted' } },
      { type: 'linkedin_message', title: 'Message', description: 'Procurement opener', cfg: { message: 'Hi {{first_name}}, thanks for connecting. I work with procurement teams in the {{company_name}} space — usually around lead times and supplier reliability on projects. Are those the pressures on your side too?' } },
      { type: 'data_enrich', macroId: ENRICH_STEP_ID, title: 'Enrich contact', description: 'Phone number', cfg: { enrich: ['phone'] } },
      { type: 'whatsapp_send', title: 'WhatsApp', description: 'Follow up on mobile', cfg: { message: 'Hi {{first_name}}, following up from LinkedIn about supply and lead times for your current projects. Happy to send details across if useful.', delayDays: 3 } },
    ],
  },
  {
    key: 'healthcare_partnerships',
    category: 'industry',
    meta: { cycleDays: 18, channels: 1 },
    accent: '#14B8A6',
    name: 'Healthcare Partnerships',
    tagline: 'Clinic owners and medical directors, approached carefully',
    chain: ['LinkedIn Search', 'Profile visit', 'Connect', 'Wait: accepted', 'Message', 'Follow-ups'],
    source: {
      key: 'linkedin_search',
      title: 'LinkedIn Search', description: 'Clinical decision makers',
      cfg: {
        job_titles: 'Medical Director, Clinic Owner, Hospital Administrator, Head of Operations',
        industries: 'Hospitals and Health Care, Medical Practice, Health Wellness and Fitness',
        locations: '',
      },
    },
    inputs: [
      { key: 'locations', question: 'Which **city or country** should I target? (e.g. "Abu Dhabi, United Arab Emirates")' },
      { key: 'job_titles', question: 'I\'ll target **Medical Directors, Clinic Owners, Hospital Administrators and Heads of Operations**. Type different titles to override, or say **skip** to keep them.', optional: true },
    ],
    nodes: [
      { type: 'linkedin_visit', title: 'Profile visit', description: 'Warm up before connecting' },
      { type: 'linkedin_connect', title: 'Connection request', description: 'AI-personalised note', cfg: { message: '' } },
      { type: 'condition', title: 'Wait for condition', description: 'Connection accepted', cfg: { condition: 'connection_accepted' } },
      { type: 'linkedin_message', title: 'Message', description: 'Practice-focused opener', cfg: { message: 'Hi {{first_name}}, thanks for connecting. I spend a lot of time with teams like {{company_name}} on patient flow and admin load — the two things that seem to eat clinical time everywhere. Is that the picture for you as well?' } },
      { type: 'followup_sequence', macroId: FOLLOWUP_STEP_ID, title: 'Follow-up sequence', description: '2 touches · LinkedIn', cfg: { channel: 'linkedin', touches: [{ hours: 96 }, { hours: 240 }] } },
    ],
  },
  {
    key: 'recruitment_outreach',
    category: 'industry',
    meta: { cycleDays: 12, channels: 1 },
    accent: '#A855F7',
    name: 'Recruitment & Staffing',
    tagline: 'Talent leaders via Premium InMail — no connection needed',
    chain: ['LinkedIn Search', 'Profile visit', 'InMail', 'Follow-ups'],
    source: {
      key: 'linkedin_search',
      title: 'LinkedIn Search', description: 'Talent & HR leaders',
      cfg: {
        job_titles: 'Head of Talent Acquisition, HR Director, Recruitment Manager, Chief People Officer',
        industries: 'Staffing and Recruiting, Human Resources Services',
        locations: '',
      },
    },
    inputs: [
      { key: 'locations', question: 'Which **city or country** should I target? (e.g. "Singapore")' },
      { key: 'job_titles', question: 'I\'ll target **Heads of Talent Acquisition, HR Directors, Recruitment Managers and CPOs**. Type different titles to override, or say **skip** to keep them.', optional: true },
    ],
    nodes: [
      { type: 'linkedin_visit', title: 'Profile visit', description: 'Warm up before the InMail' },
      { type: 'linkedin_inmail', title: 'InMail (Premium)', description: 'Cold InMail to non-connections', cfg: { subject: 'Hiring capacity at {{company_name}}', message: 'Hi {{first_name}}, reaching out directly rather than adding to your connection queue. Most {{title}}s I speak with are balancing hiring speed against quality of shortlist — is that where the pressure sits for you this quarter?' } },
      { type: 'followup_sequence', macroId: FOLLOWUP_STEP_ID, title: 'Follow-up sequence', description: '2 touches · LinkedIn', cfg: { channel: 'linkedin', touches: [{ hours: 72 }, { hours: 168 }] } },
    ],
  },
  {
    key: 'financial_services',
    category: 'industry',
    meta: { cycleDays: 21, channels: 2 },
    accent: '#0F766E',
    name: 'Financial Services',
    tagline: 'CFOs and finance directors, with email as the second touch',
    chain: ['LinkedIn Search', 'Profile visit', 'Connect', 'Wait: accepted', 'Message', 'Enrich', 'Email'],
    source: {
      key: 'linkedin_search',
      title: 'LinkedIn Search', description: 'Finance decision makers',
      cfg: {
        job_titles: 'CFO, Finance Director, Head of Treasury, Financial Controller',
        industries: 'Financial Services, Banking, Investment Management, Insurance',
        locations: '',
      },
    },
    inputs: [
      { key: 'locations', question: 'Which **city or country** should I target? (e.g. "United States")' },
      { key: 'job_titles', question: 'I\'ll target **CFOs, Finance Directors, Heads of Treasury and Financial Controllers**. Type different titles to override, or say **skip** to keep them.', optional: true },
    ],
    nodes: [
      { type: 'linkedin_visit', title: 'Profile visit', description: 'Warm up before connecting' },
      { type: 'linkedin_connect', title: 'Connection request', description: 'AI-personalised note', cfg: { message: '' } },
      { type: 'condition', title: 'Wait for condition', description: 'Connection accepted', cfg: { condition: 'connection_accepted' } },
      { type: 'linkedin_message', title: 'Message', description: 'Finance-led opener', cfg: { message: 'Hi {{first_name}}, thanks for connecting. Most {{title}}s I talk to are being asked to tighten reporting cycles without adding headcount. Curious whether that is landing on your desk at {{company_name}} too.' } },
      { type: 'data_enrich', macroId: ENRICH_STEP_ID, title: 'Enrich contact', description: 'Official email', cfg: { enrich: ['official_email'] } },
      { type: 'email_send', title: 'Email', description: 'Second touch', cfg: { subject: 'Following up — {{company_name}}', body: 'Hi {{first_name}},\n\nWe connected on LinkedIn recently. Sending this here in case email suits you better.\n\nHappy to share how comparable finance teams are handling it.\n\nBest', delayDays: 4 } },
    ],
  },
  {
    key: 'agency_new_business',
    category: 'industry',
    meta: { cycleDays: 14, channels: 2 },
    accent: '#EC4899',
    name: 'Agency New Business',
    tagline: 'Marketing leaders — outreach plus daily posts that build credibility',
    chain: ['LinkedIn Search', 'Profile visit', 'Connect', 'Wait: accepted', 'Message', 'AI Media', 'Daily auto-post'],
    source: {
      key: 'linkedin_search',
      title: 'LinkedIn Search', description: 'Marketing decision makers',
      cfg: {
        job_titles: 'CMO, Marketing Director, Head of Brand, Head of Marketing',
        industries: 'Marketing Services, Advertising Services, Retail, Consumer Goods',
        locations: '',
      },
    },
    inputs: [
      { key: 'locations', question: 'Which **city or country** should I target? (e.g. "Dubai, United Arab Emirates")' },
      { key: 'job_titles', question: 'I\'ll target **CMOs, Marketing Directors, Heads of Brand and Heads of Marketing**. Type different titles to override, or say **skip** to keep them.', optional: true },
    ],
    nodes: [
      { type: 'linkedin_visit', title: 'Profile visit', description: 'Warm up before connecting' },
      { type: 'linkedin_connect', title: 'Connection request', description: 'AI-personalised note', cfg: { message: '' } },
      { type: 'condition', title: 'Wait for condition', description: 'Connection accepted', cfg: { condition: 'connection_accepted' } },
      { type: 'linkedin_message', title: 'Message', description: 'Brand-led opener', cfg: { message: 'Hi {{first_name}}, thanks for connecting. I have been following what {{company_name}} is putting out. Always curious how {{title}}s are deciding where to spend attention this year — brand or performance?' } },
      { type: 'media_generation', macroId: MEDIA_STEP_ID, title: 'AI Media', description: 'Generate an image for your posts' },
      {
        type: 'linkedin_post', macroId: AUTOPOST_STEP_ID, title: 'LinkedIn auto-post', description: 'Daily · 09:00 · AI-written',
        cfg: {
          content: 'Share one specific, useful marketing insight for the industry I target — something a CMO could act on this week, not a general platitude.',
          ai_generate: true, frequency: 'daily', days: [1, 2, 3, 4, 5], time: '09:00', post_as: 'personal',
        },
      },
    ],
  },
  {
    key: 'logistics_freight',
    category: 'industry',
    meta: { cycleDays: 14, channels: 2 },
    accent: '#475569',
    name: 'Logistics & Freight',
    tagline: 'Supply chain and operations leads, with WhatsApp follow-up',
    chain: ['LinkedIn Search', 'Profile visit', 'Connect', 'Wait: accepted', 'Message', 'Enrich', 'WhatsApp'],
    source: {
      key: 'linkedin_search',
      title: 'LinkedIn Search', description: 'Supply chain & ops leads',
      cfg: {
        job_titles: 'Supply Chain Director, Head of Logistics, Operations Director, Warehouse Manager',
        industries: 'Transportation Logistics Supply Chain and Storage, Freight and Package Transportation, Warehousing',
        locations: '',
      },
    },
    inputs: [
      { key: 'locations', question: 'Which **city or country** should I target? (e.g. "Jebel Ali, United Arab Emirates")' },
      { key: 'job_titles', question: 'I\'ll target **Supply Chain Directors, Heads of Logistics, Operations Directors and Warehouse Managers**. Type different titles to override, or say **skip** to keep them.', optional: true },
    ],
    nodes: [
      { type: 'linkedin_visit', title: 'Profile visit', description: 'Warm up before connecting' },
      { type: 'linkedin_connect', title: 'Connection request', description: 'AI-personalised note', cfg: { message: '' } },
      { type: 'condition', title: 'Wait for condition', description: 'Connection accepted', cfg: { condition: 'connection_accepted' } },
      { type: 'linkedin_message', title: 'Message', description: 'Operations opener', cfg: { message: 'Hi {{first_name}}, thanks for connecting. Most teams I speak with in this space are still absorbing rate volatility and tighter delivery windows. Is that shaping planning at {{company_name}} right now?' } },
      { type: 'data_enrich', macroId: ENRICH_STEP_ID, title: 'Enrich contact', description: 'Phone number', cfg: { enrich: ['phone'] } },
      { type: 'whatsapp_send', title: 'WhatsApp', description: 'Follow up on mobile', cfg: { message: 'Hi {{first_name}}, following up from LinkedIn on freight capacity and lead times. Happy to share options if it is useful.', delayDays: 3 } },
    ],
  },
  {
    // Built from LinkedIn/Meltwater's "5 Takeaways from 9.5 Million Citations":
    // LinkedIn is the #2 most-cited source for AI models, 75% of those citations
    // come from individual member profiles rather than Company Pages, 92% of
    // cited posts use clear headings, every top-cited article used a list, and
    // 48% of cited content was published within the last three months.
    //
    // So: post as a PERSON not a page, three times a week, in the structured
    // list shape, with fresh copy every run.
    key: 'ai_search_authority',
    category: 'general',
    badge: { label: 'Publisher', tone: 'violet' },
    meta: { cycleDays: 30, channels: 1 },
    accent: '#7C3AED',
    name: 'AI Search Authority',
    tagline: 'Get cited by ChatGPT and Google AI — structured posts, three times a week, from your own profile',
    chain: ['AI writes a listicle', 'You approve it', 'Posts Mon / Wed / Fri'],
    // No source: this pipeline publishes, it does not enrol anyone.
    inputs: [],
    nodes: [
      {
        type: 'linkedin_content', macroId: CONTENT_STEP_ID,
        title: 'LinkedIn content', description: 'Structured listicle, AI-written',
        cfg: {
          // The seed is the standing brief, rewritten fresh each run. Phrased as
          // the citation research prescribes: answer a real buyer question, with
          // specific names and numbers, as a numbered list.
          content: 'Answer one real question my buyers ask before they choose a vendor. Make it a numbered list of 4 to 6 points, each naming a specific tool, threshold, number, or worked example. Practical enough that someone could act on it today, and useful even to a reader who never buys from us.',
          ai_generate: true,
          post_format: 'structured',
        },
      },
      {
        type: 'post_approval', macroId: APPROVAL_STEP_ID,
        title: 'Approval', description: 'WhatsApp · before posting',
        cfg: { approval_channel: 'whatsapp', approval_to: '' },
      },
      {
        type: 'linkedin_post', macroId: AUTOPOST_STEP_ID,
        title: 'LinkedIn auto-post', description: 'Mon / Wed / Fri · 09:00',
        cfg: {
          // Personal profile, deliberately: 75% of LinkedIn's AI citations come
          // from member profiles, only 25% from Company Pages.
          ai_generate: true, frequency: 'weekly', days: [1, 3, 5], time: '09:00', post_as: 'personal',
        },
      },
    ],
  },
];

// ── Wizard input derivation ────────────────────────────────────────────────
// A template's declared `inputs` only cover targeting. The copy that actually
// goes out — InMail subject/message and each follow-up touch — lives on the
// nodes, so the chat wizard derives a question per piece of copy rather than
// every template repeating them. All derived questions are optional: skipping
// one keeps the template's own suggestion (or leaves it blank for Mr LAD to
// draft, which is what an empty follow-up message means downstream).

/** How a node is addressed by a node-targeted input and by the builder's override map. */
export const templateNodeKey = (n: TemplateNode): string => n.macroId || n.type;

const touchDelayLabel = (hours?: number): string => {
  const h = Math.max(1, Number(hours) || 24);
  return h < 48 ? `sent ${h}h later` : `sent ~${Math.round(h / 24)} days later`;
};

/**
 * The one question that decides whether the copy questions get asked at all.
 * Answering it "no" keeps every template suggestion as-is, so an Accelerator stays a
 * three-question flow for anyone who just wants the defaults.
 */
export const COPY_GATE_KEY = '__write_copy__';

/** Every chat-wizard question for a template: declared targeting inputs, then message copy. */
export function templateWizardInputs(t: WorkflowTemplate): TemplateInput[] {
  const derived: TemplateInput[] = [];
  for (const n of t.nodes) {
    const nodeKey = templateNodeKey(n);
    if (n.type === 'linkedin_inmail') {
      derived.push({
        key: `${nodeKey}__subject`, label: 'InMail subject', target: 'node', nodeKey, cfgPath: 'subject', optional: true,
        suggestion: n.cfg?.subject || '',
        question: 'What **subject line** should the InMail use? (or say **skip** — LinkedIn allows a blank subject)',
      });
      derived.push({
        key: `${nodeKey}__message`, label: 'InMail message', target: 'node', nodeKey, cfgPath: 'message', optional: true, multiline: true,
        suggestion: n.cfg?.message || '',
        question: 'What should the **InMail message** say? You can use {{first_name}}, {{title}} and {{company_name}} — or say **skip** to keep the suggested copy.',
      });
    }
    if (n.type === 'followup_sequence') {
      const touches: any[] = Array.isArray(n.cfg?.touches) && n.cfg.touches.length ? n.cfg.touches : [{ hours: 24 }];
      touches.forEach((touch, i) => {
        derived.push({
          key: `${nodeKey}__touch_${i}`, label: `Follow-up ${i + 1}`, target: 'node', nodeKey, cfgPath: `touches.${i}.message`, optional: true, multiline: true,
          suggestion: touch?.message || '',
          question: `What should **follow-up ${i + 1}** say (${touchDelayLabel(touch?.hours)})? Say **skip** to let Mr LAD write it from the conversation.`,
        });
      });
    }
  }
  if (!derived.length) return [...t.inputs];
  const gate: TemplateInput = {
    key: COPY_GATE_KEY, target: 'gate', optional: true, label: 'Message copy',
    question: `Want to write the **${derived.length} message${derived.length === 1 ? '' : 's'}** this Accelerator sends? Say **yes** to go through them one by one — or **skip** to use the suggested copy, which Mr LAD adapts per lead.`,
  };
  return [...t.inputs, gate, ...derived];
}

/**
 * Turn a template into the canvas steps plus their seeded config.
 *
 * Shared so the builder's gallery and the chat wizard's right-hand preview
 * expand a template identically — two implementations would drift, and the
 * difference would only show as a preview that does not match what launches.
 *
 * Node ids are load-bearing: a macro keeps its fixed id so the builder's
 * drawers and launch emit still find its config (see MACRO_STEP_IDS).
 */
export function templateToPreviewSteps(
  t: WorkflowTemplate,
  opts?: {
    sourceCfgOverride?: Record<string, any>;
    nodeCfgOverride?: Record<string, any>;
    /** Fills title/description for a source the template left unlabelled. */
    sourceLabel?: (key: TemplateSourceKey) => { label?: string; sub?: string } | undefined;
    /** Id generator for non-macro nodes; defaults to a time-based one. */
    nextId?: () => string;
  },
): { steps: any[]; configs: Record<string, any> } {
  let seq = 0;
  const genId = opts?.nextId || (() => `wf-${Date.now()}-${seq++}`);

  // Publisher-only templates have no source: they enrol nobody, so a contact
  // source would be a step the user configures and then never uses.
  const srcDef = t.source ? opts?.sourceLabel?.(t.source.key) : undefined;
  const steps: any[] = t.source ? [{
    id: SOURCE_STEP_ID,
    type: 'lead_generation' as StepType,
    channel: t.source.key.startsWith('linkedin') ? 'linkedin' : 'email',
    title: t.source.title || srcDef?.label || 'Contact source',
    description: t.source.description || srcDef?.sub || '',
  }] : [];

  const configs: Record<string, any> = {};
  if (t.source && (t.source.cfg || opts?.sourceCfgOverride)) {
    configs[SOURCE_STEP_ID] = { ...(t.source.cfg || {}), ...(opts?.sourceCfgOverride || {}) };
  }

  // A node-cfg override addresses nodes by `macroId || type`. Templates carry
  // at most one node per addressable type, so first-match assignment is exact;
  // a hand-built template with two same-type nodes would seed both alike.
  const nodeOverrides = opts?.nodeCfgOverride || {};
  for (const n of t.nodes) {
    const id = n.macroId || genId();
    const override = nodeOverrides[templateNodeKey(n)];
    const channel = n.type.startsWith('linkedin') ? 'linkedin'
      : n.type.startsWith('email') ? 'email'
      : n.type.startsWith('whatsapp') ? 'whatsapp'
      : n.type === 'voice_agent_call' ? 'voice'
      : n.type === 'condition' ? 'linkedin'
      : 'email';
    steps.push({ id, type: n.type, channel, title: n.title, description: n.description });
    if (n.cfg || override) configs[id] = { ...(n.cfg || {}), ...(override || {}) };
  }
  return { steps, configs };
}

/** Write `value` at a dotted path, creating arrays for numeric segments. */
function setCfgPath(obj: any, path: string, value: any): void {
  const segs = path.split('.');
  let cur = obj;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i];
    if (cur[seg] == null || typeof cur[seg] !== 'object') cur[seg] = /^\d+$/.test(segs[i + 1]) ? [] : {};
    cur = cur[seg];
  }
  cur[segs[segs.length - 1]] = value;
}

/**
 * Split collected wizard answers into the two overrides the builder takes.
 *
 * `nodeCfg` values are COMPLETE cfg objects (the node's own cfg deep-cloned,
 * then patched) so the builder can shallow-merge them — patching `touches.0`
 * into a shallow merge would otherwise drop the remaining touches.
 */
export function splitWizardAnswers(
  t: WorkflowTemplate,
  answers: Record<string, string>,
): { sourceCfg: Record<string, string>; nodeCfg: Record<string, any> } {
  const sourceCfg: Record<string, string> = {};
  const nodeCfg: Record<string, any> = {};
  for (const inp of templateWizardInputs(t)) {
    const val = answers[inp.key];
    if (val == null || val === '' || inp.target === 'gate') continue;
    if (inp.target === 'node' && inp.nodeKey && inp.cfgPath) {
      if (!nodeCfg[inp.nodeKey]) {
        const node = t.nodes.find((n) => templateNodeKey(n) === inp.nodeKey);
        nodeCfg[inp.nodeKey] = JSON.parse(JSON.stringify(node?.cfg || {}));
      }
      setCfgPath(nodeCfg[inp.nodeKey], inp.cfgPath, val);
    } else {
      sourceCfg[inp.key] = val;
    }
  }
  return { sourceCfg, nodeCfg };
}

/**
 * The LinkedIn search string a template's targeting describes — used to preview
 * the audience in the leads panel before the Accelerator is launched. Returns null for
 * sources that aren't a searchable query (file import, CRM pulls).
 */
export function templateSearchQuery(t: WorkflowTemplate, sourceCfg: Record<string, string>): string | null {
  // Publisher-only pipelines (content → approval → post) enrol nobody, so they
  // carry no source and have no audience to preview.
  if (!t.source) return null;
  const cfg = { ...(t.source.cfg || {}), ...sourceCfg } as Record<string, string>;
  if (t.source.key === 'linkedin_signal') {
    const titles = (cfg.decision_maker_titles || '').trim();
    const signal = (cfg.signal_query || '').trim();
    if (!signal && !titles) return null;
    return [titles && `${titles} at companies`, signal].filter(Boolean).join(' — ');
  }
  if (t.source.key !== 'linkedin_search') return null;
  const titles = (cfg.job_titles || '').trim();
  const industries = (cfg.industries || '').trim();
  const locations = (cfg.locations || '').trim();
  if (!titles && !industries && !locations) return null;
  const parts = [titles || 'decision makers'];
  if (industries) parts.push(`in ${industries}`);
  if (locations) parts.push(`in ${locations}`);
  return parts.join(' ');
}
