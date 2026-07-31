'use client';
// Custom Accelerator builder (node graph) — embeddable component.
//
// Pick a contact SOURCE node (Zoho CRM recurring/one-time, GoHighLevel,
// LinkedIn Search), chain OUTREACH nodes (LinkedIn / Email / WhatsApp / Voice /
// Wait-condition) on a React Flow canvas, configure each node in a drawer, and
// launch — assembles engine-compatible campaign steps and POSTs /api/campaigns.
// Recurrence comes from the engine's daily lead_generation loop
// (source='zoho_contacts' etc.), not a separate scheduler.
//
// Hosted in TWO places: the /campaigns/workflow page (thin wrapper) and the
// advanced-search-ai "+" menu (full-screen overlay on the same page).
//
// Reuses the existing workflow canvas stack (CustomWorkflowNode, flow builders,
// onboarding store) so nodes render/edit/delete exactly like the campaign
// preview panel. Because the store is SHARED with the chat-built workflow
// preview on advanced-search-ai, the builder snapshots workflowPreview on
// mount and restores it on close. Node CONFIG (messages, delays, zoho
// modules…) lives in local state keyed by step id — the store only carries the
// visual step list.

import * as React from 'react';
import { useState, useMemo, useEffect, useCallback, useRef, Fragment } from 'react';
import ReactFlow, { ReactFlowProvider, useNodesState, useEdgesState } from 'reactflow';
import 'reactflow/dist/style.css';
import {
  Rocket, Loader2, Linkedin, Mail, MailPlus, MessageCircle, Phone, Clock,
  Users, Repeat, Search, X, HardDrive, Inbox, ListOrdered, BarChart3, GitFork, DatabaseZap,
  Wand2, Trash2, Radar, Split, Plus, Upload, FileSpreadsheet, Sparkles, Contact, Download, Megaphone, Zap, Globe, Telescope, Gauge, Shuffle, PenLine, Webhook, PenTool, ShieldCheck,
  Bookmark, LayoutTemplate, ExternalLink, FlaskConical, Play,
  Instagram, UserCheck, FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import LeadPreviewPanel from './LeadPreviewPanel';
import {
  WORKFLOW_TEMPLATES, WorkflowTemplate,
  SOURCE_STEP_ID, FOLLOWUP_STEP_ID, ANALYTICS_STEP_ID, ZOHO_UPDATE_STEP_ID,
  MEDIA_STEP_ID, MULTICOND_STEP_ID, AI_STEP_ID, ENRICH_STEP_ID, EXPORT_STEP_ID,
  AUTOPOST_STEP_ID, CONTENT_STEP_ID, APPROVAL_STEP_ID, AI_DEFAULT_INSTRUCTION, EXPORT_DEFAULT_COLUMNS,
  IG_AUTOPOST_STEP_ID, HUMAN_TASK_STEP_ID, REPORT_STEP_ID,
  SCRAPE_STEP_ID, RESEARCH_STEP_ID, SCORE_STEP_ID,
  SPLIT_STEP_ID, SETFIELD_STEP_ID, HTTP_STEP_ID, LANDING_STEP_ID, templateNodeKey, MACRO_STEP_IDS,
  templateToPreviewSteps,
} from './workflowTemplates';
import {
  buildIntelSteps, buildLeadReportStepConfig, buildContentMacros,
  buildTestRunSteps, TEST_RUNNABLE_TYPES,
} from './workflowPayload';
import { TemplateIcon, stepCategory } from './TemplateIcon';
import {
  useStrategies, useCreateStrategy, useSharedStrategies, useImportSharedStrategy,
} from '@lad/frontend-features/campaigns';
import {
  builderStateToDefinition, definitionToTemplate, isStrategyKey, strategyIdFromKey,
  SHARED_STRATEGY_PREFIX,
} from './strategyAdapter';
import { StrategyPublishDialog } from './StrategyPublishDialog';
import { useMediaBuilder } from '@/hooks/voice-agent/useMediaBuilder';
import { MediaGenerationModal } from '@/components/voice-agent/MediaGenerationModal';
import { useOnboardingStore, type WorkflowPreviewStep } from '@/store/onboardingStore';
import type { StepType } from '@/types/campaign';
import { useVoiceAgent } from '@lad/frontend-features/ai-icp-assistant';
import { useConnectedEmailSenders } from '@lad/frontend-features/email-senders';
import { useEmailTemplates } from '@lad/frontend-features/email-templates';
import { CustomWorkflowNode } from '@/components/onboarding/workflow/CustomWorkflowNode';
import { WorkflowCanvas } from '@/components/onboarding/workflow/WorkflowCanvas';
import { createReactFlowNodes, createReactFlowEdges } from '@/components/onboarding/workflow/workflowFlowBuilder';
import LabeledEdge from '@/components/onboarding/workflow/LabeledEdge';
import { StepInsertMenu, type InsertMenuItem } from '@/components/onboarding/workflow/StepInsertMenu';

const nodeTypes = { custom: CustomWorkflowNode };
const edgeTypes = { labeled: LabeledEdge };

// ─── Palette definitions ─────────────────────────────────────────────────────

type SourceKey = 'zoho_recurring' | 'zoho_once' | 'ghl_once' | 'linkedin_search' | 'linkedin_signal' | 'file_import';

const SOURCES: { key: SourceKey; label: string; sub: string; icon: React.ReactNode; chip: string; recurring?: boolean }[] = [
  { key: 'zoho_recurring', label: 'Zoho CRM — recurring', sub: 'Import new contacts daily', icon: <Repeat className="h-4 w-4 text-red-600" />, chip: 'bg-red-50 dark:bg-red-950/30', recurring: true },
  { key: 'zoho_once', label: 'Zoho CRM — one-time', sub: 'Import synced contacts now', icon: <Users className="h-4 w-4 text-red-600" />, chip: 'bg-red-50 dark:bg-red-950/30' },
  { key: 'ghl_once', label: 'GoHighLevel — one-time', sub: 'Import synced contacts now', icon: <Users className="h-4 w-4 text-blue-600" />, chip: 'bg-blue-50 dark:bg-blue-950/30' },
  { key: 'file_import', label: 'File import (CSV / Excel)', sub: 'Upload a list and map columns', icon: <FileSpreadsheet className="h-4 w-4 text-emerald-600" />, chip: 'bg-emerald-50 dark:bg-emerald-950/30' },
  { key: 'linkedin_search', label: 'LinkedIn Search', sub: 'Find new leads by keywords', icon: <Search className="h-4 w-4 text-[#0077B5]" />, chip: 'bg-sky-50 dark:bg-sky-950/30' },
  { key: 'linkedin_signal', label: 'LinkedIn Signal Search', sub: 'Find leads from hiring/buying signals', icon: <Radar className="h-4 w-4 text-[#0077B5]" />, chip: 'bg-sky-50 dark:bg-sky-950/30', recurring: true },
];

// Target fields the file columns map to. 'ignore' drops the column.
const IMPORT_FIELDS = [
  { value: 'ignore', label: '— Ignore —' },
  { value: 'full_name', label: 'Full name' },
  { value: 'first_name', label: 'First name' },
  { value: 'last_name', label: 'Last name' },
  { value: 'company', label: 'Company' },
  { value: 'title', label: 'Job title' },
  { value: 'location', label: 'Location' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Phone / WhatsApp' },
  { value: 'linkedin_url', label: 'LinkedIn URL' },
  { value: 'website', label: 'Website' },
];

/** Quote-aware CSV → string[][]. */
function parseCSVText(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  const s = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((v) => (v || '').trim()));
}

/** Parse a CSV/XLSX File → { headers, rows }. Excel via exceljs (dynamic import). */
async function parseImportFile(file: File): Promise<{ headers: string[]; rows: string[][] }> {
  const isExcel = /\.(xlsx|xls)$/i.test(file.name);
  let grid: string[][];
  if (isExcel) {
    const { Workbook } = await import('exceljs');
    const wb = new Workbook();
    await wb.xlsx.load(await file.arrayBuffer());
    const ws = wb.worksheets[0];
    if (!ws) throw new Error('No worksheet found in the Excel file.');
    grid = [];
    ws.eachRow((r) => {
      const vals = (r.values as any[]).slice(1).map((v) => (v == null ? '' : String(typeof v === 'object' && v.text ? v.text : v).trim()));
      grid.push(vals);
    });
    grid = grid.filter((r) => r.some((v) => (v || '').trim()));
  } else {
    grid = parseCSVText(await file.text());
  }
  if (grid.length < 2) throw new Error('File needs a header row and at least one data row.');
  return { headers: grid[0].map((h) => (h || '').trim()), rows: grid.slice(1) };
}

/** Suggest a target field for a header name. */
function suggestImportField(header: string): string {
  const s = (header || '').toLowerCase();
  if (/full.?name|^name$|contact.?name/.test(s)) return 'full_name';
  if (/first/.test(s)) return 'first_name';
  if (/last|surname/.test(s)) return 'last_name';
  if (/company|account|organi[sz]ation|employer/.test(s)) return 'company';
  if (/title|designation|role|position|job/.test(s)) return 'title';
  if (/location|city|country|region|geo|state/.test(s)) return 'location';
  if (/e-?mail/.test(s)) return 'email';
  if (/phone|mobile|whatsapp|contact.?number/.test(s)) return 'phone';
  if (/linkedin/.test(s)) return 'linkedin_url';
  if (/website|url|domain/.test(s) && !/linkedin/.test(s)) return 'website';
  return 'ignore';
}

const COMING_SOON = [
  { label: 'Google Drive', icon: <HardDrive className="h-4 w-4 text-muted-foreground" /> },
  { label: 'Gmail inbox', icon: <Inbox className="h-4 w-4 text-muted-foreground" /> },
];

type Channel = 'linkedin' | 'email' | 'whatsapp' | 'voice' | 'instagram';
// NOTE: the store's StepType uses 'condition' for waits; we map it to the
// engine's 'wait_for_condition' step type at launch.
const OUTREACH: { type: StepType; label: string; group: string; channel: Channel; icon: React.ReactNode; chip: string; router?: boolean }[] = [
  { type: 'linkedin_connect', label: 'Connection request', group: 'LinkedIn', channel: 'linkedin', icon: <Linkedin className="h-4 w-4 text-[#0077B5]" />, chip: 'bg-sky-50 dark:bg-sky-950/30' },
  { type: 'linkedin_message', label: 'Message', group: 'LinkedIn', channel: 'linkedin', icon: <Linkedin className="h-4 w-4 text-[#0077B5]" />, chip: 'bg-sky-50 dark:bg-sky-950/30' },
  { type: 'linkedin_inmail', label: 'InMail (Premium)', group: 'LinkedIn', channel: 'linkedin', icon: <MailPlus className="h-4 w-4 text-[#7C3AED]" />, chip: 'bg-violet-50 dark:bg-violet-950/30' },
  { type: 'linkedin_visit', label: 'Profile visit', group: 'LinkedIn', channel: 'linkedin', icon: <Linkedin className="h-4 w-4 text-[#0077B5]" />, chip: 'bg-sky-50 dark:bg-sky-950/30' },
  { type: 'linkedin_follow', label: 'Follow profile', group: 'LinkedIn', channel: 'linkedin', icon: <Linkedin className="h-4 w-4 text-[#0077B5]" />, chip: 'bg-sky-50 dark:bg-sky-950/30' },
  { type: 'email_send', label: 'Send email', group: 'Email', channel: 'email', icon: <Mail className="h-4 w-4 text-amber-600" />, chip: 'bg-amber-50 dark:bg-amber-950/30' },
  { type: 'whatsapp_send', label: 'Send WhatsApp', group: 'WhatsApp', channel: 'whatsapp', icon: <MessageCircle className="h-4 w-4 text-green-600" />, chip: 'bg-green-50 dark:bg-green-950/30' },
  { type: 'voice_agent_call', label: 'AI voice call', group: 'Voice', channel: 'voice', icon: <Phone className="h-4 w-4 text-violet-600" />, chip: 'bg-violet-50 dark:bg-violet-950/30' },
  { type: 'condition', label: 'Wait for condition', group: 'Logic', channel: 'linkedin', icon: <Clock className="h-4 w-4 text-slate-500" />, chip: 'bg-slate-100 dark:bg-slate-800/50' },
  { type: 'condition', label: 'Router — fallback', group: 'Logic', channel: 'linkedin', icon: <GitFork className="h-4 w-4 text-rose-600" />, chip: 'bg-rose-50 dark:bg-rose-950/30', router: true },
];

const ROUTER_CHANNELS = [
  { value: 'email', label: 'Email' },
  { value: 'linkedin', label: 'LinkedIn message' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'voice', label: 'AI voice call' },
];

/** Small rounded icon chip used across palette rows and the drawer header. */
const IconChip = ({ icon, chip, size = 'h-9 w-9' }: { icon: React.ReactNode; chip: string; size?: string }) => (
  <span className={`${size} ${chip} rounded-lg flex items-center justify-center flex-shrink-0`}>{icon}</span>
);

const CONDITIONS = [
  { value: 'connection_accepted', label: 'Connection accepted', action: 'CONNECTION_ACCEPTED' },
  { value: 'message_replied', label: 'Message replied', action: 'REPLY_RECEIVED' },
  { value: 'email_read', label: 'Email read', action: 'EMAIL_READ' },
  { value: 'email_replied', label: 'Email replied', action: 'EMAIL_REPLIED' },
  { value: 'wa_read', label: 'WhatsApp read', action: 'WA_READ' },
  { value: 'wa_replied', label: 'WhatsApp replied', action: 'WA_REPLIED' },
];

// ─── Per-node instructions ───────────────────────────────────────────────────
// What each node needs and how it behaves, shown at the top of its settings
// drawer. Keyed by SourceKey for sources, by StepType for plain outreach/logic
// nodes, by 'router' for the router variant, and by the node's fixed macro id
// (see workflowTemplates.ts) for everything else — mirrors the key resolution
// already used for icons/labels in renderEditor(). Deliberately a loose
// Record<string,string>, not tied to the three exhaustive StepType maps
// elsewhere (StepSettings.tsx / both campaignStore.ts) — this is a new,
// independent lookup so it can't break their exhaustiveness.
const STEP_INSTRUCTIONS: Record<string, string> = {
  // Sources
  zoho_recurring: 'Imports newly-created Zoho CRM contacts every day for the life of the campaign. Nothing is required — the tag filter is optional.',
  zoho_once: 'Imports contacts already synced from Zoho CRM, once. Nothing is required.',
  ghl_once: 'Imports contacts already synced from GoHighLevel, once. Nothing is required.',
  file_import: "Imports leads from an uploaded CSV/Excel file. Needs a file with at least one column mapped to name, company, email, or LinkedIn URL. Rows with no LinkedIn URL are resolved automatically by name+company at send time — some may never match, and those retry indefinitely rather than fail. Map a LinkedIn URL column directly when you have one.",
  linkedin_search: 'Finds new leads by keyword, title, industry, or location. Needs at least one of those filled in.',
  linkedin_signal: 'Finds leads from hiring/buying signals. Needs a description of the signal to search for.',
  // LinkedIn outreach
  linkedin_connect: "Sends a LinkedIn connection request — no prior connection needed. Needs an active LinkedIn account connected in Settings. Follow it with a Message step to reach leads once they accept.",
  linkedin_message: "Sends a LinkedIn DM — but ONLY once a connection has already been accepted. If there is no Connection request step earlier in this sequence, the lead is never asked to connect, so this step waits for an acceptance that will never happen and no message is ever sent. Needs message text (supports {{first_name}}, {{company}}, {{web_insight}}, {{recent_post}}, {{article}}, {{news}}).",
  linkedin_inmail: 'Sends a paid InMail straight to a non-connection — no prior connect step needed. Needs message text and a LinkedIn Premium / Sales Navigator / Recruiter seat with InMail credits on the sending account.',
  linkedin_visit: "Visits the lead's LinkedIn profile as a warm-up signal. Nothing is required; no sequence dependency, though it reads best placed before Connect/Message.",
  linkedin_follow: "Follows the lead's LinkedIn profile. Nothing is required; no sequence dependency.",
  // Other channels
  email_send: 'Sends an email. Needs a subject, a body, and a connected email sender.',
  whatsapp_send: 'Sends a WhatsApp message. Needs message text and a connected WhatsApp number.',
  voice_agent_call: 'Places an AI voice call. Voice agent and script are both optional — if left blank, the first available voice agent is used.',
  condition: 'Pauses the lead here until the chosen condition (connection accepted, message replied, etc.) is met, then continues.',
  router: 'Watches the step placed right before it. After the set number of failed attempts, it stops retrying and reroutes the lead to the fallback channel instead.',
  // Macro nodes (by fixed id — see workflowTemplates.ts)
  [FOLLOWUP_STEP_ID]: 'Automatic follow-up touches if a lead does not reply, on the schedule below. Needs at least one touch configured (defaults are pre-filled).',
  [ANALYTICS_STEP_ID]: 'Emails or WhatsApps a daily performance digest. Needs a recipient.',
  [ZOHO_UPDATE_STEP_ID]: "Writes this workflow's results back onto the lead's Zoho record. Needs a target module and at least one field mapped.",
  [MEDIA_STEP_ID]: 'Generates an image or video asset to attach to outreach or a scheduled post.',
  [MULTICOND_STEP_ID]: 'Routes each lead down a different branch (and message) by a field value. Needs at least one condition with a value and a message.',
  [AI_STEP_ID]: 'Uses AI to clean up messy imported titles/names before outreach runs. Nothing is required. Most useful placed right after the contact source, before any outreach step.',
  [ENRICH_STEP_ID]: "Reveals a lead's email/phone via FullEnrich, spending credits per lead found. Nothing is required. Most useful before an Email or WhatsApp step that needs that contact info.",
  [EXPORT_STEP_ID]: 'Sends the final lead list to a file, database, email, WhatsApp, webhook, Sheet, or Slack. Needs at least one destination configured.',
  [AUTOPOST_STEP_ID]: "Publishes on a recurring schedule to the tenant's own LinkedIn feed — not sent to leads. Needs post content from a LinkedIn content node.",
  [CONTENT_STEP_ID]: 'Writes (or AI-generates) the text for the scheduled LinkedIn post.',
  [APPROVAL_STEP_ID]: 'Holds a post for approval over WhatsApp/email before it publishes. Needs an approver contact, AND a LinkedIn auto-post node in this workflow — approval has nothing to gate without one.',
  [SCRAPE_STEP_ID]: "Reads one web page's text for this workflow's own use. Needs a URL. This is the exact URL entered — it does NOT automatically use each lead's own company site — and its content is not inserted into your message unless you separately reference {{web_insight}} there, which is filled from a different, automatic per-lead lookup, not this step. Point this at a page that should be the same for every lead, or skip it.",
  [RESEARCH_STEP_ID]: "Runs AI research on each lead's company from the open web. Nothing is required.",
  [SCORE_STEP_ID]: 'Scores each lead\'s buy-intent 0-100 and labels it hot/warm/cold. Nothing is required. Pairs naturally with a Multi-condition step placed right after it, to branch hot vs. cold leads.',
  [SPLIT_STEP_ID]: 'Sends variant A or B (roughly 50/50, sticky per lead) to compare two openers. Needs a message for BOTH variants.',
  [SETFIELD_STEP_ID]: 'Writes a tag or value onto the lead record for later branching or export.',
  [HTTP_STEP_ID]: "Calls any external API with this lead's data. Requests to internal/private/cloud-metadata addresses are blocked.",
};

// ─── Build with AI ───────────────────────────────────────────────────────────
/**
 * Starting points on the resting screen. Each seeds the prompt with a shape the
 * drafter handles well and leaves the specifics in [brackets] for the user to
 * replace — a real head start, not decoration. Colours follow the channel
 * palette used everywhere else in the builder, so a starter reads as the
 * channel it will build for.
 */
const AI_STARTERS: { label: string; prompt: string; icon: React.ReactNode; chip: string }[] = [
  {
    label: 'LinkedIn outreach',
    chip: 'bg-[#0077B5]',
    icon: <Linkedin className="h-4 w-4 text-white" />,
    prompt: 'Find [job title] at [industry] companies in [location], visit their profile, send a connection request, then message them once they accept — and follow up twice if they go quiet.',
  },
  {
    label: 'Email sequence',
    chip: 'bg-amber-600',
    icon: <Mail className="h-4 w-4 text-white" />,
    prompt: 'Email [job title] at [industry] companies in [location], then follow up twice if they do not reply.',
  },
  {
    label: 'Import a list',
    chip: 'bg-emerald-600',
    icon: <FileSpreadsheet className="h-4 w-4 text-white" />,
    prompt: 'Import my CSV of contacts, find each person on LinkedIn, send a connection request, then message them once they accept.',
  },
  {
    label: 'From your CRM',
    chip: 'bg-red-600',
    icon: <DatabaseZap className="h-4 w-4 text-white" />,
    prompt: 'Import new contacts from Zoho every day, connect with them on LinkedIn, send a welcome email, then follow up twice.',
  },
];

/**
 * One clarifying question from /workflow/plan. The catalog lives server-side so
 * every question maps to a config key the builder actually reads; the shape is
 * mirrored here only for rendering.
 */
type AiQuestion = {
  id: string;
  nodeKey: string;
  question: string;
  help?: string;
  placeholder?: string;
  type: 'choice' | 'multi' | 'text' | 'longtext';
  options?: { value: string; label: string; hint?: string }[];
  required?: boolean;
  /** Copy fields: blank is a real answer ("let Mr LAD write it"). */
  skippable?: boolean;
  /**
   * Whether the listed options are a shortlist rather than the whole set. Only
   * set where a typed answer is genuinely honoured — offering it on a closed
   * set (the three follow-up channels, yes/no) would take an answer the engine
   * cannot act on and silently drop it.
   */
  allowOther?: boolean;
  otherLabel?: string;
  otherPlaceholder?: string;
  otherHelp?: string;
};

// ─── Test run ────────────────────────────────────────────────────────────────
//
// This used to be a browser simulation that described what each step would do.
// It is now a REAL single-lead execution on the server: the research and
// content steps run for real and produce the actual artifacts, so an
// accelerator whose output IS a PDF and a landing page can be judged by reading
// them rather than by reading a description of them.
//
// Nothing reaches the lead. That is enforced in the backend executor
// (WorkflowTestRunService), not here — the rows below are a rendering of what
// the server reports it did, and the panel has no say in what runs.

/** One row of the timeline the server returns. */
type TestStep = {
  type: string;
  title: string;
  status: 'ran' | 'skipped' | 'failed';
  detail: string;
  artifacts?: TestArtifact[];
};

/** Something the run actually produced, at a real URL. */
type TestArtifact = {
  kind: 'report' | 'landing_page' | 'file' | string;
  label: string;
  url: string;
};

const ARTIFACT_ICON: Record<string, React.ReactNode> = {
  report: <FileText className="h-4 w-4 text-rose-600" />,
  landing_page: <Globe className="h-4 w-4 text-sky-600" />,
  file: <Download className="h-4 w-4 text-cyan-700" />,
};
const ARTIFACT_LABEL: Record<string, string> = {
  report: 'PDF report',
  landing_page: 'Landing page',
  file: 'Results file',
};

// "Macro" nodes (single-instance): follow-ups EXPAND into real engine steps at
// launch; analytics becomes campaign config read by the digest cron — it is
// NOT an engine step.
let stepSeq = 0;
const nextId = () => `wf-${Date.now()}-${stepSeq++}`;

const FU_CHANNELS = [
  { value: 'linkedin', label: 'LinkedIn message' },
  { value: 'email', label: 'Email' },
  { value: 'whatsapp', label: 'WhatsApp' },
];

// "Update Zoho record" write-back node (single-instance) — maps workflow data
// back onto the lead's Zoho record. Keys MUST match the backend
// ZohoWritebackService.SOURCE_RESOLVERS.

// "AI Media" node (single-instance) — generate a brand image/video at design
// time; the media_generation step records it and the asset is attached to the
// workflow's email/WhatsApp outreach at launch.

// "Multi-condition" (switch) node — routes each lead down one of N branches by
// a lead field (if/elseif/else). Expands at launch into a `switch` step + one
// guarded message step per branch (backend prunes the non-chosen branches).

// "AI Agent" node — LLM-normalises each lead (clean single title from a mixed
// field, split name, tidy company) before the outreach/LinkedIn steps run.

// "Enrich contact" node — reveals email/phone via FullEnrich; user multi-selects.
const ENRICH_OPTIONS: { key: string; label: string; sub: string }[] = [
  { key: 'official_email', label: 'Official email', sub: 'work / business email' },
  { key: 'personal_email', label: 'Personal email', sub: 'private email' },
  { key: 'phone', label: 'Phone number', sub: 'mobile number' },
];

// "Export results" node — ships the campaign's result set to one or more
// destinations. Config-only (like the analytics digest): stored on
// campaigns.config.export_results and run on completion / on demand.
const EXPORT_FORMATS = [
  { value: 'csv', label: 'CSV (.csv)' },
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'json', label: 'JSON (.json)' },
];
const EXPORT_DESTINATIONS: { key: string; label: string; sub: string }[] = [
  { key: 'file',          label: 'Download file',   sub: 'CSV / Excel / JSON link' },
  { key: 'database',      label: 'Database table',  sub: 'append to campaign_export_results' },
  { key: 'email',         label: 'Email',           sub: 'send file as an attachment' },
  { key: 'whatsapp',      label: 'WhatsApp',        sub: 'send file as a document' },
  { key: 'webhook',       label: 'Webhook',         sub: 'POST JSON to a URL' },
  { key: 'google_sheets', label: 'Google Sheets',   sub: 'append rows to a sheet' },
  { key: 'slack',         label: 'Slack',           sub: 'post summary + link' },
  { key: 'cloud_storage', label: 'Cloud storage',   sub: 'drop file in a bucket' },
];
const EXPORT_COLUMN_OPTIONS: { value: string; label: string }[] = [
  { value: 'full_name', label: 'Full name' },
  { value: 'first_name', label: 'First name' },
  { value: 'last_name', label: 'Last name' },
  { value: 'title', label: 'Title' },
  { value: 'company_name', label: 'Company' },
  { value: 'email', label: 'Email' },
  { value: 'personal_email', label: 'Personal email' },
  { value: 'phone', label: 'Phone' },
  { value: 'linkedin_url', label: 'LinkedIn URL' },
  { value: 'status', label: 'Status' },
  { value: 'last_action', label: 'Last action' },
  { value: 'last_action_at', label: 'Last action at' },
  { value: 'replied', label: 'Replied' },
  { value: 'created_at', label: 'Added on' },
];

