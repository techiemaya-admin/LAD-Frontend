'use client';
import React, { useEffect, useState } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader2, Link as LinkIcon, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  useMicrosoftEmailStatus,
  startMicrosoftOAuth,
} from '@lad/frontend-features/email-accounts';
import { MicrosoftBookingWizard } from './MicrosoftBookingWizard';

export const MicrosoftAuthIntegration: React.FC = () => {
  const {
    isConnected,
    email,
    isLoading,
    refetch,
    disconnect,
    bookingsAccessible,
    selectedBusinessName,
  } = useMicrosoftEmailStatus();
  const [isActing, setIsActing] = useState(false);
  // Reopened explicitly via "Change booking page"; also lets a skipped wizard stay
  // dismissed for the rest of the session without persisting anything.
  const [wizardOverride, setWizardOverride] = useState<'open' | 'skipped' | null>(null);

  useEffect(() => {
    // If returning from Microsoft OAuth flow, refresh status + clean up URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('microsoft') === 'connected') {
      refetch();
      window.history.replaceState({}, '', window.location.pathname + '?tab=integrations');
    }
  }, [refetch]);

  const connectMicrosoft = async () => {
    setIsActing(true);
    try {
      const result = await startMicrosoftOAuth('settings');
      if (!result?.url) {
        alert('Failed to get Microsoft authorization URL. Please try again.');
        return;
      }
      window.location.href = result.url;
    } catch (error) {
      console.error('[MicrosoftAuthIntegration] Error starting OAuth:', error);
      alert('Failed to connect Microsoft account');
    } finally {
      setIsActing(false);
    }
  };

  const handleDisconnect = async () => {
    setIsActing(true);
    try {
      await disconnect();
    } catch (error) {
      console.error('[MicrosoftAuthIntegration] Error disconnecting:', error);
      alert('Failed to disconnect Microsoft account');
    } finally {
      setIsActing(false);
    }
  };

  const busy = isLoading || isActing;

  // VOAG showed this picker as a post-OAuth redirect step. LAD_backend's callback
  // returns straight to /settings, so surface it here instead: automatically when
  // connected but unconfigured, and on demand via "Change booking page".
  const showWizard =
    isConnected && wizardOverride !== 'skipped' && (wizardOverride === 'open' || !bookingsAccessible);

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#000724] p-5 sm:p-6 shadow-sm space-y-5">
        <div className="flex items-center gap-3 pb-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 dark:bg-blue-950/40 shrink-0">
            <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">Microsoft Calendar Integration</h2>
            <p className="text-sm text-slate-400 dark:text-slate-300 mt-1 leading-relaxed">
              Connect your Microsoft account for Calendar and Contacts access
            </p>
          </div>
        </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#00051d]/40 p-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium">Connection Status</p>
              <p className="text-sm text-gray-500 dark:text-slate-300">
                {isConnected && email
                  ? `Connected as ${email}`
                  : 'Microsoft account is not connected'}
              </p>
            </div>
          </div>
          {isConnected ? (
            <CheckCircle className="h-5 w-5 text-green-500" />
          ) : (
            <AlertCircle className="h-5 w-5 text-gray-400" />
          )}
        </div>

        {showWizard && (
          <MicrosoftBookingWizard
            onSaved={() => {
              setWizardOverride(null);
              refetch();
            }}
            onSkip={() => setWizardOverride('skipped')}
          />
        )}

        {isConnected && !showWizard && bookingsAccessible && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-[#00051d]/40 p-4">
            <div className="flex min-w-0 items-center gap-3">
              <Calendar className="h-5 w-5 shrink-0 text-gray-500" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Booking page</p>
                <p className="truncate text-sm text-gray-500 dark:text-slate-300">
                  {selectedBusinessName || 'Configured'}
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setWizardOverride('open')}
              disabled={busy}
            >
              Change
            </Button>
          </div>
        )}

          <div className="flex gap-3 w-full">
        {isConnected ? (
          <Button
            type="button"
            onClick={handleDisconnect}
            disabled={busy}
            variant="destructive"
            className="flex-1"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Disconnecting...
              </>
            ) : (
              'Disconnect'
            )}
          </Button>
        ) : (
          <Button
              type="button"
              onClick={connectMicrosoft}
              disabled={busy}
              className="flex-1 bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 dark:text-white"
          >
            {busy ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <LinkIcon className="mr-2 h-4 w-4" />
                Connect
              </>
            )}
          </Button>
        )}
          </div>

        <p className="text-[11px] font-semibold text-slate-400 dark:text-slate-300 leading-normal pt-1">
          <strong className="text-slate-500 dark:text-slate-400 uppercase tracking-wide mr-1">Note:</strong>
            We only access the data you explicitly grant permission for. You can revoke access at any time.
          </p>
        </div>
      </section>
  );
};
