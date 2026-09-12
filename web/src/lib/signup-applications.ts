/**
 * Shared shape + handoff key for the super-admin signup queue
 * (/tenant/signups) and the provisioning wizard (/tenant/onboard/new).
 *
 * Lives outside the page files because Next.js refuses non-page exports from
 * a page module.
 */

export interface SignupApplication {
  id: string;
  provider: 'google' | 'whatsapp';
  identity_email: string | null;
  identity_phone: string | null;
  identity_name: string | null;
  business_name: string;
  vertical: string;
  website: string | null;
  country: string | null;
  city: string | null;
  timezone: string | null;
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  goal: string | null;
  details: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'provisioned';
  reviewer_user_id: string | null;
  review_notes: string | null;
  reviewed_at: string | null;
  tenant_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * sessionStorage key the queue uses to hand an approved application to the
 * wizard. Same browser, same super-admin; the wizard checks the id in the
 * URL against the stored row before using it.
 */
export const PROVISION_HANDOFF_KEY = 'lad.signup.provision';

export function readProvisionHandoff(applicationId: string): SignupApplication | null {
  try {
    const raw = sessionStorage.getItem(PROVISION_HANDOFF_KEY);
    if (!raw) return null;
    const app = JSON.parse(raw) as SignupApplication;
    return app?.id === applicationId ? app : null;
  } catch {
    return null;
  }
}

export function clearProvisionHandoff(): void {
  try { sessionStorage.removeItem(PROVISION_HANDOFF_KEY); } catch { /* nothing */ }
}
