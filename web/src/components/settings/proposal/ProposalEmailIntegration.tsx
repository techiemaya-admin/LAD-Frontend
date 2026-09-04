'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LogOut,
  RefreshCw,
  ShieldCheck,
  AlertTriangle,
  X,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { getApiBaseUrlForLocal } from '@/lib/api-utils';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import { useAuth } from '@/contexts/AuthContext';
import { ProposalEmailIntegrationProps } from './types';

export const ProposalEmailIntegration: React.FC<ProposalEmailIntegrationProps> = ({
  tenantId,
  onStatusChange,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Custom disconnect modal state
  const [isDisconnectModalOpen, setIsDisconnectModalOpen] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);

  const popupRef = useRef<Window | null>(null);
  const watchdogRef = useRef<NodeJS.Timeout | null>(null);
  const onStatusChangeRef = useRef(onStatusChange);
  const initialCheckDoneRef = useRef(false);

  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);

  const apiBaseUrl = getApiBaseUrlForLocal();

  const getHeaders = useCallback(() => {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Tenant-Id': tenantId,
    };
    if (user?.id) {
      headers['X-User-Id'] = user.id;
    }
    return headers;
  }, [tenantId, user?.id]);

  // 1. Check connection status
  const checkStatus = useCallback(
    async (showFeedback = false) => {
      try {
        if (!initialCheckDoneRef.current) {
          setLoading(true);
        }
        setError(null);
        const res = await fetchWithTenant(
          `${apiBaseUrl}/api/social-integration/email/google/status`,
          {
            method: 'GET',
            headers: getHeaders(),
          }
        );

        if (!res.ok) {
          throw new Error(`Server returned HTTP ${res.status}`);
        }

        const data = await res.json();

        if (data.success && data.connected) {
          setConnected(true);
          setEmail(data.email || '');
          onStatusChangeRef.current?.({ connected: true, email: data.email });
          if (showFeedback) {
            toast.success('Email connection verified');
          }
        } else {
          setConnected(false);
          setEmail('');
          onStatusChangeRef.current?.({ connected: false });
        }
      } catch (err: any) {
        console.error('[ProposalEmailIntegration] Failed to check status:', err);
        setError('Unable to fetch email integration status.');
        if (showFeedback) {
          toast.error('Failed to verify status. Please check your backend connection.');
        }
      } finally {
        initialCheckDoneRef.current = true;
        setLoading(false);
      }
    },
    [apiBaseUrl, getHeaders]
  );

  useEffect(() => {
    if (tenantId && tenantId !== 'default') {
      checkStatus();
    } else {
      setLoading(false);
    }
  }, [tenantId, checkStatus]);


  // 2. Listen for postMessage from popup window with origin and source validation
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Validate structure
      if (!event.data || typeof event.data !== 'object') return;

      // Origin validation
      let expectedOrigin = '';
      try {
        expectedOrigin = new URL(apiBaseUrl).origin;
      } catch {
        /* ignore invalid URL parse */
      }

      const isSameOrigin = event.origin === window.location.origin;
      const isExpectedBackend = expectedOrigin && event.origin === expectedOrigin;

      // In development or production, ensure origin is trusted
      if (!isSameOrigin && !isExpectedBackend && !event.origin.includes('localhost')) {
        return;
      }

      // Verify event source matches the opened popup if available
      if (popupRef.current && event.source && event.source !== popupRef.current) {
        return;
      }

      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        if (watchdogRef.current) clearInterval(watchdogRef.current);
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
        setConnecting(false);
        toast.success('Gmail connected successfully!');
        checkStatus();
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        if (watchdogRef.current) clearInterval(watchdogRef.current);
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close();
        }
        setConnecting(false);
        const errMsg = event.data.error || 'Google connection was cancelled or failed';
        setError(errMsg);
        toast.error(errMsg);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (watchdogRef.current) clearInterval(watchdogRef.current);
      if (popupRef.current && !popupRef.current.closed) {
        popupRef.current.close();
      }
    };
  }, [apiBaseUrl, checkStatus]);

  // 3. Initiate popup flow
  const handleConnect = async () => {
    if (!tenantId || tenantId === 'default') {
      toast.error('Please select a valid organization/tenant first.');
      return;
    }

    setError(null);
    setConnecting(true);

    const width = 500;
    const height = 650;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    // STEP A: Open synchronously before awaiting fetch (defeats popup blockers)
    const popup = window.open(
      'about:blank',
      'GoogleOAuthPopup',
      `width=${width},height=${height},left=${left},top=${top},menubar=no,status=no,toolbar=no,scrollbars=yes,resizable=yes`
    );

    if (!popup) {
      setConnecting(false);
      setError('Popup was blocked by your browser. Please allow popups for this site.');
      toast.error('Popup was blocked. Please allow popups in your browser settings.');
      return;
    }

    popupRef.current = popup;

    // STEP B: Poll popup.closed watchdog in case user manually closes window with (X)
    watchdogRef.current = setInterval(() => {
      if (popup.closed) {
        if (watchdogRef.current) clearInterval(watchdogRef.current);
        setConnecting(false);
      }
    }, 1000);

    try {
      // STEP C: Request Google Auth URL
      const res = await fetchWithTenant(
        `${apiBaseUrl}/api/social-integration/email/google/start`,
        {
          method: 'POST',
          headers: getHeaders(),
        }
      );

      if (!res.ok) {
        throw new Error(`Failed to start OAuth flow (HTTP ${res.status})`);
      }

      const data = await res.json();

      if (data.url) {
        // STEP D: Navigate popup to Google login screen
        popup.location.href = data.url;
      } else {
        popup.close();
        setConnecting(false);
        setError('Failed to initiate Google authentication');
        toast.error('Server did not return a valid Google authentication URL.');
      }
    } catch (err: any) {
      if (popup && !popup.closed) popup.close();
      setConnecting(false);
      const errMsg = err.message || 'Error initiating Google connection';
      setError(errMsg);
      toast.error(errMsg);
    }
  };

  // 4. Handle Disconnect Confirmation & Execution
  const executeDisconnect = async () => {
    try {
      setIsDisconnecting(true);
      setError(null);
      const res = await fetchWithTenant(
        `${apiBaseUrl}/api/social-integration/email/google/disconnect`,
        {
          method: 'POST',
          headers: getHeaders(),
        }
      );

      const data = await res.json();

      if (res.ok && data.success) {
        setConnected(false);
        setEmail('');
        onStatusChangeRef.current?.({ connected: false });
        setIsDisconnectModalOpen(false);
        toast.success('Google account disconnected successfully');
      } else {

        const errMsg = data.message || 'Failed to disconnect Google account';
        setError(errMsg);
        toast.error(errMsg);
      }
    } catch (err: any) {
      const errMsg = err.message || 'Error disconnecting account';
      setError(errMsg);
      toast.error(errMsg);
    } finally {
      setIsDisconnecting(false);
    }
  };

  // State 1: Checking status skeleton loader
  if (loading) {
    return (
      <div className="p-8 flex flex-col items-center justify-center gap-3 text-center bg-slate-50/50 dark:bg-gray-800/30 rounded-2xl border border-slate-100 dark:border-gray-800">
        <Loader2 className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-spin" />
        <p className="text-sm font-medium text-slate-600 dark:text-gray-300">
          Checking email integration status...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Informational Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-gray-800">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-gray-100">
            Proposal Email Sender
          </h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
            Connect a Gmail or Google Workspace account to automatically send proposals and quotations to leads.
          </p>
        </div>
        {connected && (
          <button
            onClick={() => checkStatus(true)}
            title="Refresh status"
            className="self-start sm:self-auto p-2 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error Alert Banner */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-3 text-red-700 dark:text-red-400 text-xs">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Integration Warning</p>
            <p className="mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => setError(null)}
            className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* State 2: Connected Card */}
      {connected ? (
        <div className="p-6 rounded-2xl border border-emerald-200/80 dark:border-emerald-900/50 bg-gradient-to-br from-emerald-50/50 via-white to-emerald-50/20 dark:from-emerald-950/20 dark:via-gray-900 dark:to-emerald-950/10 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-sm">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected
                </span>
                <span className="text-xs font-semibold text-slate-400 dark:text-gray-500">
                  Gmail OAuth 2.0
                </span>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-gray-100 mt-1">
                {email}
              </p>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-500 dark:text-gray-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>Authorized for automated quotation & proposal sending</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            <button
              onClick={() => setIsDisconnectModalOpen(true)}
              className="px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-xs font-bold transition-all shadow-sm flex items-center gap-2"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        </div>
      ) : (
        /* State 3: Disconnected / Connect Button Card */
        <div className="p-8 rounded-2xl border border-slate-200 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-800/20 flex flex-col items-center text-center max-w-xl mx-auto">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-sm">
            <Mail className="w-7 h-7" />
          </div>
          <h4 className="text-lg font-bold text-slate-900 dark:text-gray-100">
            No Email Account Connected
          </h4>
          <p className="text-xs text-slate-500 dark:text-gray-400 max-w-md mt-1.5 mb-6 leading-relaxed">
            Link your Google account so LAD can automatically generate and dispatch tailored proposals from your official email address.
          </p>

          <button
            onClick={handleConnect}
            disabled={connecting}
            className={cn(
              'px-6 py-3 rounded-xl text-sm font-bold shadow-md transition-all flex items-center gap-3',
              connecting
                ? 'bg-blue-300 dark:bg-blue-800 text-white cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg active:scale-95'
            )}
          >
            {connecting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Connecting with Google...
              </>
            ) : (
              <>
                {/* Official Google 'G' Icon */}
                <svg className="w-4 h-4 bg-white rounded-full p-0.5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Connect with Email
              </>
            )}
          </button>

          <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-4 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Tokens are securely stored and encrypted per tenant.
          </p>
        </div>
      )}

      {/* Custom Disconnect Confirmation Modal */}
      <AnimatePresence>
        {isDisconnectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDisconnecting && setIsDisconnectModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 border border-slate-100 dark:border-gray-800"
            >
              <div className="p-6">
                <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-gray-100">
                  Disconnect Gmail Account?
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-2 leading-relaxed">
                  Are you sure you want to disconnect <strong className="text-slate-800 dark:text-gray-200">{email}</strong>?
                  Automated proposal dispatch will be paused until an email account is reconnected.
                </p>

                <div className="flex items-center justify-end gap-3 mt-6">
                  <button
                    type="button"
                    disabled={isDisconnecting}
                    onClick={() => setIsDisconnectModalOpen(false)}
                    className="px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDisconnecting}
                    onClick={executeDisconnect}
                    className="px-5 py-2.5 text-xs font-bold bg-red-600 hover:bg-red-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {isDisconnecting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Disconnecting...
                      </>
                    ) : (
                      'Disconnect Account'
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
