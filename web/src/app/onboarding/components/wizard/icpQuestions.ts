// R8 Phase 3 redesign — terse, controlled question script for the wizard's
// ICP discovery step.
//
// Each question writes to ONE or BOTH of two destinations:
//
//   `apply`        → IcpStructured, persisted via createIcpDefinition() into
//                    icp_definitions. Drives the search dispatcher.
//   `applyProfile` → BusinessProfile, persisted via useBusinessProfile().save()
//                    into ai_icp_profiles.icp_data. Drives Settings → Business
//                    Profile, lead scoring, and message personalisation.
//
// Both are required: until R8.1 this step only wrote the first, so every
// ICP-half field in Settings → Business Profile stayed permanently blank even
// though the tenant had answered the question. Any NEW question must declare
// `applyProfile` if a canonical BusinessProfile key exists for it — otherwise
// the answer is invisible to every surface except the search dispatcher.

import type { IcpStructured, BusinessProfile } from '@lad/frontend-features/ai-icp-assistant';

export type QuestionType = 'chips' | 'pills' | 'range' | 'text';

export type AnswerValue = string | string[] | { min?: number; max?: number };

export interface IcpQuestion {
  id: string;
  prompt: string;
  /** Short helper shown under the prompt for ambiguous questions. */
  helper?: string;
  type: QuestionType;
  placeholder?: string;
  /** Marks a question the tenant can reasonably skip — surfaced in the UI. */
  optional?: boolean;
  /** For `pills` type — the fixed option list. */
  options?: Array<{ value: string; label: string }>;
  /** For `text` type — render a multi-line box instead of a single input. */
  multiline?: boolean;
  /** Which IcpStructured field this answer writes to. Omit for profile-only questions. */
  apply?: (value: AnswerValue, icp: IcpStructured) => IcpStructured;
  /**
   * Which BusinessProfile key(s) this answer writes to. Omit only when no
   * canonical key exists (e.g. seniorities, departments, channels — these live
   * in IcpStructured alone).
   */
  applyProfile?: (value: AnswerValue) => Partial<BusinessProfile>;
  /** Reads back the current answer from a partial ICP so we can pre-fill. */
  read?: (icp: IcpStructured) => AnswerValue | undefined;
}

const SENIORITY_OPTIONS = [
  { value: 'c_level',   label: 'C-Level' },
  { value: 'vp',        label: 'VP' },
  { value: 'director',  label: 'Director' },
  { value: 'head',      label: 'Head' },
  { value: 'manager',   label: 'Manager' },
  { value: 'senior_ic', label: 'Senior IC' },
  { value: 'ic',        label: 'IC' },
];

const CHANNEL_OPTIONS = [
  { value: 'linkedin',  label: 'LinkedIn' },
  { value: 'email',     label: 'Email' },
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'voice',     label: 'Voice' },
  { value: 'instagram', label: 'Instagram' },
];

// Mirrors the `campaignTone` radio options in the AI Playground system prompt
// (LAD_backend/features/ai-playground/migrations/*_seed_ai_playground_prompts.sql)
// so both discovery surfaces store the same vocabulary.
const TONE_OPTIONS = [
  { value: 'Consultative & Educational',   label: 'Consultative & Educational' },
  { value: 'Professional & Direct',        label: 'Professional & Direct' },
  { value: 'Friendly & Conversational',    label: 'Friendly & Conversational' },
  { value: 'Data-Driven & Analytical',     label: 'Data-Driven & Analytical' },
  { value: 'Storytelling & Empathy',       label: 'Storytelling & Empathy' },
];

// Same list the playground prompt offers for the `timezone` chips card.
const TIMEZONE_OPTIONS = [
  { value: 'GST (UTC+4)',     label: 'GST (UTC+4)' },
  { value: 'AST (UTC+3)',     label: 'AST (UTC+3)' },
  { value: 'IST (UTC+5:30)',  label: 'IST (UTC+5:30)' },
  { value: 'GMT (UTC+0)',     label: 'GMT (UTC+0)' },
  { value: 'CET (UTC+1)',     label: 'CET (UTC+1)' },
  { value: 'EST (UTC-5)',     label: 'EST (UTC-5)' },
  { value: 'PST (UTC-8)',     label: 'PST (UTC-8)' },
  { value: 'SGT (UTC+8)',     label: 'SGT (UTC+8)' },
  { value: 'AEST (UTC+10)',   label: 'AEST (UTC+10)' },
];

