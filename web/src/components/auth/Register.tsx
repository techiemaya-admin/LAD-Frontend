"use client";
/**
 * Register — prove who you are, then either sign in or apply.
 *
 * Two ways to verify, one outcome each:
 *   Google   → Google Identity Services button; the ID token goes to
 *              /api/auth/google, which verifies it server-side.
 *   WhatsApp → phone → 6-digit code sent by the platform WhatsApp number →
 *              /api/auth/otp/verify.
 *
 * The backend answers `mode: 'login'` (this identity already has an account:
 * the proxy set the session cookie, go in) or `mode: 'signup'` (no account:
 * carry the signup token to /register/apply). Nothing on this page creates an
 * account — see features/tenant-signups in LAD_backend for the queue.
 */
import React, { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { MessageCircle, ArrowLeft, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { loginSuccess } from "@/store/slices/authSlice";
import { useAuth } from "@/contexts/AuthContext";
import authService from "@/services/authService";
import { saveSignupSession, type SignupIdentity } from "@/lib/signup-session";
import { FEATURE } from "@/lib/page-permissions";

const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_SIGNIN_CLIENT_ID || "";

/**
 * Where a freshly signed-in user lands, by what their tenant is entitled to.
 * First match wins; the last entry needs no feature. A wellness tenant has
 * conversations and no ai-chat, so sending everyone to the AI assistant
 * would greet them with "Feature Not Available".
 */
const LANDING: Array<{ features: readonly string[]; href: string }> = [
  { features: FEATURE.AI_CHAT, href: "/onboarding/advanced-search-ai" },
  { features: FEATURE.CONVERSATIONS, href: "/conversations" },
  { features: FEATURE.OVERVIEW, href: "/overview" },
  { features: [], href: "/settings" },
];
function landingFor(tenantFeatures: string[] | undefined): string {
  const have = new Set(tenantFeatures || []);
  return (LANDING.find((l) => l.features.length === 0 || l.features.some((f) => have.has(f))) || LANDING[LANDING.length - 1]).href;
}

/** Minimal surface of the GIS library we call. */
interface GoogleCredentialResponse { credential: string }
interface GoogleAccountsId {
  initialize: (cfg: { client_id: string; callback: (r: GoogleCredentialResponse) => void; ux_mode?: 'popup' | 'redirect'; auto_select?: boolean }) => void;
  renderButton: (el: HTMLElement, opts: Record<string, string | number>) => void;
}
declare global {
  interface Window { google?: { accounts: { id: GoogleAccountsId } } }
}

interface IdentityResponse {
  success: boolean;
  mode?: 'login' | 'signup';
  token?: string;
  user?: any;
  signupToken?: string;
  identity?: SignupIdentity;
  error?: string;
  code?: string;
  retryAfterSeconds?: number;
  expiresInSeconds?: number;
  resendAfterSeconds?: number;
  phone?: string;
}

type Method = 'choose' | 'whatsapp';

const Register: React.FC = () => {
  const dispatch = useDispatch();
  const { refreshUser } = useAuth();
  const router = useRouter();

  const [method, setMethod] = useState<Method>('choose');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Shared outcome handling ─────────────────────────────────────────────
  const handleIdentity = useCallback(async (data: IdentityResponse) => {
    if (data.mode === 'login' && data.user) {
      // The session cookie is already set by the proxy. The login payload has
      // no tenantFeatures[] though — only /api/auth/me carries those — and
      // every feature gate reads hasFeature() from it. Navigating on the bare
      // payload rendered "Feature Not Available" on a tenant that HAD the
      // feature, until a hard reload. Login.tsx backfills /me after
      // navigating (password login is latency-tuned); a Google / OTP sign-in
      // is not, so fetch it first and also pick the landing page from it.
      dispatch(loginSuccess(data.user));
      refreshUser(data.user);
      let user: any = data.user;
      try {
        user = await authService.getCurrentUser();
        dispatch(loginSuccess(user));
        refreshUser(user);
      } catch {
        // /me unavailable — go anyway with the bare payload; AuthContext
        // self-heals on next mount.
      }
      router.push(landingFor(user?.tenantFeatures));
      return;
    }
    if (data.mode === 'signup' && data.signupToken && data.identity) {
      saveSignupSession({ signupToken: data.signupToken, identity: data.identity });
      router.push('/register/apply');
      return;
    }
    setError(data.error || 'Something went wrong. Please try again.');
  }, [dispatch, refreshUser, router]);

  // ── Google ──────────────────────────────────────────────────────────────
  const googleBtn = useRef<HTMLDivElement>(null);
  const [gisReady, setGisReady] = useState(false);

  const onGoogleCredential = useCallback(async (r: GoogleCredentialResponse) => {
    setBusy(true); setError(null);
    try {
      const resp = await fetch('/api/auth/google', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ credential: r.credential }),
      });
      const data: IdentityResponse = await resp.json().catch(() => ({ success: false }));
      if (!resp.ok) { setError(data.error || 'Google sign-in failed.'); return; }
      handleIdentity(data);
    } catch {
      setError('Google sign-in failed. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }, [handleIdentity]);

  useEffect(() => {
    if (!gisReady || !GOOGLE_CLIENT_ID || !googleBtn.current || !window.google) return;
    window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onGoogleCredential, ux_mode: 'popup', auto_select: false });
    googleBtn.current.innerHTML = '';
    window.google.accounts.id.renderButton(googleBtn.current, {
      type: 'standard', theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 320, logo_alignment: 'left',
      // The rest of the page is English; GIS would otherwise follow the browser locale.
      locale: 'en',
    });
  }, [gisReady, onGoogleCredential, method]);

  // ── WhatsApp OTP ────────────────────────────────────────────────────────
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const [needNewCode, setNeedNewCode] = useState(false);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const requestCode = async () => {
    setBusy(true); setError(null); setNeedNewCode(false);
    try {
      const resp = await fetch('/api/auth/otp/request', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      const data: IdentityResponse = await resp.json().catch(() => ({ success: false }));
      if (!resp.ok) {
        setError(data.error || 'Could not send the code.');
        if (resp.status === 429 && data.retryAfterSeconds) setResendIn(Math.min(data.retryAfterSeconds, 3600));
        return;
      }
      setSentTo(data.phone || phone);
      setCode('');
      setResendIn(data.resendAfterSeconds || 60);
    } catch {
      setError('Could not send the code. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const verifyCode = async () => {
    setBusy(true); setError(null);
    try {
      const resp = await fetch('/api/auth/otp/verify', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
        body: JSON.stringify({ phone, code, name: name.trim() || undefined }),
      });
      const data: IdentityResponse = await resp.json().catch(() => ({ success: false }));
      if (!resp.ok) {
        setError(data.error || 'Verification failed.');
        // 410 = expired / spent / missing: the only way forward is a new code.
        if (resp.status === 410) setNeedNewCode(true);
        return;
      }
      handleIdentity(data);
    } catch {
      setError('Verification failed. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/40 px-3 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div className="w-full max-w-[400px] sm:max-w-[420px] p-6 sm:p-7 rounded-2xl shadow-2xl border backdrop-blur-xl bg-gradient-to-b from-white to-gray-50 dark:from-[#071131] dark:to-[#071131] border-gray-200 dark:border-gray-700 mx-auto">
      {GOOGLE_CLIENT_ID && (
        <Script src="https://accounts.google.com/gsi/client" strategy="afterInteractive" onLoad={() => setGisReady(true)} />
      )}
      <img src="/MrLAD-logo.svg" className="w-20 sm:w-24 mx-auto mb-2 drop-shadow-md block dark:hidden" alt="logo" />
      <img src="/MrLAD-logo-white.svg" className="w-20 sm:w-24 mx-auto mb-2 drop-shadow-md hidden dark:block" alt="" aria-hidden="true" />

      <h2 className="text-center text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-1">
        Create your account
      </h2>
      <p className="text-center text-gray-600 dark:text-gray-200 mb-4 sm:mb-6 text-xs sm:text-sm">
        Verify with Google or WhatsApp. If you already have an account, this signs you in.
      </p>

      {error && (
        <div role="alert" className="mb-3 rounded-md border border-red-300 dark:border-red-600 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-sm px-3 py-2">
          ❗ {error}
        </div>
      )}

      {method === 'choose' && (
        <div className="space-y-3">
          <div className="flex justify-center min-h-[44px]" aria-busy={busy}>
            {GOOGLE_CLIENT_ID ? (
              <div ref={googleBtn} data-testid="google-signin" />
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400 text-center">Google sign-in is not available on this environment.</p>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />or<span className="h-px flex-1 bg-gray-200 dark:bg-gray-700" />
          </div>
          <Button type="button" onClick={() => { setMethod('whatsapp'); setError(null); }} disabled={busy}
            className="w-full p-2.5 sm:p-3 rounded-full text-sm font-semibold bg-[#25D366] hover:bg-[#1ebe5b] text-white transition-all cursor-pointer">
            <MessageCircle size={18} className="mr-2" /> Continue with WhatsApp
          </Button>
          {busy && <p className="text-center text-xs text-gray-500"><Loader2 size={14} className="inline animate-spin mr-1" />Checking with Google…</p>}
        </div>
      )}

      {method === 'whatsapp' && (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); if (sentTo) verifyCode(); else requestCode(); }}>
          <button type="button" onClick={() => { setMethod('choose'); setSentTo(null); setError(null); }} className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1">
            <ArrowLeft size={12} /> Other options
          </button>
          {!sentTo ? (
            <>
              <div>
                <label htmlFor="wa-phone" className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">WhatsApp number</label>
                <input id="wa-phone" type="tel" inputMode="tel" autoComplete="tel" className={inputCls} placeholder="+971 50 123 4567"
                  value={phone} onChange={(e) => setPhone(e.target.value)} required />
                <p className="text-[11px] text-gray-500 mt-1">Include the country code. We&apos;ll send a 6-digit code to this number.</p>
              </div>
              <div>
                <label htmlFor="wa-name" className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Your name <span className="text-gray-400">(optional)</span></label>
                <input id="wa-name" type="text" autoComplete="name" className={inputCls} placeholder="Ana Lopez" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <Button type="submit" disabled={busy || !phone.trim() || resendIn > 0}
                className="w-full p-2.5 sm:p-3 rounded-lg text-sm font-semibold bg-primary dark:bg-blue-600 dark:hover:bg-blue-500 text-white cursor-pointer">
                {busy ? <Loader2 size={16} className="animate-spin" /> : resendIn > 0 ? `Try again in ${resendIn}s` : 'Send code'}
              </Button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-700 dark:text-gray-200">Code sent to <span className="font-mono">{sentTo}</span>.</p>
              <div>
                <label htmlFor="wa-code" className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">6-digit code</label>
                <input id="wa-code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" maxLength={7}
                  className={`${inputCls} tracking-[0.4em] text-center font-mono text-lg`} placeholder="••••••"
                  value={code} onChange={(e) => setCode(e.target.value.replace(/[^\d ]/g, ''))} required autoFocus />
              </div>
              {needNewCode ? (
                <Button type="button" onClick={requestCode} disabled={busy || resendIn > 0}
                  className="w-full p-2.5 sm:p-3 rounded-lg text-sm font-semibold bg-primary dark:bg-blue-600 text-white cursor-pointer">
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Send a new code'}
                </Button>
              ) : (
                <Button type="submit" disabled={busy || code.replace(/\s/g, '').length !== 6}
                  className="w-full p-2.5 sm:p-3 rounded-lg text-sm font-semibold bg-primary dark:bg-blue-600 dark:hover:bg-blue-500 text-white cursor-pointer">
                  {busy ? <Loader2 size={16} className="animate-spin" /> : 'Verify'}
                </Button>
              )}
              <div className="flex justify-between text-xs text-gray-500">
                <button type="button" onClick={() => { setSentTo(null); setCode(''); setError(null); setNeedNewCode(false); }} className="hover:text-gray-700 dark:hover:text-gray-300">Change number</button>
                <button type="button" onClick={requestCode} disabled={busy || resendIn > 0} className="hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50">
                  {resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                </button>
              </div>
            </>
          )}
        </form>
      )}

      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-5">
        Already have a password?{' '}
        <a href="/login" className="text-blue-600 dark:text-blue-400 hover:underline">Sign in</a>
      </p>
    </div>
  );
};

export default Register;
