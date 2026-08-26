/**
 * Meta Onboarding - useWhatsAppEmbeddedSignup
 *
 * Drives Meta's Embedded Signup dialog end-to-end and hands the result to the
 * backend. Everything non-render lives here so the component stays presentational.
 *
 * ── Why this needs two independent inputs ───────────────────────────────────
 * Meta delivers the signup result over TWO channels that complete in an
 * unpredictable order:
 *
 *   1. A `postMessage` from facebook.com carrying `{ waba_id, phone_number_id,
 *      business_id }` - WHICH account was onboarded.
 *   2. The `FB.login` callback carrying `authResponse.code` - the authorization
 *      code that proves the user consented.
 *
 * Neither is sufficient alone, and the popup can emit the message before or
 * after the callback fires. So both are collected into refs and the exchange
 * fires from whichever arrives second. Refs rather than state deliberately:
 * these are read inside callbacks registered once, where a state closure would
 * capture stale values.
 *
 * ── Cancellation vs failure ─────────────────────────────────────────────────
 * Meta reports BOTH as event 'CANCEL'. They are distinguished only by
 * `error_message` being present in the payload - there is no separate 'ERROR'
 * event in the documented set. A plain close is a benign abort (no error
 * surface, no partial state, because closing a dialog is a decision); a CANCEL
 * carrying an error_message is a real failure and must be shown.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { exchangeWhatsAppSignup, metaOnboardingKeys } from '../api';
import type { WhatsAppAccount, WhatsAppSignupConfig } from '../types';

/**
 * Is this postMessage really from Meta?
 *
 * Meta's own sample uses `event.origin.endsWith('facebook.com')` - which also
 * accepts `https://evil-facebook.com`, since that string genuinely ends with
 * those characters. We require a DOT boundary so only real subdomains match,
 * and https so a downgraded origin cannot impersonate one.
 *
 * The previous hardcoded pair (www + web) was safe but too narrow: the dialog
 * also posts from business.facebook.com, and an unlisted origin is dropped in
 * silence - the popup completes and the handshake simply never fires.
 */
function isMetaOrigin(origin: string): boolean {
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== 'https:') return false;
    return hostname === 'facebook.com' || hostname.endsWith('.facebook.com');
  } catch {
    return false;
  }
}

const SDK_SCRIPT_ID = 'facebook-jssdk';

/**
 * Events that mean "the user finished and we have an account".
 *
 * FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING is the COEXISTENCE completion - Meta
 * emits a different event name for that flow, so treating only FINISH* as
 * success would silently drop every coexistence signup: the popup closes, the
 * user believes it worked, and nothing is ever persisted.
 */
const FINISH_EVENTS = [
  'FINISH',
  'FINISH_ONLY_WABA',
  'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
  // Documented alongside the three above. An unhandled finish event looks
  // exactly like an abandoned dialog - nothing persists and nothing errors  - 
  // so listing all of them is cheaper than diagnosing one later.
  'FINISH_OBO_MIGRATION',
  'FINISH_GRANT_ONLY_API_ACCESS',
];

/**
 * The coexistence completion. Its payload carries ONLY `waba_id` - no
 * `phone_number_id`, unlike every other finish event. Requiring both would
 * reject the signup with "finished without a phone number" at the exact moment
 * it succeeded, so the backend resolves the number from the WABA instead.
 */
const COEXISTENCE_FINISH_EVENT = 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING';

interface SessionInfo {
  waba_id: string;
  /** Absent on the coexistence flow - resolved server-side from the WABA. */
  phone_number_id?: string;
  business_id?: string;
  /** Literal completion event - the backend uses it to detect coexistence. */
  onboarding_event: string;
}

export interface UseWhatsAppEmbeddedSignupOptions {
  config: WhatsAppSignupConfig | null;
  onSuccess?: (account: WhatsAppAccount, warnings: string[]) => void;
}