/** Chip/pill answers are stored as comma-joined strings in BusinessProfile. */
const joinList = (v: AnswerValue): string => (Array.isArray(v) ? v.join(', ') : String(v ?? ''));

/** Render an employee-count range the way the Settings form expects it. */
function formatSize(v: AnswerValue): string {
  if (Array.isArray(v) || typeof v === 'string') return String(v ?? '');
  const { min, max } = v || {};
  if (min != null && max != null) return `${min}–${max} employees`;
  if (min != null) return `${min}+ employees`;
  if (max != null) return `Up to ${max} employees`;
  return '';
}

export const ICP_QUESTIONS: IcpQuestion[] = [
  {
    id: 'companyDescription',
    prompt: 'How would you describe your company?',
    helper: 'A sentence or two — this grounds every message the agent writes.',
    type: 'text',
    multiline: true,
    placeholder: 'We help outbound sales teams in MENA run AI-driven LinkedIn and WhatsApp campaigns.',
    applyProfile: (v) => ({ companyDescription: String(v ?? '').trim() }),
  },
  {
    id: 'industries',
    prompt: 'Which industries?',
    helper: 'Comma-separate any number — e.g. Healthtech, B2B SaaS.',
    type: 'chips',
    placeholder: 'Healthtech, B2B SaaS',
    apply: (v, icp) => ({ ...icp, company: { ...icp.company, industries: v as string[] } }),
    read: (icp) => icp.company.industries,
  },
  {
    id: 'countries',
    prompt: 'Which countries?',
    helper: 'Where your buyers are based.',
    type: 'chips',
    placeholder: 'United Arab Emirates, Saudi Arabia',
    apply: (v, icp) => ({ ...icp, company: { ...icp.company, countries: v as string[] } }),
    // One answer fills both geo keys: `icpLocations` (buyer locations) and
    // `geographicFocus` (the tenant's focus regions). They are separately
    // editable in Settings, but asking twice is friction for no real signal.
    applyProfile: (v) => ({ icpLocations: joinList(v), geographicFocus: joinList(v) }),
    read: (icp) => icp.company.countries,
  },
  {
    id: 'size',
    prompt: 'Company size?',
    helper: 'Employee count range.',
    type: 'range',
    apply: (v, icp) => ({ ...icp, company: { ...icp.company, size_employees: v as { min?: number; max?: number } } }),
    applyProfile: (v) => ({ icpCompanySize: formatSize(v) }),
    read: (icp) => icp.company.size_employees,
  },
  {
    id: 'seniorities',
    prompt: 'Which seniorities?',
    helper: 'Pick all that apply.',
    type: 'pills',
    options: SENIORITY_OPTIONS,
    apply: (v, icp) => ({ ...icp, person: { ...icp.person, seniorities: v as string[] } }),
    read: (icp) => icp.person.seniorities,
  },
  {
    id: 'jobTitles',
    prompt: 'Job titles?',
    helper: 'Free text — partial matches are fine.',
    type: 'chips',
    placeholder: 'Head of Growth, VP Marketing',
    apply: (v, icp) => ({ ...icp, person: { ...icp.person, job_titles_includes: v as string[] } }),
    applyProfile: (v) => ({ icpJobTitles: joinList(v) }),
    read: (icp) => icp.person.job_titles_includes,
  },
  {
    id: 'departments',
    prompt: 'Departments?',
    helper: 'Skip if titles already capture this.',
    type: 'chips',
    placeholder: 'Marketing, Growth, Sales',
    optional: true,
    apply: (v, icp) => ({ ...icp, person: { ...icp.person, departments: v as string[] } }),
    read: (icp) => icp.person.departments,
  },
  {
    id: 'icpPainPoints',
    prompt: 'What problems do you solve for them?',
    helper: 'In their language, not yours — the agent opens with these.',
    type: 'text',
    multiline: true,
    placeholder: 'Reps spend hours on manual prospecting and follow-ups slip through the cracks.',
    applyProfile: (v) => ({ icpPainPoints: String(v ?? '').trim() }),
  },
  {
    id: 'campaignTone',
    prompt: 'What tone should outreach use?',
    helper: 'Sets the voice for every generated message.',
    type: 'pills',
    options: TONE_OPTIONS,
    // Single-select in spirit; if the tenant taps several we store them joined
    // rather than silently dropping the extras.
    applyProfile: (v) => ({ campaignTone: joinList(v) }),
  },
  {
    id: 'operatingHours',
    prompt: 'What are your operating hours?',
    helper: 'Used to time outreach and set reply expectations.',
    type: 'text',
    placeholder: '09:00 – 18:00',
    applyProfile: (v) => ({ operatingHours: String(v ?? '').trim() }),
  },
  {
    id: 'timezone',
    prompt: 'Which timezone?',
    type: 'pills',
    options: TIMEZONE_OPTIONS,
    applyProfile: (v) => ({ timezone: joinList(v) }),
  },
  {
    id: 'competitors',
    prompt: 'Who do you usually compete against?',
    helper: 'Optional — names help the AI position you.',
    type: 'chips',
    placeholder: 'Outreach, Lemlist',
    optional: true,
    applyProfile: (v) => ({ competitors: joinList(v) }),
  },
  {
    id: 'sampleConversation',
    prompt: 'Paste a sales conversation that worked.',
    helper: 'Optional — the strongest single input for message quality.',
    type: 'text',
    multiline: true,
    optional: true,
    placeholder: 'Them: we already use a tool for this…\nYou: totally — most teams do. What usually breaks is…',
    applyProfile: (v) => ({ sampleConversation: String(v ?? '').trim() }),
  },
  {
    id: 'channels',
    prompt: 'Preferred outreach channels?',
    helper: 'Pick where you want Mr LAD to reach prospects.',
    type: 'pills',
    options: CHANNEL_OPTIONS,
    apply: (v, icp) => ({
      ...icp,
      outreach_preferences: {
        ...icp.outreach_preferences,
        preferred_channels: v as IcpStructured['outreach_preferences'] extends infer P
          ? P extends { preferred_channels?: infer C } ? C : never
          : never,
      },
    }),
    read: (icp) => icp.outreach_preferences?.preferred_channels as string[] | undefined,
  },
];

