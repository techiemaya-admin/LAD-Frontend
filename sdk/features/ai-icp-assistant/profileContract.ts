/**
 * Profile contract — WHICH fields the Business Profile has for THIS tenant.
 *
 * The backend resolves it from the tenant's industry pack
 * (GET /api/ai-playground/contract, core/entitlements/profilePack.js): a
 * vertical may add fields, reword labels and questions, make its own fields
 * required, and put them first. The platform baseline is the 14 required +
 * optional + offer fields that `businessProfile.ts` hardcodes — which stays
 * the FALLBACK whenever the contract cannot be fetched, so no surface ever
 * shows an empty form.
 *
 * Every "X / N" on the wizard, Settings and the discovery drawer must use
 * `computeCompletenessFor(profile, contract)` so they agree with the chat.
 */
import {
  BUSINESS_PROFILE_ALL_FIELDS,
  BUSINESS_PROFILE_OFFER_HALF,
  BUSINESS_PROFILE_OPTIONAL_FIELDS,
  type BusinessProfile,
  type BusinessProfileCompleteness,
} from './businessProfile';

export type ProfileFieldGroup = 'company' | 'icp' | 'candidates' | 'offer' | 'custom' | string;

export interface ProfileContractField {
  key: string;
  group: ProfileFieldGroup;
  required?: boolean;
  /** The exact question the interview asks. */
  ask?: string;
  /** Form label; the surface falls back to its own copy when absent. */
  label?: string;
  /** Form hint; same fallback rule. */
  help?: string;
}

export interface ProfileContract {
  required: string[];
  optional: string[];
  offer: string[];
  offerQuestions: Record<string, string>;
  asks?: Record<string, string>;
  all: string[];
  fields: ProfileContractField[];
  /** Keys beyond the platform baseline (a vertical's or tenant's additions). */
  extras: string[];
  /** True when this is the hardcoded fallback rather than the tenant's own. */
  fallback?: boolean;
}

/** The platform baseline as a contract — used when the fetch fails. */
export function baselineProfileContract(): ProfileContract {
  const offer = new Set<string>(BUSINESS_PROFILE_OFFER_HALF as ReadonlyArray<string>);
  const fields: ProfileContractField[] = (BUSINESS_PROFILE_ALL_FIELDS as ReadonlyArray<string>).map((key) => ({
    key,
    group: offer.has(key) ? 'offer' : 'company',
    required: !offer.has(key) && !BUSINESS_PROFILE_OPTIONAL_FIELDS.has(key as keyof BusinessProfile),
  }));
  return {
    required: fields.filter((f) => f.required).map((f) => f.key),
    optional: fields.filter((f) => !f.required && f.group !== 'offer').map((f) => f.key),
    offer: fields.filter((f) => f.group === 'offer').map((f) => f.key),
    offerQuestions: {},
    asks: {},
    all: fields.map((f) => f.key),
    fields,
    extras: [],
    fallback: true,
  };
}

const filled = (profile: BusinessProfile | null | undefined, key: string): boolean => {
  const v = profile ? (profile as Record<string, unknown>)[key] : undefined;
  return typeof v === 'string' && v.trim().length > 0;
};

/** Completeness over the contract's REQUIRED keys — the same gate the chat uses. */
export function computeCompletenessFor(
  profile: BusinessProfile | null | undefined,
  contract: ProfileContract,
): BusinessProfileCompleteness {
  const total = contract.required.length;
  if (!profile || total === 0) return { filled: 0, total, pct: 0 };
  const n = contract.required.filter((k) => filled(profile, k)).length;
  return { filled: n, total, pct: Math.round((n / total) * 100) };
}

/** Completeness over the contract's offer keys — a separate denominator, on purpose. */
export function computeOfferCompletenessFor(
  profile: BusinessProfile | null | undefined,
  contract: ProfileContract,
): BusinessProfileCompleteness {
  const total = contract.offer.length;
  if (!profile || total === 0) return { filled: 0, total, pct: 0 };
  const n = contract.offer.filter((k) => filled(profile, k)).length;
  return { filled: n, total, pct: Math.round((n / total) * 100) };
}

/** A readable label for a key with no pack label and no surface copy: `candidateRoles` → `Candidate roles`. */
export function humaniseFieldKey(key: string): string {
  const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}
