// extractIcp.ts - Phase 4 of R8.
//
// Maps the chat's freeform `businessProfile` state object to the canonical
// `IcpStructured` shape that tenant_icp_definitions expects.
//
// The keys here mirror what advanced-search-ai/page.tsx initialises at
// ~line 726 (companyName, industry, website, icpJobTitles, icpCompanySize,
// icpLocations, icpPainPoints, geographicFocus, valueProposition, etc.).
//
// TODO(joint-session): The R8 handoff calls for a joint session to validate
// key names against real chat output before this ships. The mappings below are
// derived from reading the chat source, but if the backend playground rewrites
// keys or extracts additional structure, those should override what's here.
// See FRONTEND_HANDOFF_R8.md §5 and open question O1.

import type {
  IcpStructured,
  SearchStrategy,
} from '@lad/frontend-features/ai-icp-assistant';

/** Shape of `businessProfile` from advanced-search-ai/page.tsx:726. */
export interface BusinessProfile {
  companyName?: string;
  industry?: string;
  website?: string;
  companyDescription?: string;
  productsServices?: string;
  targetCustomers?: string;
  icpJobTitles?: string;
  icpCompanySize?: string;
  icpLocations?: string;
  icpPainPoints?: string;
  sampleConversation?: string;
  operatingHours?: string;
  timezone?: string;
  geographicFocus?: string;
  valueProposition?: string;
  competitors?: string;
  campaignTone?: string;
  // The playground may also surface extra extracted fields.
  [key: string]: string | undefined;
}

/**
 * Build a canonical IcpStructured from the chat's businessProfile object.
 * Falls back gracefully when fields are missing - every section is optional
 * by schema and downstream consumers handle partial ICPs.
 */
export function extractStructuredIcp(
  businessProfile: BusinessProfile,
  extractedData: Record<string, unknown> = {},
  sessionId?: string,
): IcpStructured {
  const industries = parseList(businessProfile.industry);
  const jobTitles = parseList(businessProfile.icpJobTitles);
  const locations = parseList(businessProfile.icpLocations ?? businessProfile.geographicFocus);
  const sizeRange = parseEmployeeRange(businessProfile.icpCompanySize);
  const targetAccounts = parseTargets(extractedData.target_accounts);

  return {
    version: '1.0',
    company: {
      industries,
      countries: locations,
      size_employees: sizeRange,
    },
    person: {
      job_titles_includes: jobTitles,
      seniorities: parseList(extractedData.seniorities as string | string[] | undefined),
      departments: parseList(extractedData.departments as string | string[] | undefined),
    },
    outreach_preferences: {
      preferred_channels: parseChannels(extractedData.preferred_channels),
    },
    fit_weights: extractedData.fit_weights as IcpStructured['fit_weights'] | undefined,
    search_strategy: inferSearchStrategy({ jobTitles, targetAccounts }),
    metadata: {
      captured_at: new Date().toISOString(),
      chat_session_id: sessionId,
      tenant_input_summary: summarise(businessProfile),
    },
  };
}

interface InferInput {
  jobTitles?: string[];
  targetAccounts?: SearchStrategy['abm'] extends infer A
    ? A extends { target_accounts?: infer T } ? T : undefined
    : undefined;
}

/**
 * Picks a search strategy based on which signals the chat captured.
 * Named accounts → ABM-first. Otherwise titles → Sales Nav first.
 * Otherwise → Apollo broad.
 */
export function inferSearchStrategy({
  jobTitles,
  targetAccounts,
}: InferInput): SearchStrategy {
  const hasTargets = !!(targetAccounts && targetAccounts.length > 0);
  const hasTitles = !!(jobTitles && jobTitles.length > 0);

  if (hasTargets) {
    return {
      discovery_order: ['abm', 'apollo'],
      abm: { enabled: true, target_accounts: targetAccounts },
      apollo: { enabled: true, max_results_per_run: 200 },
      sales_navigator: { enabled: false },
    };
  }

  if (hasTitles) {
    return {
      discovery_order: ['sales_navigator', 'apollo'],
      sales_navigator: { enabled: true, max_results_per_run: 200 },
      apollo: { enabled: true, max_results_per_run: 300 },
    };
  }

  return {
    discovery_order: ['apollo', 'sales_navigator'],
    apollo: { enabled: true, max_results_per_run: 500 },
    sales_navigator: { enabled: true, max_results_per_run: 100 },
  };
}

// ── parsers ─────────────────────────────────────────────────────────────

function parseList(v: unknown): string[] | undefined {
  if (!v) return undefined;
  if (Array.isArray(v)) return v.map(String).map((s) => s.trim()).filter(Boolean);
  if (typeof v === 'string') {
    const parts = v.split(/[,;]\s*/).map((s) => s.trim()).filter(Boolean);
    return parts.length ? parts : undefined;
  }
  return undefined;
}

function parseChannels(v: unknown): IcpStructured['outreach_preferences'] extends infer P
  ? P extends { preferred_channels?: infer C } ? C : undefined
  : undefined {
  const list = parseList(v);
  if (!list) return undefined as never;
  const valid = new Set(['linkedin', 'email', 'voice', 'whatsapp', 'instagram']);
  const filtered = list.map((s) => s.toLowerCase()).filter((s) => valid.has(s));
  return (filtered.length ? filtered : undefined) as never;
}

function parseEmployeeRange(v?: string): { min?: number; max?: number } | undefined {
  if (!v) return undefined;
  const trimmed = v.trim();
  if (!trimmed) return undefined;

  // Match "50-500", "50 to 500", "50-500"
  const range = trimmed.match(/(\d{1,7})\s*[--to]+\s*(\d{1,7})/i);
  if (range) {
    return { min: parseInt(range[1], 10), max: parseInt(range[2], 10) };
  }
  // Match "10+" → open ended
  const plus = trimmed.match(/(\d{1,7})\s*\+/);
  if (plus) return { min: parseInt(plus[1], 10) };
  // Match bare "200" → exact size
  const single = trimmed.match(/^(\d{1,7})$/);
  if (single) {
    const n = parseInt(single[1], 10);
    return { min: n, max: n };
  }
  return undefined;
}

function parseTargets(
  raw: unknown,
): Array<{ company_name: string; domain?: string }> | undefined {
  if (!raw) return undefined;
  if (!Array.isArray(raw)) return undefined;
  const out = raw
    .map((t) => {
      if (typeof t === 'string') return { company_name: t.trim() };
      if (t && typeof t === 'object' && 'company_name' in t) {
        return t as { company_name: string; domain?: string };
      }
      return null;
    })
    .filter((t): t is { company_name: string; domain?: string } => !!t && !!t.company_name);
  return out.length ? out : undefined;
}

function summarise(p: BusinessProfile): string | undefined {
  const parts: string[] = [];
  if (p.companyName) parts.push(p.companyName);
  if (p.valueProposition) parts.push(p.valueProposition);
  if (p.targetCustomers) parts.push(`Target: ${p.targetCustomers}`);
  if (!parts.length) return undefined;
  // Cap at 280 chars - this is for audit/debug, not the canonical record.
  const joined = parts.join(' · ');
  return joined.length > 280 ? `${joined.slice(0, 277)}…` : joined;
}
