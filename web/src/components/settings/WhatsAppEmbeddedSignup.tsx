'use client';

/**
 * WhatsApp Embedded Signup
 * ========================
 * The self-serve way to connect WhatsApp: the tenant clicks one button,
 * completes Meta's own hosted dialog, and lands with a working, webhook-
 * subscribed number - no credentials to find, paste, or get wrong.
 *
 * This sits ABOVE the legacy TenantOnboarding form, which stays as the
 * "bring your own Meta app" fallback for the tenants already provisioned that
 * way. Render-only: every HTTP call and all of the Meta JS SDK choreography
 * lives in @lad/frontend-features/meta-onboarding.
 */

import { useState } from 'react';
import {
  MessageCircle, Loader2, CheckCircle2, AlertTriangle, AlertCircle,
  Plug, Unplug, RefreshCw,
} from 'lucide-react';
import {
  useWhatsAppSignupConfig,
  useWhatsAppAccounts,
  useWhatsAppEmbeddedSignup,
} from '@lad/frontend-features/meta-onboarding';
import type { WhatsAppAccount } from '@lad/frontend-features/meta-onboarding';
import { CoexistenceHistoryNotice } from './CoexistenceHistoryNotice';

function MethodBadge({ method }: { method: WhatsAppAccount['connection_method'] }) {
  const isEmbedded = method === 'embedded_signup';
  return (
    <span
      className={`px-2 py-0.5 text-[11px] font-medium rounded-full ${
        isEmbedded
          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-slate-300'
      }`}
      title={
        isEmbedded
          ? 'Connected through Meta Embedded Signup'
          : 'Connected by pasting your own Meta app credentials'
      }
    >
      {isEmbedded ? 'Embedded Signup' : 'Manual'}
    </span>
  );
}

export function WhatsAppEmbeddedSignup() {
  const { config, isConfigured, isLoading: configLoading } = useWhatsAppSignupConfig();
  const {
    accounts, isLoading: accountsLoading, refetch,
    disconnect, isDisconnecting, disconnectWarnings,
  } = useWhatsAppAccounts();

  const [justConnected, setJustConnected] = useState<string | null>(null);

  const { launch, isSdkReady, isConnecting, error, warnings, reset } =
    useWhatsAppEmbeddedSignup({
      config,
      onSuccess: (account) => {
        setJustConnected(account.display_phone_number || account.display_name);
      },
    });

  const handleDisconnect = async (account: WhatsAppAccount) => {
    const label = account.display_phone_number || account.display_name;

    // The old copy described the effect on messages but omitted the two facts
    // that actually catch people out: this is WORKSPACE-WIDE, and it destroys
    // the stored credentials so reconnecting means going back through Meta.
    //
    // Both matter more now that a number can be assigned to a person. The
    // settings screen shows it as theirs, so removing it reads like a personal
    // action — and that is exactly how a shared number gets taken away from
    // everyone by someone who thought they were tidying up their own.
    const ok = window.confirm(
      `Disconnect ${label}?\n\n` +
      'This removes the number for EVERYONE in this workspace, not just you. ' +
      'Incoming WhatsApp messages stop reaching Mr LAD and any running ' +
      'campaigns on this channel stop sending.\n\n' +
      'Reconnecting means signing in with Meta again — the saved credentials ' +
      'are deleted and cannot be restored from a backup.'
    );
    if (!ok) return;
    await disconnect(account.id);
  };

  return (
    <div className="bg-white dark:bg-[#071131] rounded-lg border border-gray-200 dark:border-blue-950/40 mx-3 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Connect WhatsApp
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-300">
              Sign in with Meta to connect your WhatsApp Business number. We handle
              the webhook setup and message registration for you - no access tokens
              to copy.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-400 hover:text-gray-600 dark:text-slate-300 dark:hover:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
              title="Refresh accounts"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              onClick={launch}
              disabled={!isConfigured || !isSdkReady || isConnecting}
              className="h-12 px-6 bg-[#0B1957] hover:bg-[#0B1957]/90 dark:bg-[#1d4ed8] dark:hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl shadow-lg transition-all font-bold flex items-center gap-2"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <Plug className="h-5 w-5" />
                  Connect WhatsApp
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Environment not configured - explain rather than silently disable */}
      {!configLoading && !isConfigured && (
        <div className="mx-6 mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">WhatsApp sign-in isn&apos;t available on this environment yet.</p>
            <p className="mt-1 text-amber-700 dark:text-amber-300">
              One of <code>FACEBOOK_APP_ID</code>, <code>FACEBOOK_APP_SECRET</code>,{' '}
              <code>META_WHATSAPP_CONFIG_ID</code> or <code>META_TOKEN_ENCRYPTION_KEY</code>{' '}
              is missing. Use the manual setup below in the meantime.
            </p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-6 mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 flex gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1 text-sm text-red-800 dark:text-red-200">
            <p className="font-medium">Couldn&apos;t connect WhatsApp</p>
            <p className="mt-1 text-red-700 dark:text-red-300">{error}</p>
          </div>
          <button
            onClick={reset}
            className="text-xs text-red-700 dark:text-red-300 underline shrink-0"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success + any non-fatal warnings from the handshake */}
      {justConnected && !error && (
        <div className="mx-6 mt-6 p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
          <div className="text-sm text-emerald-800 dark:text-emerald-200">
            <p className="font-medium">{justConnected} is connected.</p>
            {warnings.length > 0 && (
              <ul className="mt-2 space-y-1 text-emerald-700 dark:text-emerald-300 list-disc list-inside">
                {warnings.map((w) => <li key={w}>{w}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      {disconnectWarnings.length > 0 && (
        <div className="mx-6 mt-6 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-sm text-amber-800 dark:text-amber-200">
          <ul className="space-y-1 list-disc list-inside">
            {disconnectWarnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      )}

      {/* Connected accounts */}
      <div className="p-6">
        {accountsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400 dark:text-slate-300" />
          </div>
        ) : accounts.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-slate-300 text-center py-6">
            No WhatsApp number connected yet.
          </p>
        ) : (
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className="p-4 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-800/40"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {account.display_name}
                      </span>
                      <MethodBadge method={account.connection_method} />
                      {account.status !== 'active' && (
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded-full bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-slate-300">
                          {account.status}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-500 dark:text-slate-300 truncate">
                      {account.display_phone_number || 'Number pending verification'}
                      {account.business_account_id && (
                        <span className="text-gray-400 dark:text-slate-400">
                          {' · '}WABA {account.business_account_id}
                        </span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDisconnect(account)}
                    disabled={isDisconnecting}
                    className="shrink-0 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-md disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <Unplug className="h-4 w-4" />
                    Disconnect
                  </button>
                </div>

                {/* Meta refused the one-time history import - the only place the
                    tenant can be told, since it happens after the handshake. */}
                <CoexistenceHistoryNotice account={account} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default WhatsAppEmbeddedSignup;