export interface UseWhatsAppEmbeddedSignupReturn {
  /** Open Meta's signup dialog. No-op unless the SDK is ready. */
  launch: () => void;
  /** SDK script downloaded and FB.init called. */
  isSdkReady: boolean;
  /** Dialog open, or exchange in flight. */
  isConnecting: boolean;
  error: string | null;
  warnings: string[];
  account: WhatsAppAccount | null;
  reset: () => void;
}

/** Load the Meta JS SDK once per page and initialise it. */
function loadFacebookSdk(appId: string, version: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Not in a browser'));
      return;
    }

    const w = window as any;

    const init = () => {
      try {
        w.FB.init({ appId, autoLogAppEvents: true, xfbml: true, version });
        resolve();
      } catch (err) {
        reject(err as Error);
      }
    };

    // The SDK may already be present from an earlier mount - init is idempotent.
    if (w.FB) { init(); return; }

    const existing = document.getElementById(SDK_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      // Another mount is mid-download. fbAsyncInit has already been claimed by
      // that mount, so poll instead of overwriting its handler.
      const started = Date.now();
      const poll = window.setInterval(() => {
        if (w.FB) { window.clearInterval(poll); init(); }
        else if (Date.now() - started > 15000) {
          window.clearInterval(poll);
          reject(new Error('Timed out loading the Meta SDK'));
        }
      }, 100);
      return;
    }

    w.fbAsyncInit = init;

    const script = document.createElement('script');
    script.id    = SDK_SCRIPT_ID;
    script.src   = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    script.onerror = () => reject(new Error('Failed to load the Meta SDK. Check for an ad blocker.'));
    document.body.appendChild(script);
  });
}

