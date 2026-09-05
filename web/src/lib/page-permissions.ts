/**
 * The page permissions offered in Settings → Team, and the tenant feature each
 * one depends on.
 *
 * SINGLE SOURCE OF TRUTH. `sidebar.tsx` and `TeamManagement.tsx` both import
 * from here, so a capability and the feature that gates it cannot drift apart
 * again — a second copy of this pairing is what produced the bug this file
 * fixes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO TABLES, TWO VOCABULARIES. READ THIS BEFORE CHANGING A KEY.
 *
 *   tenant_features   UNDERSCORE   written by provision.js DEFAULT_TENANT_FEATURES
 *                                  read by hasFeature() via /auth/me
 *   feature_flags     HYPHEN       written by provision.js DEFAULT_FEATURE_FLAGS
 *                                  read by the backend's requireFeature()
 *
 * `hasFeature` is an exact `.includes` against tenant_features — no
 * normalisation. The sidebar's gates were written in the feature_flags
 * vocabulary and compared against tenant_features data, so they matched nothing:
 *
 *   asked for 'follow-ups'     tenants have 'followups'      → 0 of 35 on stage
 *   asked for 'deals-pipeline' tenants have 'deals_pipeline'  → 2 of 45 on stage
 *
 * Follow-ups was unreachable for every tenant on stage — not merely hidden from
 * the nav, because app/follow-ups/layout.tsx hard-gates on the same wrong key.
 *
 * Each permission therefore accepts a LIST of acceptable keys rather than one
 * string. Both spellings exist in live data (45 tenants hold `deals_pipeline`,
 * 2 hold `deals-pipeline`, 0 hold only the hyphen), and a tenant provisioned
 * under either must work. This is drift tolerance, not normalisation: the
 * accepted spellings are enumerated and reviewable, and nothing is guessed at
 * runtime.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** Accepted tenant_features spellings, per gated area. */
export const FEATURE = {
  OVERVIEW: ['overview'],
  AI_CHAT: ['ai-chat'],
  CAMPAIGNS: ['campaigns'],
  CONVERSATIONS: ['conversations'],
  // provision.js seeds 'community_roi'; the sidebar asked for 'community-roi'.
  COMMUNITY_ROI: ['community_roi', 'community-roi'],
  VOICE_AGENT: ['voice_agent', 'voice-agent'],
  DEALS_PIPELINE: ['deals_pipeline', 'deals-pipeline'],
  // 'followups' is in ESSENTIAL_TENANT_FEATURES, so every tenant holds it.
  FOLLOWUPS: ['followups', 'follow-ups'],
} as const;

export type PagePermission = {
  /** The user_capabilities key this checkbox GRANTS — the one nav actually reads. */
  key: string;
  /**
   * Older spellings of the same permission that exist in granted data. Read
   * ONLY when deciding whether the box shows as ticked, never written.
   *
   * This checklist wrote `view_followup` (singular) while the nav item, the
   * provisioning defaults and 25 of 33 granted rows use `view_followups`. The 8
   * rows on the singular key were granted by this UI and read by nothing, so
   * the permission never worked. Listing the old key keeps those admins seeing
   * a ticked box; the next save writes the working one.
   */
  aliases?: readonly string[];
  label: string;
  /**
   * Every acceptable feature spelling for the pages this unlocks. `null` means
   * a page with NO feature gate — the capability alone decides access there.
   *
   * Offerable when ANY entry passes. A capability that unlocks anything is
   * grantable; one that unlocks nothing is not.
   */
  features: readonly (string | null)[];
};

export const PAGE_PERMISSIONS: readonly PagePermission[] = [
  { key: 'view_overview',      label: 'Overview',      features: FEATURE.OVERVIEW },
  { key: 'view_ai_assistant',  label: 'AI Assistant',  features: FEATURE.AI_CHAT },
  { key: 'view_campaigns',     label: 'Campaigns',     features: FEATURE.CAMPAIGNS },
  { key: 'view_conversations', label: 'Conversations', features: FEATURE.CONVERSATIONS },
  { key: 'view_community_roi', label: 'Community ROI', features: FEATURE.COMMUNITY_ROI },
  { key: 'view_make_call',     label: 'Make a Call',   features: FEATURE.VOICE_AGENT },
  { key: 'view_call_logs',     label: 'Call Logs',     features: FEATURE.VOICE_AGENT },
  { key: 'view_followups',     label: 'Follow-up',     features: FEATURE.FOLLOWUPS,
    aliases: ['view_followup'] },
  // `null` is deliberate and load-bearing. view_pipeline unlocks /pipeline
  // (gated on deals_pipeline) AND /crm "Contacts Funnel", which has NO feature
  // gate — the one place a capability alone decides access. Gating this row on
  // deals_pipeline would remove an admin's ability to grant /crm, which works
  // today, while members already holding it keep it unrevocably.
  { key: 'view_pipeline',      label: 'Pipeline',      features: [...FEATURE.DEALS_PIPELINE, null] },

  // UNGATED — kept, not dropped. These unlock pages with no feature gate and no
  // nav item, so no entitlement can be shown to justify hiding them. Removing a
  // checkbox an admin can see today would silently strip their ability to
  // revoke a capability members already hold, which is a bigger change than the
  // one asked for. If a gate is ever added for one of these, pair it here.
  { key: 'view_scraper',       label: 'Scraper',       features: [null] },
  { key: 'view_pricing',       label: 'Pricing',       features: [null] },
  { key: 'view_settings',      label: 'Settings',      features: [null] },
];

/**
 * Can this permission be granted to a member of this workspace?
 *
 * A `null` entry always passes: the page it unlocks has no feature gate.
 */
export function isPermissionOfferable(
  permission: PagePermission,
  hasFeature: (key: string) => boolean,
): boolean {
  return permission.features.some((f) => f === null || hasFeature(f));
}

/** Is this permission granted, allowing for older spellings in stored data? */
export function isPermissionGranted(
  permission: PagePermission,
  capabilities: readonly string[] | undefined,
): boolean {
  if (!capabilities?.length) return false;
  if (capabilities.includes(permission.key)) return true;
  return (permission.aliases || []).some((a) => capabilities.includes(a));
}
