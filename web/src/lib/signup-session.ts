/**
 * The verified-identity handoff between /register and /register/apply.
 *
 * After Google or the WhatsApp code proves an identity that has no account,
 * the backend returns a short-lived signup token. It lives in sessionStorage
 * (tab-scoped, gone when the tab closes) — never in a cookie, so the auth
 * middleware and every API proxy keep treating this visitor as anonymous,
 * which is what they are. The token is only ever sent in `x-signup-token`.
 */

export interface SignupIdentity {
  provider: 'google' | 'whatsapp';
  email: string | null;
  /** Masked by the backend ("+9715•••••191"); display only. */
  phone: string | null;
  name: string | null;
}

export interface SignupSession {
  signupToken: string;
  identity: SignupIdentity;
  /** ms epoch; the backend token is 30 min, this is a UI hint only. */
  savedAt: number;
}

const KEY = 'lad.signup';
const MAX_AGE_MS = 30 * 60 * 1000;

export function saveSignupSession(s: Omit<SignupSession, 'savedAt'>): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ ...s, savedAt: Date.now() }));
  } catch {
    /* private mode / storage disabled — the apply page will ask to verify again */
  }
}

export function readSignupSession(): SignupSession | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SignupSession;
    if (!s?.signupToken || !s?.identity?.provider) return null;
    if (Date.now() - (s.savedAt || 0) > MAX_AGE_MS) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}

export function clearSignupSession(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* nothing to clear */
  }
}

export const SIGNUP_TOKEN_HEADER = 'x-signup-token';