export function useWhatsAppEmbeddedSignup(options: UseWhatsAppEmbeddedSignupOptions): UseWhatsAppEmbeddedSignupReturn {
  const { config, onSuccess } = options;
  const queryClient = useQueryClient();

  const [isSdkReady, setIsSdkReady] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionRef = useRef<SessionInfo | null>(null);
  const codeRef    = useRef<string | null>(null);

  const mutation = useMutation({
    mutationFn: exchangeWhatsAppSignup,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: metaOnboardingKeys.whatsappAccounts() });
      onSuccess?.(data.account, data.warnings ?? []);
    },
  });

  // Keep the mutation reachable from the listener/callback without making them
  // depend on a value that changes every render.
  const mutateRef = useRef(mutation.mutate);
  mutateRef.current = mutation.mutate;

  const clearHandshake = useCallback(() => {
    sessionRef.current = null;
    codeRef.current    = null;
  }, []);

  /** Fire the exchange once BOTH halves of the handshake have arrived. */
  const tryExchange = useCallback(() => {
    const session = sessionRef.current;
    const code    = codeRef.current;
    if (!session || !code) return;

    setIsDialogOpen(false);
    mutateRef.current({
      code,
      waba_id:          session.waba_id,
      phone_number_id:  session.phone_number_id,
      business_id:      session.business_id,
      // Which flow actually completed. More reliable than inferring coexistence
      // from our own config: the popup knows what it ran, our env only knows
      // what we asked for.
      onboarding_event: session.onboarding_event,
    });
    clearHandshake();
  }, [clearHandshake]);

  // ── Load the SDK ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!config?.configured || !config.appId) return;
    let cancelled = false;

    loadFacebookSdk(config.appId, config.graphVersion)
      .then(() => { if (!cancelled) setIsSdkReady(true); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); });

    return () => { cancelled = true; };
  }, [config?.configured, config?.appId, config?.graphVersion]);

  // ── Listen for the popup's session-info message ────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handler = (event: MessageEvent) => {
      // Origin check first - this listener is on window, so anything can post.
      if (!isMetaOrigin(event.origin)) return;

      let payload: any;
      try {
        payload = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      } catch {
        return; // Meta also posts non-JSON chatter on these origins.
      }
      if (payload?.type !== 'WA_EMBEDDED_SIGNUP') return;

      if (FINISH_EVENTS.includes(payload.event)) {
        const data = payload.data || {};
        const isCoexistence = payload.event === COEXISTENCE_FINISH_EVENT;
        // Coexistence reports only waba_id; every other flow reports both.
        const hasWhatWeNeed =
          data.waba_id && (isCoexistence || data.phone_number_id);

        if (hasWhatWeNeed) {
          sessionRef.current = {
            waba_id:         String(data.waba_id),
            phone_number_id: data.phone_number_id ? String(data.phone_number_id) : undefined,
            business_id:     data.business_id ? String(data.business_id) : undefined,
            onboarding_event: String(payload.event),
          };
          tryExchange();
        } else {
          setIsDialogOpen(false);
          clearHandshake();
          setError(
            'Signup finished without a phone number. Add a number to your ' +
            'WhatsApp Business Account and connect again.'
          );
        }
        return;
      }

      // Meta reports BOTH abandonment and hard failures as event 'CANCEL'.
      // The two are told apart by `error_message` being present - there is no
      // separate 'ERROR' event, so treating every CANCEL as a benign close
      // swallowed real failures and left the user staring at an unchanged page.
      if (payload.event === 'CANCEL') {
        const data = payload.data || {};
        setIsDialogOpen(false);
        clearHandshake();

        if (data.error_message) {
          const code = data.error_code ? ` (${data.error_code})` : '';
          setError(`${data.error_message}${code}`);
        }
        // Otherwise the user closed the dialog - a decision, not a failure.
        // `data.current_step` says where they stopped, which is the useful
        // signal for onboarding drop-off rather than anything to show them.
        return;
      }

      // Retained defensively: 'ERROR' is not in the documented event list, but
      // an undocumented one must not fall through to silence.
      if (payload.event === 'ERROR') {
        setIsDialogOpen(false);
        clearHandshake();
        setError(payload.data?.error_message || 'Meta reported an error during signup.');
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [tryExchange, clearHandshake]);

  // ── Launch ─────────────────────────────────────────────────────────────────
  const launch = useCallback(() => {
    const w = window as any;
    if (!isSdkReady || !w.FB || !config?.configId) return;

    setError(null);
    clearHandshake();
    setIsDialogOpen(true);

    w.FB.login(
      (response: any) => {
        const code = response?.authResponse?.code;
        if (!code) {
          // User dismissed the dialog, or denied consent. Benign either way.
          setIsDialogOpen(false);
          clearHandshake();
          return;
        }
        codeRef.current = code;
        tryExchange();
      },
      {
        config_id: config.configId,
        // Must be 'code' - the System User access token is minted server-side
        // by exchanging this code, never handed to the browser.
        response_type: 'code',
        override_default_response_type: true,
        // Matches the snippet Meta's App Dashboard generates for our app's flow
        // version. NOT the pre-v4 `{ setup, featureType, sessionInfoVersion }`
        // shape, and NOT the Graph API version - the backend supplies the value
        // so a Meta-side bump is a config change rather than a redeploy.
        //
        // featureType selects a non-default flow (coexistence, which lets a
        // number stay on the WhatsApp Business App while also reachable over
        // Cloud API). The key is OMITTED when unset rather than sent empty:
        // Meta distinguishes the two, and an unrecognised value makes it reject
        // the dialog. Absent → default onboarding, which rejects any number
        // already on WhatsApp with error #2655122.
        extras: {
          version: config.esVersion,
          ...(config.featureType ? { featureType: config.featureType } : {}),
          ...(config.features ? { features: config.features } : {}),
        },
      }
    );
  }, [isSdkReady, config?.configId, tryExchange, clearHandshake]);

  const reset = useCallback(() => {
    setError(null);
    setIsDialogOpen(false);
    clearHandshake();
    mutation.reset();
  }, [clearHandshake, mutation]);

  const mutationError = mutation.error
    ? ((mutation.error as any)?.response?.data?.error ?? (mutation.error as Error).message)
    : null;

  return {
    launch,
    isSdkReady,
    isConnecting: isDialogOpen || mutation.isPending,
    error: error ?? mutationError,
    warnings: mutation.data?.warnings ?? [],
    account:  mutation.data?.account ?? null,
    reset,
  };
}