// "LinkedIn auto-post" node — posts to the tenant's OWN feed on a recurring
// schedule while the campaign runs (social-selling warm-up). Campaign-level,
// NOT per-lead: a per-lead post would fire once per enrolled lead.
// Web-intel nodes — per-lead steps that enrich from the open web before
// outreach. Each is single-instance (fixed id) like the other AI/data nodes.
// Logic / data nodes. split_test reuses the switch machinery on the backend
// (stamps an outcome, prunes the losing variant) — see WorkflowProcessor.
const AUTOPOST_FREQUENCIES = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'On selected days' },
];
const AUTOPOST_DAYS = [
  { value: 1, label: 'Mon' }, { value: 2, label: 'Tue' }, { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' }, { value: 5, label: 'Fri' }, { value: 6, label: 'Sat' },
  { value: 0, label: 'Sun' },
];

/**
 * When this schedule actually fires next, mirroring the backend's
 * computeNextRun: the next slot STRICTLY in the future, on an allowed weekday.
 *
 * Worth surfacing because the consequence is easy to miss. Pick 04:17 on a
 * Monday afternoon and the next Monday 04:17 is a week away, so the workflow
 * launches, reports success and then does nothing for seven days.
 *
 * The builder sends the browser's timezone, so computing locally matches.
 */
export function nextAutopostRun(frequency: string, days: number[], time: string, from = new Date()): Date | null {
  const [hh, mm] = String(time || '09:00').split(':').map((n) => parseInt(n, 10) || 0);
  const weekly = frequency !== 'daily';
  // Weekly with nothing selected never fires — the backend treats it as daily.
  const allowed = weekly && days.length ? days : [0, 1, 2, 3, 4, 5, 6];
  for (let i = 0; i <= 8; i += 1) {
    const d = new Date(from);
    d.setDate(d.getDate() + i);
    d.setHours(hh, mm, 0, 0);
    if (d.getTime() <= from.getTime()) continue;
    if (!allowed.includes(d.getDay())) continue;
    return d;
  }
  return null;
}


const SWITCH_FIELDS = [
  { value: 'tag', label: 'Tag' },
  { value: 'title', label: 'Job title' },
  { value: 'company', label: 'Company' },
  { value: 'seniority', label: 'Seniority' },
  { value: 'industry', label: 'Industry' },
  { value: 'location', label: 'Location' },
];
const SWITCH_OPS = [
  { value: 'equals', label: 'is' },
  { value: 'contains', label: 'contains' },
  { value: 'not_equals', label: 'is not' },
];

type DataPoint = { key: string; label: string; match: RegExp; needsChannel?: Channel };
const WORKFLOW_DATA_POINTS: DataPoint[] = [
  { key: 'full_name',          label: 'Full name',            match: /full.?name|^name$/i },
  { key: 'first_name',         label: 'First name',           match: /first.?name/i },
  { key: 'last_name',          label: 'Last name',            match: /last.?name/i },
  { key: 'email',              label: 'Email',                match: /e-?mail/i },
  { key: 'phone',              label: 'Phone',                match: /phone|mobile/i },
  { key: 'company',            label: 'Company',              match: /company|account.?name|organi[sz]ation/i },
  { key: 'title',              label: 'Job title',            match: /title|designation|\brole\b/i },
  { key: 'linkedin_url',       label: 'LinkedIn URL',         match: /linkedin/i, needsChannel: 'linkedin' },
  { key: 'instagram_url',      label: 'Instagram URL',        match: /instagram/i, needsChannel: 'instagram' },
  { key: 'seniority',          label: 'Seniority',            match: /seniority|\blevel\b/i },
  { key: 'department',         label: 'Department',           match: /department|division/i },
  { key: 'location',           label: 'Location',             match: /location|\bcity\b|\bstate\b|country|address/i },
  { key: 'industry',           label: 'Industry',             match: /industry|sector/i },
  { key: 'headline',           label: 'Headline / summary',   match: /headline|about|summary|description/i },
  { key: 'campaign_status',    label: 'Campaign status',      match: /lead.?status|\bstatus\b|\bstage\b/i },
  { key: 'campaign_name',      label: 'Campaign name',        match: /campaign/i },
  { key: 'last_channel',       label: 'Last channel used',    match: /channel|\bsource\b/i },
  { key: 'last_activity_date', label: "Today's date",         match: /date|last.?activity|modified/i },
  { key: 'notes',              label: 'Last message / notes', match: /\bnote|comment|remark/i },
];

/** Suggest a data-point for a Zoho field, sequence-aware (only maps a channel
 *  source when that channel is actually in the Accelerator). Returns key or ''. */
function suggestDataPoint(field: { api_name: string; field_label: string }, channels: Set<Channel>): string {
  const hay = `${field.field_label || ''} ${field.api_name || ''}`;
  for (const dp of WORKFLOW_DATA_POINTS) {
    if (dp.needsChannel && !channels.has(dp.needsChannel)) continue;
    if (dp.match.test(hay)) return dp.key;
  }
  return '';
}

// ─── Canvas (inner, needs ReactFlowProvider) ─────────────────────────────────

type BranchViz = { key: string; stepType: StepType; label: string; edgeLabel: string };

function BuilderCanvas({ steps, branches = [], switchId }: { steps: WorkflowPreviewStep[]; branches?: BranchViz[]; switchId?: string }) {
  // Base linear layout, then fan the Multi-condition node's branches out below
  // it (Router-style multiple outputs → a separate node per condition).
  const initialNodes = useMemo(() => {
    const base = createReactFlowNodes(steps, 'vertical');
    if (!switchId || !branches.length) return base;
    const sw = base.find((n) => n.id === switchId);
    if (!sw) return base;
    const spread = 210;
    const startX = sw.position.x - ((branches.length - 1) * spread) / 2;
    const branchNodes = branches.map((b, i) => ({
      id: `${switchId}-${b.key}`,
      type: 'custom',
      position: { x: startX + i * spread, y: sw.position.y + 200 },
      draggable: true,
      data: { title: b.label, type: b.stepType, description: b.key === 'else' ? 'fallback branch' : 'branch output', _layout: 'snake', _branch: true },
    }));
    return [...base, ...branchNodes];
  }, [steps, branches, switchId]);
  const initialEdges = useMemo(() => {
    // Drop the linear edge leaving the switch — its outputs are the branches.
    const base = createReactFlowEdges(steps, 'vertical').filter((e) => e.source !== switchId);
    if (!switchId || !branches.length) return base;
    const fan = branches.map((b) => ({
      id: `e-${switchId}-${b.key}`,
      source: switchId, sourceHandle: 'bottom',
      target: `${switchId}-${b.key}`, targetHandle: 'top',
      type: 'labeled',
      animated: false,
      data: { label: b.edgeLabel, color: '#d97706' },
      style: { stroke: '#d97706', strokeWidth: 2, strokeDasharray: '6,6' },
    }));
    return [...base, ...fan];
  }, [steps, branches, switchId]);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  useEffect(() => { setNodes(initialNodes); setEdges(initialEdges); }, [initialNodes, initialEdges, setNodes, setEdges]);

  return (
    <ReactFlow
      nodes={nodes} edges={edges}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes} edgeTypes={edgeTypes}
      proOptions={{ hideAttribution: true }}
      fitView minZoom={0.3} maxZoom={1.2}
    >
      <WorkflowCanvas
        flowNodes={nodes} flowEdges={edges}
        onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes} workflowLength={steps.length}
      />
    </ReactFlow>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

/** Loads the connected accounts/templates a step config can reference:
 *  voice agents + numbers, email senders + templates, WhatsApp accounts +
 *  templates, LinkedIn templates. Reuses the same hooks/endpoints the
 *  advanced-search wizard uses. */
function useBuilderResources() {
  const voice = useVoiceAgent(false);
  const { data: emailSenders = [] } = useConnectedEmailSenders();
  const { data: emailTemplates = [] } = useEmailTemplates({ is_active: true });
  const [waAccounts, setWaAccounts] = useState<any[]>([]);
  const [waTemplates, setWaTemplates] = useState<any[]>([]);
  const [liTemplates, setLiTemplates] = useState<any[]>([]);

  useEffect(() => { voice.fetchAll?.().catch(() => {}); /* eslint-disable-next-line */ }, []);
  useEffect(() => {
    fetch('/api/social-integration/whatsapp/accounts', { credentials: 'include' })
      .then((r) => r.json()).then((d) => { if (Array.isArray(d?.accounts)) setWaAccounts(d.accounts); }).catch(() => {});
    fetch('/api/campaigns/whatsapp-templates', { credentials: 'include' })
      .then((r) => r.json()).then((d) => { if (d?.success) setWaTemplates(d.data || []); }).catch(() => {});
    fetch('/api/campaigns/linkedin-message-templates', { credentials: 'include' })
      .then((r) => r.json()).then((d) => { if (d?.success) setLiTemplates(d.data || []); }).catch(() => {});
  }, []);

  const voiceAgents = (voice.agents || []).map((a: any) => ({ id: a.agent_id || a.id || '', name: a.agent_name || a.name || 'Agent', voice_id: a.voice_id || '' })).filter((a: any) => a.id);
  const voiceNumbers = (voice.numbers || []).map((n: any) => {
    let num = n.phone_number || '';
    if (!num || num === '+' || num.includes('null')) num = (n.country_code && n.base_number) ? `+${n.country_code}${n.base_number}` : '';
    return { phone_number: num };
  }).filter((n: any) => n.phone_number && n.phone_number !== '+');

  return {
    voiceAgents, voiceNumbers,
    emailSenders: (emailSenders as any[]) || [],
    emailTemplates: (emailTemplates as any[]) || [],
    waAccounts, waTemplates, liTemplates,
  };
}

export function CustomWorkflowBuilder({ onClose, initialTemplateKey, initialSourceCfg, initialNodeCfg, autoLaunch, editCampaignId }: {
  onClose: () => void;
  /** Apply this template on mount (chat "Accelerators" wizard hands off here). */
  initialTemplateKey?: string;
  /** Answers collected in chat — merged into the source node's config. */
  initialSourceCfg?: Record<string, any>;
  /**
   * Message copy collected in chat, keyed by `macroId || type` (templateNodeKey).
   * Each value replaces that node's template cfg wholesale — splitWizardAnswers
   * already merged it over the node's defaults.
   */
  initialNodeCfg?: Record<string, any>;
  /** Fire launch() automatically once the template is applied. */
  autoLaunch?: boolean;
  /** Reopen an existing custom workflow for editing; launch updates it in place. */
  editCampaignId?: string;
}) {
  const {
    workflowPreview, setWorkflowPreview, updateWorkflowStep,
    addWorkflowStep: appendWorkflowStep, insertWorkflowStep,
  } = useOnboardingStore();
  const res = useBuilderResources();

  /** Slot chosen by a node's "+" button, consumed by the very next add*() call. */
  const insertAtRef = useRef<{ anchorId: string; position: 'before' | 'after' } | null>(null);
  /**
   * Every add*() helper below goes through this. Normally it appends, exactly
   * as the store action does; when the picker was opened from a node's "+" it
   * drops the step into that slot instead — so one wrapper makes the whole
   * palette insert-aware without touching each helper.
   */
  const addWorkflowStep = useCallback((step: WorkflowPreviewStep) => {
    const at = insertAtRef.current;
    if (at) insertWorkflowStep(step, at.anchorId, at.position);
    else appendWorkflowStep(step);
  }, [appendWorkflowStep, insertWorkflowStep]);

  const [name, setName] = useState('');
  const [perDay, setPerDay] = useState('25');
  const [days, setDays] = useState('30');
  const [source, setSource] = useState<SourceKey | null>(null);
  // Per-node launch config, keyed by step id (store steps only carry visuals).
  const [configs, setConfigs] = useState<Record<string, any>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  // Edit mode: block the canvas until the saved state is back, so a stray click
  // can't launch a half-restored workflow over the real one.
  const [hydrating, setHydrating] = useState(!!editCampaignId);

  useEffect(() => {
    if (!editCampaignId) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetchWithTenant(`/api/campaigns/landing-page/${editCampaignId}`);
        if (!r.ok) return;                       // 404 simply means no page yet
        const j = await r.json();
        if (!cancelled) setSavedLanding(j?.page || null);
      } catch { /* the builder must still open if this read fails */ }
    })();
    return () => { cancelled = true; };
  }, [editCampaignId]);
  const hydratedRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  // Zoho write-back node: the target module's field metadata (fetched lazily).
  const [zohoFields, setZohoFields] = useState<any[]>([]);
  const [zohoFieldsLoading, setZohoFieldsLoading] = useState(false);
  const [zohoFieldsError, setZohoFieldsError] = useState<string | null>(null);
  // AI Media node: generated-asset gallery + studio modal.
  const mediaBuilder = useMediaBuilder();
  const [showMediaStudio, setShowMediaStudio] = useState(false);
  const [mediaGalleryOpen, setMediaGalleryOpen] = useState(false);
  const [mediaImporting, setMediaImporting] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  // Left-panel tabs + template browsing state (Templates | Build with AI | Build from steps).
  const [paletteTab, setPaletteTab] = useState<'templates' | 'ai' | 'steps'>('templates');
  const [tplSearch, setTplSearch] = useState('');
  const [expandedTpl, setExpandedTpl] = useState<string | null>(WORKFLOW_TEMPLATES[0]?.key || null);
  /** Template shown in the right-hand overview drawer (null = show node editor). */
  const [overviewTpl, setOverviewTpl] = useState<string | null>(null);
  /** Open step picker for a node's input/output "+" (null = closed). */
  const [insertMenu, setInsertMenu] = useState<{ anchorId: string; position: 'before' | 'after'; x: number; y: number } | null>(null);

  // ── "Build with AI": describe a pipeline, answer a few questions, get one ──
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiBuilding, setAiBuilding] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  /** What the last AI draft produced — shown so the user can see what changed. */
  const [aiResult, setAiResult] = useState<{ name: string; chain: string[]; notes: string } | null>(null);
  /** The draft being clarified; null once it has been applied to the canvas. */
  const [aiDraft, setAiDraft] = useState<any>(null);
  const [aiQuestions, setAiQuestions] = useState<AiQuestion[]>([]);
  const [aiAnswers, setAiAnswers] = useState<Record<string, any>>({});
  /** Index of the question on screen — one at a time, like a conversation. */
  const [aiStep, setAiStep] = useState(0);
  /** Free-text buffer for the current question. */
  const [aiText, setAiText] = useState('');
  /** Question id whose "something else" input is open, if any. */
  const [aiOtherFor, setAiOtherFor] = useState<string | null>(null);
  const aiInputRef = useRef<HTMLTextAreaElement | null>(null);

  // ── Test run: simulate the current pipeline against one sample lead ───────
  const [testOpen, setTestOpen] = useState(false);
  const [testLead, setTestLead] = useState<Record<string, string>>({
    first_name: '', last_name: '', title: '', company: '', industry: '', location: '', email: '', phone: '',
  });
  const [testSampling, setTestSampling] = useState(false);
  const [testRunning, setTestRunning] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testSteps, setTestSteps] = useState<TestStep[] | null>(null);

  // ── Strategies: save the current canvas as a reusable playbook ────────────
  const { data: ownStrategies = [] } = useStrategies();
  // Sharing is backend-flagged (STRATEGY_SHARING_ENABLED); when it's off the
  // endpoint 404s and this simply stays empty, so the Community group hides.
  const { data: sharedStrategies = [] } = useSharedStrategies();
  const createStrategyMutation = useCreateStrategy();
  const importStrategyMutation = useImportSharedStrategy();
  const [strategySaving, setStrategySaving] = useState(false);
  const [strategyMsg, setStrategyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  /** Strategy id whose publish-confirmation dialog is open. */
  const [publishingId, setPublishingId] = useState<string | null>(null);

  // "Export now" (builder test run) state.
  const [exportRunning, setExportRunning] = useState(false);
  const [exportResult, setExportResult] = useState<any>(null);
  // LinkedIn auto-post state.
  const [autopostGenerating, setAutopostGenerating] = useState(false);
  const [autopostMsg, setAutopostMsg] = useState<{ ok: boolean; text: string } | null>(null);
  /**
   * The landing page already saved for the campaign being edited.
   *
   * Needed to answer "did anything actually change?". Without it the builder
   * cannot tell an edited brief from an untouched one, and the only honest
   * options would be to rewrite a public page on every save or never rewrite it.
   */
  const [savedLanding, setSavedLanding] = useState<any>(null);
  const [landingBusy, setLandingBusy] = useState(false);
  const [landingErr, setLandingErr] = useState<string | null>(null);
  const [liOrganizations, setLiOrganizations] = useState<{ id: string; name: string }[]>([]);
  const autopostFileRef = useRef<HTMLInputElement | null>(null);
  // Inline AI-media wizard for the auto-post node — runs the media builder's
  // Q&A inside the drawer instead of the full-screen studio modal.
  const [inlineMedia, setInlineMedia] = useState(false);
  const [inlineAnswer, setInlineAnswer] = useState('');
  const inlinePrefilledRef = useRef<string | null>(null);
  // Agent-driven mode: the wizard still runs, but each question is answered
  // from the post copy instead of being shown. See autoMediaLog for what it
  // decided — silent automation the user can't inspect is worse than a form.
  const [autoMedia, setAutoMedia] = useState(false);
  const [autoMediaLog, setAutoMediaLog] = useState<{ phase: string; answer: string }[]>([]);
  const autoBusyRef = useRef(false);
  const autoKeyRef = useRef<string | null>(null);
  const autoCountRef = useRef(0);
  // Stall guard. The media worker's hold can be torn down mid-run, after which
  // no further phase ever arrives — the loop simply waits, and the user watches
  // a spinner indefinitely (observed: 10 minutes on Brand DNA). Nothing here
  // can keep the worker alive, but it can stop pretending work is happening.
  const autoProgressAtRef = useRef(0);
  const [autoStalled, setAutoStalled] = useState(false);
  const inlineStartedRef = useRef(false);
  // Multi-condition node: fields of the connected source (dynamic dropdown).
  const [mcFields, setMcFields] = useState<{ value: string; label: string }[]>(SWITCH_FIELDS);
  const [mcFieldsLoading, setMcFieldsLoading] = useState(false);
  // File import source: parsed grid + header→field mapping.
  const [fileName, setFileName] = useState('');
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileRows, setFileRows] = useState<string[][]>([]);
  const [fileMapping, setFileMapping] = useState<Record<number, string>>({});
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileParsing, setFileParsing] = useState(false);

  // Fresh canvas on mount. The store is SHARED with the chat-built workflow
  // preview (advanced-search-ai) — snapshot it and restore on close so opening
  // the builder never clobbers an in-progress campaign preview.
  useEffect(() => {
    const snapshot = useOnboardingStore.getState().workflowPreview;
    setWorkflowPreview([]);
    return () => setWorkflowPreview(snapshot);
  }, [setWorkflowPreview]);

  // Node edit clicks (CustomWorkflowNode dispatches 'openStepEditor').
  useEffect(() => {
    const onEdit = (e: any) => {
      const id: string = e.detail?.stepId || '';
      // Clicking a fanned-out branch node opens the Multi-condition editor.
      setOverviewTpl(null); // node editor wins over the template overview
      setEditingId(id.startsWith(`${MULTICOND_STEP_ID}-`) ? MULTICOND_STEP_ID : (id || null));
    };
    window.addEventListener('openStepEditor', onEdit);
    return () => window.removeEventListener('openStepEditor', onEdit);
  }, []);

  // Node "+" clicks (CustomWorkflowNode dispatches 'addWorkflowStepAt') — open
  // the step picker anchored to that slot.
  useEffect(() => {
    const onInsertAt = (e: any) => {
      const d = e.detail || {};
      if (!d.anchorId) return;
      setOverviewTpl(null);
      setInsertMenu({
        anchorId: String(d.anchorId),
        position: d.position === 'before' ? 'before' : 'after',
        x: Number(d.x) || 0,
        y: Number(d.y) || 0,
      });
    };
    window.addEventListener('addWorkflowStepAt', onInsertAt);
    return () => window.removeEventListener('addWorkflowStepAt', onInsertAt);
  }, []);

  const pickSource = (key: SourceKey) => {
    setSource(key);
    const def = SOURCES.find((s) => s.key === key)!;
    const step: WorkflowPreviewStep = {
      id: SOURCE_STEP_ID, type: 'lead_generation', channel: 'linkedin',
      title: def.label, description: def.sub,
    };
    const rest = workflowPreview.filter((s) => s.id !== SOURCE_STEP_ID);
    setWorkflowPreview([step, ...rest]);
    setEditingId(SOURCE_STEP_ID);
  };

  const addOutreach = (type: StepType) => {
    const def = OUTREACH.find((o) => o.type === type)!;
    const id = nextId();
    addWorkflowStep({ id, type, channel: def.channel, title: def.label, description: '' });
    setEditingId(id);
  };

  const addRouter = () => {
    const id = `rt-${Date.now()}-${stepSeq++}`;
    addWorkflowStep({ id, type: 'condition', channel: 'linkedin', title: 'Router — fallback', description: '3 tries → Email' });
    setEditingId(id);
  };

  const addFollowup = () => {
    if (!workflowPreview.some((s) => s.id === FOLLOWUP_STEP_ID)) {
      addWorkflowStep({ id: FOLLOWUP_STEP_ID, type: 'followup_sequence', channel: 'linkedin', title: 'Follow-up sequence', description: '3 touches · LinkedIn' });
      // Seed the per-touch timeline (hours) — mirrors the WABA per-touch defaults.
      setCfg(FOLLOWUP_STEP_ID, { channel: 'linkedin', touches: [{ hours: 24 }, { hours: 72 }, { hours: 168 }] });
    }
    setEditingId(FOLLOWUP_STEP_ID);
  };

  const addAnalytics = () => {
    if (!workflowPreview.some((s) => s.id === ANALYTICS_STEP_ID)) {
      addWorkflowStep({ id: ANALYTICS_STEP_ID, type: 'analytics_report', channel: 'email', title: 'Analytics report', description: 'Daily · Email' });
    }
    setEditingId(ANALYTICS_STEP_ID);
  };

  const addZohoUpdate = () => {
    if (!workflowPreview.some((s) => s.id === ZOHO_UPDATE_STEP_ID)) {
      addWorkflowStep({ id: ZOHO_UPDATE_STEP_ID, type: 'zoho_update', channel: 'linkedin', title: 'Update Zoho record', description: 'Write back to Contacts' });
      setCfg(ZOHO_UPDATE_STEP_ID, { module: 'Contacts', map: {} });
    }
    setEditingId(ZOHO_UPDATE_STEP_ID);
  };

  const addMedia = () => {
    if (!workflowPreview.some((s) => s.id === MEDIA_STEP_ID)) {
      addWorkflowStep({ id: MEDIA_STEP_ID, type: 'media_generation', channel: 'email', title: 'AI Media', description: 'Generate media to attach' });
    }
    setEditingId(MEDIA_STEP_ID);
  };

  const addMultiCond = () => {
    if (!workflowPreview.some((s) => s.id === MULTICOND_STEP_ID)) {
      addWorkflowStep({ id: MULTICOND_STEP_ID, type: 'switch', channel: 'email', title: 'Multi-condition', description: '2 conditions + else' });
      setCfg(MULTICOND_STEP_ID, {
        field: 'tag',
        cases: [
          { op: 'equals', value: '', channel: 'email', subject: '', body: '' },
          { op: 'equals', value: '', channel: 'email', subject: '', body: '' },
        ],
        default: { channel: 'email', subject: '', body: '' },
      });
    }
    setEditingId(MULTICOND_STEP_ID);
  };

  const addAiParse = () => {
    if (!workflowPreview.some((s) => s.id === AI_STEP_ID)) {
      addWorkflowStep({ id: AI_STEP_ID, type: 'ai_parse', channel: 'linkedin', title: 'AI Agent', description: 'Clean & normalise lead data' });
      setCfg(AI_STEP_ID, { instruction: AI_DEFAULT_INSTRUCTION });
    }
    setEditingId(AI_STEP_ID);
  };

  const addDataEnrich = () => {
    if (!workflowPreview.some((s) => s.id === ENRICH_STEP_ID)) {
      addWorkflowStep({ id: ENRICH_STEP_ID, type: 'data_enrich', channel: 'email', title: 'Enrich contact', description: 'Official email · Phone' });
      setCfg(ENRICH_STEP_ID, { enrich: ['official_email', 'phone'] });
    }
    setEditingId(ENRICH_STEP_ID);
  };

  /** Map the parsed file grid + header mapping into lead objects. Shared by the
   *  launch payload and the "Export now" test run. */
  const buildLeadsFromFile = useCallback(() => {
    const colOf = (f: string) => { const e = Object.entries(fileMapping).find(([, v]) => v === f); return e ? Number(e[0]) : -1; };
    const idx = { full_name: colOf('full_name'), first_name: colOf('first_name'), last_name: colOf('last_name'), company: colOf('company'), title: colOf('title'), location: colOf('location'), email: colOf('email'), phone: colOf('phone'), linkedin_url: colOf('linkedin_url'), website: colOf('website') };
    const val = (r: string[], i: number) => (i >= 0 ? (r[i] || '').trim() : '');
    return fileRows.map((r) => {
      const first = val(r, idx.first_name), last = val(r, idx.last_name);
      const full = val(r, idx.full_name) || [first, last].filter(Boolean).join(' ');
      return {
        name: full || undefined,
        first_name: first || (full ? full.split(' ')[0] : undefined),
        last_name: last || (full ? full.split(' ').slice(1).join(' ') || undefined : undefined),
        company_name: val(r, idx.company) || undefined,
        title: val(r, idx.title) || undefined,
        location: val(r, idx.location) || undefined,
        email: val(r, idx.email) || undefined,
        phone: val(r, idx.phone) || undefined,
        linkedin_url: val(r, idx.linkedin_url) || undefined,
      };
    });
  }, [fileRows, fileMapping]);

  /** "Export now" — test the configured export against the leads loaded in the
   *  builder, so destinations (email / webhook / Slack …) are proven before launch. */
  const runExportNow = async () => {
    const cfg = configs[EXPORT_STEP_ID] || {};
    const leads = source === 'file_import' ? buildLeadsFromFile() : [];
    setExportRunning(true);
    setExportResult(null);
    try {
      const res = await fetchWithTenant('/api/campaigns/export/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: cfg, leads, campaign_name: name.trim() || 'Accelerator preview' }),
      });
      const data = await res.json();
      setExportResult(data);
    } catch (e: any) {
      setExportResult({ success: false, error: e?.message || 'Export failed' });
    } finally {
      setExportRunning(false);
    }
  };

  const addAutopost = () => {
    if (!workflowPreview.some((s) => s.id === AUTOPOST_STEP_ID)) {
      addWorkflowStep({ id: AUTOPOST_STEP_ID, type: 'linkedin_post', channel: 'linkedin', title: 'LinkedIn auto-post', description: 'Weekly · Mon' });
      setCfg(AUTOPOST_STEP_ID, {
        content: '',
        frequency: 'weekly',
        days: [1],
        time: '09:00',
        ai_generate: false,
        post_as: 'personal',
      });
    }
    setEditingId(AUTOPOST_STEP_ID);
  };

  /** "Generate with AI" — drafts the post from ICP + campaign context. */
  const generateAutopost = async () => {
    // Copy lives on the content node since the split — writing to the post
    // node here meant a successful generate updated nothing the user could see.
    const eid = CONTENT_STEP_ID;
    const c = configs[eid] || {};
    setAutopostGenerating(true);
    setAutopostMsg(null);
    try {
      const res = await fetchWithTenant('/api/campaigns/linkedin-post/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ seed: c.content || '', instruction: c.ai_instruction || '' }),
      });
      const data = await res.json();
      if (data?.success && data.content) {
        setCfg(eid, { content: data.content });
        updateWorkflowStep(eid, { description: data.content.slice(0, 40) });
        setAutopostMsg({ ok: true, text: 'Draft generated — edit it below before posting.' });
      } else {
        setAutopostMsg({ ok: false, text: data?.error || 'Could not generate a post.' });
      }
    } catch (e: any) {
      setAutopostMsg({ ok: false, text: e?.message || 'Could not generate a post.' });
    } finally {
      setAutopostGenerating(false);
    }
  };

  /**
   * Apply a template: replaces the canvas with the recipe's source + nodes and
   * seeds every drawer config in one shot. Opens the source drawer afterwards
   * so the user lands on the targeting fields they still need to fill.
   */
  const applyTemplate = (t: WorkflowTemplate, opts?: { silent?: boolean; sourceCfgOverride?: Record<string, any>; nodeCfgOverride?: Record<string, any> }) => {
    setOverviewTpl(null);
    if (!opts?.silent && workflowPreview.length > 0 &&
        !window.confirm(`Replace the current Accelerator with the "${t.name}" template?`)) {
      return;
    }
    // Expanded by the shared helper so this and the chat wizard's right-hand
    // preview always produce the same pipeline from the same template.
    const { steps, configs: cfgs } = templateToPreviewSteps(t, {
      sourceCfgOverride: opts?.sourceCfgOverride,
      nodeCfgOverride: opts?.nodeCfgOverride,
      sourceLabel: (key) => SOURCES.find((s) => s.key === key),
      nextId,
    });

    setSource(t.source ? t.source.key : null);
    setWorkflowPreview(steps);
    setConfigs(cfgs);
    if (!name.trim()) setName(t.name);
    setError(null);
    // With no source, open the first real node instead of a step that isn't there.
    setEditingId(t.source ? SOURCE_STEP_ID : (steps[0]?.id ?? null));
  };

  /** Put a finished draft on the canvas via the one existing apply path. */
  const applyAiTemplate = (t: any) => {
    const srcDef = SOURCES.find((s) => s.key === t.source?.key);
    // silent: replacing the canvas was already confirmed when the draft started.
    applyTemplate({
      key: `ai-${Date.now()}`,
      name: t.name || 'AI workflow',
      tagline: t.tagline || '',
      chain: t.nodes.map((n: any) => n.title),
      source: t.source?.key
        ? { key: t.source.key, cfg: t.source.cfg || {}, title: srcDef?.label || 'Contact source', description: srcDef?.sub || '' }
        : undefined,
      nodes: t.nodes,
      inputs: [],
      accent: '#0b1957',
      meta: { cycleDays: parseInt(days, 10) || 30, channels: new Set(t.nodes.map((n: any) => n.type.split('_')[0])).size },
      category: 'general',
    } as WorkflowTemplate, { silent: true });
    setAiResult({ name: t.name || 'AI workflow', chain: t.nodes.map((n: any) => n.title), notes: t.notes || '' });
  };

  /** Reset the conversation back to the prompt box. */
  const resetAiChat = () => {
    setAiDraft(null); setAiQuestions([]); setAiAnswers({}); setAiStep(0); setAiText(''); setAiOtherFor(null);
  };

  /**
   * "Build with AI" — describe a pipeline in words, answer a few questions,
   * get it on the canvas.
   *
   * Two-phase on purpose. Drafting straight to the canvas produced pipelines
   * whose every node was blank, so the user had to open each one anyway; asking
   * first means the nodes arrive configured. The questions come from the server
   * (grounded in real config keys) rather than being invented here, and only
   * cover what the description did not already say.
   *
   * The draft is still a starting point, not a launch: every node opens for
   * editing and the usual launch validation applies.
   */
  const buildWithAi = async () => {
    const description = aiPrompt.trim();
    if (!description || aiBuilding) return;
    if (workflowPreview.length > 0 &&
        !window.confirm('Replace the current Accelerator with the workflow the AI builds?')) {
      return;
    }
    setAiBuilding(true); setAiError(null); setAiResult(null); resetAiChat();
    try {
      const res = await fetchWithTenant('/api/campaigns/workflow/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      const data = await res.json();
      if (!data?.success || !data?.template?.nodes?.length) {
        setAiError(data?.error || 'Could not draft a workflow. Try rephrasing, or build it from the steps tab.');
        return;
      }
      // Nothing to clarify — skip the questions entirely rather than inventing some.
      if (!data.questions?.length) { applyAiTemplate(data.template); return; }
      setAiDraft(data.template);
      setAiQuestions(data.questions);
      setAiStep(0);
      setAiText(''); setAiOtherFor(null);
    } catch (e: any) {
      setAiError(e?.message || 'Could not reach the AI service.');
    } finally {
      setAiBuilding(false);
    }
  };

  /** Send the collected answers back and put the configured pipeline on the canvas. */
  const finishAiChat = async (finalAnswers: Record<string, any>) => {
    setAiBuilding(true); setAiError(null);
    try {
      const res = await fetchWithTenant('/api/campaigns/workflow/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: aiPrompt.trim(), template: aiDraft, answers: finalAnswers }),
      });
      const data = await res.json();
      if (!data?.success || !data?.template?.nodes?.length) {
        setAiError(data?.error || 'Could not finish building that workflow.');
        return;
      }
      applyAiTemplate(data.template);
      resetAiChat();
    } catch (e: any) {
      setAiError(e?.message || 'Could not reach the AI service.');
    } finally {
      setAiBuilding(false);
    }
  };

  /**
   * Record one answer and advance. Answering the last question builds straight
   * away — a separate "done" click after the final answer is a step with no
   * decision in it.
   */
  const answerAiQuestion = (value: any) => {
    const q = aiQuestions[aiStep];
    if (!q) return;
    const next = { ...aiAnswers, [q.id]: value };
    setAiAnswers(next);
    setAiText(''); setAiOtherFor(null);
    if (aiStep + 1 < aiQuestions.length) setAiStep(aiStep + 1);
    else finishAiChat(next);
  };

  /** Skip an optional question, leaving the node's own default in place. */
  const skipAiQuestion = () => {
    setAiText(''); setAiOtherFor(null);
    if (aiStep + 1 < aiQuestions.length) setAiStep(aiStep + 1);
    else finishAiChat(aiAnswers);
  };

  /** Ask the AI to invent a lead to test against. */
  const generateSampleLead = async () => {
    setTestSampling(true); setTestError(null);
    try {
      const srcCfg = configs[SOURCE_STEP_ID] || {};
      const hint = [srcCfg.job_titles, srcCfg.industries, srcCfg.locations, srcCfg.keywords]
        .filter(Boolean).join(', ');
      const res = await fetchWithTenant('/api/campaigns/workflow/sample-lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hint }),
      });
      const data = await res.json();
      if (!data?.success || !data?.lead) {
        setTestError(data?.error || 'Could not generate a sample lead — fill the fields in yourself.');
        return;
      }
      setTestLead((prev) => ({ ...prev, ...data.lead }));
    } catch (e: any) {
      setTestError(e?.message || 'Could not reach the AI service.');
    } finally {
      setTestSampling(false);
    }
  };

  /**
   * Run the current pipeline against one lead — for real, on the server.
   *
   * The executable steps in this payload come from the SAME builders Launch
   * uses (workflowPayload.ts), so what the test runs is what would launch.
   * Every other node is sent as type + title only: enough to list what was
   * skipped, and no message copy, template id or recipient for anything that
   * could contact a person. The backend refuses to run them regardless — the
   * filter is a closed handler map there, not a shape of this request.
   */
  const runTest = async () => {
    setTestRunning(true); setTestError(null); setTestSteps(null);
    try {
      const res = await fetchWithTenant('/api/campaigns/workflow/test-run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || undefined,
          lead: testLead,
          steps: buildTestRunSteps(workflowPreview, configs),
          config: buildContentMacros(workflowPreview, configs),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setTestError(data?.error || 'The test run could not complete.');
        return;
      }
      setTestSteps(Array.isArray(data.timeline) ? data.timeline : []);
    } catch (e: any) {
      setTestError(e?.message || 'The test run could not complete.');
    } finally {
      setTestRunning(false);
    }
  };

  /**
   * Saved strategies presented as WorkflowTemplates, so the gallery cards, the
   * overview drawer and applyTemplate() all treat them identically to built-in
   * recipes. definitionToTemplate returns null for a strategy whose source key
   * this build doesn't know — those are skipped rather than crashing applyTemplate.
   */
  const strategyTemplates = useMemo(
    () => ownStrategies
      .map((s) => definitionToTemplate(s, s.definition))
      .filter((t): t is WorkflowTemplate => t !== null),
    [ownStrategies],
  );
  const communityTemplates = useMemo(
    () => sharedStrategies
      .map((s) => definitionToTemplate(s, s.shared_definition, { shared: true }))
      .filter((t): t is WorkflowTemplate => t !== null),
    [sharedStrategies],
  );
  /** Every template the gallery, search and key lookups can resolve. */
  const allTemplates = useMemo(
    () => [...WORKFLOW_TEMPLATES, ...strategyTemplates, ...communityTemplates],
    [strategyTemplates, communityTemplates],
  );

  /** Snapshot the current canvas as a named, reusable strategy. */
  const saveAsStrategy = async () => {
    setStrategyMsg(null);
    if (!name.trim()) { setError('Name your workflow before saving it as a strategy.'); return; }
    if (!source) { setError('Pick a contact source before saving.'); return; }
    if (!workflowPreview.length) { setError('Add at least one step before saving.'); return; }

    setStrategySaving(true);
    try {
      const definition = builderStateToDefinition({ source, workflowPreview, configs, perDay, days });
      await createStrategyMutation.mutateAsync({ name: name.trim(), definition });
      setStrategyMsg({ ok: true, text: `Saved “${name.trim()}” — find it under My strategies.` });
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to save strategy.';
      setStrategyMsg({ ok: false, text: msg });
    } finally {
      setStrategySaving(false);
    }
  };

  /**
   * Applying a community card copies it into this tenant first, so the user
   * ends up owning an editable strategy rather than working off a card that
   * disappears if the author unpublishes.
   */
  const applyCommunityTemplate = async (t: WorkflowTemplate) => {
    const sharedId = strategyIdFromKey(t.key);
    if (!sharedId) return;
    setStrategyMsg(null);
    try {
      const { warnings } = await importStrategyMutation.mutateAsync({ id: sharedId, name: t.name });
      applyTemplate(t);
      setStrategyMsg(warnings.length
        ? { ok: false, text: `Imported with warnings: ${warnings.map((w) => `${w.type} — ${w.reason}`).join(' ')}` }
        : { ok: true, text: `Imported “${t.name}” into your strategies.` });
    } catch (e: any) {
      const msg = e?.response?.data?.error || e?.message || 'Failed to import strategy.';
      setStrategyMsg({ ok: false, text: msg });
    }
  };

  const addSplitTest = () => {
    if (!workflowPreview.some((s) => s.id === SPLIT_STEP_ID)) {
      addWorkflowStep({ id: SPLIT_STEP_ID, type: 'split_test', channel: 'linkedin', title: 'A/B split test', description: '50 / 50' });
      setCfg(SPLIT_STEP_ID, {
        split_pct: 50,
        a: { channel: 'linkedin', body: '' },
        b: { channel: 'linkedin', body: '' },
      });
    }
    setEditingId(SPLIT_STEP_ID);
  };

  const addSetField = () => {
    if (!workflowPreview.some((s) => s.id === SETFIELD_STEP_ID)) {
      addWorkflowStep({ id: SETFIELD_STEP_ID, type: 'set_field', channel: 'email', title: 'Set field', description: 'Tag / write a value' });
      setCfg(SETFIELD_STEP_ID, { fields: [{ key: '', value: '' }], tags: '' });
    }
    setEditingId(SETFIELD_STEP_ID);
  };

  const addHttpRequest = () => {
    if (!workflowPreview.some((s) => s.id === HTTP_STEP_ID)) {
      addWorkflowStep({ id: HTTP_STEP_ID, type: 'http_request', channel: 'email', title: 'HTTP request', description: 'Call any API' });
      setCfg(HTTP_STEP_ID, { method: 'POST', url: '', headers: [{ key: '', value: '' }], body: '', save_as: 'http_response', timeout_ms: 15000 });
    }
    setEditingId(HTTP_STEP_ID);
  };

  const addWebScrape = () => {
    if (!workflowPreview.some((s) => s.id === SCRAPE_STEP_ID)) {
      addWorkflowStep({ id: SCRAPE_STEP_ID, type: 'web_scrape', channel: 'email', title: 'Webpage scraper', description: "Read the lead's website" });
      setCfg(SCRAPE_STEP_ID, { url: '', max_chars: 1500 });
    }
    setEditingId(SCRAPE_STEP_ID);
  };

  const addWebResearch = () => {
    if (!workflowPreview.some((s) => s.id === RESEARCH_STEP_ID)) {
      addWorkflowStep({ id: RESEARCH_STEP_ID, type: 'web_research', channel: 'email', title: 'Web research', description: 'AI company intel' });
      setCfg(RESEARCH_STEP_ID, {});
    }
    setEditingId(RESEARCH_STEP_ID);
  };

  const addLeadScore = () => {
    if (!workflowPreview.some((s) => s.id === SCORE_STEP_ID)) {
      addWorkflowStep({ id: SCORE_STEP_ID, type: 'lead_score', channel: 'email', title: 'Lead scoring', description: 'Buy-intent 0-100' });
      setCfg(SCORE_STEP_ID, { hiring_companies: '', funding_companies: '', competitor_companies: '' });
    }
    setEditingId(SCORE_STEP_ID);
  };

  const addLinkedInContent = () => {
    if (!workflowPreview.some((s) => s.id === CONTENT_STEP_ID)) {
      addWorkflowStep({ id: CONTENT_STEP_ID, type: 'linkedin_content', channel: 'linkedin', title: 'LinkedIn content', description: 'What the post says' });
      setCfg(CONTENT_STEP_ID, { content: '', ai_generate: false });
    }
    setEditingId(CONTENT_STEP_ID);
  };

  const addPostApproval = () => {
    if (!workflowPreview.some((s) => s.id === APPROVAL_STEP_ID)) {
      addWorkflowStep({ id: APPROVAL_STEP_ID, type: 'post_approval', channel: 'whatsapp', title: 'Approval', description: 'WhatsApp · before posting' });
      setCfg(APPROVAL_STEP_ID, { approval_channel: 'whatsapp', approval_to: '' });
    }
    setEditingId(APPROVAL_STEP_ID);
  };

  const addExport = () => {
    if (!workflowPreview.some((s) => s.id === EXPORT_STEP_ID)) {
      addWorkflowStep({ id: EXPORT_STEP_ID, type: 'export_results', channel: 'email', title: 'Export results', description: 'CSV · Download' });
      setCfg(EXPORT_STEP_ID, {
        format: 'csv',
        destinations: ['file'],
        columns: EXPORT_DEFAULT_COLUMNS,
        run_on_completion: true,
      });
    }
    setEditingId(EXPORT_STEP_ID);
  };

  /**
   * Landing page — campaign-level, exactly like the auto-post node.
   *
   * Defaults to capture-on and approval-on: the page is published to a public
   * URL under the tenant's brand, so it is reviewed before anyone can read it.
   */
  /**
   * Instagram auto-post — campaign-level, exactly like the LinkedIn one.
   *
   * Media is REQUIRED and there is no way around it: Instagram has no
   * text-only post type, so a caption alone can never be published.
   */
  const addInstagramPost = () => {
    if (!workflowPreview.some((s) => s.id === IG_AUTOPOST_STEP_ID)) {
      addWorkflowStep({ id: IG_AUTOPOST_STEP_ID, type: 'instagram_post', channel: 'email', title: 'Instagram auto-post', description: 'Image / Reel · Daily' });
      setCfg(IG_AUTOPOST_STEP_ID, {
        caption: '', media_url: '', media_type: 'image',
        ai_generate: false, share_to_feed: true,
        frequency: 'daily', days: [1, 2, 3, 4, 5], time: '10:00',
      });
    }
    setEditingId(IG_AUTOPOST_STEP_ID);
  };

  /**
   * Human task — PER-LEAD, unlike every other node added here.
   *
   * Pauses each lead at this point until someone confirms via a one-time
   * link. Exists so a workflow can include work the platform cannot do
   * (record a video, build a PDF, make a judgement call) instead of
   * pretending those steps happened.
   */
  /**
   * Audit report — the ONE node whose execution model depends on its own config.
   *
   * scope 'lead'     → a per-lead step, written from that company's research
   * scope 'campaign' → a campaign-level macro, written about the industry
   *
   * Defaults to per-lead: it is the more valuable artifact, and the one the
   * outreach steps can reference per prospect.
   */
  const addReport = () => {
    if (!workflowPreview.some((s) => s.id === REPORT_STEP_ID)) {
      addWorkflowStep({ id: REPORT_STEP_ID, type: 'lead_report', channel: 'email', title: 'Audit report', description: 'Per lead · PDF' });
      setCfg(REPORT_STEP_ID, {
        scope: 'lead',
        report_type: 'growth_opportunity_audit',
        context: '',
        email_now: false,
        // On by default: this is an AI-written document sent to a prospect
        // under the tenant's name. Reviewing it should be the thing you opt
        // OUT of, not the thing you remember to switch on.
        require_approval: true,
        approval_channel: 'email',
        approval_to: '',
      });
    }
    setEditingId(REPORT_STEP_ID);
  };

  const addHumanTask = () => {
    if (!workflowPreview.some((s) => s.id === HUMAN_TASK_STEP_ID)) {
      addWorkflowStep({ id: HUMAN_TASK_STEP_ID, type: 'human_task', channel: 'email', title: 'Human task', description: 'Pauses until confirmed' });
      setCfg(HUMAN_TASK_STEP_ID, {
        title: '', instructions: '', assignee_channel: 'email', assignee_to: '',
      });
    }
    setEditingId(HUMAN_TASK_STEP_ID);
  };

  const addLandingPage = () => {
    if (!workflowPreview.some((s) => s.id === LANDING_STEP_ID)) {
      addWorkflowStep({ id: LANDING_STEP_ID, type: 'landing_page', channel: 'email', title: 'Landing page', description: 'AI page · Capture form' });
      setCfg(LANDING_STEP_ID, {
        brief: '',
        goal: '',
        capture_enabled: true,
        capture_fields: ['name', 'email'],
        require_approval: true,
      });
    }
    setEditingId(LANDING_STEP_ID);
  };

  const setCfg = useCallback((id: string, patch: any) => {
    setConfigs((c) => ({ ...c, [id]: { ...(c[id] || {}), ...patch } }));
  }, []);

  const handleImportFile = useCallback(async (file: File) => {
    setFileError(null); setFileParsing(true);
    try {
      const { headers, rows } = await parseImportFile(file);
      setFileName(file.name);
      setFileHeaders(headers);
      setFileRows(rows);
      const auto: Record<number, string> = {};
      headers.forEach((h, i) => { auto[i] = suggestImportField(h); });
      setFileMapping(auto);
    } catch (e: any) {
      setFileError(e?.message || 'Could not read the file.');
      setFileName(''); setFileHeaders([]); setFileRows([]); setFileMapping({});
    } finally {
      setFileParsing(false);
    }
  }, []);

  const mediaTypeFromName = (name: string): 'image' | 'video' | 'document' => {
    const ext = (name.split('?')[0].split('.').pop() || '').toLowerCase();
    if (['mp4', 'webm', 'mov', '3gp'].includes(ext)) return 'video';
    if (['pdf', 'doc', 'docx'].includes(ext)) return 'document';
    return 'image';
  };

  // Re-home a generated asset (MAGe 7-day signed URL) into the permanent
  // campaign bucket and attach it to the AI Media node.
  const importGenerated = useCallback(async (sourceUrl: string, targetStepId: string = MEDIA_STEP_ID) => {
    if (!sourceUrl) return;
    setMediaImporting(true); setMediaError(null);
    try {
      const filename = decodeURIComponent(sourceUrl.split('?')[0].split('/').pop() || 'generated-media');
      const res = await fetchWithTenant('/api/campaigns/media/import-generated', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_url: sourceUrl, media_type: mediaTypeFromName(filename), filename }),
      });
      const d = await res.json();
      if (!res.ok || !d?.url) throw new Error(d?.error || `Import failed (${res.status})`);
      setCfg(targetStepId, {
        media_url: d.url,
        media_type: d.media_type || mediaTypeFromName(d.filename || filename),
        media_filename: d.filename || filename,
      });
      // The auto-post node keeps its own schedule summary as the description.
      if (targetStepId === MEDIA_STEP_ID) {
        updateWorkflowStep(MEDIA_STEP_ID, { description: `${d.media_type || mediaTypeFromName(filename)} attached` });
      }
      setMediaGalleryOpen(false);
    } catch (e: any) {
      setMediaError(e?.message || 'Failed to import media');
    } finally {
      setMediaImporting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCfg, updateWorkflowStep]);

  /** Upload a local image/video and attach it to a node (reuses the LinkedIn
   *  template media endpoint, which stores to GCP and returns a stable URL). */
  const uploadMediaFor = useCallback(async (file: File, targetStepId: string) => {
    if (!file) return;
    setMediaImporting(true); setMediaError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetchWithTenant('/api/campaigns/linkedin-templates/media-upload', { method: 'POST', body: fd });
      // A failing upload can answer with an HTML error page rather than JSON.
      // res.json() would then either throw or, worse, the page ends up rendered
      // as the error text — a stack trace in the drawer tells the user nothing.
      const raw = await res.text();
      let d: any = null;
      try { d = raw ? JSON.parse(raw) : null; } catch { /* not JSON — keep the status instead */ }
      if (!res.ok || !d?.url) throw new Error(d?.error || `Upload failed (${res.status})`);
      setCfg(targetStepId, {
        media_url: d.url,
        media_type: d.media_type || mediaTypeFromName(d.filename || file.name),
        media_filename: d.filename || file.name,
      });
    } catch (e: any) {
      setMediaError(e?.message || 'Failed to upload media');
    } finally {
      setMediaImporting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setCfg]);

  // Kick the image flow off only after startFlow's sessionId has committed.
  // selectImageCreation is memoised on `sessionId`, so calling it in the same
  // tick as startFlow captures the previous (empty) value — the worker then
  // fails with "Session not found: " and returns 500.
  useEffect(() => {
    if (!inlineMedia) { inlineStartedRef.current = false; return; }
    if (inlineStartedRef.current) return;
    if (mediaBuilder.step === 'welcome' && mediaBuilder.sessionId) {
      inlineStartedRef.current = true;
      Promise.resolve(mediaBuilder.selectImageCreation?.()).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inlineMedia, mediaBuilder.step, mediaBuilder.sessionId]);

  // ── Agent-driven media configuration ──────────────────────────────────────
  // Answer each wizard question from the post copy instead of asking the user.
  // The wizard is the media worker's own state machine, so this drives it the
  // same way a human would — one answer at a time — rather than trying to
  // shortcut it. It deliberately STOPS at the image grid: picking the picture
  // is a real choice worth keeping, and it isn't the part that was tedious.
  const AUTO_MEDIA_MAX_PHASES = 30;
  // Brand DNA extraction is genuinely slow, so this is deliberately generous:
  // long enough that a working run is never interrupted, short enough that a
  // dead one doesn't cost ten minutes.
  const AUTO_MEDIA_STALL_MS = 3 * 60 * 1000;

  // Any movement from the worker counts as progress.
  useEffect(() => {
    if (!inlineMedia || !autoMedia) return;
    autoProgressAtRef.current = Date.now();
    setAutoStalled(false);
  }, [inlineMedia, autoMedia, mediaBuilder.step, mediaBuilder.uiPayload]);

  useEffect(() => {
    if (!inlineMedia || !autoMedia) return;
    const t = setInterval(() => {
      if (!autoProgressAtRef.current) return;
      if (Date.now() - autoProgressAtRef.current < AUTO_MEDIA_STALL_MS) return;
      setAutoStalled(true);
      setAutoMedia(false);   // stop answering into a run that is no longer there
    }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inlineMedia, autoMedia]);
  useEffect(() => {
    if (!inlineMedia || !autoMedia) return;
    const mb = mediaBuilder;
    const step = mb.step as string;
    const p: any = mb.uiPayload || {};
    if (step === 'loading' || mb.generating) return;
    if (mb.error) { setAutoMedia(false); return; }

    // Steps the driver deliberately leaves alone. builder-image-output is the
    // intended stop — picking the picture is the user's call. Brand-DNA
    // extraction is a genuine wait, and the hook already polls it.
    if (step === 'builder-image-output' || step === 'builder-video-progress') return;

    // The brand-DNA review is a confirmation screen, not a question: the wizard
    // parks there until something sends "Select this & start". Nothing polls it,
    // so leaving it unanswered surfaced three minutes later as "the image
    // service stopped responding" when the service was perfectly healthy.
    const isConfirm = step === 'builder-brand-dna';
    // Hand back to the manual UI on anything else we can't answer — a video or
    // keyframe phase has no question, and pretending to work is worse than
    // showing the real screen.
    if (!isConfirm && step !== 'builder-mcq-few' && step !== 'builder-text') { setAutoMedia(false); return; }

    const key = `${step}|${p.phase || ''}|${p.question || ''}`;
    if (autoBusyRef.current || autoKeyRef.current === key) return;
    // A wizard that loops would otherwise burn model calls forever.
    if (autoCountRef.current >= AUTO_MEDIA_MAX_PHASES) { setAutoMedia(false); return; }

    autoBusyRef.current = true;
    autoKeyRef.current = key;
    autoCountRef.current += 1;

    (async () => {
      const post = (configs[CONTENT_STEP_ID]?.content || configs[AUTOPOST_STEP_ID]?.content || '').trim();
      let answer = '';
      if (isConfirm) {
        // The exact label the worker matches on — the full studio sends the same.
        answer = 'Select this & start';
        setAutoMediaLog((l) => [...l, { phase: p.phase || 'Brand DNA', answer }]);
        try { await mb.advanceStep?.(answer); } catch { /* surfaced via mb.error */ }
        autoBusyRef.current = false;
        return;
      }
      try {
        const res = await fetchWithTenant('/api/campaigns/linkedin-post/media-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question: p.question || '',
            description: p.description || '',
            options: step === 'builder-mcq-few' ? (p.options || []) : null,
            phase: p.phase || '',
            post_content: post,
          }),
        });
        const data = await res.json();
        if (data?.success) answer = String(data.answer ?? '');
      } catch {
        // Leave the answer empty — the wizard treats that as a skip, which is
        // better than abandoning a run half-way through.
      }
      setAutoMediaLog((l) => [...l, { phase: p.phase || p.question || 'Step', answer }]);
      try { await mb.advanceStep?.(answer); } catch { /* surfaced via mb.error */ }
      autoBusyRef.current = false;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inlineMedia, autoMedia, mediaBuilder.step, mediaBuilder.uiPayload, mediaBuilder.generating, mediaBuilder.error]);

  // Lazy-load the LinkedIn company pages the account may post as. Fails soft —
  // an empty list simply leaves "personal profile" as the only option.
  useEffect(() => {
    if (editingId !== AUTOPOST_STEP_ID || liOrganizations.length) return;
    let cancelled = false;
    fetchWithTenant('/api/campaigns/linkedin-post/organizations')
      .then((r) => r.json())
      .then((d) => { if (!cancelled && Array.isArray(d?.data)) setLiOrganizations(d.data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [editingId, liOrganizations.length]);

  // Lazy-load Zoho field metadata when the write-back node is open, per module.
  const zohoModule = configs[ZOHO_UPDATE_STEP_ID]?.module === 'Leads' ? 'Leads' : 'Contacts';
  useEffect(() => {
    if (editingId !== ZOHO_UPDATE_STEP_ID) return;
    let cancelled = false;
    setZohoFieldsLoading(true); setZohoFieldsError(null);
    fetch(`/api/social-integration/zoho/fields?module=${zohoModule}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.success && Array.isArray(d.fields)) setZohoFields(d.fields);
        else { setZohoFields([]); setZohoFieldsError(d?.error || 'Could not load Zoho fields'); }
      })
      .catch(() => { if (!cancelled) { setZohoFields([]); setZohoFieldsError('Could not load Zoho fields — is Zoho connected?'); } })
      .finally(() => { if (!cancelled) setZohoFieldsLoading(false); });
    return () => { cancelled = true; };
  }, [editingId, zohoModule]);

  // Multi-condition: load the connected source's fields for the "Branch on"
  // dropdown. Zoho sources → the module's real fields via /fields; other
  // sources → the generic semantic field list.
  useEffect(() => {
    if (editingId !== MULTICOND_STEP_ID) return;
    const isZoho = source === 'zoho_recurring' || source === 'zoho_once';
    if (!isZoho) { setMcFields(SWITCH_FIELDS); return; }
    const mod = (configs[SOURCE_STEP_ID]?.zoho_modules === 'contacts_leads' || configs[SOURCE_STEP_ID]?.zoho_type === 'leads') ? 'Leads' : 'Contacts';
    let cancelled = false;
    setMcFieldsLoading(true);
    fetch(`/api/social-integration/zoho/fields?module=${mod}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d?.success && Array.isArray(d.fields) && d.fields.length) {
          const fetched = d.fields.map((f: any) => ({ value: f.api_name, label: f.field_label || f.api_name }));
          // 'Tag' is a semantic pseudo-field (Zoho tags aren't a writable field);
          // prepend it if the module's field list didn't already include one.
          const hasTag = fetched.some((f: { value: string }) => /tag/i.test(f.value));
          setMcFields(hasTag ? fetched : [{ value: 'tag', label: 'Tag' }, ...fetched]);
        } else { setMcFields(SWITCH_FIELDS); }
      })
      .catch(() => { if (!cancelled) setMcFields(SWITCH_FIELDS); })
      .finally(() => { if (!cancelled) setMcFieldsLoading(false); });
    return () => { cancelled = true; };
  }, [editingId, source, configs]);

  const editingStep = workflowPreview.find((s) => s.id === editingId) || null;
  const cfg = editingId ? (configs[editingId] || {}) : {};

  /**
   * Hard sequence-order problems — derived from the visual step list itself,
   * not per-node field completeness (launch() below still owns that, on
   * click). Anything surfaced here disables Launch before the click, because
   * these aren't "a field is empty", they're "this step can never do
   * anything, ever" — grounded in confirmed engine behaviour:
   *  - linkedin_message only sends once a connection is ACCEPTED
   *    (LinkedInStepExecutor's isConnectionAccepted check). With no earlier
   *    linkedin_connect step in this workflow, nothing ever asks the lead to
   *    connect, so the step waits forever and never actually sends.
   *  - post_approval has nothing to gate without a linkedin_post/autopost
   *    node in the same workflow — same rule launch() already enforces on
   *    click (the APPROVAL_STEP_ID check further below); surfaced here too
   *    so Launch is disabled ahead of time instead of erroring after a click.
   */
  const sequenceIssues = useMemo(() => {
    const issues: { id: string; message: string }[] = [];
    let seenConnect = false;
    for (const step of workflowPreview) {
      if (step.type === 'linkedin_connect') seenConnect = true;
      else if (step.type === 'linkedin_message' && !seenConnect) {
        issues.push({
          id: step.id,
          message: "Add a 'Connection request' step before 'Message' — Message only sends once a connection is accepted, so without a Connect step earlier in the sequence it will wait forever and never send.",
        });
      }
    }
    if (workflowPreview.some((s) => s.id === APPROVAL_STEP_ID) && !workflowPreview.some((s) => s.id === AUTOPOST_STEP_ID)) {
      issues.push({ id: APPROVAL_STEP_ID, message: 'The Approval node needs a LinkedIn post node — it gates what that node publishes.' });
    }
    return issues;
  }, [workflowPreview]);

  // Router-style branch visualisation for the Multi-condition node: one output
  // node per condition (+ else), fanned out on the canvas.
  const CH_TO_STEP: Record<string, StepType> = { email: 'email_send', linkedin: 'linkedin_message', whatsapp: 'whatsapp_send' };
  const mcBranches: BranchViz[] = useMemo(() => {
    if (!workflowPreview.some((s) => s.id === MULTICOND_STEP_ID)) return [];
    const c = configs[MULTICOND_STEP_ID] || {};
    const fLabel = mcFields.find((f) => f.value === (c.field || 'tag'))?.label || 'field';
    const opLabel = (op: string) => SWITCH_OPS.find((o) => o.value === op)?.label || 'is';
    const rows: any[] = Array.isArray(c.cases) && c.cases.length ? c.cases : [{}];
    const out: BranchViz[] = rows.map((cs, i) => {
      const v = (cs?.value || '').trim();
      return {
        key: `b${i}`,
        stepType: CH_TO_STEP[cs?.channel] || 'email_send',
        label: v ? `If ${fLabel} ${opLabel(cs?.op || 'equals')} "${v}"` : `Condition ${i + 1}`,
        edgeLabel: (v ? `${opLabel(cs?.op || 'equals')} ${v}` : `#${i + 1}`).slice(0, 22),
      };
    });
    out.push({ key: 'else', stepType: CH_TO_STEP[(c.default?.channel)] || 'email_send', label: 'Otherwise', edgeLabel: 'else' });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowPreview, configs, mcFields]);

  // ── Launch ────────────────────────────────────────────────────────────────
  const launch = async () => {
    setError(null);
    if (hydrating) return;   // never launch over a workflow that is still loading
    if (!name.trim()) { setError('Name your Accelerator.'); return; }
    // Belt-and-suspenders: the Launch button is already disabled while
    // sequenceIssues is non-empty, but guard the click too in case state
    // changed between render and click.
    if (sequenceIssues.length) { setError(sequenceIssues[0].message); setEditingId(sequenceIssues[0].id); return; }
    // A publisher-only workflow (content → approval → post) never touches a
    // lead: all three nodes compile into campaigns.config.autopost, a
    // campaign-level macro that linkedinAutopostCron fires on a schedule. There
    // is nobody to enrol, so demanding a contact source — or an outreach step —
    // would block a perfectly valid pipeline. Any other node present means the
    // workflow does operate on leads, and the normal guards apply again.
    const outreachSteps = workflowPreview.filter(
      (s) => s.id !== SOURCE_STEP_ID && s.id !== FOLLOWUP_STEP_ID && s.id !== ANALYTICS_STEP_ID && s.id !== ZOHO_UPDATE_STEP_ID && s.id !== MEDIA_STEP_ID && s.id !== MULTICOND_STEP_ID && s.id !== AI_STEP_ID && s.id !== ENRICH_STEP_ID && s.id !== EXPORT_STEP_ID && s.id !== AUTOPOST_STEP_ID && s.id !== SCRAPE_STEP_ID && s.id !== RESEARCH_STEP_ID && s.id !== SCORE_STEP_ID && s.id !== SPLIT_STEP_ID && s.id !== SETFIELD_STEP_ID && s.id !== HTTP_STEP_ID && s.id !== CONTENT_STEP_ID && s.id !== APPROVAL_STEP_ID
    );
    const multiCondNode = workflowPreview.find((s) => s.id === MULTICOND_STEP_ID);
    const followupNode = workflowPreview.find((s) => s.id === FOLLOWUP_STEP_ID);
    // Publisher-only is about what CONSUMES leads, not about which nodes are on
    // the canvas. A contact source on its own consumes nothing: with no per-lead
    // step the imported contacts have nowhere to go, so a workflow whose only
    // real work is the scheduled post stays publisher-only even with a source
    // attached. Defining it by node identity instead meant picking a source
    // silently turned the exemption off.
    const publisherOnly =
      workflowPreview.some((s) => s.id === AUTOPOST_STEP_ID) &&
      !outreachSteps.length && !followupNode && !multiCondNode;
    if (!source && !publisherOnly) { setError('Pick a contact source (first node).'); return; }
    // LinkedIn Search needs at least one criterion — templates seed these empty
    // on purpose, so catch it here with a pointer instead of a backend 400.
    if (source === 'linkedin_search') {
      const sc = configs[SOURCE_STEP_ID] || {};
      const any = [sc.keywords, sc.job_titles, sc.industries, sc.locations]
        .some((v) => String(v || '').trim());
      if (!any) {
        setError('Fill the LinkedIn Search targeting — at least one of job title, industry, location, or keywords.');
        setEditingId(SOURCE_STEP_ID);
        return;
      }
    }
    const aiNode = workflowPreview.find((s) => s.id === AI_STEP_ID);
    const enrichNode = workflowPreview.find((s) => s.id === ENRICH_STEP_ID);
    const mediaNode = workflowPreview.find((s) => s.id === MEDIA_STEP_ID);
    const analyticsNode = workflowPreview.find((s) => s.id === ANALYTICS_STEP_ID);
    const autopostNode = workflowPreview.find((s) => s.id === AUTOPOST_STEP_ID);
    const zohoUpdateNode = workflowPreview.find((s) => s.id === ZOHO_UPDATE_STEP_ID);
    if (!outreachSteps.length && !followupNode && !multiCondNode && !publisherOnly) { setError('Add at least one outreach step.'); return; }

    // InMail needs an entitlement the account may not have. Checking here means
    // the user finds out while looking at the canvas, instead of one lead
    // failing hours later with a 422 that reads like a billing problem.
    //
    // A free LinkedIn account returns "insufficient credits", which is NOT a
    // depleted balance — it has no InMail entitlement at all, so credits on
    // another account are irrelevant. Fails OPEN: an unreachable probe must
    // never block a launch.
    if (workflowPreview.some((s) => s.type === 'linkedin_inmail')) {
      try {
        const capRes = await fetchWithTenant('/api/campaigns/linkedin/capabilities');
        const capJson = await capRes.json();
        const cap = capJson?.data;
        if (cap?.known && cap.connected && cap.canInMail === false) {
          const who = cap.accountName || 'The connected LinkedIn account';
          // Distinguish "free account" from the far more confusing case: a paid
          // seat whose credits the integration cannot see. The account that
          // prompted this reported Premium, and its owner could see 149 Sales
          // Navigator credits in LinkedIn, while the API reported every pool as
          // null. Telling that user to buy credits would have been useless.
          setError(cap.premium
            ? `${who} has a paid LinkedIn plan, but no InMail credits are visible to the integration. `
              + 'Sales Navigator credits are a separate pool and stay hidden unless the account was connected with that seat active. '
              + 'Reconnect the LinkedIn account in Settings, or swap the InMail step for a connection request.'
            : `${who} has no InMail credits available. `
              + 'InMail needs Premium or Sales Navigator on the sending account. Swap the InMail step for a connection request, or connect an account that has one.'
          );
          return;
        }
        if (cap?.connected === false) {
          setError('No LinkedIn account is connected, so the InMail step cannot run. Connect one in Settings first.');
          return;
        }
      } catch {
        // Probe unavailable — let the launch proceed rather than block on it.
      }
    }
    if (multiCondNode) {
      const mcCases: any[] = (configs[MULTICOND_STEP_ID]?.cases) || [];
      const validCases = mcCases.filter((c) => (c.value || '').trim() && (c.body || c.subject || '').trim());
      if (!validCases.length) { setError('Add at least one condition (value + message) in the Multi-condition node.'); setEditingId(MULTICOND_STEP_ID); return; }
    }
    // A split test with only one variant filled would emit nothing at all —
    // tell the user rather than silently dropping the node.
    if (workflowPreview.some((s) => s.id === SPLIT_STEP_ID)) {
      const spc = configs[SPLIT_STEP_ID] || {};
      if (!(spc.a?.body || '').trim() || !(spc.b?.body || '').trim()) {
        setError('Write a message for BOTH variants in the A/B split test — otherwise there is nothing to compare.');
        setEditingId(SPLIT_STEP_ID); return;
      }
    }
    // A post node with nothing to say, or an approval gate with nobody to ask,
    // would launch silently doing nothing — point at the offending node instead.
    if (workflowPreview.some((s) => s.id === AUTOPOST_STEP_ID)) {
      const hasContent = ((configs[CONTENT_STEP_ID]?.content ?? configs[AUTOPOST_STEP_ID]?.content) || '').trim();
      if (!hasContent) {
        setError('Add the LinkedIn content node and write what the post should say.');
        setEditingId(workflowPreview.some((s) => s.id === CONTENT_STEP_ID) ? CONTENT_STEP_ID : AUTOPOST_STEP_ID);
        return;
      }
    }
    if (workflowPreview.some((s) => s.id === APPROVAL_STEP_ID)) {
      if (!(configs[APPROVAL_STEP_ID]?.approval_to || '').trim()) {
        setError('Add the WhatsApp number (or email) that should approve each post.');
        setEditingId(APPROVAL_STEP_ID); return;
      }
      if (!workflowPreview.some((s) => s.id === AUTOPOST_STEP_ID)) {
        setError('The Approval node needs a LinkedIn post node — it gates what that node publishes.');
        setEditingId(APPROVAL_STEP_ID); return;
      }
    }
    if (analyticsNode && !(configs[ANALYTICS_STEP_ID]?.recipient || '').trim()) {
      setError('Add a recipient (email or WhatsApp number) in the Analytics report node.'); setEditingId(ANALYTICS_STEP_ID); return;
    }
    if (source === 'linkedin_signal' && !(configs[SOURCE_STEP_ID]?.signal_query || '').trim()) {
      setError('Describe the signal to search for in the LinkedIn Signal Search source.'); setEditingId(SOURCE_STEP_ID); return;
    }
    if (source === 'file_import') {
      if (!fileRows.length) { setError('Upload a CSV/Excel file in the File import source.'); setEditingId(SOURCE_STEP_ID); return; }
      const mapped = Object.values(fileMapping);
      if (!mapped.includes('full_name') && !(mapped.includes('first_name') || mapped.includes('last_name')) && !mapped.includes('company') && !mapped.includes('email') && !mapped.includes('linkedin_url')) {
        setError('Map at least a name, company, email, or LinkedIn column in the File import source.'); setEditingId(SOURCE_STEP_ID); return;
      }
    }
    setLaunching(true);

    const perDayN = Math.max(1, parseInt(perDay, 10) || 25);
    const daysN = Math.max(1, parseInt(days, 10) || 30);
    const srcCfg = configs[SOURCE_STEP_ID] || {};
    const start = new Date(); const end = new Date(); end.setDate(end.getDate() + daysN);

    let order = 0;
    const steps: any[] = [];
    let initialLeads: any[] | undefined;

    try {
      // Source node → lead_generation step (recurring) or initial_leads (one-time).
      if (source === 'zoho_recurring') {
        steps.push({
          type: 'lead_generation', title: 'Import from Zoho CRM', channel: 'linkedin', order_index: order++,
          config: {
            source: 'zoho_contacts',
            zoho_modules: srcCfg.zoho_modules || 'contacts',
            zoho_tag: (srcCfg.zoho_tag || '').trim() || undefined,
            leadGenerationLimit: perDayN,
          },
        });
      } else if (source === 'linkedin_search') {
        // Structured targeting — the backend normalises job_titles → roles,
        // locations → location, industries as-is (LeadGenerationService).
        const csv = (v: any) => String(v || '').split(',').map((s: string) => s.trim()).filter(Boolean);
        const jt = csv(srcCfg.job_titles), ind = csv(srcCfg.industries), loc = csv(srcCfg.locations);
        steps.push({
          type: 'lead_generation', title: 'LinkedIn Lead Search', channel: 'linkedin', order_index: order++,
          config: {
            source: 'linkedin_search',
            leadGenerationFilters: {
              keywords: (srcCfg.keywords || '').trim(),
              ...(jt.length ? { job_titles: jt } : {}),
              ...(ind.length ? { industries: ind } : {}),
              ...(loc.length ? { locations: loc } : {}),
            },
            leadGenerationLimit: perDayN,
          },
        });
      } else if (source === 'linkedin_signal') {
        const titles = (srcCfg.decision_maker_titles || '')
          .split(',').map((t: string) => t.trim()).filter(Boolean);
        steps.push({
          type: 'lead_generation', title: 'Signal Lead Search', channel: 'linkedin', order_index: order++,
          config: {
            source: 'signal_detection',
            signal_query: (srcCfg.signal_query || '').trim(),
            decision_maker_titles: titles,
            // Blank/absent = worldwide. The backend only pays for the
            // author-location lookups when this is set.
            location: (srcCfg.location || '').trim() || undefined,
            leadGenerationLimit: perDayN,
          },
        });
      } else if (source === 'file_import') {
        // File import: build initial_leads from the parsed grid + header mapping.
        // Leads carrying name+company (but no LinkedIn URL) are resolved by the
        // LinkedIn step's Unipile name+company waterfall at execution time.
        const colOf = (f: string) => { const e = Object.entries(fileMapping).find(([, v]) => v === f); return e ? Number(e[0]) : -1; };
        const idx = { full_name: colOf('full_name'), first_name: colOf('first_name'), last_name: colOf('last_name'), company: colOf('company'), title: colOf('title'), location: colOf('location'), email: colOf('email'), phone: colOf('phone'), linkedin_url: colOf('linkedin_url'), website: colOf('website') };
        const val = (r: string[], i: number) => (i >= 0 ? (r[i] || '').trim() : '');
        initialLeads = fileRows.map((r, i) => {
          const first = val(r, idx.first_name), last = val(r, idx.last_name);
          const full = val(r, idx.full_name) || [first, last].filter(Boolean).join(' ');
          const email = val(r, idx.email), li = val(r, idx.linkedin_url), company = val(r, idx.company);
          // Content-based sourceId so dedup is meaningful and rows never collide
          // across imports (a plain row number "1" would dedup with other lists).
          const key = (email || li || `${full}|${company}` || `row-${i + 1}`).trim().toLowerCase() || `row-${i + 1}`;
          return {
            id: `file:${key}`,
            name: full || undefined,
            first_name: first || (full ? full.split(' ')[0] : undefined),
            last_name: last || (full ? full.split(' ').slice(1).join(' ') || undefined : undefined),
            company_name: val(r, idx.company) || undefined,
            title: val(r, idx.title) || undefined,
            location: val(r, idx.location) || undefined,
            email: val(r, idx.email) || undefined,
            phone: val(r, idx.phone) || undefined,
            linkedin_url: val(r, idx.linkedin_url) || undefined,
            website: val(r, idx.website) || undefined,
          };
        }).filter((l) => l.name || l.company_name || l.email || l.linkedin_url);
        if (!initialLeads.length) throw new Error('No usable rows after mapping — check your column mapping.');
      } else {
        // One-time import: fetch synced contacts now → initial_leads at create.
        const limit = Math.min(500, Math.max(1, parseInt(srcCfg.import_count, 10) || 100));
        const url = source === 'zoho_once'
          ? `/api/social-integration/zoho/records/local?type=${srcCfg.zoho_type === 'leads' ? 'leads' : 'contacts'}&page=1&limit=${limit}`
          : `/api/social-integration/gohighlevel/contacts/local?page=1&limit=${limit}`;
        const res = await fetchWithTenant(url);
        const data = await res.json();
        const rows = data?.data || [];
        // A publisher workflow has nobody to enrol, so an empty import is not a
        // failure — it only means the source was pointless, not that the
        // scheduled post can't run. Blocking here stopped a post-only workflow
        // from launching just because a source had been picked.
        if (!rows.length && !publisherOnly) {
          throw new Error('No synced contacts found for this source — sync it first.');
        }
        initialLeads = rows.map((c: any, i: number) => ({
          id: String(c.source_id || c.id || i),
          first_name: c.first_name || undefined,
          last_name: c.last_name || undefined,
          name: c.name || [c.first_name, c.last_name].filter(Boolean).join(' ') || undefined,
          email: c.email || undefined,
          phone: c.phone || undefined,
          company_name: c.company_name || undefined,
        }));
      }

      // AI Agent → an ai_parse step that runs BEFORE outreach, so the LinkedIn
      // step sees the cleaned single title / normalised name+company. (Emitted
      // here, right after the source's lead_generation / initial_leads.)
      if (aiNode) {
        steps.push({
          type: 'ai_parse', title: 'AI Agent', channel: 'linkedin', order_index: order++,
          config: { instruction: (configs[AI_STEP_ID]?.instruction || AI_DEFAULT_INSTRUCTION).trim() },
        });
      }

      // Data Enrichment → a data_enrich step (after AI cleanup, before outreach)
      // so the email/WhatsApp/voice steps have the revealed email/phone.
      if (enrichNode) {
        const sel: string[] = Array.isArray(configs[ENRICH_STEP_ID]?.enrich) ? configs[ENRICH_STEP_ID].enrich : ['official_email', 'phone'];
        if (sel.length) {
          steps.push({
            type: 'data_enrich', title: 'Enrich contact', channel: 'email', order_index: order++,
            config: { enrich: sel },
          });
        }
      }

      // Web-intel nodes → per-lead steps that run before outreach, so the
      // message generators can use what they gathered. Emitted by the shared
      // builder, so a Test run executes exactly these — see workflowPayload.ts.
      const csvList = (v: any) => String(v || '').split(',').map((x: string) => x.trim()).filter(Boolean);
      for (const st of buildIntelSteps(workflowPreview, configs)) {
        steps.push({ ...st, order_index: order++ });
      }

      // Set field / HTTP request → per-lead steps before outreach, so the
      // message generators can use whatever they wrote onto the lead.
      if (workflowPreview.some((s) => s.id === SETFIELD_STEP_ID)) {
        const sc = configs[SETFIELD_STEP_ID] || {};
        const fields = (Array.isArray(sc.fields) ? sc.fields : [])
          .filter((f: any) => (f?.key || '').trim())
          .map((f: any) => ({ key: f.key.trim(), value: String(f.value ?? '') }));
        const tags = csvList(sc.tags);
        if (fields.length || tags.length) {
          steps.push({ type: 'set_field', title: 'Set field', channel: 'email', order_index: order++, config: { fields, tags } });
        }
      }
      if (workflowPreview.some((s) => s.id === HTTP_STEP_ID)) {
        const hc = configs[HTTP_STEP_ID] || {};
        if ((hc.url || '').trim()) {
          steps.push({
            type: 'http_request', title: 'HTTP request', channel: 'email', order_index: order++,
            config: {
              url: hc.url.trim(),
              method: hc.method || 'POST',
              headers: (Array.isArray(hc.headers) ? hc.headers : []).filter((h: any) => (h?.key || '').trim()),
              body: (hc.body || '').trim() || undefined,
              save_as: (hc.save_as || 'http_response').trim(),
              timeout_ms: Math.max(1000, Math.min(30000, parseInt(hc.timeout_ms, 10) || 15000)),
            },
          });
        }
      }

      // Outreach nodes in canvas order.
      for (const s of outreachSteps) {
        const c = configs[s.id] || {};
        // Router node: guard the PREVIOUS engine step — after N failed
        // attempts the engine marks it exhausted and runs the fallback step;
        // if it succeeds, the fallback is skipped (WorkflowProcessor).
        if (s.id.startsWith('rt-')) {
          const rc = c;
          const prev = steps[steps.length - 1];
          if (!prev || prev.type === 'wait_for_condition' || prev.type === 'lead_generation') {
            throw new Error('Place the Router right after the outreach step it should guard.');
          }
          prev.config = { ...(prev.config || {}), router: { id: s.id, after_attempts: Math.min(10, Math.max(1, parseInt(rc.attempts, 10) || 3)) } };
          const fb = ['whatsapp', 'linkedin', 'voice'].includes(rc.fallback_channel) ? rc.fallback_channel : 'email';
          const gate = { run_if_failed_of: s.id, delayDays: 0, delayHours: 0 };
          if (fb === 'whatsapp') steps.push({ type: 'whatsapp_send', title: 'Fallback: WhatsApp', channel: 'whatsapp', order_index: order++, config: { whatsappMessage: (rc.message || '').trim(), ...gate } });
          else if (fb === 'linkedin') steps.push({ type: 'linkedin_message', title: 'Fallback: LinkedIn message', channel: 'linkedin', order_index: order++, config: { message: (rc.message || '').trim(), ...gate } });
          else if (fb === 'voice') steps.push({ type: 'voice_agent_call', title: 'Fallback: AI voice call', channel: 'voice', order_index: order++, config: { ...gate } });
          else steps.push({ type: 'email_send', title: 'Fallback: Email', channel: 'email', order_index: order++, config: { subject: (rc.subject || '').trim(), body: (rc.message || '').trim(), ...gate } });
          continue;
        }
        const delay = { delayDays: Math.max(0, parseInt(c.delayDays, 10) || 0), delayHours: 0 };
        if (s.type === 'lead_report') {
          // Campaign-scoped reports are macros and were emitted into config
          // above; only the per-lead variant becomes a step. Shared with the
          // Test run — see workflowPayload.ts.
          const reportCfg = buildLeadReportStepConfig(c, delay);
          if (reportCfg) {
            steps.push({
              type: 'lead_report', title: 'Audit report', channel: 'email',
              order_index: order++, config: reportCfg,
            });
          }
        }
        else         if (s.type === 'human_task') {
          // Per-lead, unlike the other new nodes. WorkflowProcessor pauses the
          // lead here and resumes it only once someone confirms.
          steps.push({
            type: 'human_task', title: (c.title || 'Human task').trim(), channel: 'email',
            order_index: order++,
            config: {
              title: (c.title || 'Human task').trim(),
              instructions: (c.instructions || '').trim(),
              assignee_channel: c.assignee_channel === 'whatsapp' ? 'whatsapp' : 'email',
              assignee_to: (c.assignee_to || '').trim(),
              ...delay,
            },
          });
        }
        else         if (s.type === 'linkedin_connect') steps.push({ type: s.type, title: 'Send Connection Request', channel: 'linkedin', order_index: order++, config: { message: (c.message || '').trim(), template_id: c.linkedin_template_id || undefined, ...delay } });
        else if (s.type === 'linkedin_message') steps.push({ type: s.type, title: 'Send LinkedIn Message', channel: 'linkedin', order_index: order++, config: { message: (c.message || '').trim(), template_id: c.linkedin_template_id || undefined, ...delay } });
        else if (s.type === 'linkedin_inmail') steps.push({ type: s.type, title: 'Send LinkedIn InMail', channel: 'linkedin', order_index: order++, config: { message: (c.message || '').trim(), subject: (c.subject || '').trim() || undefined, template_id: c.linkedin_template_id || undefined, ...delay } });
        else if (s.type === 'linkedin_visit') steps.push({ type: s.type, title: 'Visit LinkedIn Profile', channel: 'linkedin', order_index: order++, config: { ...delay } });
        else if (s.type === 'email_send') steps.push({ type: s.type, title: 'Send Email', channel: 'email', order_index: order++, config: { subject: (c.subject || '').trim(), body: (c.body || '').trim(), from_email: c.from_email || undefined, email_provider: c.email_provider || undefined, template_id: c.template_id || undefined, ...delay } });
        else if (s.type === 'whatsapp_send') steps.push({ type: s.type, title: 'Send WhatsApp Message', channel: 'whatsapp', order_index: order++, config: { whatsappMessage: (c.message || '').trim(), whatsapp_account_id: c.whatsapp_account_id || undefined, whatsapp_template_id: c.whatsapp_template_id || undefined, ...delay } });
        else if (s.type === 'voice_agent_call') steps.push({ type: s.type, title: 'AI Voice Call', channel: 'voice', order_index: order++, config: { agent_id: c.agent_id || undefined, voice_id: c.voice_id || undefined, from_number: c.from_number || undefined, ...delay } });
        else if (s.type === 'condition') {
          const cond = CONDITIONS.find((x) => x.value === (c.condition || 'connection_accepted'))!;
          // Store type 'condition' → engine step type 'wait_for_condition'.
          steps.push({ type: 'wait_for_condition', title: `Wait for ${cond.label}`, channel: 'linkedin', order_index: order++, config: { condition: cond.value, action_type: cond.action } });
        }
      }

      // Follow-up sequence macro → one real channel step per touch, each with
      // its own delay (from the touch's hours) and message source (blank = AI,
      // else the chosen template id). Delays are relative to the prior step.
      const fc = configs[FOLLOWUP_STEP_ID] || {};
      const fuChannel = fc.channel === 'email' ? 'email' : fc.channel === 'whatsapp' ? 'whatsapp' : 'linkedin';
      const fuTouchList: { hours?: number; template_id?: string; message?: string; touch_type?: string }[] =
        Array.isArray(fc.touches) && fc.touches.length ? fc.touches.slice(0, 7) : [{ hours: 24 }, { hours: 72 }, { hours: 168 }];
      if (followupNode) {
        fuTouchList.forEach((t, idx) => {
          const hrs = Math.max(1, parseInt(String(t.hours), 10) || 24);
          const d = { delayDays: Math.floor(hrs / 24), delayHours: hrs % 24 };
          const tid = t.template_id || undefined;
          // Written copy wins over the AI draft; blank keeps the old behaviour
          // (Mr LAD writes the touch from the conversation at send time).
          const body = (t.message || '').trim();
          const n = idx + 1;
          if (fuChannel === 'email') steps.push({ type: 'email_send', title: `Follow-up ${n} (email)`, channel: 'email', order_index: order++, config: { subject: '', body, template_id: tid, ...d } });
          else if (fuChannel === 'whatsapp') steps.push({ type: 'whatsapp_send', title: `Follow-up ${n} (WhatsApp)`, channel: 'whatsapp', order_index: order++, config: { whatsappMessage: body, whatsapp_template_id: tid, ...d } });
          else steps.push({ type: 'linkedin_message', title: `Follow-up ${n} (LinkedIn)`, channel: 'linkedin', order_index: order++, config: { message: body, template_id: tid, ...d } });
        });
      }

      // "Update Zoho record" write-back → a terminal zoho_update step. Runs
      // when the lead reaches it (place it last); maps workflow data back onto
      // the lead's original Zoho record via ZohoWritebackService.
      if (zohoUpdateNode) {
        const zc = configs[ZOHO_UPDATE_STEP_ID] || {};
        const map: Record<string, string> = zc.map || {};
        const mappings = Object.entries(map)
          .filter(([, sourceKey]) => sourceKey)
          .map(([zoho_field, source]) => ({ zoho_field, source }));
        if (mappings.length) {
          steps.push({
            type: 'zoho_update', title: 'Update Zoho record', channel: 'linkedin', order_index: order++,
            config: { module: zc.module === 'Leads' ? 'Leads' : 'Contacts', mappings },
          });
        }
      }

      // "Multi-condition" node → a `switch` step + one guarded message step per
      // branch (if/elseif/else). The backend evaluates the field, stamps the
      // chosen branch, and prunes the rest so only one branch sends.
      if (multiCondNode) {
        const sc = configs[MULTICOND_STEP_ID] || {};
        const switchId = `sw-${MULTICOND_STEP_ID}`;
        const rawCases: any[] = Array.isArray(sc.cases) ? sc.cases : [];
        const cases = rawCases.filter((c) => (c.value || '').trim() && (c.body || c.subject || '').trim());
        const buildBranchStep = (b: any, branchKey: string, titlePrefix: string) => {
          const guard = { run_if_branch: { switch_id: switchId, branch: branchKey } };
          const ch = b.channel === 'linkedin' ? 'linkedin' : b.channel === 'whatsapp' ? 'whatsapp' : 'email';
          if (ch === 'linkedin') return { type: 'linkedin_message', title: `${titlePrefix} (LinkedIn)`, channel: 'linkedin', order_index: order++, config: { message: (b.body || '').trim(), ...guard } };
          if (ch === 'whatsapp') return { type: 'whatsapp_send', title: `${titlePrefix} (WhatsApp)`, channel: 'whatsapp', order_index: order++, config: { whatsappMessage: (b.body || '').trim(), ...guard } };
          return { type: 'email_send', title: `${titlePrefix} (email)`, channel: 'email', order_index: order++, config: { subject: (b.subject || '').trim(), body: (b.body || '').trim(), ...guard } };
        };
        if (cases.length) {
          steps.push({
            type: 'switch', title: 'Multi-condition', channel: 'email', order_index: order++,
            config: {
              switch_id: switchId,
              field: sc.field || 'tag',
              cases: cases.map((c, i) => ({ op: c.op || 'equals', value: (c.value || '').trim(), branch: `b${i}` })),
              default_branch: 'else',
            },
          });
          cases.forEach((c, i) => steps.push(buildBranchStep(c, `b${i}`, `If ${sc.field || 'tag'} ${SWITCH_OPS.find((o) => o.value === (c.op || 'equals'))?.label || 'is'} "${(c.value || '').trim()}"`)));
          if ((sc.default?.body || sc.default?.subject || '').trim()) {
            steps.push(buildBranchStep(sc.default, 'else', 'Otherwise'));
          }
        }
      }

      // "A/B split test" → a split_test step + one guarded message step per
      // variant. The backend stamps the variant into switch_outcomes and prunes
      // the losing branch, exactly as the multi-condition node does.
      if (workflowPreview.some((s) => s.id === SPLIT_STEP_ID)) {
        const spc = configs[SPLIT_STEP_ID] || {};
        const splitId = `sp-${SPLIT_STEP_ID}`;
        const buildVariant = (v: any, branchKey: string, label: string) => {
          const guard = { run_if_branch: { switch_id: splitId, branch: branchKey } };
          const ch = v?.channel === 'email' ? 'email' : v?.channel === 'whatsapp' ? 'whatsapp' : 'linkedin';
          if (ch === 'email') return { type: 'email_send', title: `${label} (email)`, channel: 'email', order_index: order++, config: { subject: (v?.subject || '').trim(), body: (v?.body || '').trim(), ...guard } };
          if (ch === 'whatsapp') return { type: 'whatsapp_send', title: `${label} (WhatsApp)`, channel: 'whatsapp', order_index: order++, config: { whatsappMessage: (v?.body || '').trim(), ...guard } };
          return { type: 'linkedin_message', title: `${label} (LinkedIn)`, channel: 'linkedin', order_index: order++, config: { message: (v?.body || '').trim(), ...guard } };
        };
        const aBody = (spc.a?.body || '').trim(), bBody = (spc.b?.body || '').trim();
        if (aBody && bBody) {
          steps.push({
            type: 'split_test', title: 'A/B split test', channel: 'linkedin', order_index: order++,
            config: { split_id: splitId, split_pct: Math.min(100, Math.max(0, parseInt(spc.split_pct, 10) || 50)) },
          });
          steps.push(buildVariant(spc.a, 'a', 'Variant A'));
          steps.push(buildVariant(spc.b, 'b', 'Variant B'));
        }
      }

      // "AI Media" node → records a media_generation step AND attaches the
      // generated asset to every email/WhatsApp step that has no media of its
      // own (the engine's email/whatsapp executors read config.media_url).
      const mc = configs[MEDIA_STEP_ID] || {};
      if (mediaNode && mc.media_url) {
        for (const st of steps) {
          if ((st.type === 'email_send' || st.type === 'whatsapp_send') && !st.config?.media_url) {
            st.config = { ...(st.config || {}), media_url: mc.media_url, media_type: mc.media_type || 'image', media_filename: mc.media_filename || undefined };
          }
        }
        // Record the asset as a media_generation step at the front (after source).
        const mediaStep = {
          type: 'media_generation', title: 'AI Media', channel: 'linkedin', order_index: 0,
          config: { media_url: mc.media_url, media_type: mc.media_type || 'image', media_filename: mc.media_filename || undefined },
        };
        const insertAt = steps.length && steps[0].type === 'lead_generation' ? 1 : 0;
        steps.splice(insertAt, 0, mediaStep);
        steps.forEach((st, i) => { st.order_index = i; }); // renumber after splice
      }

      const ac = configs[ANALYTICS_STEP_ID] || {};

      const payload: any = {
        name: name.trim(),
        status: 'active',
        leads_per_day: perDayN,
        campaign_start_date: start.toISOString(),
        campaign_end_date: end.toISOString(),
        config: {
          data_source: source === 'zoho_recurring' ? 'zoho_contacts' : source === 'linkedin_search' ? 'linkedin_search' : 'direct_contact',
          builder: 'custom_workflow',
          // The builder's own state, stored so "Edit Accelerator" can reopen it
          // exactly as it was. Launch flattens these nodes into config.* and
          // steps, and that flattening is lossy — reversing it would be guesswork.
          // Mirrors how the chat flow persists checkpoint_selections.
          builder_state: {
            version: 1,
            source,
            name: name.trim(),
            per_day: perDayN,
            days: daysN,
            steps: workflowPreview.map((s: any) => ({
              id: s.id, type: s.type, channel: s.channel, title: s.title, description: s.description,
            })),
            configs,
          },
          // Search targeting, surfaced at campaign level so AI features ground
          // on it — notably the auto-post generator (LinkedInPostContentService
          // reads config.targeting), making "daily post about the industry you
          // target" actually track the industry you searched.
          ...(source === 'linkedin_search' ? (() => {
            const sc = configs[SOURCE_STEP_ID] || {};
            const csv = (v: any) => String(v || '').split(',').map((x: string) => x.trim()).filter(Boolean);
            const tgt: any = {};
            if (csv(sc.job_titles).length) tgt.job_titles = csv(sc.job_titles);
            if (csv(sc.industries).length) tgt.industries = csv(sc.industries);
            if (csv(sc.locations).length) tgt.locations = csv(sc.locations);
            if ((sc.keywords || '').trim()) tgt.keywords = sc.keywords.trim();
            return Object.keys(tgt).length ? { targeting: tgt } : {};
          })() : {}),
          leads_per_day: perDayN,
          campaign_days: daysN,
          working_days: 'monday-friday',
          ...(source === 'zoho_recurring' ? {
            zoho_modules: srcCfg.zoho_modules || 'contacts',
            zoho_tag: (srcCfg.zoho_tag || '').trim() || undefined,
            // Compliant, read-only Instagram enrichment: resolve each contact's
            // handle + optional public business_discovery profile. No follow/DM
            // (Meta's API exposes none) — maps contacts to IG for inbound.
            ...(srcCfg.resolve_instagram ? { resolve_instagram: true, instagram_business_discovery: srcCfg.instagram_business_discovery !== false } : {}),
          } : {}),
          ...(followupNode ? {
            followup_sequence: { touches: fuTouchList.length, channel: fuChannel, timeline_hours: fuTouchList.map((t) => t.hours || 24), touches_config: fuTouchList.map((t) => ({ hours: t.hours || 24, template_id: t.template_id || undefined, touch_type: t.touch_type || undefined })), human_approval: !!fc.human_approval },
          } : {}),
          ...(autopostNode ? (() => {
            // The three nodes merge here: content node supplies the copy/media,
            // the approval node the gate, the post node the schedule. Falling
            // back to the post node's own config keeps campaigns built before
            // the split working unchanged.
            const sc = configs[AUTOPOST_STEP_ID] || {};
            const cc = configs[CONTENT_STEP_ID] || {};
            const ac = workflowPreview.some((s) => s.id === APPROVAL_STEP_ID) ? (configs[APPROVAL_STEP_ID] || {}) : null;
            const pc = { ...sc, ...cc };   // content-node values win for copy/media
            const content = ((cc.content ?? sc.content) || '').trim();
            if (!content) return {};
            return {
              // Read by LinkedInAutopostScheduleService at launch → drives
              // linkedinAutopostCron. Campaign-level (one post per schedule).
              autopost: {
                content,
                ai_generate: !!pc.ai_generate,
                // Read by LinkedInPostContentService — 'structured' switches the
                // generator to the heading + numbered-list shape AI search cites.
                post_format: pc.post_format === 'structured' ? 'structured' : undefined,
                media_url: (pc.media_url || '').trim() || undefined,
                // The cron passes this to publishPost, which derives the MIME
                // type from the extension — without it the filename is guessed
                // from the URL, which loses it for signed/query-string URLs.
                media_filename: (pc.media_filename || '').trim() || undefined,
                external_link: (pc.external_link || '').trim() || undefined,
                as_organization: pc.post_as && pc.post_as !== 'personal' ? pc.post_as : undefined,
                frequency: pc.frequency === 'daily' ? 'daily' : 'weekly',
                days: Array.isArray(pc.days) ? pc.days : [1],
                time: pc.time || '09:00',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
                // Approval node present → the cron drafts and asks instead of
                // publishing. Absent → unchanged auto-post behaviour.
                require_approval: !!ac,
                approval_channel: ac ? (ac.approval_channel || 'whatsapp') : undefined,
                approval_to: ac ? ((ac.approval_to || '').trim() || undefined) : undefined,
              },
            };
          })() : {}),
          // export_results / campaign_report / landing_page macros. Shared
          // with the Test run, which executes all three — see workflowPayload.ts.
          ...buildContentMacros(workflowPreview, configs),
          ...(workflowPreview.some((s) => s.id === IG_AUTOPOST_STEP_ID) ? (() => {
            const ic = configs[IG_AUTOPOST_STEP_ID] || {};
            return {
              // Read by InstagramAutopostScheduleService at launch. media_url is
              // what the backend gates on — Instagram has no text-only post.
              instagram_autopost: {
                caption: (ic.caption || '').trim(),
                media_url: (ic.media_url || '').trim(),
                media_type: ic.media_type === 'reel' ? 'reel' : 'image',
                cover_url: (ic.cover_url || '').trim() || undefined,
                share_to_feed: ic.share_to_feed !== false,
                ai_generate: !!ic.ai_generate,
                frequency: ic.frequency === 'weekly' ? 'weekly' : 'daily',
                days: Array.isArray(ic.days) && ic.days.length ? ic.days : undefined,
                time: ic.time || '10:00',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              },
            };
          })() : {}),
          ...(analyticsNode ? {
            // Read by core/cron/campaignDigestCron.js — daily 08:00 GST (weekly = Mondays).
            analytics_notifications: {
              channel: ac.channel === 'whatsapp' ? 'whatsapp' : 'email',
              recipient: (ac.recipient || '').trim(),
              frequency: ac.frequency === 'weekly' ? 'weekly' : 'daily',
              metrics: { new_leads: ac.m_new_leads !== false, pipeline: ac.m_pipeline !== false },
            },
          } : {}),
        },
        steps,
        // Mark one-time imports as direct outreach so the backend saves the
        // leads as source='direct_contact' (NOT 'linkedin_search') — otherwise
        // the LinkedIn step treats the row id as a Unipile provider_id and
        // skips the name+company resolution waterfall.
        // `.length`, not just truthiness — an empty import (allowed for a
        // publisher workflow) would otherwise send initial_leads: [] and mark
        // the campaign direct_outreach with nobody in it.
        ...(initialLeads?.length ? { initial_leads: initialLeads, campaign_type: 'direct_outreach' } : {}),
      };

      // Editing updates THIS campaign. Posting again would leave the original
      // running alongside a duplicate, both posting to the same feed.
      let res: Response;
      if (editCampaignId) {
        // PATCH, not PUT — the backend only registers patch('/:id'), so PUT hit
        // Express's 404 and returned "Cannot PUT /api/campaigns/<id>".
        const { status: _dropStatus, steps: editSteps, ...rest } = payload;
        const editPayload: any = {
          ...rest,
          // CampaignModel.update MERGES config instead of replacing it, so a
          // node removed in the builder would leave its key behind and keep
          // running. Null the macro keys that are no longer present.
          config: {
            ...rest.config,
            ...(rest.config.autopost ? {} : { autopost: null }),
            ...(rest.config.export_results ? {} : { export_results: null }),
            ...(rest.config.analytics_notifications ? {} : { analytics_notifications: null }),
            ...(rest.config.followup_sequence ? {} : { followup_sequence: null }),
            ...(rest.config.landing_page ? {} : { landing_page: null }),
            ...(rest.config.instagram_autopost ? {} : { instagram_autopost: null }),
            ...(rest.config.campaign_report ? {} : { campaign_report: null }),
          },
        };
        // `status` is deliberately dropped. update() has no active→running
        // mapping (create does), so sending 'active' would write that literally
        // and the cron's `status = 'running'` filter would stop matching — the
        // schedule would go quiet. It would also resurrect a paused campaign.
        res = await fetchWithTenant(`/api/campaigns/${editCampaignId}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editPayload),
        });
        // Steps are not in update()'s allowedFields — they have their own
        // endpoint, so without this an edited outreach sequence saved nothing.
        if (res.ok && Array.isArray(editSteps)) {
          await fetchWithTenant(`/api/campaigns/${editCampaignId}/steps`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ steps: editSteps }),
          }).catch(() => { /* surfaced by the reload below */ });
        }
      } else {
        res = await fetchWithTenant('/api/campaigns', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
      }
      // Express answers an unknown route with an HTML page, and res.json() then
      // dumped the whole document into the error banner. Parse defensively so a
      // failure reads as a sentence.
      const raw = await res.text();
      let data: any = null;
      try { data = raw ? JSON.parse(raw) : null; } catch { /* not JSON */ }
      if (res.ok && (data?.success || data?.id || data?.data?.id)) window.location.href = '/campaigns';
      else {
        setError(data?.error || `${editCampaignId ? 'Could not save changes' : 'Failed to launch Accelerator'} (${res.status})`);
        setLaunching(false);
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to launch Accelerator');
      setLaunching(false);
    }
  };

  // ── Programmatic template launch (chat "Accelerators" wizard hand-off) ────
  // Effect 1 applies the template once on mount (silently — no confirm) with
  // the wizard's answers merged into the source config. Effect 2 fires launch()
  // exactly once, on the render AFTER the applied state has committed (the
  // !source guard skips the same-commit run where state is still stale).
  // ── Edit mode ─────────────────────────────────────────────────────────────
  // Restore from config.builder_state, written at launch. Reversing the
  // flattened config.* + steps back into builder nodes would be guesswork, so
  // the builder stores its own state and reads it straight back.
  useEffect(() => {
    if (!editCampaignId || hydratedRef.current) return;
    hydratedRef.current = true;
    (async () => {
      try {
        const res = await fetchWithTenant(`/api/campaigns/${editCampaignId}`);
        const json = await res.json();
        const camp = json?.data || json;
        const bs = camp?.config?.builder_state;
        if (bs?.steps) {
          setSource(bs.source ?? null);
          setWorkflowPreview(bs.steps as any);
          setConfigs(bs.configs || {});
          setName(bs.name || camp?.name || '');
          if (bs.per_day) setPerDay(String(bs.per_day));
          if (bs.days) setDays(String(bs.days));
        } else {
          // Launched before builder_state existed. Rather than silently opening
          // an empty canvas over a live campaign, say so — the nodes cannot be
          // recovered and overwriting would delete the workflow.
          setName(camp?.name || '');
          setError('This Accelerator was created before edits were supported, so its steps cannot be reopened. Relaunching here would replace it — build it again, or leave it running.');
        }
      } catch {
        setError('Could not load this Accelerator for editing.');
      } finally {
        setHydrating(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editCampaignId]);

  const appliedTplRef = useRef(false);
  const autoLaunchedRef = useRef(false);
  useEffect(() => {
    if (!initialTemplateKey || appliedTplRef.current) return;
    const tpl = allTemplates.find((t) => t.key === initialTemplateKey);
    if (!tpl) return;
    appliedTplRef.current = true;
    applyTemplate(tpl, { silent: true, sourceCfgOverride: initialSourceCfg, nodeCfgOverride: initialNodeCfg });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTemplateKey]);
  useEffect(() => {
    if (!autoLaunch || !appliedTplRef.current || autoLaunchedRef.current) return;
    if (!source || launching) return;
    autoLaunchedRef.current = true;
    launch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLaunch, source, workflowPreview, configs]);

  /**
   * Step picker for a node's input/output "+". Same palette as the left rail —
   * each entry runs the very same add*() helper (so per-node config defaults are
   * still seeded) with insertAtRef pointing at the clicked slot, which is what
   * turns an append into an insert. Single-instance macro nodes that are
   * already on the canvas are shown disabled rather than silently no-op'ing.
   */
  const renderInsertMenu = () => {
    if (!insertMenu) return null;
    const has = (id: string) => workflowPreview.some((s) => s.id === id);
    const run = (fn: () => void) => {
      insertAtRef.current = { anchorId: insertMenu.anchorId, position: insertMenu.position };
      try { fn(); } finally { insertAtRef.current = null; }
    };
    const macro = (id: string, label: string, sub: string, icon: React.ReactNode, chip: string, on: () => void, group: string): InsertMenuItem => ({
      key: id, label, sub, icon, chip, group,
      disabled: has(id), hint: 'Already in this workflow',
      onSelect: () => run(on),
    });

    const items: InsertMenuItem[] = [
      ...OUTREACH.map((o, i) => ({
        key: `outreach-${i}`,
        label: o.label,
        sub: o.group,
        icon: o.icon,
        chip: o.chip,
        group: 'Outreach & timing',
        onSelect: () => run(() => (o.router ? addRouter() : addOutreach(o.type))),
      })),
      macro(MULTICOND_STEP_ID, 'Multi-condition', 'Branch by a field value', <Split className="h-4 w-4 text-amber-600" />, 'bg-amber-50 dark:bg-amber-950/30', addMultiCond, 'Logic & routing'),
      macro(SPLIT_STEP_ID, 'A/B split test', 'Compare two openers', <Shuffle className="h-4 w-4 text-pink-600" />, 'bg-pink-50 dark:bg-pink-950/30', addSplitTest, 'Logic & routing'),
      macro(SETFIELD_STEP_ID, 'Set field', 'Tag or write a value', <PenLine className="h-4 w-4 text-lime-600" />, 'bg-lime-50 dark:bg-lime-950/30', addSetField, 'Logic & routing'),
      macro(AI_STEP_ID, 'AI Agent', 'Clean & normalise lead data', <Sparkles className="h-4 w-4 text-violet-600" />, 'bg-violet-50 dark:bg-violet-950/30', addAiParse, 'Enrich & AI'),
      macro(ENRICH_STEP_ID, 'Enrich contact', 'Official email · phone', <Contact className="h-4 w-4 text-teal-600" />, 'bg-teal-50 dark:bg-teal-950/30', addDataEnrich, 'Enrich & AI'),
      macro(SCRAPE_STEP_ID, 'Webpage scraper', "Read the lead's website", <Globe className="h-4 w-4 text-sky-600" />, 'bg-sky-50 dark:bg-sky-950/30', addWebScrape, 'Enrich & AI'),
      macro(RESEARCH_STEP_ID, 'Web research', 'AI company intel', <Telescope className="h-4 w-4 text-indigo-600" />, 'bg-indigo-50 dark:bg-indigo-950/30', addWebResearch, 'Enrich & AI'),
      macro(SCORE_STEP_ID, 'Lead scoring', 'Buy-intent 0-100', <Gauge className="h-4 w-4 text-yellow-600" />, 'bg-yellow-50 dark:bg-yellow-950/30', addLeadScore, 'Enrich & AI'),
      macro(MEDIA_STEP_ID, 'AI Media', 'Generate media to attach', <Wand2 className="h-4 w-4 text-fuchsia-600" />, 'bg-fuchsia-50 dark:bg-fuchsia-950/30', addMedia, 'Enrich & AI'),
      macro(FOLLOWUP_STEP_ID, 'Follow-up sequence', 'Touches if no reply', <ListOrdered className="h-4 w-4 text-indigo-600" />, 'bg-indigo-50 dark:bg-indigo-950/30', addFollowup, 'Automation & output'),
      macro(HTTP_STEP_ID, 'HTTP request', 'Call any API per lead', <Webhook className="h-4 w-4 text-slate-600" />, 'bg-slate-100 dark:bg-slate-800/50', addHttpRequest, 'Automation & output'),
      macro(CONTENT_STEP_ID, 'LinkedIn content', 'Write or AI-generate a post', <PenTool className="h-4 w-4 text-violet-600" />, 'bg-violet-50 dark:bg-violet-950/30', addLinkedInContent, 'Automation & output'),
      macro(APPROVAL_STEP_ID, 'Approval', 'Approve before posting', <ShieldCheck className="h-4 w-4 text-green-600" />, 'bg-green-50 dark:bg-green-950/30', addPostApproval, 'Automation & output'),
      macro(AUTOPOST_STEP_ID, 'LinkedIn auto-post', 'Recurring post to your feed', <Megaphone className="h-4 w-4 text-[#0077B5]" />, 'bg-sky-50 dark:bg-sky-950/30', addAutopost, 'Automation & output'),
      macro(IG_AUTOPOST_STEP_ID, 'Instagram auto-post', 'Image or Reel · on a schedule', <Instagram className="h-4 w-4 text-pink-600" />, 'bg-pink-50 dark:bg-pink-950/30', addInstagramPost, 'Automation & output'),
      macro(REPORT_STEP_ID, 'Audit report', 'PDF · attach or offer', <FileText className="h-4 w-4 text-teal-700" />, 'bg-teal-50 dark:bg-teal-950/30', addReport, 'Automation & output'),
      macro(HUMAN_TASK_STEP_ID, 'Assign a human task', 'Pauses until someone confirms', <UserCheck className="h-4 w-4 text-amber-600" />, 'bg-amber-50 dark:bg-amber-950/30', addHumanTask, 'Automation & output'),
      macro(LANDING_STEP_ID, 'Landing page', 'AI-written · captures leads', <LayoutTemplate className="h-4 w-4 text-emerald-700" />, 'bg-emerald-50 dark:bg-emerald-950/30', addLandingPage, 'Automation & output'),
      macro(ZOHO_UPDATE_STEP_ID, 'Update Zoho record', 'Write back to Contacts', <DatabaseZap className="h-4 w-4 text-red-600" />, 'bg-red-50 dark:bg-red-950/30', addZohoUpdate, 'Automation & output'),
      macro(ANALYTICS_STEP_ID, 'Analytics report', 'Daily digest', <BarChart3 className="h-4 w-4 text-cyan-600" />, 'bg-cyan-50 dark:bg-cyan-950/30', addAnalytics, 'Automation & output'),
      macro(EXPORT_STEP_ID, 'Export results', 'CSV · download & more', <Download className="h-4 w-4 text-cyan-700" />, 'bg-cyan-50 dark:bg-cyan-950/30', addExport, 'Automation & output'),
    ];

    return (
      <StepInsertMenu
        x={insertMenu.x} y={insertMenu.y} position={insertMenu.position}
        items={items} onClose={() => setInsertMenu(null)}
      />
    );
  };

  /**
   * Right-hand "Template overview" drawer — full pipeline breakdown before you
   * commit. Applying from here routes through the same applyTemplate() the
   * gallery uses, so there is one code path for building a template.
   */
  const renderTemplateOverview = () => {
    const t = allTemplates.find((x) => x.key === overviewTpl);
    if (!t) return null;
    const steps = [
      ...(t.source ? [{ title: t.source.title, category: 'Contact source' }] : []),
      ...t.nodes.map((n) => ({ title: n.title, category: stepCategory(n.type) })),
    ];
    // Community cards are imported (copied into this tenant) before being
    // applied, so the user ends up owning what they're about to edit.
    const use = () => {
      if (t.category === 'community') applyCommunityTemplate(t);
      else applyTemplate(t);
      setOverviewTpl(null);
    };
    return (
      <div className="absolute right-0 top-0 h-full w-[22rem] bg-card border-l border-border shadow-2xl z-10 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-border">
          <span className="h-11 w-11 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${t.accent}14` }}>
            <TemplateIcon tplKey={t.key} color={t.accent} size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold text-foreground truncate">{t.name}</div>
            <div className="text-xs text-muted-foreground">Template overview</div>
          </div>
          <button onClick={() => setOverviewTpl(null)}
            className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          <p className="text-[13.5px] text-foreground leading-relaxed">{t.tagline}.</p>

          <div className="grid grid-cols-3 gap-2 mt-4">
            {[
              { n: steps.length, l: 'steps' },
              { n: t.meta.cycleDays, l: 'day cycle' },
              { n: t.meta.channels, l: 'channels' },
            ].map((st) => (
              <div key={st.l} className="rounded-xl border border-border bg-muted/30 dark:bg-slate-800/30 px-3 py-3 text-center">
                <div className="text-[19px] font-bold text-foreground leading-none">{st.n}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{st.l}</div>
              </div>
            ))}
          </div>

          <div className="mt-5">
            <div className="text-[13px] font-semibold text-foreground mb-2.5">Pipeline</div>
            <div className="relative">
              {steps.map((st, i) => (
                <div key={i} className="relative flex items-start gap-3 pb-3.5 last:pb-0">
                  {i < steps.length - 1 && (
                    <span className="absolute left-[13px] top-7 bottom-0 w-px bg-border" />
                  )}
                  <span className="relative z-[1] h-[26px] w-[26px] rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                    style={{ background: `${t.accent}14`, color: t.accent }}>{i + 1}</span>
                  <span className="min-w-0 flex-1 pt-0.5">
                    <span className="block text-[13.5px] font-semibold text-foreground leading-tight">{st.title}</span>
                    <span className="block text-[11.5px] text-muted-foreground mt-0.5">{st.category}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <button type="button" onClick={use}
            className="mt-5 w-full rounded-xl bg-[#0b1957] text-white text-[13.5px] font-semibold py-3 hover:bg-[#0b1957]/90 transition-colors">
            Use this template
          </button>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-border flex items-center gap-2">
          <button type="button" onClick={() => setOverviewTpl(null)}
            className="px-4 py-2.5 rounded-xl bg-muted text-foreground text-[13px] font-semibold hover:bg-muted/70 transition-colors">
            Preview
          </button>
          <button type="button" onClick={() => { use(); setPaletteTab('steps'); }}
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#0b1957] text-white text-[13px] font-semibold hover:bg-[#0b1957]/90 transition-colors">
            Customize steps
          </button>
        </div>
      </div>
    );
  };

  // ── Config drawer fields per node type ────────────────────────────────────
  const field = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
  const renderEditor = () => {
    if (!editingStep || !editingId) return null;
    const isSource = editingId === SOURCE_STEP_ID;
    const isFollowup = editingId === FOLLOWUP_STEP_ID;
    const isAnalytics = editingId === ANALYTICS_STEP_ID;
    const isRouter = !!editingId?.startsWith('rt-');
    const isZohoUpdate = editingId === ZOHO_UPDATE_STEP_ID;
    const isMedia = editingId === MEDIA_STEP_ID;
    const isMultiCond = editingId === MULTICOND_STEP_ID;
    const isAiParse = editingId === AI_STEP_ID;
    const isDataEnrich = editingId === ENRICH_STEP_ID;
    const isExport = editingId === EXPORT_STEP_ID;
    const isAutopost = editingId === AUTOPOST_STEP_ID;
    const isContent = editingId === CONTENT_STEP_ID;
    const isApproval = editingId === APPROVAL_STEP_ID;
    const isScrape = editingId === SCRAPE_STEP_ID;
    const isResearch = editingId === RESEARCH_STEP_ID;
    const isScore = editingId === SCORE_STEP_ID;
    const isSplit = editingId === SPLIT_STEP_ID;
    const isSetField = editingId === SETFIELD_STEP_ID;
    const isHttp = editingId === HTTP_STEP_ID;
    const isLanding = editingId === LANDING_STEP_ID;
    const isIgPost = editingId === IG_AUTOPOST_STEP_ID;
    const isHumanTask = editingId === HUMAN_TASK_STEP_ID;
    const isReport = editingId === REPORT_STEP_ID;
    const isMacro = isFollowup || isAnalytics || isZohoUpdate || isMedia || isMultiCond || isAiParse || isDataEnrich || isExport || isAutopost || isScrape || isResearch || isScore || isSplit || isSetField || isHttp || isContent || isApproval || isLanding || isIgPost || isHumanTask || isReport;
    const visual = isSource
      ? SOURCES.find((s) => s.key === source)
      : isFollowup
        ? { icon: <ListOrdered className="h-4 w-4 text-indigo-600" />, chip: 'bg-indigo-50 dark:bg-indigo-950/30' }
        : isAnalytics
          ? { icon: <BarChart3 className="h-4 w-4 text-cyan-600" />, chip: 'bg-cyan-50 dark:bg-cyan-950/30' }
          : isZohoUpdate
            ? { icon: <DatabaseZap className="h-4 w-4 text-red-600" />, chip: 'bg-red-50 dark:bg-red-950/30' }
          : isMedia
            ? { icon: <Wand2 className="h-4 w-4 text-fuchsia-600" />, chip: 'bg-fuchsia-50 dark:bg-fuchsia-950/30' }
          : isMultiCond
            ? { icon: <Split className="h-4 w-4 text-amber-600" />, chip: 'bg-amber-50 dark:bg-amber-950/30' }
          : isAiParse
            ? { icon: <Sparkles className="h-4 w-4 text-violet-600" />, chip: 'bg-violet-50 dark:bg-violet-950/30' }
          : isDataEnrich
            ? { icon: <Contact className="h-4 w-4 text-teal-600" />, chip: 'bg-teal-50 dark:bg-teal-950/30' }
          : isExport
            ? { icon: <Download className="h-4 w-4 text-cyan-700" />, chip: 'bg-cyan-50 dark:bg-cyan-950/30' }
          : isAutopost
            ? { icon: <Megaphone className="h-4 w-4 text-[#0077B5]" />, chip: 'bg-sky-50 dark:bg-sky-950/30' }
          : isContent
            ? { icon: <PenTool className="h-4 w-4 text-violet-600" />, chip: 'bg-violet-50 dark:bg-violet-950/30' }
          : isApproval
            ? { icon: <ShieldCheck className="h-4 w-4 text-green-600" />, chip: 'bg-green-50 dark:bg-green-950/30' }
          : isScrape
            ? { icon: <Globe className="h-4 w-4 text-sky-600" />, chip: 'bg-sky-50 dark:bg-sky-950/30' }
          : isResearch
            ? { icon: <Telescope className="h-4 w-4 text-indigo-600" />, chip: 'bg-indigo-50 dark:bg-indigo-950/30' }
          : isScore
            ? { icon: <Gauge className="h-4 w-4 text-yellow-600" />, chip: 'bg-yellow-50 dark:bg-yellow-950/30' }
          : isSplit
            ? { icon: <Shuffle className="h-4 w-4 text-pink-600" />, chip: 'bg-pink-50 dark:bg-pink-950/30' }
          : isSetField
            ? { icon: <PenLine className="h-4 w-4 text-lime-600" />, chip: 'bg-lime-50 dark:bg-lime-950/30' }
          : isHttp
            ? { icon: <Webhook className="h-4 w-4 text-slate-600" />, chip: 'bg-slate-100 dark:bg-slate-800/50' }
          : isRouter
            ? { icon: <GitFork className="h-4 w-4 text-rose-600" />, chip: 'bg-rose-50 dark:bg-rose-950/30' }
            : OUTREACH.find((o) => o.type === editingStep.type && !o.router);
    // What this node needs / how it behaves — same key resolution as `visual`
    // above (macro id when fixed, 'router' for the router variant, else type).
    const instructionsKey = isSource ? (source || '') : isRouter ? 'router' : isMacro ? editingId : editingStep.type;
    const instructions = STEP_INSTRUCTIONS[instructionsKey as string];
    return (
      <div className="absolute right-0 top-0 h-full w-[22rem] bg-card border-l border-border shadow-2xl z-10 flex flex-col">
        <div className="flex items-start gap-3 p-4 border-b border-border">
          {visual && <IconChip icon={visual.icon} chip={visual.chip} size="h-10 w-10" />}
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground truncate">{editingStep.title}</div>
            <div className="text-xs text-muted-foreground">
              {isSource ? 'Contact source settings' : isFollowup ? 'Follow-up sequence settings' : isAnalytics ? 'Report settings' : isZohoUpdate ? 'Field mapping' : isMedia ? 'AI media' : isMultiCond ? 'Branch by condition' : isAiParse ? 'AI data cleanup' : isDataEnrich ? 'Data to enrich' : isExport ? 'Export destinations' : isAutopost ? 'Where & when' : isContent ? 'What the post says' : isApproval ? 'Who approves' : isScrape ? 'Page to read' : isResearch ? 'What gets researched' : isScore ? 'Scoring signals' : isSplit ? 'Variants & split' : isSetField ? 'Fields to write' : isHttp ? 'Request' : isRouter ? 'Fallback routing settings' : 'Step settings'}
            </div>
          </div>
          <button onClick={() => setEditingId(null)} className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 p-4 space-y-4 overflow-y-auto text-sm">
          {instructions && (
            <div className="rounded-lg border border-sky-200 dark:border-sky-900 bg-sky-50 dark:bg-sky-950/30 p-2.5 text-[12px] leading-relaxed text-sky-900 dark:text-sky-200">
              {instructions}
            </div>
          )}
          {isSource && source === 'zoho_recurring' && (<>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Import from</label>
              <select className={field} value={cfg.zoho_modules || 'contacts'} onChange={(e) => setCfg(editingId, { zoho_modules: e.target.value })}>
                <option value="contacts">Contacts only</option><option value="contacts_leads">Contacts + Leads</option>
              </select></div>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Only tag (optional)</label>
              <Input value={cfg.zoho_tag || ''} onChange={(e) => setCfg(editingId, { zoho_tag: e.target.value })} placeholder="e.g. Auto-Conversion Lead" /></div>
            <p className="text-xs text-muted-foreground">Imports up to {perDay}/day of newly-created records, every day until the campaign ends.</p>
            <div className="rounded-lg border border-border p-2.5 space-y-2 bg-muted/20">
              <label className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer">
                <input type="checkbox" checked={!!cfg.resolve_instagram} onChange={(e) => setCfg(editingId, { resolve_instagram: e.target.checked })} />
                Enrich with Instagram
              </label>
              {cfg.resolve_instagram && (
                <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer pl-6">
                  <input type="checkbox" checked={cfg.instagram_business_discovery !== false} onChange={(e) => setCfg(editingId, { instagram_business_discovery: e.target.checked })} />
                  Fetch public profile stats (business accounts)
                </label>
              )}
              <p className="text-[11px] leading-snug text-muted-foreground">
                Finds each contact&apos;s Instagram handle (from their Zoho profile, website, or search) and maps them to Instagram for inbound engagement. Read-only — Meta&apos;s API does not permit auto-following, liking, or DMing.
              </p>
            </div>
          </>)}
          {isSource && source === 'zoho_once' && (<>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Record type</label>
              <select className={field} value={cfg.zoho_type || 'contacts'} onChange={(e) => setCfg(editingId, { zoho_type: e.target.value })}>
                <option value="contacts">Contacts</option><option value="leads">Leads</option>
              </select></div>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">How many (max 500)</label>
              <Input type="number" value={cfg.import_count || '100'} onChange={(e) => setCfg(editingId, { import_count: e.target.value })} /></div>
          </>)}
          {isSource && source === 'ghl_once' && (
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">How many (max 500)</label>
              <Input type="number" value={cfg.import_count || '100'} onChange={(e) => setCfg(editingId, { import_count: e.target.value })} /></div>
          )}
          {isSource && source === 'file_import' && (<>
            <label className="flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 cursor-pointer px-3 py-4 text-sm font-medium text-foreground transition-colors">
              <Upload className="h-4 w-4 text-emerald-600" />
              {fileParsing ? 'Reading file…' : fileName ? 'Choose a different file' : 'Upload CSV or Excel'}
              <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImportFile(f); e.target.value = ''; }} />
            </label>
            {fileError && <p className="text-xs text-red-600">{fileError}</p>}
            {!!fileHeaders.length && (<>
              <p className="text-xs text-muted-foreground">{fileName} · <span className="font-medium text-foreground">{fileRows.length}</span> row{fileRows.length !== 1 ? 's' : ''} · map columns below</p>
              <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                {fileHeaders.map((h, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 items-center">
                    <span className="text-xs text-foreground truncate" title={h}>{h || `Column ${i + 1}`}</span>
                    <select className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs"
                      value={fileMapping[i] || 'ignore'}
                      onChange={(e) => setFileMapping((m) => ({ ...m, [i]: e.target.value }))}>
                      {IMPORT_FIELDS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                  </div>
                ))}
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">Any combination works (name + company, company + title + location, name + location…). When a LinkedIn step runs, Unipile resolves each lead&apos;s LinkedIn profile from the mapped name + company.</p>
            </>)}
          </>)}
          {isSource && source === 'linkedin_search' && (<>
            {/* Structured targeting — the backend normalises job_titles → roles,
                locations → location, and matches industries against the lead's
                company industry. Comma-separate to search several at once. */}
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Job titles</label>
              <Input value={cfg.job_titles || ''} onChange={(e) => setCfg(editingId, { job_titles: e.target.value })} placeholder="e.g. VP Sales, Head of Revenue" />
              <p className="text-[11px] text-muted-foreground">Comma-separate to target several titles.</p></div>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Industries</label>
              <Input value={cfg.industries || ''} onChange={(e) => setCfg(editingId, { industries: e.target.value })} placeholder="e.g. SaaS, Fintech" /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Location</label>
              <Input value={cfg.locations || ''} onChange={(e) => setCfg(editingId, { locations: e.target.value })} placeholder="e.g. Dubai, United Arab Emirates" /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Extra keywords (optional)</label>
              <Input value={cfg.keywords || ''} onChange={(e) => setCfg(editingId, { keywords: e.target.value })} placeholder="Anything else to match on" />
              <p className="text-[11px] text-muted-foreground">Fill at least one field above — the search needs a title, industry, location, or keyword.</p></div>
          </>)}
          {isSource && source === 'linkedin_signal' && (<>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Signal</label>
              <textarea className={`${field} min-h-[70px]`} value={cfg.signal_query || ''}
                onChange={(e) => setCfg(editingId, { signal_query: e.target.value })}
                placeholder="e.g. companies posting jobs for Salesforce revenue operations" />
              <p className="text-[11px] text-muted-foreground">Describe the hiring / buying signal to look for in LinkedIn posts.</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Decision-maker title(s)</label>
              <Input value={cfg.decision_maker_titles || ''}
                onChange={(e) => setCfg(editingId, { decision_maker_titles: e.target.value })}
                placeholder="e.g. VP Revenue Operations, Head of Sales" />
              <p className="text-[11px] text-muted-foreground">Comma-separated. Who to enrol at the companies that match the signal.</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">Location (optional)</label>
              <Input value={cfg.location || ''}
                onChange={(e) => setCfg(editingId, { location: e.target.value })}
                placeholder="e.g. Dubai, United Arab Emirates" />
              {/*
                Honest about the mechanism, because the result can surprise:
                LinkedIn cannot search posts by geography, so we search
                worldwide and then keep only the people whose own profile says
                they are there. A narrow location can therefore come back empty
                even when the signal exists somewhere.
              */}
              <p className="text-[11px] text-muted-foreground">
                Leave blank to search worldwide. LinkedIn can’t filter posts by place, so Mr LAD
                searches everywhere and then keeps only people whose profile location matches —
                a very specific place may find fewer leads.
              </p>
            </div>
            <p className="text-xs text-muted-foreground">Runs daily until the campaign ends, enrolling up to {perDay}/day of newly-signalled leads.</p>
          </>)}

          {isFollowup && (() => {
            // Is an Audit report node positioned BEFORE this follow-up?
            const reportIdx = workflowPreview.findIndex((x) => x.id === REPORT_STEP_ID);
            const followupIdx = workflowPreview.findIndex((x) => x.id === FOLLOWUP_STEP_ID);
            const reportBeforeFollowup = reportIdx !== -1 && followupIdx !== -1 && reportIdx < followupIdx;
            const eid = editingId!;
            const channel: string = cfg.channel || 'linkedin';
            const touches: { hours?: number; template_id?: string; message?: string; touch_type?: string }[] = Array.isArray(cfg.touches) && cfg.touches.length ? cfg.touches : [{ hours: 24 }];
            const tmpls: any[] = channel === 'email' ? res.emailTemplates : channel === 'whatsapp' ? res.waTemplates : res.liTemplates;
            const tmplName = (t: any) => t.name || t.title || 'Template';
            const syncDesc = (n: number, ch: string) => updateWorkflowStep(eid, { description: `${n} touches · ${FU_CHANNELS.find((c2) => c2.value === ch)?.label}` });
            const setTouch = (i: number, patch: any) => { const next = touches.map((t, idx) => (idx === i ? { ...t, ...patch } : t)); setCfg(eid, { touches: next }); };
            const addTouch = () => { if (touches.length >= 7) return; const last = touches[touches.length - 1]?.hours || 24; const next = [...touches, { hours: last * 2 }]; setCfg(eid, { touches: next }); syncDesc(next.length, channel); };
            const removeTouch = (i: number) => { if (touches.length <= 1) return; const next = touches.filter((_, idx) => idx !== i); setCfg(eid, { touches: next }); syncDesc(next.length, channel); };
            return (<>
              {/* The report must be GENERATED before a touch can attach it.
                  Presence alone is not enough: a report node placed after the
                  follow-up has not run when the touch fires, so the attachment
                  would silently fall back to a plain message. Check position. */}
              {(() => null)()}
              <div className="space-y-1"><label className="text-xs font-medium text-foreground">Follow-up channel</label>
                <select className={field} value={channel} onChange={(e) => { setCfg(eid, { channel: e.target.value }); syncDesc(touches.length, e.target.value); }}>
                  {FU_CHANNELS.map((c2) => <option key={c2.value} value={c2.value}>{c2.label}</option>)}
                </select></div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Touch timeline ({touches.length})</label>
                {touches.map((t, i) => {
                  const h = t.hours ?? 24;
                  return (
                    <div key={i} className="rounded-lg border border-border p-2.5 space-y-2 bg-muted/20">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-foreground">Touch {i + 1}</span>
                        {touches.length > 1 && (
                          <button onClick={() => removeTouch(i)} className="text-muted-foreground hover:text-red-600" title="Remove touch"><X className="h-3.5 w-3.5" /></button>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input type="number" className="w-24 h-8" value={String(h)} onChange={(e) => setTouch(i, { hours: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                        <span className="text-xs text-muted-foreground">hours (≈ {Math.round((h / 24) * 10) / 10}d) after {i === 0 ? 'the previous step' : `touch ${i}`}</span>
                      </div>
                      <select className={`${field} h-8`}
                        value={t.touch_type === 'lead_report' ? '__lead_report__' : (t.template_id || '')}
                        onChange={(e) => {
                          const v = e.target.value;
                          // The report option is a TOUCH TYPE, not a template —
                          // the backend branches on touch_type, so setting one
                          // must clear the other or the row carries both and the
                          // template path wins.
                          if (v === '__lead_report__') setTouch(i, { touch_type: 'lead_report', template_id: undefined });
                          else setTouch(i, { touch_type: undefined, template_id: v || undefined });
                        }}>
                        <option value="">AI-generated (default)</option>
                        {reportBeforeFollowup && (
                          <option value="__lead_report__">Attach the audit report</option>
                        )}
                        {tmpls.map((tm: any) => <option key={tm.id} value={tm.id}>{tmplName(tm)}</option>)}
                      </select>
                      {!t.template_id && (
                        <textarea className={`${field} min-h-[64px]`} value={t.message || ''} onChange={(e) => setTouch(i, { message: e.target.value })}
                          placeholder={`Message for touch ${i + 1} — leave blank to let Mr LAD draft it`} />
                      )}
                    </div>
                  );
                })}
                {touches.length < 7 && (
                  <button onClick={addTouch} className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center gap-1">
                    <span className="text-base leading-none">+</span> Add another touch
                  </button>
                )}

                {/* Dry-run the cadence before it goes anywhere near a real lead. */}
                <a
                  href="/followup-simulator.html"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 flex items-start gap-2 rounded-lg border border-dashed border-border p-2.5 hover:border-amber-500 hover:bg-amber-50/50 dark:hover:bg-amber-950/20 transition-colors group"
                >
                  <span className="text-base leading-none mt-0.5">🧪</span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-foreground group-hover:text-amber-700">
                      Test this sequence first
                    </span>
                    <span className="block text-[11px] text-muted-foreground leading-snug">
                      Play the whole cadence against a sample lead and read what each touch would
                      actually send — before you launch.
                    </span>
                  </span>
                </a>
              </div>

              <label className="flex items-start gap-2 text-sm text-foreground cursor-pointer select-none">
                <input type="checkbox" className="h-4 w-4 mt-0.5" checked={!!cfg.human_approval} onChange={(e) => setCfg(eid, { human_approval: e.target.checked })} />
                <span>Human in the loop
                  <span className="block text-xs text-muted-foreground">Flags this sequence for manual review. Every send already passes Mr LAD&apos;s safety supervisor; a full approval queue reads this flag as it rolls out.</span>
                </span>
              </label>
              <p className="text-xs text-muted-foreground">AI-generated touches are drafted by Mr LAD from the conversation context; templated touches use your saved {FU_CHANNELS.find((c2) => c2.value === channel)?.label} template. The sequence auto-cancels when the lead replies.</p>
            </>);
          })()}

          {isAnalytics && (<>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Notify me via</label>
              <select className={field} value={cfg.channel || 'email'} onChange={(e) => {
                setCfg(editingId, { channel: e.target.value });
                updateWorkflowStep(editingId, { description: `${(cfg.frequency || 'daily') === 'weekly' ? 'Weekly' : 'Daily'} · ${e.target.value === 'whatsapp' ? 'WhatsApp' : 'Email'}` });
              }}>
                <option value="email">Email</option><option value="whatsapp">WhatsApp</option>
              </select></div>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Recipient</label>
              <Input value={cfg.recipient || ''} onChange={(e) => setCfg(editingId, { recipient: e.target.value })}
                placeholder={(cfg.channel || 'email') === 'whatsapp' ? 'WhatsApp number, e.g. +9715…' : 'you@company.com'} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Frequency</label>
              <select className={field} value={cfg.frequency || 'daily'} onChange={(e) => {
                setCfg(editingId, { frequency: e.target.value });
                updateWorkflowStep(editingId, { description: `${e.target.value === 'weekly' ? 'Weekly' : 'Daily'} · ${(cfg.channel || 'email') === 'whatsapp' ? 'WhatsApp' : 'Email'}` });
              }}>
                <option value="daily">Daily (08:00 GST)</option><option value="weekly">Weekly (Mondays)</option>
              </select></div>
            <div className="space-y-1.5"><label className="text-xs font-medium text-foreground">Data to send</label>
              <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" className="h-4 w-4" checked={cfg.m_new_leads !== false} onChange={(e) => setCfg(editingId, { m_new_leads: e.target.checked })} /> New leads imported (24h)</label>
              <label className="flex items-center gap-2 text-sm text-foreground"><input type="checkbox" className="h-4 w-4" checked={cfg.m_pipeline !== false} onChange={(e) => setCfg(editingId, { m_pipeline: e.target.checked })} /> Lead pipeline status</label>
            </div>
            <p className="text-xs text-muted-foreground">Sent by Mr LAD via your connected {(cfg.channel || 'email') === 'whatsapp' ? 'WhatsApp' : 'email'} account while the campaign is running.</p>
          </>)}

          {isZohoUpdate && (() => {
            const eid = editingId!;
            const zmap: Record<string, string> = cfg.map || {};
            // Channels present in the sequence → sequence-aware suggestions.
            const channels = new Set<Channel>();
            workflowPreview.forEach((s) => { const o = OUTREACH.find((x) => x.type === s.type); if (o) channels.add(o.channel); });
            if (source === 'zoho_recurring' && configs[SOURCE_STEP_ID]?.resolve_instagram) channels.add('instagram');
            const setMap = (api: string, val: string) => setCfg(eid, { map: { ...zmap, [api]: val } });
            const applySuggestions = () => {
              const next: Record<string, string> = { ...zmap };
              zohoFields.forEach((f) => { if (!next[f.api_name]) { const s = suggestDataPoint(f, channels); if (s) next[f.api_name] = s; } });
              setCfg(eid, { map: next });
            };
            const mappedCount = Object.values(zmap).filter(Boolean).length;
            return (<>
              <div className="space-y-1"><label className="text-xs font-medium text-foreground">Update which record</label>
                <select className={field} value={cfg.module || 'Contacts'} onChange={(e) => { setCfg(eid, { module: e.target.value }); updateWorkflowStep(eid, { description: `Write back to ${e.target.value}` }); }}>
                  <option value="Contacts">Contacts</option><option value="Leads">Leads</option>
                </select></div>
              <div className="flex items-center justify-between">
                <label className="text-xs font-medium text-foreground">Field mapping{mappedCount ? ` (${mappedCount})` : ''}</label>
                <button type="button" onClick={applySuggestions} disabled={!zohoFields.length}
                  className="text-[11px] font-medium text-[#0b1957] hover:underline disabled:opacity-40 disabled:no-underline">Suggest mappings</button>
              </div>
              {zohoFieldsLoading && <p className="text-xs text-muted-foreground">Loading Zoho fields…</p>}
              {zohoFieldsError && <p className="text-xs text-red-600">{zohoFieldsError}</p>}
              {!zohoFieldsLoading && !zohoFieldsError && !zohoFields.length && <p className="text-xs text-muted-foreground">No writable fields returned. Connect Zoho and sync first.</p>}
              {!!zohoFields.length && (
                <div className="space-y-2 max-h-[46vh] overflow-y-auto pr-1">
                  {zohoFields.map((f) => (
                    <div key={f.api_name} className="grid grid-cols-2 gap-2 items-center">
                      <span className="text-xs text-foreground truncate" title={`${f.field_label} (${f.data_type})`}>{f.field_label}</span>
                      <select className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs" value={zmap[f.api_name] || ''} onChange={(e) => setMap(f.api_name, e.target.value)}>
                        <option value="">— Skip —</option>
                        {WORKFLOW_DATA_POINTS.map((dp) => <option key={dp.key} value={dp.key}>{dp.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] leading-snug text-muted-foreground">Runs when a lead finishes the sequence — writes the mapped workflow &amp; enrichment data back onto its original Zoho record. Only non-empty values are written; blank fields are left untouched.</p>
            </>);
          })()}

          {isMedia && (() => {
            const m = cfg || {};
            const imgs = mediaBuilder.galleryImages || [];
            const vids = mediaBuilder.galleryVideos || [];
            const openGallery = () => { setMediaGalleryOpen((o) => !o); if (!mediaGalleryOpen) mediaBuilder.fetchGallery?.().catch(() => {}); };
            return (<>
              {m.media_url ? (
                <div className="space-y-2">
                  <label className="text-xs font-medium text-foreground">Attached media</label>
                  {m.media_type === 'video'
                    ? <video src={m.media_url} controls className="w-full max-h-48 rounded-md bg-black" />
                    : <img src={m.media_url} alt={m.media_filename || 'media'} className="w-full max-h-48 object-contain rounded-md border border-border" />}
                  <button type="button" onClick={() => { setCfg(MEDIA_STEP_ID, { media_url: '', media_type: '', media_filename: '' }); updateWorkflowStep(MEDIA_STEP_ID, { description: 'Generate media to attach' }); }}
                    className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:underline"><Trash2 className="h-3.5 w-3.5" /> Remove</button>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No media yet. Generate one in the AI Media Studio, then pick it below.</p>
              )}
              {mediaError && <p className="text-xs text-red-600">{mediaError}</p>}
              <div className="flex flex-col gap-2">
                <button type="button" onClick={() => setShowMediaStudio(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-fuchsia-300 bg-fuchsia-50 dark:bg-fuchsia-950/30 px-3 py-2 text-sm font-medium text-fuchsia-700 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/40">
                  <Wand2 className="h-4 w-4" /> Open AI Media Studio</button>
                <button type="button" onClick={openGallery} className="text-xs font-medium text-[#0b1957] hover:underline text-left">
                  {mediaGalleryOpen ? 'Hide generated media' : 'Pick from generated media'}</button>
              </div>
              {mediaGalleryOpen && (
                <div className="rounded-lg border border-border p-2 bg-muted/20">
                  {mediaBuilder.loadingGallery ? (
                    <p className="py-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
                  ) : (!imgs.length && !vids.length) ? (
                    <p className="py-3 text-center text-xs text-muted-foreground">No generated media yet — use the studio first.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto">
                      {imgs.map((it: any, i: number) => { const u = it?.url || it?.signed_url || (typeof it === 'string' ? it : ''); return u ? (
                        <img key={`gi-${i}`} src={u} alt="generated" onClick={() => importGenerated(u)} className="h-16 w-full object-cover rounded cursor-pointer hover:ring-2 ring-fuchsia-400" />
                      ) : null; })}
                      {vids.map((it: any, i: number) => { const u = it?.url || it?.signed_url || (typeof it === 'string' ? it : ''); return u ? (
                        <video key={`gv-${i}`} src={u} muted onClick={() => importGenerated(u)} className="h-16 w-full object-cover rounded cursor-pointer hover:ring-2 ring-fuchsia-400" />
                      ) : null; })}
                    </div>
                  )}
                  {mediaImporting && <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Attaching…</p>}
                </div>
              )}
              <p className="text-[11px] leading-snug text-muted-foreground">The asset attaches to your email &amp; WhatsApp steps automatically. Email inlines images only.</p>
            </>);
          })()}

          {isMultiCond && (() => {
            const eid = editingId!;
            const swField: string = cfg.field || 'tag';
            const cases: any[] = Array.isArray(cfg.cases) && cfg.cases.length ? cfg.cases : [{ op: 'equals', value: '', channel: 'email', subject: '', body: '' }];
            const def = cfg.default || { channel: 'email', subject: '', body: '' };
            const fieldLabel = mcFields.find((f) => f.value === swField)?.label || 'Tag';
            const setCase = (i: number, patch: any) => { const next = cases.map((c, idx) => (idx === i ? { ...c, ...patch } : c)); setCfg(eid, { cases: next }); updateWorkflowStep(eid, { description: `${next.length} conditions + else` }); };
            const addCase = () => { if (cases.length >= 6) return; const next = [...cases, { op: 'equals', value: '', channel: 'email', subject: '', body: '' }]; setCfg(eid, { cases: next }); updateWorkflowStep(eid, { description: `${next.length} conditions + else` }); };
            const removeCase = (i: number) => { if (cases.length <= 1) return; const next = cases.filter((_, idx) => idx !== i); setCfg(eid, { cases: next }); updateWorkflowStep(eid, { description: `${next.length} conditions + else` }); };
            const BranchBody = ({ b, onChange }: { b: any; onChange: (p: any) => void }) => (<>
              <select className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs" value={b.channel || 'email'} onChange={(e) => onChange({ channel: e.target.value })}>
                <option value="email">Send email</option><option value="linkedin">LinkedIn message</option><option value="whatsapp">WhatsApp</option>
              </select>
              {(b.channel || 'email') === 'email' && (
                <Input value={b.subject || ''} onChange={(e) => onChange({ subject: e.target.value })} placeholder="Email subject" />
              )}
              <textarea className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-xs min-h-[56px]" value={b.body || ''} onChange={(e) => onChange({ body: e.target.value })} placeholder="Message (leave blank to let Mr LAD draft it)" />
            </>);
            return (<>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Branch on {mcFieldsLoading && <span className="text-muted-foreground">· loading fields…</span>}</label>
                <select className={field} value={swField} onChange={(e) => setCfg(eid, { field: e.target.value })}>
                  {!mcFields.some((f) => f.value === swField) && swField && <option value={swField}>{swField}</option>}
                  {mcFields.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
                <p className="text-[11px] text-muted-foreground">{(source === 'zoho_recurring' || source === 'zoho_once') ? 'Fields from your connected Zoho module.' : 'Contact fields available for this source.'}</p>
              </div>
              {cases.map((c, i) => (
                <div key={i} className="rounded-lg border border-border p-2.5 space-y-2 bg-muted/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{i === 0 ? 'If' : 'Else if'}</span>
                    {cases.length > 1 && <button type="button" onClick={() => removeCase(i)} className="text-muted-foreground hover:text-red-600"><Trash2 className="h-3.5 w-3.5" /></button>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground shrink-0">{fieldLabel}</span>
                    <select className="rounded-md border border-input bg-background px-1.5 py-1.5 text-xs" value={c.op || 'equals'} onChange={(e) => setCase(i, { op: e.target.value })}>
                      {SWITCH_OPS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    <Input value={c.value || ''} onChange={(e) => setCase(i, { value: e.target.value })} placeholder="e.g. person1" />
                  </div>
                  <BranchBody b={c} onChange={(p) => setCase(i, p)} />
                </div>
              ))}
              {cases.length < 6 && (
                <button type="button" onClick={addCase} className="inline-flex items-center gap-1.5 text-xs font-medium text-[#0b1957] hover:underline"><Plus className="h-3.5 w-3.5" /> Add condition</button>
              )}
              <div className="rounded-lg border border-dashed border-border p-2.5 space-y-2">
                <span className="text-xs font-semibold text-foreground">Otherwise (else)</span>
                <BranchBody b={def} onChange={(p) => setCfg(eid, { default: { ...def, ...p } })} />
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">Each lead runs exactly ONE branch — the first condition that matches, else the fallback. Conditions are checked top-to-bottom.</p>
            </>);
          })()}

          {isAiParse && (<>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground">What should the AI clean up?</label>
              <textarea className={`${field} min-h-[110px]`} value={cfg.instruction ?? AI_DEFAULT_INSTRUCTION}
                onChange={(e) => setCfg(editingId!, { instruction: e.target.value })}
                placeholder={AI_DEFAULT_INSTRUCTION} />
            </div>
            <p className="text-[11px] leading-snug text-muted-foreground">Runs on each lead before the outreach steps. It normalises the data — e.g. picks the single best job title when the column has a mix — and writes it back so the LinkedIn node resolves the right person. Uses your tenant&apos;s AI model.</p>
          </>)}

          {isDataEnrich && (() => {
            const eid = editingId!;
            const sel: string[] = Array.isArray(cfg.enrich) ? cfg.enrich : ['official_email', 'phone'];
            const toggle = (key: string) => {
              const next = sel.includes(key) ? sel.filter((k) => k !== key) : [...sel, key];
              setCfg(eid, { enrich: next });
              const labels = ENRICH_OPTIONS.filter((o) => next.includes(o.key)).map((o) => o.label.replace(' email', '').replace(' number', ''));
              updateWorkflowStep(eid, { description: labels.length ? labels.join(' · ') : 'nothing selected' });
            };
            return (<>
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Data to enrich</label>
                {ENRICH_OPTIONS.map((o) => (
                  <label key={o.key} className="flex items-start gap-2.5 rounded-lg border border-border p-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                    <input type="checkbox" className="mt-0.5 h-4 w-4" checked={sel.includes(o.key)} onChange={() => toggle(o.key)} />
                    <span className="min-w-0">
                      <span className="block text-sm text-foreground">{o.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{o.sub}</span>
                    </span>
                  </label>
                ))}
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">Reveals the selected data via FullEnrich (name + company/LinkedIn → contact). Runs before outreach so email/WhatsApp/voice steps use the enriched values. Costs FullEnrich credits per lead (work email 2 · personal 4 · mobile 12).</p>
            </>);
          })()}

          {isContent && (() => {
            const eid = editingId!;
            return (<>
              <div className="rounded-md border border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30 px-3 py-2">
                <p className="text-[11px] text-sky-800 dark:text-sky-300">
                  Posts to your own LinkedIn feed on a schedule while the campaign runs — it warms
                  your profile so the people you reach out to see recent activity. This posts
                  <strong> once per schedule</strong>, not once per lead.
                </p>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground">Post content</label>
                  <button type="button" onClick={generateAutopost} disabled={autopostGenerating}
                    className="text-[11px] font-medium text-[#0b1957] dark:text-sky-300 hover:underline disabled:opacity-60 flex items-center gap-1">
                    {autopostGenerating ? <><Loader2 className="h-3 w-3 animate-spin" /> Generating…</> : <><Sparkles className="h-3 w-3" /> Generate with AI</>}
                  </button>
                </div>
                <textarea className={`${field} min-h-[140px]`} value={cfg.content || ''}
                  onChange={(e) => { setCfg(eid, { content: e.target.value }); updateWorkflowStep(eid, { description: e.target.value.slice(0, 40) || 'What the post says' }); }}
                  placeholder="Write your post, or add a topic and hit Generate with AI…" />
                <p className="text-[11px] text-muted-foreground">{(cfg.content || '').length}/3000 characters</p>
                {/* Generation feedback belongs here — the shared status line is
                    rendered in the post drawer, which isn't visible from here. */}
                {autopostMsg && (
                  <div className={`rounded-md border p-2 text-[11px] ${autopostMsg.ok
                    ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300'
                    : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30 text-red-700 dark:text-red-300'}`}>
                    {autopostMsg.text}
                  </div>
                )}
              </div>

              <label className="flex items-start gap-2.5 rounded-lg border border-border p-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={!!cfg.ai_generate}
                  onChange={(e) => setCfg(eid, { ai_generate: e.target.checked })} />
                <span className="min-w-0">
                  <span className="block text-sm text-foreground">Write a fresh post with AI each time</span>
                  <span className="block text-[11px] text-muted-foreground">Uses the text above as the topic, so a recurring series doesn&apos;t repeat itself.</span>
                </span>
              </label>

              {/* Shape of the post. Only meaningful when AI writes it — a post
                  typed by hand is already whatever shape it is. */}
              {!!cfg.ai_generate && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Post shape</label>
                  <select className={field} value={cfg.post_format || 'insight'}
                    onChange={(e) => setCfg(eid, { post_format: e.target.value })}>
                    <option value="insight">Short insight post (80-150 words)</option>
                    <option value="structured">Structured list (200-400 words)</option>
                  </select>
                  <p className="text-[11px] text-muted-foreground">
                    {(cfg.post_format || 'insight') === 'structured'
                      ? 'A heading and 3-6 numbered points. This is the shape AI search engines cite most: LinkedIn found headings in 92% of cited posts, and a list in every top-cited article.'
                      : 'A single hook and a short story. Good for reach and replies.'}
                  </p>
                </div>
              )}

              <div className="space-y-1"><label className="text-xs font-medium text-foreground">Link (optional)</label>
                <input className={field} value={cfg.external_link || ''} onChange={(e) => setCfg(eid, { external_link: e.target.value })}
                  placeholder="https://… (shown as a preview card)" /></div>

              {/* ── Media: generate with AI, pick from the gallery, upload, or paste ── */}
              {(() => {
                const imgs = mediaBuilder.galleryImages || [];
                const vids = mediaBuilder.galleryVideos || [];
                const openGallery = () => { setMediaGalleryOpen((o) => !o); if (!mediaGalleryOpen) mediaBuilder.fetchGallery?.().catch(() => {}); };
                // Run the wizard inline in this drawer. selectImageCreation
                // skips the image/video choice — an auto-post wants an image —
                // and the describe-image phase is pre-filled with the post text.
                const openStudio = (auto = false) => {
                  setAutopostMsg(null);
                  inlinePrefilledRef.current = null;
                  setInlineAnswer('');
                  autoBusyRef.current = false;
                  autoKeyRef.current = null;
                  autoCountRef.current = 0;
                  autoProgressAtRef.current = Date.now();
                  setAutoStalled(false);
                  setAutoMediaLog([]);
                  setAutoMedia(auto);
                  setInlineMedia(true);
                  // Only start the flow here. selectImageCreation closes over
                  // the sessionId STATE, which startFlow has just queued —
                  // calling it in this tick sends an empty session id and the
                  // worker 500s with "Session not found". The effect below
                  // fires it once the id has actually committed.
                  mediaBuilder.startFlow?.();
                };
                return (
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-foreground">Image / video (optional)</label>

                    {cfg.media_url ? (
                      <div className="space-y-2">
                        {cfg.media_type === 'video'
                          ? <video src={cfg.media_url} controls className="w-full max-h-44 rounded-md bg-black" />
                          : <img src={cfg.media_url} alt={cfg.media_filename || 'media'} className="w-full max-h-44 object-contain rounded-md border border-border" />}
                        <button type="button" onClick={() => setCfg(eid, { media_url: '', media_type: '', media_filename: '' })}
                          className="inline-flex items-center gap-1.5 text-xs text-red-600 hover:underline">
                          <Trash2 className="h-3.5 w-3.5" /> Remove
                        </button>
                      </div>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">Posts with an image get noticeably more reach than text alone.</p>
                    )}

                    {mediaError && <p className="text-xs text-red-600">{mediaError}</p>}

                    {/* ── Inline AI-media wizard ─────────────────────────────
                        The media builder is a multi-phase Q&A. Rather than the
                        full-screen studio, render each phase compactly here and
                        pre-fill the image description with the post text. */}
                    {inlineMedia && (() => {
                      const mb = mediaBuilder;
                      const step = mb.step as string;
                      const p: any = mb.uiPayload || {};
                      const phase: string = p.phase || '';
                      const busy = step === 'loading' || mb.generating;
                      const cancel = () => { setInlineMedia(false); setInlineAnswer(''); setAutoMedia(false); mb.closeFlow?.(); };

                      // The prompt phase — seed it with the post content once.
                      const isDescribe = /describe image/i.test(phase) || /describe.*image/i.test(p.question || '');
                      if (step === 'builder-text' && isDescribe && inlinePrefilledRef.current !== phase) {
                        inlinePrefilledRef.current = phase;
                        const seed = (cfg.content || '').trim();
                        if (seed) setTimeout(() => setInlineAnswer(seed.slice(0, 900)), 0);
                      }

                      // NOTE: a plain function, NOT a component. Declaring a
                      // component inside render gives it a new type every pass,
                      // so React remounts the subtree and the textarea loses
                      // focus on each keystroke.
                      const shell = (children: React.ReactNode) => (
                        <div className="rounded-xl border border-fuchsia-200 dark:border-fuchsia-900 bg-fuchsia-50/50 dark:bg-fuchsia-950/20 p-3 space-y-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-fuchsia-700 dark:text-fuchsia-300">
                              <Wand2 className="h-3.5 w-3.5" /> AI image
                            </span>
                            <button type="button" onClick={cancel} className="text-[11px] text-muted-foreground hover:text-foreground">Cancel</button>
                          </div>
                          {phase && <div className="text-[10.5px] font-medium text-fuchsia-600/80 dark:text-fuchsia-400/80">{phase}</div>}
                          {children}
                        </div>
                      );

                      // The run stopped responding. Say so plainly rather than
                      // spinning: the copy is safe, and both ways forward are
                      // one click away.
                      if (autoStalled) return (
                        shell(<>
                          <p className="text-[12.5px] font-medium text-foreground">The image service stopped responding.</p>
                          <p className="text-[11.5px] text-muted-foreground leading-snug">
                            Your post copy is safe. You can try again, or attach an image yourself with Upload.
                          </p>
                          {autoMediaLog.length > 0 && (
                            <p className="text-[11px] text-muted-foreground">Got as far as: {autoMediaLog[autoMediaLog.length - 1].phase}</p>
                          )}
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => { cancel(); openStudio(true); }}
                              className="px-3 py-1.5 rounded-lg bg-fuchsia-600 text-white text-[12.5px] font-semibold">Try again</button>
                            <button type="button" onClick={cancel}
                              className="text-[12px] text-muted-foreground hover:text-foreground">Close</button>
                          </div>
                        </>)
                      );

                      // Agent-driven: never show the questionnaire. Show what it
                      // has decided instead — automation you can't inspect is
                      // worse than the form it replaced. Stops at the image
                      // grid, which is a real choice and was never the tedious
                      // part.
                      if (autoMedia && !mb.error && step !== 'builder-image-output') return (
                        shell(<>
                          <p className="flex items-center gap-2 text-[12.5px] font-medium text-foreground">
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-fuchsia-600" />
                            Setting the image up from your post…
                          </p>
                          {autoMediaLog.length > 0 && (
                            <ul className="space-y-1 max-h-40 overflow-y-auto">
                              {autoMediaLog.map((e, i) => (
                                <li key={i} className="text-[11px] leading-snug">
                                  <span className="text-muted-foreground">{e.phase}: </span>
                                  <span className="text-foreground font-medium">{e.answer || 'skipped'}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          <button type="button" onClick={() => setAutoMedia(false)}
                            className="text-[11.5px] text-muted-foreground hover:text-foreground underline">
                            Take over and answer the rest myself
                          </button>
                        </>)
                      );

                      if (busy) return (
                        shell(<><p className="py-3 text-center text-[12px] text-muted-foreground flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Working…
                        </p></>)
                      );

                      if (mb.error) return (
                        shell(<>
                          <p className="text-[12px] text-red-600">{String(mb.error)}</p>
                          <button type="button" onClick={() => { cancel(); setShowMediaStudio(true); }}
                            className="text-[12px] font-medium text-[#0b1957] dark:text-sky-300 hover:underline">Open the full studio instead</button>
                        </>)
                      );

                      // Multiple-choice phase
                      if (step === 'builder-mcq-few') return (
                        shell(<>
                          <p className="text-[13px] font-medium text-foreground leading-snug">{p.question}</p>
                          {p.description && <p className="text-[11.5px] text-muted-foreground leading-snug">{p.description}</p>}
                          <div className="flex flex-col gap-1.5">
                            {(p.options || []).map((o: any, i: number) => (
                              <button key={i} type="button"
                                onClick={() => { setInlineAnswer(''); mb.advanceStep?.(o?.label ?? String(o)); }}
                                className="w-full text-left rounded-lg border border-border bg-card px-2.5 py-2 text-[12.5px] text-foreground hover:border-fuchsia-400 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-950/30 transition-colors">
                                {o?.label ?? String(o)}
                              </button>
                            ))}
                          </div>
                        </>)
                      );

                      // Free-text phase (the image description lands here)
                      if (step === 'builder-text') return (
                        shell(<>
                          <p className="text-[13px] font-medium text-foreground leading-snug">{p.question}</p>
                          {p.description && <p className="text-[11.5px] text-muted-foreground leading-snug">{p.description}</p>}
                          {isDescribe && (
                            <p className="text-[11px] text-fuchsia-700 dark:text-fuchsia-300">Pre-filled from your post — edit if you want a different image.</p>
                          )}
                          <textarea className={`${field} min-h-[80px]`} value={inlineAnswer}
                            onChange={(e) => setInlineAnswer(e.target.value)} placeholder="Type your answer…" />
                          <div className="flex items-center gap-2">
                            <button type="button" disabled={!inlineAnswer.trim()}
                              onClick={() => { const v = inlineAnswer.trim(); setInlineAnswer(''); mb.advanceStep?.(v); }}
                              className="px-3 py-1.5 rounded-lg bg-fuchsia-600 text-white text-[12.5px] font-semibold disabled:opacity-50">Send</button>
                            <button type="button" onClick={() => { setInlineAnswer(''); mb.advanceStep?.(''); }}
                              className="text-[12px] text-muted-foreground hover:text-foreground">Skip</button>
                          </div>
                        </>)
                      );

                      // Generated images — click one to attach it to the post
                      if (step === 'builder-image-output') {
                        const outImgs: any[] = p.images || [];
                        return (
                          shell(<>
                            <p className="text-[13px] font-medium text-foreground leading-snug">
                              {autoMedia ? 'Configured from your post — pick your favourite' : (p.question || 'Pick an image for your post')}
                            </p>
                            {!outImgs.length ? (
                              <p className="text-[12px] text-muted-foreground">No images came back — try the full studio.</p>
                            ) : (
                              <div className="grid grid-cols-2 gap-2">
                                {outImgs.map((im: any, i: number) => {
                                  const u = im?.url || im?.signed_url || (typeof im === 'string' ? im : '');
                                  return u ? (
                                    <img key={i} src={u} alt="generated"
                                      onClick={() => { importGenerated(u, CONTENT_STEP_ID); setInlineMedia(false); mb.closeFlow?.(); }}
                                      className="h-20 w-full object-cover rounded-md cursor-pointer hover:ring-2 ring-fuchsia-500" />
                                  ) : null;
                                })}
                              </div>
                            )}
                            <p className="text-[11px] text-muted-foreground">Click an image to attach it.</p>
                          </>)
                        );
                      }

                      // Video / keyframe phases aren't worth reproducing in a
                      // 22rem drawer — hand off to the studio.
                      return (
                        shell(<>
                          <p className="text-[12.5px] text-muted-foreground leading-snug">This part of the wizard needs more room.</p>
                          <button type="button" onClick={() => { setInlineMedia(false); setShowMediaStudio(true); }}
                            className="px-3 py-1.5 rounded-lg bg-fuchsia-600 text-white text-[12.5px] font-semibold">Continue in the full studio</button>
                        </>)
                      );
                    })()}

                    <div className="grid grid-cols-2 gap-2">
                      {/* Default to the agent doing the setup: the post copy is
                          already the brief, so making everyone sit through the
                          questionnaire to restate it is the wrong default. */}
                      <button type="button" onClick={() => openStudio(true)} disabled={inlineMedia || !(cfg.content || '').trim()}
                        title={!(cfg.content || '').trim() ? 'Write or generate the post first — the copy is what the image is based on' : undefined}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-fuchsia-300 bg-fuchsia-50 dark:bg-fuchsia-950/30 px-2.5 py-2 text-[12.5px] font-medium text-fuchsia-700 dark:text-fuchsia-300 hover:bg-fuchsia-100 dark:hover:bg-fuchsia-900/40 disabled:opacity-50">
                        <Wand2 className="h-3.5 w-3.5" /> Generate with AI
                      </button>
                      <button type="button" onClick={() => autopostFileRef.current?.click()} disabled={mediaImporting}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border px-2.5 py-2 text-[12.5px] font-medium text-foreground hover:bg-muted/50 disabled:opacity-60">
                        {mediaImporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />} Upload
                      </button>
                    </div>
                    {!inlineMedia && (
                      <button type="button" onClick={() => openStudio(false)}
                        className="text-[11.5px] text-muted-foreground hover:text-foreground underline">
                        Set the image up myself instead
                      </button>
                    )}
                    <input ref={autopostFileRef} type="file" accept="image/*,video/*" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMediaFor(f, CONTENT_STEP_ID); e.target.value = ''; }} />

                    <button type="button" onClick={openGallery} className="text-[12px] font-medium text-[#0b1957] dark:text-sky-300 hover:underline">
                      {mediaGalleryOpen ? 'Hide generated media' : 'Pick from generated media'}
                    </button>

                    {mediaGalleryOpen && (
                      <div className="rounded-lg border border-border p-2 bg-muted/20">
                        {mediaBuilder.loadingGallery ? (
                          <p className="py-3 text-center text-xs text-muted-foreground flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>
                        ) : (!imgs.length && !vids.length) ? (
                          <p className="py-3 text-center text-xs text-muted-foreground">Nothing generated yet — use Generate with AI first.</p>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 max-h-52 overflow-y-auto">
                            {imgs.map((it: any, i: number) => { const u = it?.url || it?.signed_url || (typeof it === 'string' ? it : ''); return u ? (
                              <img key={`ai-${i}`} src={u} alt="generated" onClick={() => importGenerated(u, CONTENT_STEP_ID)}
                                className="h-16 w-full object-cover rounded cursor-pointer hover:ring-2 ring-fuchsia-400" />
                            ) : null; })}
                            {vids.map((it: any, i: number) => { const u = it?.url || it?.signed_url || (typeof it === 'string' ? it : ''); return u ? (
                              <video key={`av-${i}`} src={u} onClick={() => importGenerated(u, CONTENT_STEP_ID)}
                                className="h-16 w-full object-cover rounded cursor-pointer hover:ring-2 ring-fuchsia-400" />
                            ) : null; })}
                          </div>
                        )}
                      </div>
                    )}

                    <input className={field} value={cfg.media_url || ''} onChange={(e) => setCfg(eid, { media_url: e.target.value })}
                      placeholder="…or paste an image / video URL" />
                  </div>
                );
              })()}

            </>);
          })()}

          {isApproval && (() => {
            const eid = editingId!;
            return (<>
              <div className="rounded-md border border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/30 px-3 py-2">
                <p className="text-[11px] text-green-800 dark:text-green-300">
                  Nothing is published until you approve it. At each scheduled slot the post is
                  drafted and sent to you — tap <strong>Approve</strong> and it goes out immediately.
                </p>
              </div>
              <div className="space-y-1"><label className="text-xs font-medium text-foreground">Send the draft to</label>
                <select className={field} value={cfg.approval_channel || 'whatsapp'}
                  onChange={(e) => { setCfg(eid, { approval_channel: e.target.value }); updateWorkflowStep(eid, { description: `${e.target.value === 'email' ? 'Email' : 'WhatsApp'} · before posting` }); }}>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="email">Email</option>
                </select></div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  {(cfg.approval_channel || 'whatsapp') === 'email' ? 'Approver email' : 'Approver WhatsApp number'}
                </label>
                <input className={field} value={cfg.approval_to || ''} onChange={(e) => setCfg(eid, { approval_to: e.target.value })}
                  placeholder={(cfg.approval_channel || 'whatsapp') === 'email' ? 'you@company.com' : '+971500000000'} />
              </div>
              <p className="text-[11px] leading-snug text-muted-foreground">
                A draft nobody answers is released after 48 hours so the schedule keeps running —
                that slot is skipped, not posted.
              </p>
            </>);
          })()}

          {isAutopost && (() => {
            const eid = editingId!;
            const freq = cfg.frequency === 'daily' ? 'daily' : 'weekly';
            const days: number[] = Array.isArray(cfg.days) ? cfg.days : [1];
            const describe = (f: string, d: number[]) => {
              if (f === 'daily') return 'Daily · ' + (cfg.time || '09:00');
              const names = AUTOPOST_DAYS.filter((x) => d.includes(x.value)).map((x) => x.label);
              return (names.length ? names.join(', ') : 'no days') + ' · ' + (cfg.time || '09:00');
            };
            const toggleDay = (v: number) => {
              const next = days.includes(v) ? days.filter((x) => x !== v) : [...days, v];
              setCfg(eid, { days: next });
              updateWorkflowStep(eid, { description: describe(freq, next) });
            };
            return (<>
              <div className="rounded-md border border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30 px-3 py-2">
                <p className="text-[11px] text-sky-800 dark:text-sky-300">
                  Publishes the content from the <strong>LinkedIn content</strong> node to your own
                  feed on this schedule. Posts <strong>once per schedule</strong>, not once per lead.
                </p>
              </div>
              <div className="space-y-1"><label className="text-xs font-medium text-foreground">Post as</label>
                <select className={field} value={cfg.post_as || 'personal'} onChange={(e) => setCfg(eid, { post_as: e.target.value })}>
                  <option value="personal">My personal profile</option>
                  {liOrganizations.map((o) => <option key={o.id} value={o.id}>{o.name} (company page)</option>)}
                </select>
                {liOrganizations.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">No company pages found for this account — posting to your personal profile.</p>
                )}</div>

              <div className="space-y-1"><label className="text-xs font-medium text-foreground">How often</label>
                <select className={field} value={freq} onChange={(e) => { setCfg(eid, { frequency: e.target.value }); updateWorkflowStep(eid, { description: describe(e.target.value, days) }); }}>
                  {AUTOPOST_FREQUENCIES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select></div>

              {freq === 'weekly' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Days</label>
                  <div className="flex flex-wrap gap-1.5">
                    {AUTOPOST_DAYS.map((d) => (
                      <button key={d.value} type="button" onClick={() => toggleDay(d.value)}
                        className={`px-2.5 py-1 rounded-md border text-[12px] transition-colors ${
                          days.includes(d.value)
                            ? 'border-[#0b1957] bg-[#0b1957] text-white'
                            : 'border-border text-foreground hover:bg-muted/40'
                        }`}>{d.label}</button>
                    ))}
                  </div>
                  {days.length === 0 && <p className="text-[11px] text-amber-600">Pick at least one day, or it posts every day.</p>}
                </div>
              )}

              <div className="space-y-1"><label className="text-xs font-medium text-foreground">Time</label>
                <input type="time" className={field} value={cfg.time || '09:00'}
                  onChange={(e) => { setCfg(eid, { time: e.target.value }); updateWorkflowStep(eid, { description: describe(freq, days) }); }} />
                <p className="text-[11px] text-muted-foreground">Your local timezone. Posting stops when the campaign is paused or finishes.</p></div>

              {/* What this schedule actually means, in dates. */}
              {(() => {
                const next = nextAutopostRun(freq, days, cfg.time || '09:00');
                if (!next) {
                  return <p className="text-[11px] text-amber-600">This schedule never fires — check the days and time.</p>;
                }
                const hours = Math.round((next.getTime() - Date.now()) / 3600000);
                const away = hours < 1 ? 'in under an hour'
                  : hours < 24 ? `in about ${hours} hour${hours === 1 ? '' : 's'}`
                  : `in ${Math.round(hours / 24)} days`;
                const far = hours >= 48;
                return (
                  <div className={`rounded-md border px-3 py-2 ${far
                    ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30'
                    : 'border-border bg-muted/30'}`}>
                    <p className={`text-[11.5px] ${far ? 'text-amber-800 dark:text-amber-300' : 'text-foreground'}`}>
                      First post: <strong>{next.toLocaleString(undefined, {
                        weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
                      })}</strong> — {away}.
                    </p>
                    {far && (
                      <p className="text-[11px] text-amber-700/80 dark:text-amber-400/80 mt-0.5">
                        That time has already passed today, so the first post waits for the next matching day.
                      </p>
                    )}
                  </div>
                );
              })()}
            </>);

          })()}


          {isSplit && (() => {
            const eid = editingId!;
            const pct = Math.min(100, Math.max(0, parseInt(cfg.split_pct, 10) || 50));
            const setV = (k: 'a' | 'b', patch: any) => setCfg(eid, { [k]: { ...(cfg[k] || {}), ...patch } });
            const variant = (k: 'a' | 'b', label: string) => (
              <div className="rounded-lg border border-border p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-semibold text-foreground">Variant {label}</span>
                  <span className="text-[11px] text-muted-foreground">{k === 'a' ? pct : 100 - pct}% of leads</span>
                </div>
                <select className={field} value={(cfg[k] || {}).channel || 'linkedin'} onChange={(e) => setV(k, { channel: e.target.value })}>
                  {ROUTER_CHANNELS.filter((c) => c.value !== 'voice').map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                {((cfg[k] || {}).channel === 'email') && (
                  <input className={field} value={(cfg[k] || {}).subject || ''} onChange={(e) => setV(k, { subject: e.target.value })} placeholder="Subject" />
                )}
                <textarea className={`${field} min-h-[70px]`} value={(cfg[k] || {}).body || ''} onChange={(e) => setV(k, { body: e.target.value })}
                  placeholder={`Message for variant ${label}…`} />
              </div>
            );
            return (<>
              <div className="rounded-md border border-pink-200 bg-pink-50 dark:border-pink-900 dark:bg-pink-950/30 px-3 py-2">
                <p className="text-[11px] text-pink-800 dark:text-pink-300">
                  Randomly sends each lead <strong>one</strong> of two variants, so you can compare openers
                  in a single campaign. The assignment sticks — a lead never receives both.
                </p>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Split — {pct}% A / {100 - pct}% B</label>
                <input type="range" min={10} max={90} step={5} value={pct} className="w-full"
                  onChange={(e) => { setCfg(eid, { split_pct: parseInt(e.target.value, 10) }); updateWorkflowStep(eid, { description: `${e.target.value} / ${100 - parseInt(e.target.value, 10)}` }); }} />
              </div>
              {variant('a', 'A')}
              {variant('b', 'B')}
              <p className="text-[11px] leading-snug text-muted-foreground">
                Results show up per variant in campaign analytics (SPLIT_ASSIGNED records which one each lead got).
              </p>
            </>);
          })()}

          {isSetField && (() => {
            const eid = editingId!;
            const rows: any[] = Array.isArray(cfg.fields) ? cfg.fields : [{ key: '', value: '' }];
            const setRow = (i: number, patch: any) => setCfg(eid, { fields: rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)) });
            return (<>
              <div className="rounded-md border border-lime-200 bg-lime-50 dark:border-lime-900 dark:bg-lime-950/30 px-3 py-2">
                <p className="text-[11px] text-lime-800 dark:text-lime-300">
                  Writes values onto the lead. Pair it with <strong>Multi-condition</strong> to branch on
                  something you set yourself.
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Fields</label>
                {rows.map((r, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input className={`${field} flex-1`} value={r.key || ''} onChange={(e) => setRow(i, { key: e.target.value })} placeholder="field name" />
                    <input className={`${field} flex-1`} value={r.value || ''} onChange={(e) => setRow(i, { value: e.target.value })} placeholder="value or {{token}}" />
                    <button type="button" onClick={() => setCfg(eid, { fields: rows.filter((_, idx) => idx !== i) })}
                      className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setCfg(eid, { fields: [...rows, { key: '', value: '' }] })}
                  className="text-[12px] font-medium text-[#0b1957] dark:text-sky-300 hover:underline inline-flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Add field
                </button>
              </div>
              <div className="space-y-1"><label className="text-xs font-medium text-foreground">Tags</label>
                <input className={field} value={cfg.tags || ''} onChange={(e) => setCfg(eid, { tags: e.target.value })} placeholder="hot-lead, webinar — comma separated" />
                <p className="text-[11px] text-muted-foreground">Added to any tags the lead already has.</p></div>
            </>);
          })()}

          {isIgPost && (() => {
            const eid = editingId!;
            const isReel = cfg.media_type === 'reel';
            const days: number[] = Array.isArray(cfg.days) ? cfg.days : [1, 2, 3, 4, 5];
            const toggleDay = (d: number) => setCfg(eid, {
              days: days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort(),
            });
            return (<>
              <div className="rounded-md border border-pink-200 bg-pink-50 dark:border-pink-800 dark:bg-pink-950/30 px-3 py-2">
                <p className="text-[11px] text-pink-900 dark:text-pink-200">
                  Posts to <strong>your own Instagram account</strong> on a schedule — one post
                  per campaign, not one per lead.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Post type</label>
                <select className={field} value={cfg.media_type || 'image'}
                  onChange={(e) => setCfg(eid, { media_type: e.target.value })}>
                  <option value="image">Image post</option>
                  <option value="reel">Reel (video)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  {isReel ? 'Video URL' : 'Image URL'} <span className="text-red-600">*</span>
                </label>
                <input className={field} value={cfg.media_url || ''}
                  onChange={(e) => setCfg(eid, { media_url: e.target.value })}
                  placeholder={isReel ? 'https://…/video.mp4' : 'https://…/image.jpg'} />
                <p className="text-[11px] text-muted-foreground">
                  Instagram downloads this itself, so it has to be publicly reachable — a
                  private or expiring link fails while Instagram processes it, not when you save.
                </p>
              </div>

              {isReel && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Cover image URL (optional)</label>
                  <input className={field} value={cfg.cover_url || ''}
                    onChange={(e) => setCfg(eid, { cover_url: e.target.value })}
                    placeholder="https://…/cover.jpg" />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Caption</label>
                <textarea className={`${field} min-h-[90px] resize-y`} value={cfg.caption || ''}
                  onChange={(e) => setCfg(eid, { caption: e.target.value })}
                  placeholder="What this post is about…" />
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={!!cfg.ai_generate}
                  onChange={(e) => setCfg(eid, { ai_generate: e.target.checked })} />
                <span className="text-xs">
                  <span className="font-medium text-foreground">Write the caption with AI each time</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Grounded in your business profile. The caption above is used as the topic,
                    and as a fallback if generation fails.
                  </span>
                </span>
              </label>

              {isReel && (
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" className="mt-0.5" checked={cfg.share_to_feed !== false}
                    onChange={(e) => setCfg(eid, { share_to_feed: e.target.checked })} />
                  <span className="text-xs">
                    <span className="font-medium text-foreground">Also show on your profile grid</span>
                  </span>
                </label>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">How often</label>
                <select className={field} value={cfg.frequency || 'daily'}
                  onChange={(e) => setCfg(eid, { frequency: e.target.value })}>
                  <option value="daily">Every day</option>
                  <option value="weekly">Chosen days</option>
                </select>
              </div>

              {cfg.frequency === 'weekly' && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Days</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d, i) => (
                      <button key={d} type="button" onClick={() => toggleDay(i)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] transition-colors ${
                          days.includes(i)
                            ? 'border-pink-600 bg-pink-600 text-white'
                            : 'border-border text-muted-foreground hover:bg-muted/50'
                        }`}>{d}</button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Time</label>
                <input type="time" className={field} value={cfg.time || '10:00'}
                  onChange={(e) => setCfg(eid, { time: e.target.value })} />
              </div>

              <div className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 px-3 py-2">
                <p className="text-[11px] text-amber-900 dark:text-amber-200">
                  Instagram publishing needs Meta&apos;s approval for this app before it can post.
                  You can configure this now; it starts publishing once that is granted.
                </p>
              </div>
            </>);
          })()}

          {isReport && (() => {
            const eid = editingId!;
            const isCampaign = cfg.scope === 'campaign';
            const hasLanding = workflowPreview.some((x) => x.id === LANDING_STEP_ID);
            // Whether the earlier research steps that a per-lead report needs
            // are actually in this workflow. Without them the step fails at
            // runtime with "add a Research or Scrape step", so say it here.
            const hasResearch = workflowPreview.some((x) => x.id === RESEARCH_STEP_ID || x.id === SCRAPE_STEP_ID);
            return (<>
              <div className="rounded-md border border-teal-200 bg-teal-50 dark:border-teal-800 dark:bg-teal-950/30 px-3 py-2">
                <p className="text-[11px] text-teal-900 dark:text-teal-200">
                  Builds a PDF you can send as an attachment or offer as a download.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">What is it about?</label>
                <select className={field} value={cfg.scope || 'lead'}
                  onChange={(e) => setCfg(eid, { scope: e.target.value })}>
                  <option value="lead">Each lead&apos;s own company</option>
                  <option value="campaign">The campaign&apos;s industry</option>
                </select>
                <p className="text-[11px] text-muted-foreground">
                  {isCampaign
                    ? 'One report for the whole campaign. The same document for everyone, so it can be given away on a landing page.'
                    : 'A separate report per lead, written from their own website and research. More valuable, but personal to them.'}
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Report</label>
                <select className={field} value={cfg.report_type || 'growth_opportunity_audit'}
                  onChange={(e) => setCfg(eid, { report_type: e.target.value })}>
                  <option value="growth_opportunity_audit">Growth Opportunity Audit</option>
                  <option value="competitor_analysis">Competitor Analysis</option>
                  <option value="lead_conversion_assessment">Lead Conversion Assessment</option>
                  <option value="customer_experience_audit">Customer Experience Audit</option>
                  <option value="revenue_leakage_report">Revenue Leakage Report</option>
                  <option value="market_positioning_review">Market Positioning Review</option>
                  <option value="sales_process_review">Sales Process Review</option>
                  <option value="followup_effectiveness_audit">Follow-up Effectiveness Audit</option>
                  <option value="marketing_performance_snapshot">Marketing Performance Snapshot</option>
                  <option value="industry_benchmark_report">Industry Benchmark Report</option>
                </select>
              </div>

              {isCampaign && (
                <div className="space-y-1">
                  <label className="text-xs font-medium text-foreground">Industry</label>
                  <input className={field} value={cfg.industry || ''}
                    onChange={(e) => setCfg(eid, { industry: e.target.value })}
                    placeholder="e.g. freight forwarding in the UAE" />
                  <p className="text-[11px] text-muted-foreground">
                    Left blank, the industry from your contact source is used. A report that
                    would read the same for any sector is not worth sending.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Anything to add? (optional)</label>
                <textarea className={`${field} min-h-[70px] resize-y`} value={cfg.context || ''}
                  onChange={(e) => setCfg(eid, { context: e.target.value })}
                  placeholder="Angles you want covered, or things to avoid." />
              </div>

              {!isCampaign && (
                <>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input type="checkbox" className="mt-0.5" checked={!!cfg.email_now}
                      onChange={(e) => setCfg(eid, { email_now: e.target.checked })} />
                    <span className="text-xs">
                      <span className="font-medium text-foreground">Email it here, as an attachment</span>
                      <span className="block text-[11px] text-muted-foreground">
                        Otherwise it is saved and any later step can link it with{' '}
                        <code className="text-[10px]">{'{{report_url}}'}</code>.
                      </span>
                    </span>
                  </label>

                  {!hasResearch && (
                    <div className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 px-3 py-2">
                      <p className="text-[11px] text-amber-900 dark:text-amber-200">
                        Add a <strong>Research</strong> or <strong>Scrape</strong> step before this one.
                        A per-lead report is written from what those find; without them there is
                        nothing to write about and the step will fail rather than invent something.
                      </p>
                    </div>
                  )}
                </>
              )}

              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={cfg.require_approval !== false}
                  onChange={(e) => setCfg(eid, { require_approval: e.target.checked })} />
                <span className="text-xs">
                  <span className="font-medium text-foreground">Review it before it goes out</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Strongly recommended. You get a link to read the PDF, then approve or reject.
                    {isCampaign
                      ? ' Until approved, your landing page will not offer it.'
                      : ' Until approved, nothing is sent and no step can link it.'}
                  </span>
                </span>
              </label>

              {cfg.require_approval !== false && (
                <div className="space-y-2 pl-5">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">Send the review request by</label>
                    <select className={field} value={cfg.approval_channel || 'email'}
                      onChange={(e) => setCfg(eid, { approval_channel: e.target.value })}>
                      <option value="email">Email</option>
                      <option value="whatsapp">WhatsApp</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-foreground">
                      Who reviews it? <span className="text-red-600">*</span>
                    </label>
                    <input className={field} value={cfg.approval_to || ''}
                      onChange={(e) => setCfg(eid, { approval_to: e.target.value })}
                      placeholder={cfg.approval_channel === 'whatsapp' ? '+9715…' : 'you@yourcompany.com'} />
                    {!(cfg.approval_to || '').trim() && (
                      <p className="text-[11px] text-amber-700 dark:text-amber-400">
                        Needed to turn the review on. With nobody to ask, the report would wait
                        forever, so it will go out unreviewed instead.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* The rule: only the industry report can be given away publicly. */}
              <div className={`rounded-md border px-3 py-2 ${
                isCampaign
                  ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30'
                  : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50'
              }`}>
                <p className={`text-[11px] ${isCampaign ? 'text-emerald-900 dark:text-emerald-200' : 'text-slate-700 dark:text-slate-300'}`}>
                  {isCampaign
                    ? (hasLanding
                      ? 'Your landing page will offer this as a download once someone fills the form.'
                      : 'Add a Landing page node and this becomes a download people can fill a form to get.')
                    : 'A per-lead report cannot go on a landing page — one public URL is shared by every visitor, so there is no way to know whose report to show. Switch to the campaign industry for that.'}
                </p>
              </div>
            </>);
          })()}

          {isHumanTask && (() => {
            const eid = editingId!;
            const isWa = cfg.assignee_channel === 'whatsapp';
            return (<>
              <div className="rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 px-3 py-2">
                <p className="text-[11px] text-amber-900 dark:text-amber-200">
                  <strong>Pauses each lead here</strong> until a person confirms. Use it for work
                  Mr LAD cannot do itself — recording a video, building a deck, a judgement call.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Task name</label>
                <input className={field} value={cfg.title || ''}
                  onChange={(e) => setCfg(eid, { title: e.target.value })}
                  placeholder="e.g. Record a personalised video" />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">What needs doing?</label>
                <textarea className={`${field} min-h-[100px] resize-y`} value={cfg.instructions || ''}
                  onChange={(e) => setCfg(eid, { instructions: e.target.value })}
                  placeholder={'e.g. Record a 60-second video mentioning their recent funding round, upload it, and paste the link back.'} />
                <p className="text-[11px] text-muted-foreground">
                  Sent with the notification, so write it for whoever has to act on it.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Notify by</label>
                <select className={field} value={cfg.assignee_channel || 'email'}
                  onChange={(e) => setCfg(eid, { assignee_channel: e.target.value })}>
                  <option value="email">Email</option>
                  <option value="whatsapp">WhatsApp</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  {isWa ? 'WhatsApp number' : 'Email address'} <span className="text-red-600">*</span>
                </label>
                <input className={field} value={cfg.assignee_to || ''}
                  onChange={(e) => setCfg(eid, { assignee_to: e.target.value })}
                  placeholder={isWa ? '+9715…' : 'someone@yourcompany.com'} />
                <p className="text-[11px] text-muted-foreground">
                  They get a link to confirm — no Mr LAD login needed. Without someone to
                  notify, leads would wait here forever.
                </p>
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 px-3 py-2">
                <p className="text-[11px] text-slate-700 dark:text-slate-300">
                  Whatever they type when confirming is saved onto the lead, so later steps can
                  use it.
                </p>
              </div>
            </>);
          })()}

          {isLanding && (() => {
            const eid = editingId!;
            const fields: string[] = Array.isArray(cfg.capture_fields) && cfg.capture_fields.length
              ? cfg.capture_fields : ['name', 'email'];
            const toggleField = (f: string) => setCfg(eid, {
              capture_fields: fields.includes(f) ? fields.filter((x) => x !== f) : [...fields, f],
            });
            // Read the brief in the browser. A .txt/.md brief is just text, and
            // uploading it to parse it server-side would add an endpoint, a
            // storage object and a failure mode for no benefit.
            const readFile = async (file?: File | null) => {
              if (!file) return;
              if (file.size > 200 * 1024) {
                setError('That file is larger than 200 KB. Paste the relevant part instead.');
                return;
              }
              try {
                const text = await file.text();
                setCfg(eid, { brief: text.slice(0, 20000), source_file_name: file.name });
              } catch {
                setError('Could not read that file. Paste the content instead.');
              }
            };
            return (<>
              <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2">
                <p className="text-[11px] text-emerald-900 dark:text-emerald-200">
                  Builds <strong>one public page for this campaign</strong> (not one per lead).
                  The copy is written from your saved business profile and ICP, so describe
                  only what is specific to this page.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">What is this page for?</label>
                <textarea
                  className={`${field} min-h-[110px] resize-y`}
                  value={cfg.brief || ''}
                  onChange={(e) => setCfg(eid, { brief: e.target.value, source_file_name: undefined })}
                  placeholder={'e.g. A page for our corporate wellness package aimed at HR heads in Dubai. Mention the free pilot session and that sessions run on-site.'}
                />
                <p className="text-[11px] text-muted-foreground">
                  Your company name, what you sell, who you sell to and your logo are pulled
                  from your business profile automatically. Do not repeat them here.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Or upload a brief</label>
                <label className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-2 cursor-pointer hover:bg-muted/40">
                  <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground truncate">
                    {cfg.source_file_name || 'Choose a .txt or .md file'}
                  </span>
                  <input type="file" accept=".txt,.md,text/plain,text/markdown" className="hidden"
                    onChange={(e) => readFile(e.target.files?.[0])} />
                </label>
                <p className="text-[11px] text-muted-foreground">
                  The file is read here and its text fills the box above, so you can edit it before launching.
                </p>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">Goal (optional)</label>
                <input className={field} value={cfg.goal || ''}
                  onChange={(e) => setCfg(eid, { goal: e.target.value })}
                  placeholder="e.g. book a discovery call" />
              </div>

              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={cfg.capture_enabled !== false}
                  onChange={(e) => setCfg(eid, { capture_enabled: e.target.checked })} />
                <span className="text-xs">
                  <span className="font-medium text-foreground">Capture leads on the page</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Anyone who fills the form is added to this campaign and picked up by the
                    steps below. Turn this off and the button points at your booking link instead.
                  </span>
                </span>
              </label>

              {cfg.capture_enabled !== false && (
                <div className="space-y-1 pl-5">
                  <label className="text-xs font-medium text-foreground">Ask for</label>
                  <div className="flex flex-wrap gap-1.5">
                    {['name', 'email', 'phone', 'company', 'message'].map((f) => (
                      <button key={f} type="button" onClick={() => toggleField(f)}
                        className={`rounded-full border px-2.5 py-1 text-[11px] capitalize transition-colors ${
                          fields.includes(f)
                            ? 'border-emerald-600 bg-emerald-600 text-white'
                            : 'border-border text-muted-foreground hover:bg-muted/50'
                        }`}>{f}</button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Every extra field costs you conversions. Email alone is usually enough.
                  </p>
                </div>
              )}

              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" className="mt-0.5" checked={cfg.require_approval !== false}
                  onChange={(e) => setCfg(eid, { require_approval: e.target.checked })} />
                <span className="text-xs">
                  <span className="font-medium text-foreground">Review before it goes live</span>
                  <span className="block text-[11px] text-muted-foreground">
                    Strongly recommended. The page is written by AI and published on a public
                    URL under your brand.
                  </span>
                </span>
              </label>

              {/* Build it now and hand back a URL, so the copy can be judged
                  before committing to a launch. The content that comes back is
                  stored on the node and reused at launch, so the page that goes
                  live is the page that was reviewed. */}
              <div className="space-y-2">
                <button
                  type="button"
                  disabled={landingBusy || !(cfg.brief || '').trim()}
                  onClick={async () => {
                    setLandingErr(null);
                    setLandingBusy(true);
                    try {
                      const r = await fetchWithTenant('/api/campaigns/landing-page/preview', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          brief: cfg.brief || '',
                          goal: cfg.goal || '',
                          capture_enabled: cfg.capture_enabled !== false,
                          capture_fields: fields,
                        }),
                      });
                      const j = await r.json().catch(() => ({}));
                      if (!r.ok || !j?.url) throw new Error(j?.error || 'Could not build the preview.');
                      setCfg(eid, {
                        preview_url: j.url,
                        preview_content: j.content,
                        // Stored so launch can tell whether the brief changed
                        // after the preview was taken.
                        preview_brief: (cfg.brief || '').trim(),
                      });
                    } catch (err: any) {
                      setLandingErr(err?.message || 'Could not build the preview.');
                    } finally {
                      setLandingBusy(false);
                    }
                  }}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {landingBusy
                    ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Writing the page…</>)
                    : (<><Sparkles className="h-3.5 w-3.5" /> {cfg.preview_url ? 'Generate again' : 'Generate & preview'}</>)}
                </button>

                {!(cfg.brief || '').trim() && (
                  <p className="text-[11px] text-muted-foreground">Describe the page above first.</p>
                )}
                {landingErr && <p className="text-[11px] text-red-600">{landingErr}</p>}

                {cfg.preview_url && (
                  <div className="rounded-md border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30 px-3 py-2 space-y-1">
                    <a href={cfg.preview_url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-200 hover:underline break-all">
                      <ExternalLink className="h-3 w-3 flex-shrink-0" /> Open the preview
                    </a>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300">
                      {(cfg.preview_brief ?? '') === (cfg.brief || '').trim()
                        ? 'This exact page is what launches. The form is inactive until it is published.'
                        : 'You have edited the brief since this preview. Generate again, or launch and the page will be written afresh.'}
                    </p>
                  </div>
                )}
              </div>

              {savedLanding ? (() => {
                // Compare against what produced the LIVE page. Mirrors
                // hasInputChanges() on the backend, which is the real gate —
                // this only decides whether to offer the choice.
                const norm = (v: any) => String(v ?? '').trim();
                const sortedFields = (v: any) => (Array.isArray(v) ? [...v].sort().join(',') : '');
                const dirty =
                  norm(cfg.brief) !== norm(savedLanding.source_text) ||
                  (cfg.capture_enabled !== false) !== (savedLanding.capture_enabled !== false) ||
                  sortedFields(fields) !== sortedFields(savedLanding.capture_fields);
                const live = savedLanding.status === 'published';
                return (
                  <div className="space-y-2">
                    <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 px-3 py-2 space-y-1">
                      <p className="text-[11px] font-medium text-foreground">
                        {live ? 'This page is live' : `Current page: ${savedLanding.status}`}
                      </p>
                      {savedLanding.public_url && (
                        <a href={savedLanding.public_url} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline break-all">
                          <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          {savedLanding.public_url}
                        </a>
                      )}
                      {typeof savedLanding.submission_count === 'number' && (
                        <p className="text-[11px] text-muted-foreground">
                          {savedLanding.submission_count} lead{savedLanding.submission_count === 1 ? '' : 's'} captured so far
                        </p>
                      )}
                    </div>

                    {dirty ? (
                      <label className="flex items-start gap-2 cursor-pointer rounded-md border border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 px-3 py-2">
                        <input type="checkbox" className="mt-0.5" checked={!!cfg.regenerate}
                          onChange={(e) => setCfg(eid, { regenerate: e.target.checked })} />
                        <span className="text-xs">
                          <span className="font-medium text-amber-900 dark:text-amber-200">Rewrite the page with these changes</span>
                          <span className="block text-[11px] text-amber-800 dark:text-amber-300">
                            {cfg.regenerate
                              ? (live
                                ? 'The new copy needs approving before it replaces what is live. The current page keeps working until then.'
                                : 'The page will be written again and will need approving.')
                              : 'Leave this unticked and your edits are saved, but the existing page is left exactly as it is.'}
                          </span>
                        </span>
                      </label>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        Nothing about the page content has changed, so it will be left alone.
                      </p>
                    )}
                  </div>
                );
              })() : (
                <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 px-3 py-2">
                  <p className="text-[11px] text-slate-700 dark:text-slate-300">
                    The page is written when you launch, then appears here for review. Nothing is
                    published until you approve it.
                  </p>
                </div>
              )}
            </>);
          })()}

          {isHttp && (() => {
            const eid = editingId!;
            const hdrs: any[] = Array.isArray(cfg.headers) ? cfg.headers : [{ key: '', value: '' }];
            const setH = (i: number, patch: any) => setCfg(eid, { headers: hdrs.map((h, idx) => (idx === i ? { ...h, ...patch } : h)) });
            return (<>
              <div className="rounded-md border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50 px-3 py-2">
                <p className="text-[11px] text-slate-700 dark:text-slate-300">
                  Calls any API for each lead and stores the response on them, so a later
                  Multi-condition can branch on it. Use <code className="text-[10px]">{'{{first_name}}'}</code>-style
                  tokens anywhere below.
                </p>
              </div>
              <div className="flex gap-1.5">
                <select className={`${field} w-28`} value={cfg.method || 'POST'} onChange={(e) => setCfg(eid, { method: e.target.value })}>
                  {['POST', 'GET', 'PUT', 'PATCH', 'DELETE'].map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
                <input className={`${field} flex-1`} value={cfg.url || ''} onChange={(e) => { setCfg(eid, { url: e.target.value }); updateWorkflowStep(eid, { description: (e.target.value || 'Call any API').slice(0, 40) }); }}
                  placeholder="https://api.example.com/leads" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Headers</label>
                {hdrs.map((h, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <input className={`${field} flex-1`} value={h.key || ''} onChange={(e) => setH(i, { key: e.target.value })} placeholder="Authorization" />
                    <input className={`${field} flex-1`} value={h.value || ''} onChange={(e) => setH(i, { value: e.target.value })} placeholder="Bearer …" />
                    <button type="button" onClick={() => setCfg(eid, { headers: hdrs.filter((_, idx) => idx !== i) })}
                      className="h-8 w-8 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
                <button type="button" onClick={() => setCfg(eid, { headers: [...hdrs, { key: '', value: '' }] })}
                  className="text-[12px] font-medium text-[#0b1957] dark:text-sky-300 hover:underline inline-flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Add header
                </button>
              </div>
              {(cfg.method || 'POST') !== 'GET' && (
                <div className="space-y-1"><label className="text-xs font-medium text-foreground">Body</label>
                  <textarea className={`${field} min-h-[90px] font-mono text-[12px]`} value={cfg.body || ''} onChange={(e) => setCfg(eid, { body: e.target.value })}
                    placeholder={'{"email": "{{email}}", "company": "{{company_name}}"}'} /></div>
              )}
              <div className="space-y-1"><label className="text-xs font-medium text-foreground">Save response as</label>
                <input className={field} value={cfg.save_as || ''} onChange={(e) => setCfg(eid, { save_as: e.target.value })} placeholder="http_response" />
                <p className="text-[11px] text-muted-foreground">Stored on the lead under this name.</p></div>
              <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2">
                <p className="text-[11px] text-amber-800 dark:text-amber-300">
                  Public http/https addresses only — private, loopback and cloud-metadata hosts are refused.
                </p>
              </div>
            </>);
          })()}

          {isScrape && (<>
            <div className="rounded-md border border-sky-200 bg-sky-50 dark:border-sky-900 dark:bg-sky-950/30 px-3 py-2">
              <p className="text-[11px] text-sky-800 dark:text-sky-300">
                Reads each lead&apos;s company website and stores the page text on the lead, so later
                steps can reference something concrete. Runs before outreach.
              </p>
            </div>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Page to read</label>
              <input className={field} value={cfg.url || ''} onChange={(e) => setCfg(editingId!, { url: e.target.value })}
                placeholder="Leave blank to use each lead's own website" />
              <p className="text-[11px] text-muted-foreground">Blank = the lead&apos;s website field, else the domain from their work email. Free mailboxes (gmail, outlook…) are skipped.</p></div>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Characters to keep</label>
              <input type="number" className={field} value={cfg.max_chars ?? 1500}
                onChange={(e) => setCfg(editingId!, { max_chars: e.target.value })} min={200} max={5000} />
              <p className="text-[11px] text-muted-foreground">200-5000. Kept small so it doesn&apos;t bloat every later step.</p></div>
          </>)}

          {isResearch && (<>
            <div className="rounded-md border border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/30 px-3 py-2">
              <p className="text-[11px] text-indigo-800 dark:text-indigo-300">
                Finds the company&apos;s website, reads it, and runs an <strong>AI extraction</strong> into
                structured intel stored on the lead.
              </p>
            </div>
            <p className="text-[12px] text-muted-foreground leading-snug">
              Nothing to configure — the company name comes from each lead. Leads without a company are
              skipped automatically.
            </p>
            <div className="rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30 px-3 py-2">
              <p className="text-[11px] text-amber-800 dark:text-amber-300">
                Costs LLM credits per lead and takes several seconds each — best paired with a lead-scoring
                step so you only research leads worth the spend.
              </p>
            </div>
          </>)}

          {isScore && (<>
            <div className="rounded-md border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30 px-3 py-2">
              <p className="text-[11px] text-yellow-800 dark:text-yellow-300">
                Scores each lead <strong>0-100</strong> on buy intent (ICP fit + seniority + signals) and tags
                them <strong>hot / warm / cold</strong>. Free — no external calls.
              </p>
            </div>
            <p className="text-[12px] text-muted-foreground leading-snug">
              Add a Multi-condition node after this one and branch on <code className="text-[11px]">intent_band</code> to
              treat hot leads differently.
            </p>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Companies hiring (optional)</label>
              <input className={field} value={cfg.hiring_companies || ''} onChange={(e) => setCfg(editingId!, { hiring_companies: e.target.value })}
                placeholder="Acme, Globex — comma separated" /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Recently funded (optional)</label>
              <input className={field} value={cfg.funding_companies || ''} onChange={(e) => setCfg(editingId!, { funding_companies: e.target.value })}
                placeholder="Comma separated" /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Using a competitor (optional)</label>
              <input className={field} value={cfg.competitor_companies || ''} onChange={(e) => setCfg(editingId!, { competitor_companies: e.target.value })}
                placeholder="Comma separated" />
              <p className="text-[11px] text-muted-foreground">Leads at these companies score higher.</p></div>
          </>)}

          {isExport && (() => {
            const eid = editingId!;
            const dests: string[] = Array.isArray(cfg.destinations) ? cfg.destinations : ['file'];
            const cols: string[] = Array.isArray(cfg.columns) ? cfg.columns : EXPORT_DEFAULT_COLUMNS;
            const fmt = cfg.format || 'csv';
            const describe = (d: string[], f: string) => {
              const names = EXPORT_DESTINATIONS.filter((x) => d.includes(x.key)).map((x) => x.label);
              return `${String(f).toUpperCase()} · ${names.length ? names.join(' · ') : 'no destination'}`;
            };
            const toggleDest = (key: string) => {
              const next = dests.includes(key) ? dests.filter((k) => k !== key) : [...dests, key];
              setCfg(eid, { destinations: next });
              updateWorkflowStep(eid, { description: describe(next, fmt) });
            };
            const toggleCol = (value: string) => {
              const next = cols.includes(value) ? cols.filter((c) => c !== value) : [...cols, value];
              setCfg(eid, { columns: next });
            };
            const has = (k: string) => dests.includes(k);
            return (<>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">File format</label>
                <select className={field} value={fmt} onChange={(e) => { setCfg(eid, { format: e.target.value }); updateWorkflowStep(eid, { description: describe(dests, e.target.value) }); }}>
                  {EXPORT_FORMATS.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Where to send the results</label>
                {EXPORT_DESTINATIONS.map((o) => (
                  <label key={o.key} className="flex items-start gap-2.5 rounded-lg border border-border p-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                    <input type="checkbox" className="mt-0.5 h-4 w-4" checked={has(o.key)} onChange={() => toggleDest(o.key)} />
                    <span className="min-w-0">
                      <span className="block text-sm text-foreground">{o.label}</span>
                      <span className="block text-[11px] text-muted-foreground">{o.sub}</span>
                    </span>
                  </label>
                ))}
              </div>

              {/* Per-destination inputs — only shown for the ones selected. */}
              {has('email') && (
                <div className="space-y-1"><label className="text-xs font-medium text-foreground">Email to</label>
                  <input className={field} value={cfg.email_to || ''} onChange={(e) => setCfg(eid, { email_to: e.target.value })} placeholder="you@company.com" /></div>
              )}
              {has('whatsapp') && (
                <div className="space-y-1"><label className="text-xs font-medium text-foreground">WhatsApp number</label>
                  <input className={field} value={cfg.whatsapp_to || ''} onChange={(e) => setCfg(eid, { whatsapp_to: e.target.value })} placeholder="+971500000000" /></div>
              )}
              {has('webhook') && (
                <div className="space-y-1"><label className="text-xs font-medium text-foreground">Webhook URL</label>
                  <input className={field} value={cfg.webhook_url || ''} onChange={(e) => setCfg(eid, { webhook_url: e.target.value })} placeholder="https://hooks.example.com/…" /></div>
              )}
              {has('google_sheets') && (
                <div className="space-y-1"><label className="text-xs font-medium text-foreground">Google Sheet ID</label>
                  <input className={field} value={cfg.sheet_id || ''} onChange={(e) => setCfg(eid, { sheet_id: e.target.value })} placeholder="1AbC…xyz (from the sheet URL)" />
                  <p className="text-[11px] text-muted-foreground">Uses your connected Google account — the Sheets scope must be granted.</p></div>
              )}
              {has('slack') && (
                <div className="space-y-1"><label className="text-xs font-medium text-foreground">Slack incoming webhook</label>
                  <input className={field} value={cfg.slack_webhook_url || ''} onChange={(e) => setCfg(eid, { slack_webhook_url: e.target.value })} placeholder="https://hooks.slack.com/services/…" /></div>
              )}
              {has('cloud_storage') && (<>
                <div className="space-y-1"><label className="text-xs font-medium text-foreground">Bucket</label>
                  <input className={field} value={cfg.bucket || ''} onChange={(e) => setCfg(eid, { bucket: e.target.value })} placeholder="Leave blank for the default bucket" /></div>
                <div className="space-y-1"><label className="text-xs font-medium text-foreground">Folder prefix</label>
                  <input className={field} value={cfg.bucket_prefix || ''} onChange={(e) => setCfg(eid, { bucket_prefix: e.target.value })} placeholder="campaign-exports" /></div>
              </>)}

              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Columns to include</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {EXPORT_COLUMN_OPTIONS.map((c) => (
                    <label key={c.value} className="flex items-center gap-2 text-[12px] text-foreground cursor-pointer">
                      <input type="checkbox" className="h-3.5 w-3.5" checked={cols.includes(c.value)} onChange={() => toggleCol(c.value)} />
                      <span className="truncate">{c.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <label className="flex items-start gap-2.5 rounded-lg border border-border p-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
                <input type="checkbox" className="mt-0.5 h-4 w-4" checked={cfg.run_on_completion !== false}
                  onChange={(e) => setCfg(eid, { run_on_completion: e.target.checked })} />
                <span className="min-w-0">
                  <span className="block text-sm text-foreground">Export automatically when the campaign finishes</span>
                  <span className="block text-[11px] text-muted-foreground">You can also export any time from the campaign page.</span>
                </span>
              </label>

              {/* Execute now — proves the destinations work before launch. */}
              <div className="space-y-2 pt-1">
                <button type="button" onClick={runExportNow} disabled={exportRunning}
                  className="w-full rounded-md bg-[#0b1957] text-white text-sm font-medium py-2 disabled:opacity-60 flex items-center justify-center gap-2">
                  {exportRunning ? <><Loader2 className="h-4 w-4 animate-spin" /> Exporting…</> : <><Download className="h-4 w-4" /> Export now</>}
                </button>
                <p className="text-[11px] leading-snug text-muted-foreground">
                  {source === 'file_import'
                    ? 'Runs the export against the leads loaded above, so you can check the file and confirm your destinations work.'
                    : 'Sends a test export (no leads are loaded yet for this source) — useful to confirm the destination settings are valid.'}
                </p>
                {exportResult && (
                  <div className={`rounded-md border p-2.5 text-[11px] ${exportResult.success ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30' : 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30'}`}>
                    {exportResult.error && <p className="text-red-700 dark:text-red-300">{exportResult.error}</p>}
                    {typeof exportResult.count === 'number' && <p className="text-foreground font-medium">{exportResult.count} row{exportResult.count !== 1 ? 's' : ''} exported</p>}
                    {exportResult.results && Object.entries(exportResult.results).map(([k, v]: any) => (
                      <p key={k} className={v.ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-red-700 dark:text-red-300'}>
                        {v.ok ? '✓' : '✕'} {k}{v.error ? ` — ${v.error}` : ''}{v.skipped ? ` — ${v.skipped}` : ''}
                      </p>
                    ))}
                    {exportResult.file_url && (
                      <a href={exportResult.file_url} target="_blank" rel="noreferrer" className="inline-block mt-1 underline text-[#0b1957] dark:text-sky-300">Download file</a>
                    )}
                  </div>
                )}
              </div>
            </>);
          })()}

          {!isSource && (editingStep.type === 'linkedin_connect' || editingStep.type === 'linkedin_message') && (<>
            {/* Who is this actually going to? Built from the SOURCE node's
                targeting, because that is what decides who gets enrolled — this
                node only decides what they receive. Connection requests cannot
                be unsent, so seeing the people first is worth the extra call. */}
            {(() => {
              const sc = configs[SOURCE_STEP_ID] || {};
              const srcNode = workflowPreview.find((x) => x.id === SOURCE_STEP_ID);
              const parts = [sc.job_titles, sc.industries, sc.locations, sc.keywords]
                .map((v: any) => String(v || '').trim()).filter(Boolean);
              const query = parts.join(' ');
              // Only LinkedIn search targeting can be previewed. An imported
              // file or a CRM sync already has its people, so there is nothing
              // to search for and offering the button would just fail.
              // `source` is the SourceKey state, not the node's StepType — the
              // source node is always type 'lead_generation' regardless of
              // which kind of source was picked.
              const isSearchSource = source === 'linkedin_search';
              const reason = !srcNode
                ? 'Add a contact source first to see who this reaches.'
                : !isSearchSource
                  ? 'Only available when the source is a LinkedIn search.'
                  : !query
                    ? 'Set job titles or a location on the source node first.'
                    : null;
              return (
                <LeadPreviewPanel
                  query={query}
                  count={6}
                  disabledReason={reason}
                />
              );
            })()}

            {res.liTemplates.length > 0 && (
              <div className="space-y-1"><label className="text-xs font-medium text-foreground">LinkedIn template (optional)</label>
                <select className={field} value={cfg.linkedin_template_id || ''} onChange={(e) => {
                  const t = res.liTemplates.find((x: any) => String(x.id) === e.target.value);
                  setCfg(editingId!, { linkedin_template_id: e.target.value || undefined, message: t?.content ?? t?.message ?? cfg.message });
                }}>
                  <option value="">— None (write below / AI-drafted) —</option>
                  {res.liTemplates.map((t: any) => <option key={t.id} value={t.id}>{t.name || t.title || 'Template'}</option>)}
                </select></div>
            )}
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Message {editingStep.type === 'linkedin_connect' ? '(optional note)' : ''}</label>
              <textarea className={`${field} min-h-[90px]`} value={cfg.message || ''} onChange={(e) => { setCfg(editingId, { message: e.target.value }); updateWorkflowStep(editingId, { description: e.target.value.slice(0, 40) }); }}
                placeholder="Leave blank to let Mr LAD draft it" /></div>
          </>)}
          {!isSource && editingStep.type === 'linkedin_inmail' && (<>
            <div className="rounded-md border border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950/30 px-3 py-2">
              <p className="text-[11px] text-violet-700 dark:text-violet-300">
                InMail reaches prospects you are <strong>not connected to</strong>. Requires a Premium /
                Sales Navigator / Recruiter LinkedIn account and consumes one InMail credit per send.
              </p>
            </div>
            {res.liTemplates.length > 0 && (
              <div className="space-y-1"><label className="text-xs font-medium text-foreground">LinkedIn template (optional)</label>
                <select className={field} value={cfg.linkedin_template_id || ''} onChange={(e) => {
                  const t = res.liTemplates.find((x: any) => String(x.id) === e.target.value);
                  setCfg(editingId!, { linkedin_template_id: e.target.value || undefined, message: t?.content ?? t?.message ?? cfg.message });
                }}>
                  <option value="">— None (write below / AI-drafted) —</option>
                  {res.liTemplates.map((t: any) => <option key={t.id} value={t.id}>{t.name || t.title || 'Template'}</option>)}
                </select></div>
            )}
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Subject (optional)</label>
              <input className={field} value={cfg.subject || ''} onChange={(e) => setCfg(editingId!, { subject: e.target.value })}
                placeholder="e.g. Quick question about {{company_name}}" /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Message</label>
              <textarea className={`${field} min-h-[90px]`} value={cfg.message || ''} onChange={(e) => { setCfg(editingId!, { message: e.target.value }); updateWorkflowStep(editingId!, { description: e.target.value.slice(0, 40) }); }}
                placeholder="Hi {{first_name}}, I came across your profile…" /></div>
          </>)}
          {!isSource && editingStep.type === 'whatsapp_send' && (<>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">WhatsApp account</label>
              <select className={field} value={cfg.whatsapp_account_id || ''} onChange={(e) => setCfg(editingId!, { whatsapp_account_id: e.target.value || undefined })}>
                <option value="">— Default connected account —</option>
                {res.waAccounts.map((a: any) => <option key={a.id} value={a.id}>{a.slug || a.display_name || a.phone_number || a.id}</option>)}
              </select>
              {res.waAccounts.length === 0 && <p className="text-[11px] text-muted-foreground">No WhatsApp account connected — connect one in Settings.</p>}</div>
            {res.waTemplates.length > 0 && (
              <div className="space-y-1"><label className="text-xs font-medium text-foreground">Template (optional)</label>
                <select className={field} value={cfg.whatsapp_template_id || ''} onChange={(e) => {
                  const t = res.waTemplates.find((x: any) => String(x.id) === e.target.value);
                  setCfg(editingId!, { whatsapp_template_id: e.target.value || undefined, message: t?.content ?? t?.body ?? cfg.message });
                }}>
                  <option value="">— None (write below / AI-drafted) —</option>
                  {res.waTemplates.map((t: any) => <option key={t.id} value={t.id}>{t.name || t.title || 'Template'}</option>)}
                </select></div>
            )}
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Message</label>
              <textarea className={`${field} min-h-[90px]`} value={cfg.message || ''} onChange={(e) => { setCfg(editingId!, { message: e.target.value }); updateWorkflowStep(editingId!, { description: e.target.value.slice(0, 40) }); }}
                placeholder="Leave blank to let Mr LAD draft it" /></div>
          </>)}
          {!isSource && editingStep.type === 'email_send' && (<>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Send from</label>
              <select className={field} value={cfg.from_email || ''} onChange={(e) => {
                const s = res.emailSenders.find((x: any) => x.email === e.target.value);
                setCfg(editingId!, { from_email: e.target.value || undefined, email_provider: s?.provider || undefined });
              }}>
                <option value="">— Default connected account —</option>
                {res.emailSenders.map((s: any) => <option key={s.email} value={s.email}>{s.email}{s.provider ? ` (${s.provider})` : ''}</option>)}
              </select>
              {res.emailSenders.length === 0 && <p className="text-[11px] text-muted-foreground">No email account connected — connect Gmail/Outlook in Settings.</p>}</div>
            {res.emailTemplates.length > 0 && (
              <div className="space-y-1"><label className="text-xs font-medium text-foreground">Template (optional)</label>
                <select className={field} value={cfg.template_id || ''} onChange={(e) => {
                  const t = res.emailTemplates.find((x: any) => String(x.id) === e.target.value);
                  setCfg(editingId!, { template_id: e.target.value || undefined, subject: t?.subject ?? cfg.subject, body: t?.body ?? t?.content ?? cfg.body });
                }}>
                  <option value="">— None (write below / AI-drafted) —</option>
                  {res.emailTemplates.map((t: any) => <option key={t.id} value={t.id}>{t.name || t.title || 'Template'}</option>)}
                </select></div>
            )}
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Subject</label>
              <Input value={cfg.subject || ''} onChange={(e) => { setCfg(editingId, { subject: e.target.value }); updateWorkflowStep(editingId, { description: e.target.value.slice(0, 40) }); }} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Body</label>
              <textarea className={`${field} min-h-[110px]`} value={cfg.body || ''} onChange={(e) => setCfg(editingId, { body: e.target.value })} placeholder="Leave blank to let Mr LAD draft it" /></div>
            <label className="flex items-start gap-2.5 rounded-lg border border-border p-2.5 cursor-pointer hover:bg-muted/30 transition-colors">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={cfg.track_opens !== false}
                onChange={(e) => setCfg(editingId, { track_opens: e.target.checked })} />
              <span className="min-w-0">
                <span className="block text-sm text-foreground">Track email opens</span>
                <span className="block text-[11px] text-muted-foreground">Required for a &ldquo;Wait for condition → Email read&rdquo; step later in this workflow. Turn off for sensitive sends.</span>
              </span>
            </label>
          </>)}
          {!isSource && editingStep.type === 'voice_agent_call' && (<>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Calling number</label>
              <select className={field} value={cfg.from_number || ''} onChange={(e) => setCfg(editingId!, { from_number: e.target.value || undefined })}>
                <option value="">— Default number —</option>
                {res.voiceNumbers.map((n: any) => <option key={n.phone_number} value={n.phone_number}>{n.phone_number}</option>)}
              </select>
              {res.voiceNumbers.length === 0 && <p className="text-[11px] text-muted-foreground">No voice number configured.</p>}</div>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Voice agent</label>
              <select className={field} value={cfg.agent_id || ''} onChange={(e) => {
                const a = res.voiceAgents.find((x: any) => x.id === e.target.value);
                setCfg(editingId!, { agent_id: e.target.value || undefined, voice_id: a?.voice_id || undefined });
                updateWorkflowStep(editingId!, { description: a?.name || 'AI voice call' });
              }}>
                <option value="">— Select an agent —</option>
                {res.voiceAgents.map((a: any) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
              {res.voiceAgents.length === 0 && <p className="text-[11px] text-muted-foreground">No voice agent found — create one in the Voice playground.</p>}</div>
          </>)}
          {isRouter && (<>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Attempts before falling back (1–10)</label>
              <Input type="number" value={cfg.attempts || '3'} onChange={(e) => {
                setCfg(editingId, { attempts: e.target.value });
                updateWorkflowStep(editingId!, { description: `${Math.min(10, Math.max(1, parseInt(e.target.value, 10) || 3))} tries → ${ROUTER_CHANNELS.find((r) => r.value === (cfg.fallback_channel || 'email'))?.label}` });
              }} /></div>
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Fallback channel</label>
              <select className={field} value={cfg.fallback_channel || 'email'} onChange={(e) => {
                setCfg(editingId, { fallback_channel: e.target.value });
                updateWorkflowStep(editingId!, { description: `${cfg.attempts || 3} tries → ${ROUTER_CHANNELS.find((r) => r.value === e.target.value)?.label}` });
              }}>
                {ROUTER_CHANNELS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select></div>
            {(cfg.fallback_channel || 'email') === 'email' && (
              <div className="space-y-1"><label className="text-xs font-medium text-foreground">Fallback email subject</label>
                <Input value={cfg.subject || ''} onChange={(e) => setCfg(editingId, { subject: e.target.value })} placeholder="Blank = Mr LAD drafts it" /></div>
            )}
            {(cfg.fallback_channel || 'email') !== 'voice' && (
              <div className="space-y-1"><label className="text-xs font-medium text-foreground">Fallback message</label>
                <textarea className={`${field} min-h-[80px]`} value={cfg.message || ''} onChange={(e) => setCfg(editingId, { message: e.target.value })} placeholder="Blank = Mr LAD drafts it" /></div>
            )}
            <p className="text-xs text-muted-foreground">Guards the step placed right before it. If that step keeps failing (e.g. no resolvable LinkedIn profile), the pipeline stops retrying after the set attempts and switches to this channel instead. If it succeeds, the fallback is skipped.</p>
          </>)}

          {!isSource && !isRouter && editingStep.type === 'condition' && (
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Continue when…</label>
              <select className={field} value={cfg.condition || 'connection_accepted'} onChange={(e) => { setCfg(editingId, { condition: e.target.value }); updateWorkflowStep(editingId, { description: CONDITIONS.find((c) => c.value === e.target.value)?.label || '' }); }}>
                {CONDITIONS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select></div>
          )}
          {!isSource && !isMacro && editingStep.type !== 'condition' && (
            <div className="space-y-1"><label className="text-xs font-medium text-foreground">Delay before this step (days)</label>
              <Input type="number" className="w-24" value={cfg.delayDays || '0'} onChange={(e) => setCfg(editingId, { delayDays: e.target.value })} /></div>
          )}
        </div>
        <div className="p-3 border-t border-border bg-muted/20">
          <Button className="w-full" onClick={() => setEditingId(null)}>Done</Button>
        </div>
      </div>
    );
  };

  /** Test-run drawer: sample lead in, real artifacts out. */
  const renderTestPanel = () => {
    /** Nodes on the canvas whose step type the server will actually execute. */
    const runnable = workflowPreview.filter(
      (s) => s.type && TEST_RUNNABLE_TYPES.has(s.type),
    ).length
      + (workflowPreview.some((s) => s.id === LANDING_STEP_ID) ? 1 : 0)
      + (workflowPreview.some((s) => s.id === EXPORT_STEP_ID) ? 1 : 0);
    const LEAD_FIELDS: { key: string; label: string; placeholder: string }[] = [
      { key: 'first_name', label: 'First name', placeholder: 'Dana' },
      { key: 'last_name', label: 'Last name', placeholder: 'Reyes' },
      { key: 'title', label: 'Job title', placeholder: 'VP Operations' },
      { key: 'company', label: 'Company', placeholder: 'Trellis Freight' },
      { key: 'industry', label: 'Industry', placeholder: 'Logistics' },
      { key: 'location', label: 'Location', placeholder: 'Dubai, UAE' },
      { key: 'email', label: 'Email', placeholder: 'dana@trellisfreight.com' },
      { key: 'phone', label: 'Phone', placeholder: '+971 50 123 4567' },
    ];
    const tone: Record<TestStep['status'], string> = {
      ran: 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/60 dark:bg-emerald-950/20',
      skipped: 'border-border bg-muted/30',
      failed: 'border-amber-200 dark:border-amber-900 bg-amber-50/60 dark:bg-amber-950/20',
    };
    const badge: Record<TestStep['status'], string> = {
      ran: 'text-emerald-700 dark:text-emerald-400',
      skipped: 'text-muted-foreground',
      failed: 'text-amber-700 dark:text-amber-400',
    };
    // Pulled to the top of the results: the artifacts ARE the point of a test
    // run, and hunting for them inside a step list buries the thing the user
    // came to look at.
    const artifacts: TestArtifact[] = (testSteps || []).flatMap((s) => s.artifacts || []);
    return (
      <div className="absolute right-0 top-0 h-full w-[24rem] bg-card border-l border-border shadow-2xl z-10 flex flex-col">
        <div className="flex items-start gap-3 p-4 border-b border-border">
          <IconChip icon={<FlaskConical className="h-4 w-4 text-emerald-600" />} chip="bg-emerald-50 dark:bg-emerald-950/30" size="h-10 w-10" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">Test run</div>
            <div className="text-xs text-muted-foreground">One real run against one lead</div>
          </div>
          <button onClick={() => setTestOpen(false)} className="h-7 w-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 p-4 space-y-4 overflow-y-auto text-sm">
          <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-2.5 text-[12px] leading-relaxed text-emerald-900 dark:text-emerald-200 space-y-1.5">
            <p>
              Runs the research and content steps <strong>for real</strong> against one lead, so you can read
              what your Accelerator actually produces before you launch it.
            </p>
            <p>
              <strong>Nothing is sent to the prospect.</strong> Every message, connection request and call is
              skipped. Anything the Export step delivers goes to the addresses you put on that node — yours.
            </p>
            <p className="text-emerald-800/90 dark:text-emerald-300/90">
              This costs credits: live web research, AI-written reports and pages, and a real PDF render.
              Reports and pages publish to a temporary public link.
            </p>
          </div>

          {!runnable && !!workflowPreview.length && (
            <div className="rounded-lg border border-border bg-muted/30 p-2.5 text-[12px] leading-relaxed text-muted-foreground">
              Nothing in this workflow produces something to look at yet. A test run executes research,
              scraping, scoring, reports, landing pages and exports — add one of those and there will be an
              artifact to review.
            </div>
          )}

          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-xs font-semibold text-foreground">Sample lead</span>
              <button type="button" onClick={generateSampleLead} disabled={testSampling}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-border text-[11.5px] font-semibold text-muted-foreground hover:text-foreground hover:border-[#0b1957]/40 disabled:opacity-50 transition-colors">
                {testSampling ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {testSampling ? 'Generating…' : 'Generate for me'}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground mb-2 leading-snug">
              Use a real company you know, so you can judge whether the research and the report are any good.
              Or let Mr LAD invent someone who fits your targeting.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {LEAD_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground">{f.label}</label>
                  <Input value={testLead[f.key] || ''} placeholder={f.placeholder}
                    onChange={(e) => setTestLead((p) => ({ ...p, [f.key]: e.target.value }))} />
                </div>
              ))}
            </div>
          </div>

          {testError && (
            <div className="rounded-lg border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-2.5 text-[12px] text-amber-900 dark:text-amber-200">
              {testError}
            </div>
          )}

          {testSteps && (
            <div className="space-y-2">
              {!!artifacts.length && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/30 p-3 space-y-2">
                  <div className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                    What this run produced
                  </div>
                  {artifacts.map((a, i) => (
                    <a key={`${a.url}-${i}`} href={a.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 rounded-lg bg-card border border-border p-2 hover:border-[#0b1957]/40 transition-colors">
                      <span className="flex-shrink-0">{ARTIFACT_ICON[a.kind] || ARTIFACT_ICON.file}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-semibold text-foreground truncate">{a.label}</span>
                        <span className="block text-[10.5px] text-muted-foreground">{ARTIFACT_LABEL[a.kind] || 'File'}</span>
                      </span>
                      <ExternalLink className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    </a>
                  ))}
                  <p className="text-[10.5px] text-emerald-800/90 dark:text-emerald-300/90 leading-snug">
                    These are real, publicly reachable links, published as temporary previews. Launching
                    generates the customer-facing versions separately.
                  </p>
                </div>
              )}

              <div className="text-xs font-semibold text-foreground pt-1">Step by step</div>
              {testSteps.map((s, i) => (
                <div key={`${s.type}-${i}`} className={`rounded-xl border p-2.5 ${tone[s.status] || tone.skipped}`}>
                  <div className="flex items-center gap-2">
                    <span className="h-5 w-5 rounded-full bg-card border border-border text-[10px] font-bold text-muted-foreground flex items-center justify-center flex-shrink-0">{i + 1}</span>
                    <span className="text-[12.5px] font-semibold text-foreground flex-1 truncate">{s.title}</span>
                    <span className={`text-[9.5px] font-bold uppercase tracking-wider ${badge[s.status] || badge.skipped}`}>
                      {s.status === 'ran' ? 'Ran' : s.status === 'failed' ? 'Failed' : 'Skipped'}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug whitespace-pre-line">{s.detail}</p>
                  {!!s.artifacts?.length && (
                    <div className="mt-2 space-y-1">
                      {s.artifacts.map((a, j) => (
                        <a key={`${a.url}-${j}`} href={a.url} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#0b1957] dark:text-sky-400 hover:underline">
                          <ExternalLink className="h-3 w-3" /> {a.label}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <p className="text-[10.5px] text-muted-foreground leading-snug pt-1">
                Skipped steps are not a fault: outreach, follow-ups and paid contact enrichment are held back
                so a test can never reach the person you made up. They run normally once you launch.
              </p>
            </div>
          )}
        </div>

        <div className="p-3 border-t border-border bg-muted/20 space-y-1.5">
          <Button className="w-full" onClick={runTest} disabled={testRunning || !workflowPreview.length}>
            {testRunning ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Play className="h-4 w-4 mr-2" />}
            {testRunning ? 'Running…' : testSteps ? 'Run again' : 'Run for real'}
          </Button>
          {testRunning && (
            // Research, an LLM report and a PDF render, one after the other.
            // Without this the panel looks hung and people click away mid-run.
            <p className="text-[10.5px] text-muted-foreground text-center leading-snug">
              Researching, writing and rendering. This usually takes a minute or two.
            </p>
          )}
        </div>
      </div>
    );
  };

  /**
   * Suggested next node — a deterministic recommendation, not a live AI call,
   * so it can't be flaky about something adjacent to what gates Launch. Each
   * rule traces to a documented producer/consumer relationship already noted
   * in STEP_INSTRUCTIONS or the palette copy above (e.g. lead-score → Multi-
   * condition, AI Agent → LinkedIn). Purely a shortcut: every suggestion here
   * is also always pickable manually from the palette below, unchanged.
   */
  const suggestions = useMemo(() => {
    if (!source) return []; // "pick a source" is already section 1 of the palette
    type Suggestion = { key: string; label: string; sub: string; action: () => void; primary?: boolean };
    const hasId = (id: string) => workflowPreview.some((s) => s.id === id);
    const hasType = (t: StepType) => workflowPreview.some((s) => s.type === t);
    const hasOutreach = hasType('linkedin_connect') || hasType('email_send') || hasType('whatsapp_send') || hasType('voice_agent_call');
    const last = workflowPreview[workflowPreview.length - 1];
    const lastKey = !last ? 'source' : last.id === SOURCE_STEP_ID ? 'source' : (MACRO_STEP_IDS.includes(last.id) ? last.id : last.type);
    const out: Suggestion[] = [];
    switch (lastKey) {
      case 'source':
        if (!hasOutreach) {
          out.push({ key: 'linkedin_connect', label: 'Connection request', sub: 'Start LinkedIn outreach with a connect step', action: () => addOutreach('linkedin_connect'), primary: true });
          out.push({ key: 'email_send', label: 'Send email', sub: 'Or start an email sequence instead', action: () => addOutreach('email_send') });
        }
        if (!hasId(AI_STEP_ID)) out.push({ key: AI_STEP_ID, label: 'AI Agent', sub: 'Clean up messy imported titles/names first', action: addAiParse });
        break;
      case 'linkedin_connect':
        out.push({ key: 'linkedin_message', label: 'Message', sub: 'Sent once the connection is accepted', action: () => addOutreach('linkedin_message'), primary: true });
        break;
      case SCORE_STEP_ID:
        out.push({ key: MULTICOND_STEP_ID, label: 'Multi-condition', sub: 'Branch hot vs. cold leads by the score just computed', action: addMultiCond, primary: true });
        break;
      case SCRAPE_STEP_ID:
      case RESEARCH_STEP_ID:
      case AI_STEP_ID:
      case ENRICH_STEP_ID:
        if (!hasOutreach) out.push({ key: 'linkedin_connect', label: 'Connection request', sub: 'Start outreach now that lead data is ready', action: () => addOutreach('linkedin_connect'), primary: true });
        break;
      case 'linkedin_message':
      case 'email_send':
      case 'whatsapp_send':
      case 'voice_agent_call':
        if (!hasId(FOLLOWUP_STEP_ID)) out.push({ key: FOLLOWUP_STEP_ID, label: 'Follow-up sequence', sub: 'Automatic touches if there is no reply', action: addFollowup, primary: true });
        if (!hasId(EXPORT_STEP_ID)) out.push({ key: EXPORT_STEP_ID, label: 'Export results', sub: 'Send the final list to a file, sheet, or webhook', action: addExport });
        break;
      default:
        break;
    }
    return out;
  }, [workflowPreview, source]);

  return (
    <div className="h-full min-h-0 flex flex-col bg-[#F8F9FE] dark:bg-[#000724]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border bg-card flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onClose} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground" title="Close builder">
            <X className="h-4 w-4" /> Close
          </button>
          <span className="text-sm font-semibold text-foreground hidden sm:block">Custom Accelerator</span>
          <Input className="w-64" value={name} onChange={(e) => setName(e.target.value)} placeholder="Accelerator name…" />
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Leads/day</span><Input type="number" className="w-16 h-8" value={perDay} onChange={(e) => setPerDay(e.target.value)} />
            <span>Days</span><Input type="number" className="w-16 h-8" value={days} onChange={(e) => setDays(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => setTestOpen((v) => !v)} disabled={!workflowPreview.length || hydrating}
            title="Run the research and content steps for real against one lead. Costs credits. Nothing is sent to the prospect.">
            <FlaskConical className="h-4 w-4 mr-2" />
            Test run
          </Button>
          <Button variant="outline" onClick={saveAsStrategy} disabled={strategySaving || launching || hydrating}
            title="Save this pipeline so you can reuse it later without launching it now">
            {strategySaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Bookmark className="h-4 w-4 mr-2" />}
            Save as strategy
          </Button>
          <Button onClick={launch} disabled={launching || hydrating || sequenceIssues.length > 0}
            title={sequenceIssues.length ? sequenceIssues[0].message : undefined}>
            {(launching || hydrating) ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
            {hydrating ? 'Loading…' : editCampaignId ? 'Save changes' : 'Launch Accelerator'}
          </Button>
        </div>
      </div>
      {error && <div className="mx-4 mt-3 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">{error}</div>}
      {!error && sequenceIssues.length > 0 && (
        <div className="mx-4 mt-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/30 dark:border-amber-900 p-3 text-sm text-amber-900 dark:text-amber-200 flex items-start gap-2">
          <span className="flex-1">
            <strong className="font-semibold">Launch is disabled — fix the sequence first: </strong>
            {sequenceIssues[0].message}
            {sequenceIssues.length > 1 && ` (+${sequenceIssues.length - 1} more)`}
          </span>
          <button type="button" onClick={() => setEditingId(sequenceIssues[0].id)}
            className="flex-shrink-0 px-2.5 py-1 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-900 dark:text-amber-200 text-xs font-semibold hover:bg-amber-200 dark:hover:bg-amber-900 transition-colors">
            Fix it
          </button>
        </div>
      )}
      {strategyMsg && (
        <div className={`mx-4 mt-3 rounded-lg border p-3 text-sm flex items-start gap-2 ${
          strategyMsg.ok
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900 dark:text-emerald-200'
            : 'bg-amber-50 border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200'
        }`}>
          <span className="flex-1">{strategyMsg.text}</span>
          <button type="button" onClick={() => setStrategyMsg(null)} className="opacity-60 hover:opacity-100" aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="flex-1 flex min-h-0">
        {/* Palette */}
        {/* Column, not a plain scroller: the AI tab pins its composer to the
            bottom the way a chat does, so it owns its own scroll region. */}
        <div className="w-[19rem] border-r border-border bg-card flex flex-col min-h-0">
          {/* Tabs — Templates | Build with AI | Build from steps */}
          <div className="flex items-center gap-1 p-1 m-4 mb-0 flex-shrink-0 rounded-xl bg-muted/60 dark:bg-slate-800/60">
            {([['templates', 'Templates'], ['ai', 'Build with AI'], ['steps', 'From steps']] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setPaletteTab(k)}
                className={`flex-1 inline-flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[12px] font-semibold transition-all ${
                  paletteTab === k
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>
                {k === 'templates'
                  ? <Zap className="h-3.5 w-3.5 flex-shrink-0" />
                  : k === 'ai'
                    ? <Sparkles className="h-3.5 w-3.5 flex-shrink-0" />
                    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M4 6h16M4 12h10M4 18h13" /></svg>}
                {label}
              </button>
            ))}
          </div>

          {paletteTab === 'ai' && (
            <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col">
              {/* Resting state: a calm starting screen rather than a form. The
                  starters are real accelerators — each seeds the prompt with a
                  shape Mr LAD handles well, which the user then edits. */}
              {!aiQuestions.length && !aiResult && (
                <div className="flex-1 flex flex-col items-center justify-center text-center px-1">
                  <h2 className="font-serif text-[22px] leading-tight text-foreground">Start with a goal</h2>
                  <p className="text-[12.5px] text-muted-foreground mt-1.5 mb-6 leading-snug max-w-[15rem]">
                    Say who you want to reach and how. Mr LAD asks a few questions, then builds the pipeline.
                  </p>
                  <div className="w-full space-y-2">
                    {AI_STARTERS.map((s) => (
                      <button key={s.label} type="button"
                        onClick={() => {
                          setAiPrompt(s.prompt);
                          // Show the START of the seeded prompt, not wherever the
                          // textarea happened to scroll to, and put the caret at
                          // the front so the first [bracket] is what you edit.
                          requestAnimationFrame(() => {
                            const el = aiInputRef.current;
                            if (!el) return;
                            el.focus();
                            el.setSelectionRange(0, 0);
                            el.scrollTop = 0;
                          });
                        }}
                        className="w-full flex items-center gap-3 rounded-full border border-border bg-card px-2 py-2 text-left hover:border-[#0b1957]/40 hover:bg-muted/40 transition-colors">
                        <span className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0 ${s.chip}`}>
                          {s.icon}
                        </span>
                        <span className="text-[13px] font-medium text-foreground truncate">{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* The clarifying conversation: one question at a time. */}
              {!!aiQuestions.length && (() => {
                const q = aiQuestions[aiStep];
                if (!q) return null;
                const answered = aiQuestions.slice(0, aiStep).filter((x) => aiAnswers[x.id] !== undefined);
                const labelFor = (x: AiQuestion, v: any) => {
                  if (Array.isArray(v)) return v.map((one) => x.options?.find((o) => o.value === one)?.label || one).join(', ');
                  return x.options?.find((o) => o.value === v)?.label || String(v);
                };
                const multiSelected: string[] = Array.isArray(aiAnswers[q.id]) ? aiAnswers[q.id] : [];
                const toggleMulti = (v: string) => {
                  const next = multiSelected.includes(v) ? multiSelected.filter((x) => x !== v) : [...multiSelected, v];
                  setAiAnswers({ ...aiAnswers, [q.id]: next });
                };
                return (
                  <div className="space-y-3">
                    {/* What you asked for, and what has been settled so far. */}
                    <div className="rounded-xl bg-muted/50 dark:bg-slate-800/40 p-2.5">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">You asked for</div>
                      <p className="text-[12px] text-foreground leading-snug">{aiPrompt.trim()}</p>
                    </div>
                    {answered.map((x) => (
                      <div key={x.id} className="flex items-start gap-2 text-[11.5px]">
                        <svg className="text-emerald-600 flex-shrink-0 mt-0.5" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                        <span className="min-w-0 flex-1">
                          <span className="text-muted-foreground">{x.question}</span>{' '}
                          <span className="font-semibold text-foreground">{labelFor(x, aiAnswers[x.id]) || 'Mr LAD writes it'}</span>
                        </span>
                      </div>
                    ))}

                    <div className="rounded-2xl border border-[#0b1957]/30 bg-[#0b1957]/[0.03] dark:bg-[#0b1957]/[0.08] p-3">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#0b1957] dark:text-sky-300">
                          Question {aiStep + 1} of {aiQuestions.length}
                        </span>
                        <button type="button" onClick={resetAiChat}
                          className="text-[10.5px] font-semibold text-muted-foreground hover:text-foreground">Start over</button>
                      </div>
                      <p className="font-serif text-[16px] text-foreground leading-snug">{q.question}</p>
                      {q.help && <p className="text-[11px] text-muted-foreground mt-1 leading-snug">{q.help}</p>}

                      {q.type === 'choice' && (
                        <div className="mt-2.5 space-y-1.5">
                          {q.options?.map((o) => (
                            <button key={o.value} type="button" onClick={() => answerAiQuestion(o.value)} disabled={aiBuilding}
                              className={`w-full text-left border border-border bg-card px-3 py-2 hover:border-[#0b1957] hover:bg-[#0b1957]/[0.04] disabled:opacity-50 transition-all ${
                                o.hint ? 'rounded-2xl' : 'rounded-full'}`}>
                              <span className="block text-[12.5px] font-medium text-foreground">{o.label}</span>
                              {o.hint && <span className="block text-[10.5px] text-muted-foreground">{o.hint}</span>}
                            </button>
                          ))}
                          {/* Escape hatch, only where a typed answer is honoured. */}
                          {q.allowOther && (aiOtherFor === q.id ? (
                            <div className="rounded-2xl border border-[#0b1957] bg-card px-3 py-2.5 space-y-2">
                              {q.otherHelp && <p className="text-[10.5px] text-muted-foreground leading-snug">{q.otherHelp}</p>}
                              <input autoFocus value={aiText} onChange={(e) => setAiText(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && aiText.trim()) answerAiQuestion(aiText.trim()); }}
                                placeholder={q.otherPlaceholder || ''}
                                className="w-full rounded-full border border-input bg-background px-3 py-1.5 text-[12.5px] outline-none focus:border-[#0b1957]/40" />
                              <div className="flex items-center gap-1.5">
                                <button type="button" disabled={aiBuilding || !aiText.trim()}
                                  onClick={() => answerAiQuestion(aiText.trim())}
                                  className="flex-1 rounded-full bg-[#0b1957] text-white text-[12px] font-semibold py-1.5 hover:bg-[#0b1957]/90 disabled:opacity-40 transition-colors">
                                  Use this
                                </button>
                                <button type="button" onClick={() => { setAiOtherFor(null); setAiText(''); }}
                                  className="px-3 py-1.5 rounded-full border border-border text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                                  Back
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button type="button" onClick={() => { setAiOtherFor(q.id); setAiText(''); }} disabled={aiBuilding}
                              className="w-full text-left rounded-full border border-dashed border-border bg-transparent px-3 py-2 text-[12.5px] font-medium text-muted-foreground hover:text-foreground hover:border-[#0b1957]/40 disabled:opacity-50 transition-all">
                              {q.otherLabel || 'Something else…'}
                            </button>
                          ))}
                        </div>
                      )}

                      {q.type === 'multi' && (
                        <div className="mt-2.5 space-y-1.5">
                          {q.options?.map((o) => {
                            const on = multiSelected.includes(o.value);
                            return (
                              <button key={o.value} type="button" onClick={() => toggleMulti(o.value)}
                                className={`w-full text-left rounded-full border px-3 py-2 transition-all ${
                                  on ? 'border-[#0b1957] bg-[#0b1957]/[0.06]' : 'border-border bg-card hover:border-[#0b1957]/40'}`}>
                                <span className="flex items-center gap-2">
                                  <span className={`h-3.5 w-3.5 rounded border flex items-center justify-center flex-shrink-0 ${
                                    on ? 'bg-[#0b1957] border-[#0b1957]' : 'border-muted-foreground/40'}`}>
                                    {on && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>}
                                  </span>
                                  <span className="min-w-0">
                                    <span className="block text-[12.5px] font-semibold text-foreground">{o.label}</span>
                                    {o.hint && <span className="block text-[10.5px] text-muted-foreground">{o.hint}</span>}
                                  </span>
                                </span>
                              </button>
                            );
                          })}
                          <button type="button" disabled={aiBuilding || !multiSelected.length}
                            onClick={() => answerAiQuestion(multiSelected)}
                            className="w-full rounded-xl bg-[#0b1957] text-white text-[12.5px] font-semibold py-2 hover:bg-[#0b1957]/90 disabled:opacity-40 transition-colors">
                            Continue
                          </button>
                        </div>
                      )}

                      {(q.type === 'text' || q.type === 'longtext') && (
                        <div className="mt-2.5 space-y-1.5">
                          {q.type === 'longtext' ? (
                            <textarea value={aiText} onChange={(e) => setAiText(e.target.value)}
                              placeholder={q.placeholder || ''}
                              className="w-full min-h-[80px] rounded-xl border border-input bg-background px-2.5 py-2 text-[12.5px] outline-none focus:border-[#0b1957]/40 resize-y" />
                          ) : (
                            <input value={aiText} onChange={(e) => setAiText(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter' && aiText.trim()) answerAiQuestion(aiText.trim()); }}
                              placeholder={q.placeholder || ''}
                              className="w-full rounded-xl border border-input bg-background px-2.5 py-2 text-[12.5px] outline-none focus:border-[#0b1957]/40" />
                          )}
                          <div className="flex items-center gap-1.5">
                            <button type="button" disabled={aiBuilding || (!!q.required && !aiText.trim())}
                              onClick={() => answerAiQuestion(aiText.trim())}
                              className="flex-1 rounded-xl bg-[#0b1957] text-white text-[12.5px] font-semibold py-2 hover:bg-[#0b1957]/90 disabled:opacity-40 transition-colors">
                              Continue
                            </button>
                            {!q.required && (
                              <button type="button" onClick={skipAiQuestion} disabled={aiBuilding}
                                className="px-3 py-2 rounded-xl border border-border text-[12px] font-semibold text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors">
                                {q.skippable ? 'Let Mr LAD write it' : 'Skip'}
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {aiBuilding && (
                        <p className="text-[11px] text-muted-foreground mt-2 inline-flex items-center gap-1.5">
                          <Loader2 className="h-3 w-3 animate-spin" /> Building your workflow…
                        </p>
                      )}
                    </div>
                  </div>
                );
              })()}

              {aiError && (
                <div className="mt-3 rounded-xl border border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/30 p-3 text-[12px] text-amber-900 dark:text-amber-200">
                  {aiError}
                </div>
              )}

              {aiResult && (
                <div className="mt-3 rounded-xl border border-border bg-card p-3">
                  <div className="text-[13px] font-bold text-foreground">{aiResult.name}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-y-1.5" style={{ columnGap: 4 }}>
                    {aiResult.chain.map((c, i) => (
                      <Fragment key={i}>
                        {i > 0 && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
                        <span className="text-[10.5px] font-semibold px-2 py-[3px] rounded-full whitespace-nowrap bg-[#0b1957]/10 text-[#0b1957] dark:text-sky-300">{c}</span>
                      </Fragment>
                    ))}
                  </div>
                  {aiResult.notes && <p className="text-[11px] text-muted-foreground mt-2 leading-snug">{aiResult.notes}</p>}
                  <div className="flex items-center gap-1.5 mt-3">
                    <button type="button" onClick={() => setPaletteTab('steps')}
                      className="flex-1 rounded-full border border-border py-2 text-[12.5px] font-semibold text-muted-foreground hover:text-foreground hover:border-[#0b1957]/40 transition-colors">
                      Adjust the steps
                    </button>
                    <button type="button" onClick={() => { setAiResult(null); setAiPrompt(''); }}
                      className="px-3 py-2 rounded-full border border-border text-[12px] font-semibold text-muted-foreground hover:text-foreground transition-colors">
                      New
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Composer — pinned, like a chat. Hidden mid-conversation: the
                answer controls are the input at that point, and two places to
                type would be ambiguous. */}
            {!aiQuestions.length && (
              <div className="flex-shrink-0 border-t border-border p-3">
                <div className="rounded-2xl border border-input bg-muted/40 dark:bg-slate-800/40 focus-within:bg-background focus-within:border-[#0b1957]/40 transition-colors">
                  <textarea
                    ref={aiInputRef}
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); buildWithAi(); }
                    }}
                    rows={3}
                    placeholder="Describe the workflow you want…"
                    className="w-full max-h-[9rem] bg-transparent px-3 pt-2.5 pb-1 text-[13px] leading-snug outline-none resize-none overflow-y-auto placeholder:text-muted-foreground"
                  />
                  <div className="flex items-center justify-between px-2 pb-2">
                    <span className="text-[10px] text-muted-foreground pl-1">Enter to send</span>
                    <button type="button" onClick={buildWithAi} disabled={aiBuilding || !aiPrompt.trim()}
                      className="inline-flex items-center gap-1.5 rounded-full bg-[#0b1957] text-white text-[12px] font-semibold pl-2.5 pr-3 py-1.5 hover:bg-[#0b1957]/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                      {aiBuilding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {aiBuilding ? 'Thinking' : 'Build'}
                    </button>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 leading-snug text-center">
                  Nothing is launched or sent until you press Launch.
                </p>
              </div>
            )}
          </div>
          )}

          {paletteTab !== 'ai' && (
          <div className="flex-1 overflow-y-auto px-4 pt-4 pb-4 space-y-6">
          {paletteTab === 'templates' && (<>
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
              <input value={tplSearch} onChange={(e) => setTplSearch(e.target.value)} placeholder="Search templates…"
                className="w-full rounded-xl border border-input bg-muted/40 dark:bg-slate-800/40 pl-9 pr-3 py-2.5 text-[13px] outline-none focus:bg-background focus:border-[#0b1957]/40 transition-colors" />
            </div>

            <div>
              <div className="text-[15px] font-bold text-foreground">Start from a template</div>
              <p className="text-[12.5px] text-muted-foreground mt-0.5 mb-3">Builds the whole pipeline — then tune each node</p>

              <div className="space-y-2.5">
                {(() => {
                  const q = tplSearch.trim().toLowerCase();
                  const list = q
                    ? allTemplates.filter((t) =>
                        (t.name + ' ' + t.tagline + ' ' + t.chain.join(' ')).toLowerCase().includes(q))
                    : allTemplates;
                  if (!list.length) return (
                    <p className="text-[12.5px] text-muted-foreground py-6 text-center">No templates match “{tplSearch}”.</p>
                  );
                  // 13 templates is a lot for one flat list — split general
                  // pipelines from the industry-tuned ones.
                  const renderCard = (t: typeof WORKFLOW_TEMPLATES[number]) => {
                    const open = expandedTpl === t.key;
                    return (
                      <div key={t.key}
                        className={`rounded-2xl border bg-card transition-all ${
                          open ? 'border-[#0b1957]/40 shadow-[0_2px_16px_rgba(11,25,87,0.08)]' : 'border-border hover:border-[#0b1957]/25'
                        }`}>
                        <button type="button" onClick={() => setExpandedTpl(open ? null : t.key)}
                          className="w-full flex items-start gap-3 p-3 text-left">
                          <span className="h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${t.accent}14` }}>
                            <TemplateIcon tplKey={t.key} color={t.accent} size={18} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start gap-1.5 flex-wrap">
                              <span className="text-[14px] font-bold text-foreground leading-tight">{t.name}</span>
                              {t.badge && (
                                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md mt-0.5 ${
                                  t.badge.tone === 'violet'
                                    ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300'
                                    : 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300'
                                }`}>{t.badge.label}</span>
                              )}
                            </span>
                            <span className="block text-[12px] text-muted-foreground mt-1 leading-snug">{t.tagline}</span>
                          </span>
                          <span className="flex flex-col items-center flex-shrink-0 pl-1">
                            <span className="text-[15px] font-bold text-foreground leading-none">{t.nodes.length + 1}</span>
                            <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">Steps</span>
                          </span>
                          <svg className={`text-muted-foreground flex-shrink-0 mt-2.5 transition-transform ${open ? 'rotate-90' : ''}`}
                            width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="m9 18 6-6-6-6" /></svg>
                        </button>

                        {open && (
                          <div className="px-3 pb-3">
                            <div className="border-t border-border pt-3 flex flex-wrap items-center gap-y-1.5" style={{ columnGap: 4 }}>
                              {t.chain.map((c, i) => (
                                <Fragment key={i}>
                                  {i > 0 && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>}
                                  <span className="text-[10.5px] font-semibold px-2 py-[3px] rounded-full whitespace-nowrap"
                                    style={{ background: `${t.accent}12`, color: t.accent }}>{c}</span>
                                </Fragment>
                              ))}
                            </div>
                            <div className="flex items-center gap-3 mt-3">
                              <span className="inline-flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                                <strong className="font-semibold text-foreground">{t.meta.cycleDays}-day</strong> cycle
                              </span>
                              <span className="h-3 w-px bg-border" />
                              <span className="text-[11.5px] text-muted-foreground">
                                <strong className="font-semibold text-foreground">{t.meta.channels}</strong> channels
                              </span>
                              {t.category === 'strategy' && (
                                <button type="button"
                                  onClick={(e) => { e.stopPropagation(); setPublishingId(strategyIdFromKey(t.key)); }}
                                  className="ml-auto px-3 py-2 rounded-xl border border-border text-[12.5px] font-semibold text-muted-foreground hover:text-foreground hover:border-[#0b1957]/40 transition-colors">
                                  Share
                                </button>
                              )}
                              <button type="button" onClick={(e) => { e.stopPropagation(); setOverviewTpl(t.key); setEditingId(null); }}
                                className={`${t.category === 'strategy' ? '' : 'ml-auto '}px-3.5 py-2 rounded-xl bg-[#0b1957] text-white text-[12.5px] font-semibold hover:bg-[#0b1957]/90 transition-colors`}>
                                {t.category === 'community' ? 'Import' : 'Use template'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  };
                  const general = list.filter((t) => t.category === 'general');
                  const industry = list.filter((t) => t.category === 'industry');
                  const mine = list.filter((t) => t.category === 'strategy');
                  const community = list.filter((t) => t.category === 'community');
                  const heading = (label: string, count: number) => (
                    <div className="flex items-center gap-2 pt-1 pb-0.5">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
                      <span className="text-[10px] font-semibold text-muted-foreground/70">{count}</span>
                      <span className="flex-1 h-px bg-border" />
                    </div>
                  );
                  return (<>
                    {/* The tenant's own saved playbooks lead — they're the most
                        likely thing someone opening this panel is reaching for. */}
                    {mine.length > 0 && heading('My strategies', mine.length)}
                    {mine.map(renderCard)}
                    {community.length > 0 && heading('Community', community.length)}
                    {community.map(renderCard)}
                    {general.length > 0 && heading('General', general.length)}
                    {general.map(renderCard)}
                    {industry.length > 0 && heading('By industry', industry.length)}
                    {industry.map(renderCard)}
                  </>);
                })()}
              </div>

              <button type="button" onClick={() => setPaletteTab('steps')}
                className="mt-3 w-full rounded-2xl border border-dashed border-border hover:border-[#0b1957]/40 hover:bg-muted/40 py-3 text-[13px] font-semibold text-muted-foreground hover:text-foreground transition-colors inline-flex items-center justify-center gap-2">
                <Plus className="h-4 w-4" /> Or build from scratch with steps
              </button>
            </div>
          </>)}

          {paletteTab === 'steps' && (<>
          {/* Suggested next step — a shortcut, not a requirement. Every option
              here is also always pickable manually from the sections below. */}
          {suggestions.length > 0 && (
            <div className="rounded-2xl border border-dashed border-[#0b1957]/30 bg-[#0b1957]/[0.03] dark:bg-[#0b1957]/[0.08] p-3 space-y-2">
              <div className="flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-[#0b1957] dark:text-sky-300" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#0b1957] dark:text-sky-300">Suggested next step</span>
              </div>
              <div className="space-y-1.5">
                {suggestions.map((s) => (
                  <button key={s.key} type="button" onClick={s.action}
                    className={`w-full flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition-all ${
                      s.primary
                        ? 'border-[#0b1957] bg-card shadow-sm hover:bg-[#0b1957]/[0.04]'
                        : 'border-border bg-card/60 hover:border-[#0b1957]/30 hover:bg-muted/40'
                    }`}>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[12.5px] font-semibold text-foreground truncate">{s.label}</span>
                      <span className="block text-[11px] text-muted-foreground truncate">{s.sub}</span>
                    </span>
                    <Plus className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                  </button>
                ))}
              </div>
              <p className="text-[10.5px] text-muted-foreground leading-snug">Just a suggestion — pick any other step below instead if you&rsquo;d rather.</p>
            </div>
          )}
          {/* 1 · Contact source */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-5 w-5 rounded-full bg-[#0b1957] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">1</span>
              <span className="text-sm font-semibold text-foreground">Contact source</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2.5 ml-7">Where leads enter this Accelerator</p>
            <div className="space-y-2">
              {SOURCES.map((s) => {
                const active = source === s.key;
                return (
                  <button key={s.key} onClick={() => pickSource(s.key)}
                    className={`relative w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                      active
                        ? 'border-[#0b1957] bg-[#0b1957]/[0.04] shadow-sm ring-1 ring-[#0b1957]/20'
                        : 'border-border hover:border-[#0b1957]/30 hover:bg-muted/40'
                    }`}>
                    <IconChip icon={s.icon} chip={s.chip} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground truncate">{s.label}</span>
                        {s.recurring && (
                          <span className="text-[10px] font-bold uppercase tracking-wide text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 rounded-full px-1.5 py-0.5 flex-shrink-0">Daily</span>
                        )}
                      </span>
                      <span className="block text-xs text-muted-foreground truncate">{s.sub}</span>
                    </span>
                    {active && (
                      <span className="h-5 w-5 rounded-full bg-[#0b1957] flex items-center justify-center flex-shrink-0">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      </span>
                    )}
                  </button>
                );
              })}
              <div className="flex gap-2">
                {COMING_SOON.map((s) => (
                  <div key={s.label} className="flex-1 flex items-center gap-2 rounded-xl border border-dashed border-border px-2.5 py-2 opacity-60 min-w-0">
                    {s.icon}
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-foreground truncate">{s.label}</span>
                      <span className="block text-[10px] text-muted-foreground">Coming soon</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2 · Outreach steps, grouped by channel */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-5 w-5 rounded-full bg-[#0b1957] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">2</span>
              <span className="text-sm font-semibold text-foreground">Outreach steps</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2.5 ml-7">Click to add to the sequence</p>
            {['LinkedIn', 'Email', 'WhatsApp', 'Voice', 'Logic'].map((group) => (
              <div key={group} className="mb-2.5">
                <div className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/80 mb-1 ml-0.5">{group}</div>
                <div className="space-y-1">
                  {OUTREACH.filter((o) => o.group === group).map((o) => (
                    <button key={o.label} onClick={() => (o.router ? addRouter() : addOutreach(o.type))}
                      className="group w-full flex items-center gap-2.5 rounded-lg border border-border px-2.5 py-2 text-left hover:border-[#0b1957]/30 hover:bg-muted/40 transition-all">
                      <IconChip icon={o.icon} chip={o.chip} size="h-7 w-7" />
                      <span className="text-[13px] font-medium text-foreground truncate flex-1">{o.label}</span>
                      <span className="h-6 w-6 rounded-full border border-border text-muted-foreground group-hover:bg-[#0b1957] group-hover:border-[#0b1957] group-hover:text-white flex items-center justify-center transition-colors flex-shrink-0">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">Click a node on the canvas to configure it · hover a node and use ✕ to remove it.</p>
            {/* Branching — route each lead to a different message by a field. */}
            {(() => {
              const added = workflowPreview.some((s) => s.id === MULTICOND_STEP_ID);
              return (
                <button onClick={addMultiCond}
                  className={`mt-2 relative w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    added ? 'border-[#0b1957] bg-[#0b1957]/[0.04] shadow-sm ring-1 ring-[#0b1957]/20' : 'border-border hover:border-[#0b1957]/30 hover:bg-muted/40'
                  }`}>
                  <IconChip icon={<Split className="h-4 w-4 text-amber-600" />} chip="bg-amber-50 dark:bg-amber-950/30" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">Multi-condition</span>
                    <span className="block text-xs text-muted-foreground truncate">Route by tag / field → different message</span>
                  </span>
                  {added && (
                    <span className="h-5 w-5 rounded-full bg-[#0b1957] flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              );
            })()}
            {/* AI Agent — clean/normalise lead data before outreach. */}
            {(() => {
              const added = workflowPreview.some((s) => s.id === AI_STEP_ID);
              return (
                <button onClick={addAiParse}
                  className={`mt-2 relative w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    added ? 'border-[#0b1957] bg-[#0b1957]/[0.04] shadow-sm ring-1 ring-[#0b1957]/20' : 'border-border hover:border-[#0b1957]/30 hover:bg-muted/40'
                  }`}>
                  <IconChip icon={<Sparkles className="h-4 w-4 text-violet-600" />} chip="bg-violet-50 dark:bg-violet-950/30" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">AI Agent</span>
                    <span className="block text-xs text-muted-foreground truncate">Clean messy titles / names before LinkedIn</span>
                  </span>
                  {added && (
                    <span className="h-5 w-5 rounded-full bg-[#0b1957] flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              );
            })()}
            {/* Data enrichment — reveal email/phone via FullEnrich. */}
            {(() => {
              const added = workflowPreview.some((s) => s.id === ENRICH_STEP_ID);
              return (
                <button onClick={addDataEnrich}
                  className={`mt-2 relative w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    added ? 'border-[#0b1957] bg-[#0b1957]/[0.04] shadow-sm ring-1 ring-[#0b1957]/20' : 'border-border hover:border-[#0b1957]/30 hover:bg-muted/40'
                  }`}>
                  <IconChip icon={<Contact className="h-4 w-4 text-teal-600" />} chip="bg-teal-50 dark:bg-teal-950/30" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">Enrich contact</span>
                    <span className="block text-xs text-muted-foreground truncate">Reveal email &amp; phone (FullEnrich)</span>
                  </span>
                  {added && (
                    <span className="h-5 w-5 rounded-full bg-[#0b1957] flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              );
            })()}
            {/* Export results — ship the final result set to files / DB / channels. */}
            {(() => {
              const added = workflowPreview.some((s) => s.id === EXPORT_STEP_ID);
              return (
                <button onClick={addExport}
                  className={`mt-2 relative w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    added ? 'border-[#0b1957] bg-[#0b1957]/[0.04] shadow-sm ring-1 ring-[#0b1957]/20' : 'border-border hover:border-[#0b1957]/30 hover:bg-muted/40'
                  }`}>
                  <IconChip icon={<Download className="h-4 w-4 text-cyan-700" />} chip="bg-cyan-50 dark:bg-cyan-950/30" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">Export results</span>
                    <span className="block text-xs text-muted-foreground truncate">File · DB · Email · WhatsApp · more</span>
                  </span>
                  {added && (
                    <span className="h-5 w-5 rounded-full bg-[#0b1957] flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              );
            })()}
            {/* Instagram auto-post — one scheduled post per campaign. */}
            {(() => {
              const added = workflowPreview.some((s) => s.id === IG_AUTOPOST_STEP_ID);
              return (
                <button onClick={addInstagramPost}
                  className={`mt-2 relative w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    added ? 'border-[#0b1957] bg-[#0b1957]/[0.04] shadow-sm ring-1 ring-[#0b1957]/20' : 'border-border hover:border-[#0b1957]/30 hover:bg-muted/40'
                  }`}>
                  <IconChip icon={<Instagram className="h-4 w-4 text-pink-600" />} chip="bg-pink-50 dark:bg-pink-950/30" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">Instagram auto-post</span>
                    <span className="block text-xs text-muted-foreground truncate">Image or Reel · On a schedule</span>
                  </span>
                  {added && (
                    <span className="h-5 w-5 rounded-full bg-[#0b1957] flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              );
            })()}

            {/* Audit report — a PDF worth receiving. */}
            {(() => {
              const added = workflowPreview.some((s) => s.id === REPORT_STEP_ID);
              return (
                <button onClick={addReport}
                  className={`mt-2 relative w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    added ? 'border-[#0b1957] bg-[#0b1957]/[0.04] shadow-sm ring-1 ring-[#0b1957]/20' : 'border-border hover:border-[#0b1957]/30 hover:bg-muted/40'
                  }`}>
                  <IconChip icon={<FileText className="h-4 w-4 text-teal-700" />} chip="bg-teal-50 dark:bg-teal-950/30" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">Audit report</span>
                    <span className="block text-xs text-muted-foreground truncate">PDF · Attach or offer as a download</span>
                  </span>
                  {added && (
                    <span className="h-5 w-5 rounded-full bg-[#0b1957] flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              );
            })()}

            {/* Human task — the escape hatch for work Mr LAD cannot do. */}
            {(() => {
              const added = workflowPreview.some((s) => s.id === HUMAN_TASK_STEP_ID);
              return (
                <button onClick={addHumanTask}
                  className={`mt-2 relative w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    added ? 'border-[#0b1957] bg-[#0b1957]/[0.04] shadow-sm ring-1 ring-[#0b1957]/20' : 'border-border hover:border-[#0b1957]/30 hover:bg-muted/40'
                  }`}>
                  <IconChip icon={<UserCheck className="h-4 w-4 text-amber-600" />} chip="bg-amber-50 dark:bg-amber-950/30" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">Assign a human task</span>
                    <span className="block text-xs text-muted-foreground truncate">Pauses the lead until someone confirms</span>
                  </span>
                  {added && (
                    <span className="h-5 w-5 rounded-full bg-[#0b1957] flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              );
            })()}

            {/* Landing page — one public page for the whole campaign. */}
            {(() => {
              const added = workflowPreview.some((s) => s.id === LANDING_STEP_ID);
              return (
                <button onClick={addLandingPage}
                  className={`mt-2 relative w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    added ? 'border-[#0b1957] bg-[#0b1957]/[0.04] shadow-sm ring-1 ring-[#0b1957]/20' : 'border-border hover:border-[#0b1957]/30 hover:bg-muted/40'
                  }`}>
                  <IconChip icon={<LayoutTemplate className="h-4 w-4 text-emerald-700" />} chip="bg-emerald-50 dark:bg-emerald-950/30" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">Landing page</span>
                    <span className="block text-xs text-muted-foreground truncate">AI-written from your ICP · Captures leads</span>
                  </span>
                  {added && (
                    <span className="h-5 w-5 rounded-full bg-[#0b1957] flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              );
            })()}
            {/* Web intelligence — enrich each lead from the open web. */}
            {([
              { id: SCRAPE_STEP_ID, on: addWebScrape, icon: <Globe className="h-4 w-4 text-sky-600" />, chip: 'bg-sky-50 dark:bg-sky-950/30', label: 'Webpage scraper', sub: "Read the lead's website" },
              { id: RESEARCH_STEP_ID, on: addWebResearch, icon: <Telescope className="h-4 w-4 text-indigo-600" />, chip: 'bg-indigo-50 dark:bg-indigo-950/30', label: 'Web research', sub: 'AI company intel from the web' },
              { id: SCORE_STEP_ID, on: addLeadScore, icon: <Gauge className="h-4 w-4 text-yellow-600" />, chip: 'bg-yellow-50 dark:bg-yellow-950/30', label: 'Lead scoring', sub: 'Buy-intent 0-100 · hot/warm/cold' },
              { id: SPLIT_STEP_ID, on: addSplitTest, icon: <Shuffle className="h-4 w-4 text-pink-600" />, chip: 'bg-pink-50 dark:bg-pink-950/30', label: 'A/B split test', sub: 'Compare two openers' },
              { id: SETFIELD_STEP_ID, on: addSetField, icon: <PenLine className="h-4 w-4 text-lime-600" />, chip: 'bg-lime-50 dark:bg-lime-950/30', label: 'Set field', sub: 'Tag or write a value' },
              { id: HTTP_STEP_ID, on: addHttpRequest, icon: <Webhook className="h-4 w-4 text-slate-600" />, chip: 'bg-slate-100 dark:bg-slate-800/50', label: 'HTTP request', sub: 'Call any API per lead' },
              { id: CONTENT_STEP_ID, on: addLinkedInContent, icon: <PenTool className="h-4 w-4 text-violet-600" />, chip: 'bg-violet-50 dark:bg-violet-950/30', label: 'LinkedIn content', sub: 'Write or AI-generate the post' },
              { id: APPROVAL_STEP_ID, on: addPostApproval, icon: <ShieldCheck className="h-4 w-4 text-green-600" />, chip: 'bg-green-50 dark:bg-green-950/30', label: 'Approval', sub: 'Approve on WhatsApp before posting' },
            ]).map((b) => {
              const added2 = workflowPreview.some((s) => s.id === b.id);
              return (
                <button key={b.id} onClick={b.on}
                  className={`mt-2 relative w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    added2 ? 'border-[#0b1957] bg-[#0b1957]/[0.04] shadow-sm ring-1 ring-[#0b1957]/20' : 'border-border hover:border-[#0b1957]/30 hover:bg-muted/40'
                  }`}>
                  <IconChip icon={b.icon} chip={b.chip} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">{b.label}</span>
                    <span className="block text-xs text-muted-foreground truncate">{b.sub}</span>
                  </span>
                  {added2 && (
                    <span className="h-5 w-5 rounded-full bg-[#0b1957] flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              );
            })}
            {/* LinkedIn auto-post — recurring posts to the tenant's own feed. */}
            {(() => {
              const added = workflowPreview.some((s) => s.id === AUTOPOST_STEP_ID);
              return (
                <button onClick={addAutopost}
                  className={`mt-2 relative w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    added ? 'border-[#0b1957] bg-[#0b1957]/[0.04] shadow-sm ring-1 ring-[#0b1957]/20' : 'border-border hover:border-[#0b1957]/30 hover:bg-muted/40'
                  }`}>
                  <IconChip icon={<Megaphone className="h-4 w-4 text-[#0077B5]" />} chip="bg-sky-50 dark:bg-sky-950/30" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">LinkedIn auto-post</span>
                    <span className="block text-xs text-muted-foreground truncate">Recurring posts to your own feed</span>
                  </span>
                  {added && (
                    <span className="h-5 w-5 rounded-full bg-[#0b1957] flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              );
            })()}
          </div>

          {/* 3 · Follow-ups */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-5 w-5 rounded-full bg-[#0b1957] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">3</span>
              <span className="text-sm font-semibold text-foreground">Follow-ups</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2.5 ml-7">Automatic touch points after your outreach</p>
            {(() => {
              const added = workflowPreview.some((s) => s.id === FOLLOWUP_STEP_ID);
              return (
                <button onClick={addFollowup}
                  className={`relative w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    added ? 'border-[#0b1957] bg-[#0b1957]/[0.04] shadow-sm ring-1 ring-[#0b1957]/20' : 'border-border hover:border-[#0b1957]/30 hover:bg-muted/40'
                  }`}>
                  <IconChip icon={<ListOrdered className="h-4 w-4 text-indigo-600" />} chip="bg-indigo-50 dark:bg-indigo-950/30" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">Follow-up sequence</span>
                    <span className="block text-xs text-muted-foreground truncate">Touches · spacing · channel · human review</span>
                  </span>
                  {added && (
                    <span className="h-5 w-5 rounded-full bg-[#0b1957] flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              );
            })()}
          </div>

          {/* 4 · Analytics */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-5 w-5 rounded-full bg-[#0b1957] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">4</span>
              <span className="text-sm font-semibold text-foreground">Analytics</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2.5 ml-7">Campaign stats to your inbox or WhatsApp</p>
            {(() => {
              const added = workflowPreview.some((s) => s.id === ANALYTICS_STEP_ID);
              return (
                <button onClick={addAnalytics}
                  className={`relative w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    added ? 'border-[#0b1957] bg-[#0b1957]/[0.04] shadow-sm ring-1 ring-[#0b1957]/20' : 'border-border hover:border-[#0b1957]/30 hover:bg-muted/40'
                  }`}>
                  <IconChip icon={<BarChart3 className="h-4 w-4 text-cyan-600" />} chip="bg-cyan-50 dark:bg-cyan-950/30" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">Analytics report</span>
                    <span className="block text-xs text-muted-foreground truncate">Channel · frequency · data to send</span>
                  </span>
                  {added && (
                    <span className="h-5 w-5 rounded-full bg-[#0b1957] flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              );
            })()}
          </div>

          {/* ── 5. AI Media ───────────────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-5 w-5 rounded-full bg-[#0b1957] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">5</span>
              <span className="text-sm font-semibold text-foreground">AI Media</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2.5 ml-7">Generate a brand image or video to attach to outreach</p>
            {(() => {
              const added = workflowPreview.some((s) => s.id === MEDIA_STEP_ID);
              return (
                <button onClick={addMedia}
                  className={`relative w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    added ? 'border-[#0b1957] bg-[#0b1957]/[0.04] shadow-sm ring-1 ring-[#0b1957]/20' : 'border-border hover:border-[#0b1957]/30 hover:bg-muted/40'
                  }`}>
                  <IconChip icon={<Wand2 className="h-4 w-4 text-fuchsia-600" />} chip="bg-fuchsia-50 dark:bg-fuchsia-950/30" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">Generate media</span>
                    <span className="block text-xs text-muted-foreground truncate">Image / video · attaches to email &amp; WhatsApp</span>
                  </span>
                  {added && (
                    <span className="h-5 w-5 rounded-full bg-[#0b1957] flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              );
            })()}
          </div>

          {/* ── 6. Sync back to CRM ───────────────────────────────────────── */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="h-5 w-5 rounded-full bg-[#0b1957] text-white text-[11px] font-bold flex items-center justify-center flex-shrink-0">6</span>
              <span className="text-sm font-semibold text-foreground">Sync back to Zoho</span>
            </div>
            <p className="text-xs text-muted-foreground mb-2.5 ml-7">Write campaign data back onto the Zoho contact</p>
            {(() => {
              const added = workflowPreview.some((s) => s.id === ZOHO_UPDATE_STEP_ID);
              return (
                <button onClick={addZohoUpdate}
                  className={`relative w-full flex items-center gap-3 rounded-xl border p-3 text-left transition-all ${
                    added ? 'border-[#0b1957] bg-[#0b1957]/[0.04] shadow-sm ring-1 ring-[#0b1957]/20' : 'border-border hover:border-[#0b1957]/30 hover:bg-muted/40'
                  }`}>
                  <IconChip icon={<DatabaseZap className="h-4 w-4 text-red-600" />} chip="bg-red-50 dark:bg-red-950/30" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-foreground truncate">Update Zoho record</span>
                    <span className="block text-xs text-muted-foreground truncate">Map fields · write-back on completion</span>
                  </span>
                  {added && (
                    <span className="h-5 w-5 rounded-full bg-[#0b1957] flex items-center justify-center flex-shrink-0">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    </span>
                  )}
                </button>
              );
            })()}
          </div>
          </>)}
          </div>
          )}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative min-w-0">
          {workflowPreview.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Pick a contact source to start your workflow →
            </div>
          ) : (
            <ReactFlowProvider>
              <BuilderCanvas steps={workflowPreview} branches={mcBranches} switchId={MULTICOND_STEP_ID} />
            </ReactFlowProvider>
          )}
          {testOpen ? renderTestPanel() : overviewTpl ? renderTemplateOverview() : renderEditor()}
        </div>
      </div>

      {/* Step picker opened from a node's input/output "+". */}
      {renderInsertMenu()}

      {/* AI Media Studio (MAGe) — generate assets, then pick from the gallery. */}
      {showMediaStudio && (
        <MediaGenerationModal
          isOpen={showMediaStudio}
          onClose={() => { setShowMediaStudio(false); setMediaGalleryOpen(true); mediaBuilder.fetchGallery?.().catch(() => {}); }}
          // The builder is hosted in a fixed z-index:10000 overlay and the
          // dialog portals to <body>, so without these it opens BEHIND the
          // builder — invisible, and closed by the next click.
          className="z-[10050]"
          overlayClassName="z-[10040]"
        />
      )}

      {/* Publish confirmation — shows exactly what would leave this account. */}
      {publishingId && (
        <StrategyPublishDialog
          strategyId={publishingId}
          strategyName={ownStrategies.find((s) => s.id === publishingId)?.name}
          onClose={() => setPublishingId(null)}
          onPublished={() => setStrategyMsg({ ok: true, text: 'Submitted for review. It appears in the Community gallery once an admin approves it.' })}
        />
      )}
    </div>
  );
}

export default CustomWorkflowBuilder;
