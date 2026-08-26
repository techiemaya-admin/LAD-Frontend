/**
 * Campaign-name conflict (HTTP 409 / `CAMPAIGN_NAME_TAKEN`).
 *
 * POST /api/campaigns enforces one campaign name per tenant, case- and
 * whitespace-insensitively. The check ignores status, so a draft, paused or
 * completed campaign holds its name just as firmly as a running one - only a
 * delete frees it. That surprises people, and every create surface in the app
 * used to render the failure as either raw prose or (in the AI search flow)
 * "Campaign creation failed: Conflict", which says nothing actionable.
 *
 * These helpers give every surface one place to detect the case and one
 * sentence to show for it.
 */

import { apiErrorCode, apiErrorStatus } from '../../shared/apiError';

/** Backend discriminator for a duplicate campaign name. */
export const CAMPAIGN_NAME_TAKEN = 'CAMPAIGN_NAME_TAKEN';

/**
 * Is this failure a duplicate-campaign-name rejection?
 *
 * Prefers the `code`; falls back to status + message so the check still holds
 * for responses that predate the code (and for the DB-level 23505 race, which
 * returns the same 409 shape).
 */
export function isCampaignNameTaken(err: unknown): boolean {
  if (apiErrorCode(err) === CAMPAIGN_NAME_TAKEN) return true;
  return (
    apiErrorStatus(err) === 409 &&
    /already exists/i.test(err instanceof Error ? err.message : '')
  );
}

/**
 * The message to show the user. Names the collision and states the
 * non-obvious part - that finished and draft campaigns still hold their names.
 */
export function campaignNameTakenMessage(name?: string): string {
  const quoted = name && name.trim() ? `"${name.trim()}"` : 'that name';
  return (
    `A campaign called ${quoted} already exists - drafts and finished campaigns ` +
    `keep their names too. Rename this one, or open the existing campaign instead.`
  );
}

/**
 * Message for any campaign-save failure: the specific sentence for a name
 * clash, the backend's own message otherwise.
 */
export function campaignSaveErrorMessage(
  err: unknown,
  name?: string,
  fallback = 'Failed to save campaign'
): string {
  if (isCampaignNameTaken(err)) return campaignNameTakenMessage(name);
  return (err instanceof Error && err.message) || fallback;
}
