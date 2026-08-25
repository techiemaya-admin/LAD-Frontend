'use client';
import React, { useEffect, useState } from 'react';
import { Mail, CheckCircle, AlertCircle, Loader2, Link as LinkIcon, Calendar, Info } from 'lucide-react';
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
    <div className="w-full px-2 sm:px-4 lg:px-6 py-4 space-y-4 font-sans text-slate-900 dark:text-white">
      {/* 1. SEPARATED TOP HEADER CARD */}
      <div className="rounded-2xl border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#071131] p-5 shadow-sm dark:shadow-none">
        <div className="flex items-center gap-4">
          {/* Calendar Icon Container Box */}
          <div className="w-12 h-12 rounded-xl bg-[#1d4ed8] flex items-center justify-center shrink-0">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
              Microsoft Calendar Integration
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
              Connect your Microsoft account for Calendar and Contacts access
            </p>
          </div>
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA / STATUS & ACTIONS */}
      <div className="space-y-4">
        {/* Connection Status Row Card */}
        <div className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-blue-950/40 bg-slate-50 dark:bg-[#050f26] p-4 shadow-sm dark:shadow-none">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-[#0d1f42] flex items-center justify-center shrink-0">
              <LinkIcon className="h-5 w-5 text-[#2563eb]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">Connection Status</p>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5">
                {isConnected && email
                  ? `Connected as ${email}`
                  : 'Microsoft account is not connected'}
              </p>
            </div>
          </div>

          {isConnected ? (
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-50 dark:bg-[#061e19] border border-emerald-200 dark:border-[#0e4835]">
              <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-[#00d68f]" />
            </div>
          ) : (
            <AlertCircle className="h-5 w-5 text-slate-400 dark:text-slate-500" />
          )}
        </div>

        {/* Wizard Section */}
        {showWizard && (
          <MicrosoftBookingWizard
            onSaved={() => {
              setWizardOverride(null);
              refetch();
            }}
            onSkip={() => setWizardOverride('skipped')}
          />
        )}

        {/* Booking Page Section */}
        {isConnected && !showWizard && bookingsAccessible && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-blue-950/40 bg-slate-50 dark:bg-[#050f26] p-4 shadow-sm dark:shadow-none">
            <div className="flex min-w-0 items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-[#0d1f42] flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-[#2563eb]" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">Booking page</p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-300 mt-0.5">
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
              className="border-slate-300 dark:border-blue-900 bg-white dark:bg-transparent text-xs text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-blue-950"
            >
              Change
            </Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="w-full">
          {isConnected ? (
            <button
              type="button"
              onClick={handleDisconnect}
              disabled={busy}
              className="w-full h-11 px-5 rounded-xl text-sm font-semibold text-white bg-[#a21d59] hover:bg-[#881749] transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Disconnecting...</span>
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4" />
                  <span>Disconnect</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={connectMicrosoft}
              disabled={busy}
              className="w-full h-11 px-5 rounded-xl text-sm font-semibold text-white bg-[#2463ef] hover:bg-[#1d4ed8] transition-all flex items-center justify-center gap-2 cursor-pointer border-none disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Connecting...</span>
                </>
              ) : (
                <>
                  <LinkIcon className="h-4 w-4" />
                  <span>Connect</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* 3. SEPARATED NOTE CARD */}
        <div className="rounded-xl border border-slate-200 dark:border-blue-950/40 bg-slate-50 dark:bg-[#050f26] p-4 shadow-sm dark:shadow-none">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-[#0d1f42] flex items-center justify-center shrink-0 mt-0.5">
              <Info className="h-4 w-4 text-[#2563eb]" />
            </div>
            <div className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
              <span className="font-bold text-[#2563eb] block mb-0.5">NOTE:</span>
              We only access the data you explicitly grant permission for. You can revoke access at any time.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