export function emptyIcp(): IcpStructured {
  return {
    version: '1.0',
    company: {},
    person: {},
    outreach_preferences: {},
    fit_weights: {
      industry_match: 0.7,
      size_match: 0.5,
      seniority_match: 0.7,
      title_match: 0.8,
      geo_match: 0.6,
      tech_stack_match: 0.3,
    },
    // All three discovery backends enabled by default so the search dispatcher
    // has the widest possible reach out of the box. The tenant can disable
    // anything they don't want in the Review step.
    search_strategy: {
      discovery_order: ['apollo', 'sales_navigator', 'abm'],
      apollo:          { enabled: true, max_results_per_run: 500 },
      sales_navigator: { enabled: true, max_results_per_run: 200 },
      abm:             { enabled: true, target_accounts: [] },
    },
    metadata: { captured_at: new Date().toISOString() },
  };
}

export function parseChips(raw: string): string[] {
  return raw.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean);
}

export function parseRange(raw: string): { min?: number; max?: number } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const range = trimmed.match(/(\d{1,7})\s*[-–to]+\s*(\d{1,7})/i);
  if (range) return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  const plus = trimmed.match(/(\d{1,7})\s*\+/);
  if (plus) return { min: parseInt(plus[1], 10) };
  const single = trimmed.match(/^(\d{1,7})$/);
  if (single) {
    const n = parseInt(single[1], 10);
    return { min: n, max: n };
  }
  return null;
}
