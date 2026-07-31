/**
 * The parts of the launch payload the Test run also has to build.
 *
 * A test run that re-read the canvas its own way would drift from Launch, and
 * the drift would be invisible: the test would pass against a workflow that
 * behaves differently once launched, which is worse than no test at all. So
 * every node the test actually EXECUTES — the web-intel steps, the report step,
 * and the three content macros — is emitted here once and used by both.
 *
 * Outreach nodes are deliberately NOT here. The test run sends them as bare
 * `{ type, title }` so the timeline can list what it skipped, and the request
 * therefore carries no message copy, no template ids and no recipients for any
 * step that could contact someone. Nothing reads their config, because the
 * backend refuses to run them (WorkflowTestRunService).
 */

import {
  SCRAPE_STEP_ID, RESEARCH_STEP_ID, SCORE_STEP_ID, REPORT_STEP_ID,
  LANDING_STEP_ID, EXPORT_STEP_ID, SOURCE_STEP_ID, EXPORT_DEFAULT_COLUMNS,
} from './workflowTemplates';

type Cfgs = Record<string, any>;
type Node = { id: string; type?: string; title?: string };

const csvList = (v: any): string[] =>
  String(v || '').split(',').map((x: string) => x.trim()).filter(Boolean);

/**
 * Web-intel steps (scrape / research / score), in the fixed order the engine
 * needs: scrape and research gather what the report is written from, so they
 * have to precede it, and scoring reads whatever they left behind.
 */
export function buildIntelSteps(workflowPreview: Node[], configs: Cfgs): any[] {
  const steps: any[] = [];
  if (workflowPreview.some((s) => s.id === SCRAPE_STEP_ID)) {
    const sc = configs[SCRAPE_STEP_ID] || {};
    steps.push({
      type: 'web_scrape', title: 'Webpage scraper', channel: 'email',
      config: {
        url: (sc.url || '').trim() || undefined,
        max_chars: Math.max(200, Math.min(5000, parseInt(sc.max_chars, 10) || 1500)),
      },
    });
  }
  if (workflowPreview.some((s) => s.id === RESEARCH_STEP_ID)) {
    steps.push({ type: 'web_research', title: 'Web research', channel: 'email', config: {} });
  }
  if (workflowPreview.some((s) => s.id === SCORE_STEP_ID)) {
    const sc = configs[SCORE_STEP_ID] || {};
    steps.push({
      type: 'lead_score', title: 'Lead scoring', channel: 'email',
      config: {
        hiring_companies: csvList(sc.hiring_companies),
        funding_companies: csvList(sc.funding_companies),
        competitor_companies: csvList(sc.competitor_companies),
      },
    });
  }
  return steps;
}

/**
 * The per-lead report step's config. Returns null for the campaign-scoped
 * variant, which is a macro (see buildContentMacros) rather than a step — same
 * node, two execution models, chosen by its own scope field.
 */
export function buildLeadReportStepConfig(c: Record<string, any>, delay: Record<string, number>) {
  if (c?.scope === 'campaign') return null;
  return {
    step_id: REPORT_STEP_ID,
    report_type: c.report_type || 'growth_opportunity_audit',
    context: (c.context || '').trim() || undefined,
    email_now: !!c.email_now,
    require_approval: c.require_approval !== false,
    approval_channel: c.approval_channel === 'whatsapp' ? 'whatsapp' : 'email',
    approval_to: (c.approval_to || '').trim() || undefined,
    ...delay,
  };
}

/**
 * The three campaign-level content macros, exactly as Launch writes them onto
 * campaigns.config. Not steps: separate machinery runs each one.
 */
