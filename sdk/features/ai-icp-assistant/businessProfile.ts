/**
 * BusinessProfile - shared shape for the tenant's 14-field business profile.
 *
 * Persisted as a JSONB blob in `ai_icp_profiles.icp_data` via
 * GET/POST /api/ai-playground. Read by:
 *   - The "ICP Discovery" drawer in advanced-search-ai/page.tsx (chat)
 *   - The onboarding wizard's Company step (form)
 *   - Settings → Business Profile (form)
 *
 * This file is the SINGLE source of truth for the field list and the
 * completeness math. Anywhere that displays "X / 14 fields" must compute
 * it via `computeCompleteness()` so the three surfaces agree.
 *
 * NOTE: the chat also writes a few non-canonical keys (`linkedinUrl`,
 * `blogUrls`, `linkedinAudit`) onto the same JSONB blob. The type uses a
 * permissive index signature so those keys are preserved on round-trip
 * through the form-based surfaces - the form just doesn't render them.
 */

/** All fields the form surfaces edit. Additional keys may be present. */
export interface BusinessProfile {
  // Company half - collected by the wizard's Company step
  companyName?: string;
  industry?: string;
  website?: string;
  valueProposition?: string;
  productsServices?: string;
  targetCustomers?: string;
  // Tenant's own contact details - shared by the agent when a prospect asks
  // how to reach them, and baked into the generated LinkedIn prompt. Optional.
  contactEmail?: string;
  contactPhone?: string;
  // Agent identity + CTA link - the sender the LinkedIn agent speaks as, and the
  // booking link it offers. Feed the prompt generator directly (persona is
  // otherwise only collected in the mid-generation modal). Optional here so they
  // don't affect completeness; the generator still requires a persona at
  // generation time when absent.
  personaName?: string;
  personaTitle?: string;
  bookingLink?: string;

  // ICP half - collected by the wizard's ICP chat step
  companyDescription?: string;
  icpJobTitles?: string;
  icpCompanySize?: string;
  icpLocations?: string;
  icpPainPoints?: string;
  sampleConversation?: string;
  operatingHours?: string;
  timezone?: string;
  geographicFocus?: string;
  competitors?: string;
  campaignTone?: string;

  // ── Company basics ────────────────────────────────────────────────────────
  // Operational fields rendered by the "Company basics" card in Settings.
  // Declared here (rather than left to the index signature) so every surface
  // agrees on the key names, but deliberately OUTSIDE the canonical arrays so
  // they neither move the "X / 14" denominator nor get rendered a second time
  // as plain text inputs by the section-driven form.
  /** Free-text HQ location, e.g. "Dubai, UAE". */
  companyLocation?: string;
  /** Public URL of the uploaded logo (GCS). Written by the logo upload endpoint. */
  companyLogoUrl?: string;

  // ── Offer ─────────────────────────────────────────────────────────────────
  // What a persuasive page needs and the 14 canonical fields cannot supply.
  // The ICP half describes WHO the buyer is; these describe WHY they act - the
  // segments they fall into, what standing still costs them, the proof that the
  // claim is true, and who should walk away.
  //
  // Deliberately OUTSIDE the canonical arrays. Adding nine required fields would
  // drop every existing tenant from 14/14 to 14/23 with no change on their part,
  // across all three surfaces. They get their own denominator instead - see
  // BUSINESS_PROFILE_OFFER_HALF and computeOfferCompleteness().
  //
  // Consumed by LandingPageContentService (grounding for the generated page) and
  // available to the lead-report generator for the same reason.

  /** 2-4 distinct buyer profiles, one per line. Drives the audience section. */
  icpSegments?: string;
  /** What it costs the buyer to change nothing. Drives the symptoms section. */
  costOfInaction?: string;
  /** The questions the tenant asks on a real sales call, one per line. */
  discoveryQuestions?: string;
  /** What actually happens after someone signs. Drives the how-it-works steps. */
  deliveryProcess?: string;
  /**
   * Substantiable outcomes - the ONLY sanctioned source of a number on a page.
   * The generator is forbidden from inventing statistics, so with this empty a
   * page carries no figures at all. That is the intended failure mode.
   */
  proofPoints?: string;
  /** Who should not buy. A real disqualifier reads as confidence, not modesty. */
  notAGoodFit?: string;
  /** Objections heard in the field, so the FAQ answers real doubts. */
  commonObjections?: string;
  /** Why this tenant over the alternative the buyer is actually considering. */
  differentiators?: string;
  /** Guarantee or risk reversal, if one is genuinely offered. */
  guarantee?: string;

  /**
   * Allow non-canonical extras the chat may add (linkedinUrl, blogUrls,
   * linkedinAudit, etc.) to round-trip through the form surfaces without
   * being dropped on save.
   */
  [extraKey: string]: string | undefined | unknown;
}

/**
 * Company-basics keys - persisted in the same `icp_data` blob but excluded
 * from the canonical field list (and therefore from completeness math).
 */
export const BUSINESS_PROFILE_BASICS_FIELDS: ReadonlyArray<keyof BusinessProfile> = [
  'companyLocation',
  'companyLogoUrl',
];