export function buildContentMacros(workflowPreview: Node[], configs: Cfgs): Record<string, any> {
  const out: Record<string, any> = {};

  if (workflowPreview.some((s) => s.id === EXPORT_STEP_ID)) {
    const ec = configs[EXPORT_STEP_ID] || {};
    // Read by CampaignExportService — on completion and from "Export now".
    out.export_results = {
      format: ec.format || 'csv',
      destinations: Array.isArray(ec.destinations) && ec.destinations.length ? ec.destinations : ['file'],
      columns: Array.isArray(ec.columns) && ec.columns.length ? ec.columns : EXPORT_DEFAULT_COLUMNS,
      run_on_completion: ec.run_on_completion !== false,
      email_to: (ec.email_to || '').trim() || undefined,
      whatsapp_to: (ec.whatsapp_to || '').trim() || undefined,
      webhook_url: (ec.webhook_url || '').trim() || undefined,
      sheet_id: (ec.sheet_id || '').trim() || undefined,
      slack_webhook_url: (ec.slack_webhook_url || '').trim() || undefined,
      bucket: (ec.bucket || '').trim() || undefined,
      bucket_prefix: (ec.bucket_prefix || '').trim() || undefined,
    };
  }

  const rc = configs[REPORT_STEP_ID] || {};
  if (workflowPreview.some((s) => s.id === REPORT_STEP_ID) && rc.scope === 'campaign') {
    const sc = configs[SOURCE_STEP_ID] || {};
    out.campaign_report = {
      // Fall back to the source node's industry so the common case needs no
      // retyping.
      industry: (rc.industry || sc.industries || '').trim(),
      audience: (sc.job_titles || '').trim() || undefined,
      report_type: rc.report_type || 'growth_opportunity_audit',
      context: (rc.context || '').trim() || undefined,
      require_approval: rc.require_approval !== false,
      approval_channel: rc.approval_channel === 'whatsapp' ? 'whatsapp' : 'email',
      approval_to: (rc.approval_to || '').trim() || undefined,
    };
  }

  if (workflowPreview.some((s) => s.id === LANDING_STEP_ID)) {
    const lc = configs[LANDING_STEP_ID] || {};
    // Read by the campaigns landing-page routes: the page is generated from
    // this brief at launch, then approved and published.
    out.landing_page = {
      brief: (lc.brief || '').trim(),
      goal: (lc.goal || '').trim() || undefined,
      capture_enabled: lc.capture_enabled !== false,
      capture_fields: Array.isArray(lc.capture_fields) && lc.capture_fields.length
        ? lc.capture_fields : ['name', 'email'],
      require_approval: lc.require_approval !== false,
      source_file_name: lc.source_file_name || undefined,
      // Only meaningful on edit. The backend still re-checks that the inputs
      // really changed, so a stale true cannot force a rewrite.
      regenerate: lc.regenerate === true,
      // Reused verbatim at launch when the brief has not changed since, so the
      // page that goes live is the page that was reviewed.
      preview_content: lc.preview_content || undefined,
      preview_brief: lc.preview_brief || undefined,
    };
  }

  return out;
}

/** Step types the backend's test run will actually execute. */
export const TEST_RUNNABLE_TYPES = new Set([
  'web_scrape', 'web_research', 'lead_score', 'lead_report',
]);

/**
 * The `steps` array for a test run.
 *
 * Executable steps come from the shared emitters above — byte-for-byte what
 * Launch posts. Everything else is reduced to type + title: enough for the
 * timeline to name what it skipped, and nothing the backend could act on even
 * if its filter were removed.
 */
export function buildTestRunSteps(workflowPreview: Node[], configs: Cfgs): any[] {
  const steps: any[] = [];
  const emitted = new Set<string>();

  for (const node of workflowPreview) {
    if (node.id === SOURCE_STEP_ID) {
      steps.push({ type: 'lead_generation', title: node.title || 'Contact source' });
      continue;
    }
    if (node.id === SCRAPE_STEP_ID || node.id === RESEARCH_STEP_ID || node.id === SCORE_STEP_ID) {
      // Emitted together, in engine order, the first time one is reached.
      if (!emitted.has('intel')) {
        emitted.add('intel');
        steps.push(...buildIntelSteps(workflowPreview, configs));
      }
      continue;
    }
    if (node.type === 'lead_report') {
      const cfg = buildLeadReportStepConfig(configs[node.id] || {}, {});
      // Campaign-scoped: runs as a macro instead, so it is not a step here.
      if (cfg) steps.push({ type: 'lead_report', title: node.title || 'Audit report', config: cfg });
      continue;
    }
    // The two nodes the backend runs from `config` rather than from `steps`.
    // Sending them as steps too listed each one TWICE in the timeline: once
    // "skipped" (there is no step handler for their type) and again "ran" (from
    // the macro pass) — with a skip reason about contacting the lead that makes
    // no sense for a landing page.
    //
    // Deliberately not MACRO_STEP_IDS, which is a much wider list: AI Agent,
    // Enrich contact and the follow-up sequence are in it and DO compile to real
    // steps. Their skipped rows are the honest disclosure of what a test holds
    // back, so dropping them would hide exactly what the panel promises to show.
    if (node.id === LANDING_STEP_ID || node.id === EXPORT_STEP_ID) continue;
    // Anything that can reach the lead or your accounts: name only.
    if (node.type) steps.push({ type: node.type, title: node.title || node.type });
  }

  return steps;
}