/**
 * Optional fields excluded from the completeness denominator.
 * Match advanced-search-ai/page.tsx:4489 - these are supplementary, not
 * required for the core conversation flow.
 */
export const BUSINESS_PROFILE_OPTIONAL_FIELDS: ReadonlySet<keyof BusinessProfile> = new Set([
  'website',
  'sampleConversation',
  'competitors',
  // Contact details are optional - the agent can hand off to the team when they
  // are absent - so they don't count against the completeness denominator.
  'contactEmail',
  'contactPhone',
  // Persona + booking link feed the generator but are collected at generation
  // time when absent, so they don't count against completeness either.
  'personaName',
  'personaTitle',
  'bookingLink',
]);

/** Fields collected by the wizard's Company step (form). */
export const BUSINESS_PROFILE_COMPANY_HALF: ReadonlyArray<keyof BusinessProfile> = [
  'companyName',
  'industry',
  'website',
  'valueProposition',
  'productsServices',
  'targetCustomers',
  'personaName',
  'personaTitle',
  'bookingLink',
  'contactEmail',
  'contactPhone',
];

/** Fields collected by the wizard's ICP chat step. */
export const BUSINESS_PROFILE_ICP_HALF: ReadonlyArray<keyof BusinessProfile> = [
  'companyDescription',
  'icpJobTitles',
  'icpCompanySize',
  'icpLocations',
  'icpPainPoints',
  'sampleConversation',
  'operatingHours',
  'timezone',
  'geographicFocus',
  'competitors',
  'campaignTone',
];

/**
 * Offer fields - grounding for generated pages and reports.
 *
 * NOT part of BUSINESS_PROFILE_ALL_FIELDS, and therefore not part of the "X / 14"
 * math. They carry their own meter via computeOfferCompleteness() so a tenant who
 * never generates a landing page is never told their profile is incomplete.
 */
export const BUSINESS_PROFILE_OFFER_HALF: ReadonlyArray<keyof BusinessProfile> = [
  'icpSegments',
  'costOfInaction',
  'discoveryQuestions',
  'deliveryProcess',
  'proofPoints',
  'notAGoodFit',
  'commonObjections',
  'differentiators',
  'guarantee',
];

/** Full canonical list (company half ∪ ICP half). */
export const BUSINESS_PROFILE_ALL_FIELDS: ReadonlyArray<keyof BusinessProfile> = [
  ...BUSINESS_PROFILE_COMPANY_HALF,
  ...BUSINESS_PROFILE_ICP_HALF,
];

/** Empty profile with every canonical key initialised to ''. */
export function emptyBusinessProfile(): BusinessProfile {
  const empty: BusinessProfile = {};
  for (const k of BUSINESS_PROFILE_ALL_FIELDS) {
    (empty as Record<string, string>)[k as string] = '';
  }
  return empty;
}

export interface BusinessProfileCompleteness {
  /** How many of the non-optional canonical fields are filled. */
  filled: number;
  /** Always the count of non-optional canonical fields. */
  total: number;
  /** Math.round(100 * filled / total). 0 when total is 0. */
  pct: number;
}

/**
 * Compute completeness over the non-optional canonical fields.
 *
 * "Filled" matches the rule at advanced-search-ai/page.tsx:4495  - 
 * a truthy string value (so `''`, `undefined`, and `null` all count as empty).
 * Whitespace-only strings count as empty too, since the chat trims input.
 */
export function computeCompleteness(profile: BusinessProfile | null | undefined): BusinessProfileCompleteness {
  const required = BUSINESS_PROFILE_ALL_FIELDS.filter(
    (k) => !BUSINESS_PROFILE_OPTIONAL_FIELDS.has(k),
  );
  const total = required.length;
  if (!profile || total === 0) {
    return { filled: 0, total, pct: 0 };
  }
  let filled = 0;
  for (const k of required) {
    const v = (profile as Record<string, unknown>)[k as string];
    if (typeof v === 'string' && v.trim().length > 0) {
      filled += 1;
    }
  }
  const pct = Math.round((filled / total) * 100);
  return { filled, total, pct };
}

/**
 * Compute completeness over the offer fields.
 *
 * Separate denominator, deliberately. A tenant running LinkedIn outreach and
 * nothing else has a complete profile at 14/14 and should not be nagged about
 * fields that only a generated page or report consumes. Surfaces that show this
 * should label it for what it is ("Offer 4/9"), never fold it into the 14.
 *
 * Every offer field counts - none is optional within its own group, since a page
 * section is simply omitted when its field is blank.
 */
export function computeOfferCompleteness(
  profile: BusinessProfile | null | undefined,
): BusinessProfileCompleteness {
  const total = BUSINESS_PROFILE_OFFER_HALF.length;
  if (!profile || total === 0) {
    return { filled: 0, total, pct: 0 };
  }
  let filled = 0;
  for (const k of BUSINESS_PROFILE_OFFER_HALF) {
    const v = (profile as Record<string, unknown>)[k as string];
    if (typeof v === 'string' && v.trim().length > 0) {
      filled += 1;
    }
  }
  return { filled, total, pct: Math.round((filled / total) * 100) };
}
