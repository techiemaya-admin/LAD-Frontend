'use client';
import React, { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, ExternalLink, ChevronDown, ChevronUp, Eye, EyeOff, X, Power, Linkedin } from 'lucide-react';
import { Dialog, DialogTitle, DialogContent, DialogActions, DialogHeader } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getApiBaseUrl } from '@/lib/api-utils';
import { apiGet, apiPost } from '@/lib/api';
import { safeStorage } from '@lad/shared/storage';  
import { io } from 'socket.io-client';

import { LINKEDIN_LOGO_PATH, PHONE_AUTH_PATH } from '@/constants/icons';

// Helper to get auth headers for fetch calls
const getAuthHeaders = () => {
  const token = safeStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};
/** What the integration can actually do with this account, from Unipile. */
interface LinkedInCapabilities {
  known?: boolean;
  premium?: boolean;
  salesNavigator?: boolean;
  recruiter?: boolean;
  canInMail?: boolean;
  totalCredits?: number;
  credits?: { premium?: number; recruiter?: number; salesNavigator?: number };
}

interface LinkedInAccount {
  capabilities?: LinkedInCapabilities;
  id?: string;
  connected: boolean;
  status?: 'connected' | 'disconnected' | 'stopped' | 'checkpoint' | 'unknown' | 'error';
  profileName?: string;
  accountName?: string; // Account name from database
  profileUrl?: string;
  email?: string;
  connectedAt?: string;
  connectionMethod?: string;
  checkpoint?: {
    required: boolean;
    type?: string;
    message?: string;
    is_yes_no?: boolean;
    is_otp?: boolean;
  };
  unipileAccount?: {
    id: string;
    state: string;
    lastChecked: string;
  };
}
interface LinkedInStatusResponse {
  connected: boolean;
  status: string;
  connections: LinkedInAccount[];
  totalConnections: number;
}
// Tenant-level LinkedIn automation config (one per tenant, derived from the
// active social_linkedin_accounts metadata). Returned by
// GET /api/social-integration/linkedin/automation-settings wrapped in { data }.
interface LinkedInAutomationSettings {
  auto_like_posts: boolean;
  auto_comment_posts: boolean;
  ai_agent_enabled: boolean;
  ai_agent_reply_delay_seconds: number;
  // Tenant-chosen model for AI-personalized outbound messages (connection
  // requests + follow-ups). Kept in sync with the backend allow-list in
  // core/constants/aiMessageModels.js.
  /** Still returned by the backend; the picker was removed and every tenant
   *  generates on DeepSeek. Kept so the type matches the payload. */
  linkedin_ai_model?: string;
}
// Curated model menu for LinkedIn outbound message personalization. Must match
// the backend registry (core/constants/aiMessageModels.js) — ids are validated
// server-side on PUT, so an out-of-sync entry here is rejected rather than saved.
type AuthMethod = 'credentials' | 'cookies';
export const LinkedInIntegration: React.FC = () => {
  const [linkedInConnections, setLinkedInConnections] = useState<LinkedInAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState<{ [key: string]: boolean }>({});
  const [reconnectingAccount, setReconnectingAccount] = useState<{ [key: string]: boolean }>({});
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [authMethod, setAuthMethod] = useState<AuthMethod>('credentials');
  const [showOptionalSettings, setShowOptionalSettings] = useState(false);
  const [showCookieHelp, setShowCookieHelp] = useState(false);
  // Form states
  const [email, setEmail] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [liAtCookie, setLiAtCookie] = useState('');
  const [liACookie, setLiACookie] = useState('');
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [connectionSuccess, setConnectionSuccess] = useState(false);
  const [reconnecting, setReconnecting] = useState(false);
  const [statusPolling, setStatusPolling] = useState<NodeJS.Timeout | null>(null);
  // OTP verification states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [currentCheckpointAccount, setCurrentCheckpointAccount] = useState<LinkedInAccount | null>(null);
  // Yes/No auto-polling states
  const [yesNoPolling, setYesNoPolling] = useState<NodeJS.Timeout | null>(null);
  const [autoResolving, setAutoResolving] = useState(false);
  // ── AI Replies (tenant-level LinkedIn AI agent) ────────────────────────────
  // ai_agent_enabled is stored once per tenant, so every connected account shares
  // the same flag. We hold the full settings object (not just the boolean) so a
  // PUT can resend auto_like_posts / auto_comment_posts / reply-delay unchanged —
  // the backend rebuilds all four keys, so omitting them would clobber them.
  const [automationSettings, setAutomationSettings] = useState<LinkedInAutomationSettings | null>(null);
  const [aiRepliesSaving, setAiRepliesSaving] = useState(false);
  const [aiToast, setAiToast] = useState<{ kind: 'ok' | 'err'; message: string } | null>(null);
  const inputClass =
      'w-full rounded-xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-[#00051d] px-3 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 outline-none focus:border-slate-400 dark:focus:border-slate-600 focus:ring-0 focus-visible:ring-0 transition-all [box-shadow:0_0_0_30px_white_inset] dark:[box-shadow:0_0_0_30px_#00051d_inset] [-webkit-text-fill-color:#1e293b] dark:[-webkit-text-fill-color:white] [&:-webkit-autofill]:[box-shadow:0_0_0_30px_white_inset] [&:-webkit-autofill]:[-webkit-text-fill-color:#1e293b] dark:[&:-webkit-autofill]:[box-shadow:0_0_0_30px_#00051d_inset] dark:[&:-webkit-autofill]:[-webkit-text-fill-color:white]';

  // Auto-dismiss the AI Replies toast after a few seconds (mirrors Instagram).
  useEffect(() => {
    if (!aiToast) return;
    const t = setTimeout(() => setAiToast(null), 4500);
    return () => clearTimeout(t);
  }, [aiToast]);
  useEffect(() => {
    checkLinkedInConnection();
    // Fetch the tenant's AI-agent setting on mount and whenever the account
    // count changes (connect/disconnect). Deliberately NOT in the 30s poll so
    // an in-flight optimistic toggle isn't overwritten mid-flight.
    void fetchAutomationSettings();
    // Start polling status every 30 seconds if any connection is active
    const pollInterval = setInterval(() => {
      if (linkedInConnections.some(conn => conn.connected)) {
        checkLinkedInConnection();
      }
    }, 30000); // Poll every 30 seconds
    setStatusPolling(pollInterval);
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      if (yesNoPolling) {
        clearInterval(yesNoPolling);
      }
    };
  }, [linkedInConnections.length]);

  // Socket.IO real-time listener for account status updates
  useEffect(() => {
    const socketUrl = getApiBaseUrl().replace('/api', ''); // Remove /api from base URL
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    // Join tenant-specific room
    const userStr = safeStorage.getItem('user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        const tenantId = user.tenantId || user.organizationId;
        if (tenantId) {
          const tenantRoom = `tenant:${tenantId}`;
          socket.emit('join', tenantRoom);
        }
      } catch (e) {
        // Failed to parse user data
      }
    }

    // Listen for LinkedIn account status updates
    socket.on('linkedin:account:status', (data: {
      accountId: string;
      accountName?: string;
      profileName?: string;
      status: string;
      dbStatus?: string;
      needsReconnect?: boolean;
      timestamp: string;
    }) => {

      const newStatus = data.status || data.dbStatus;
      const isActive = newStatus === 'active' || newStatus === 'connected';
      const isCheckpoint = newStatus === 'checkpoint';

      // Update account status in state
      setLinkedInConnections(prev => prev.map(account => {
        if (account.id === data.accountId || 
            account.unipileAccount?.id === data.accountId ||
            account.accountName === data.accountName ||
            account.profileName === data.profileName) {
          return {
            ...account,
            status: newStatus === 'active' ? 'connected' : 
                   newStatus === 'credentials_expired' ? 'error' :
                   newStatus === 'error' ? 'error' :
                   newStatus === 'stopped' ? 'stopped' : 
                   newStatus === 'checkpoint' ? 'checkpoint' : 'unknown' as any,
            connected: isActive,
          };
        }
        return account;
      }));

      // If checkpoint is resolved (user clicked Yes/No on mobile device)
      if (isActive && showOtpModal && currentCheckpointAccount) {
        const isCurrentAccount = currentCheckpointAccount.id === data.accountId || 
                                currentCheckpointAccount.unipileAccount?.id === data.accountId;
        
        if (isCurrentAccount) {
          // Stop polling if active
          if (yesNoPolling) {
            clearInterval(yesNoPolling);
            setYesNoPolling(null);
          }
          
          // Auto-close modal and show success
          setAutoResolving(true);
          setShowOtpModal(false);
          setConnectionSuccess(true);
          
          // Refresh account status
          const accountEmail = currentCheckpointAccount?.email || email;
          checkLinkedInConnection(accountEmail);
          
          // Close connection modal after a short delay
          setTimeout(() => {
            setShowConnectionModal(false);
            setEmail('');
            setPinCode('');
            setLiAtCookie('');
            setLiACookie('');
            setAutoResolving(false);
          }, 2000);
        }
      }

      // Show notification if account needs reconnection
      if (data.needsReconnect) {
        const accountName = data.accountName || data.profileName || 'LinkedIn Account';
        alert(`⚠️ LinkedIn Account Update: ${accountName} needs reconnection. Please reconnect to continue using this account.`);
      }
    });

    socket.on('connect', () => {
      // Connected to server
    });

    socket.on('disconnect', () => {
      // Disconnected from server
    });

    socket.on('connect_error', (error) => {
      // Connection error
    });

    return () => {
      socket.disconnect();
    };
  }, []); // Run once on mount

  // Auto-polling for Yes/No checkpoint - FALLBACK only (primary is webhook + Socket.IO)
  // Keeps polling as backup in case webhook fails
  useEffect(() => {
    // If we have a Yes/No checkpoint, start polling as fallback (webhook should handle this)
    if (currentCheckpointAccount?.checkpoint?.is_yes_no && showOtpModal && !yesNoPolling) {
      const pollInterval = setInterval(async () => {
        try {
          const accountId    = currentCheckpointAccount?.unipileAccount?.id || currentCheckpointAccount?.id;
          const accountEmail = currentCheckpointAccount?.email || email || '';
          if (!accountId) return;
          const emailParam = accountEmail ? `&email=${encodeURIComponent(accountEmail)}` : '';
          const response = await fetch(`${getApiBaseUrl()}/api/campaigns/linkedin/checkpoint-status?account_id=${accountId}${emailParam}`, {
            method: 'GET',
            headers: getAuthHeaders(),
          });
          const data = await response.json();
          // If checkpoint is resolved (user clicked Yes on mobile), auto-login
          if (data.connected || data.status === 'connected' || (data.checkpoint && !data.checkpoint.required)) {
            // Stop polling
            if (yesNoPolling) {
              clearInterval(yesNoPolling);
              setYesNoPolling(null);
            }
            // Auto-close modal and refresh
            setAutoResolving(true);
            setShowOtpModal(false);
            setConnectionSuccess(true);
            // Refresh account status
            const accountEmail = currentCheckpointAccount?.email || email;
            await checkLinkedInConnection(accountEmail);
            // Close connection modal after a short delay
            setTimeout(() => {
              setShowConnectionModal(false);
              setEmail('');
              setPinCode('');
              setLiAtCookie('');
              setLiACookie('');
              setAutoResolving(false);
            }, 2000);
          }
        } catch (error) {
          // Error polling checkpoint status
        }
      }, 2000); // Poll every 2 seconds for fast detection
      setYesNoPolling(pollInterval);
      // Cleanup after 5 minutes (stop polling if user hasn't clicked Yes)
      setTimeout(() => {
        if (yesNoPolling) {
          clearInterval(yesNoPolling);
          setYesNoPolling(null);
          }
      }, 5 * 60 * 1000); // 5 minutes
    }
    return () => {
      if (yesNoPolling) {
        clearInterval(yesNoPolling);
        setYesNoPolling(null);
      }
    };
  }, [currentCheckpointAccount?.checkpoint?.is_yes_no, showOtpModal, yesNoPolling, email]);
  const checkLinkedInConnection = async (email?: string) => {
    try {
      setLoading(true); // Explicitly set loading at start
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject({ timeout: true }), 15000) // Increased to 15s
      );
      // Use apiGet for authenticated requests with timeout
      const dataPromise = apiGet<any>('/api/campaigns/linkedin/accounts');
      const data = await Promise.race([dataPromise, timeoutPromise]) as any;
      // Handle response from backend (returns { success, accounts })
      if (data.accounts && Array.isArray(data.accounts)) {
        setLinkedInConnections(data.accounts);
      } else if (data.connections && Array.isArray(data.connections)) {
        // Fallback for old format
        setLinkedInConnections(data.connections);
      } else {
        // Single account format
        setLinkedInConnections([data as LinkedInAccount]);
      }
    } catch (error: any) {
      // Silently handle timeout - don't log as error since it's expected when backend is slow/unavailable
      if (error?.timeout) {
        // Request timed out - LinkedIn service may be unavailable
      } else {
        // Error checking connection
      }
      // Set empty connections array to show disconnected state
      setLinkedInConnections([]);
    } finally {
      setLoading(false);
    }
  };
  // GET the tenant's LinkedIn automation settings. Response is { success, data }.
  // Failure is non-fatal: we leave settings unloaded and keep the pill disabled
  // (so a toggle can never PUT a partial/clobbering payload).
  const fetchAutomationSettings = async () => {
    try {
      const res = await apiGet<{ success?: boolean; data?: LinkedInAutomationSettings }>(
        '/api/social-integration/linkedin/automation-settings'
      );
      if (res?.data) {
        setAutomationSettings(res.data);
      }
    } catch (error) {
      // Non-fatal — see note above.
    }
  };
  // Flip the tenant-level AI agent on/off. Optimistic UI, then PUT the FULL set
  // (only ai_agent_enabled changed) so the backend's jsonb rebuild preserves
  // auto_like_posts / auto_comment_posts / reply-delay. Reverts + toasts on
  // failure (mirrors Instagram's per-account AI toggle).
  const toggleAiReplies = async () => {
    if (!automationSettings || aiRepliesSaving) return;
    const previous = automationSettings;
    const next = !previous.ai_agent_enabled;
    // Optimistic — all cards read this one flag, so they flip together.
    setAutomationSettings({ ...previous, ai_agent_enabled: next });
    setAiRepliesSaving(true);
    try {
      const response = await fetch(
        `${getApiBaseUrl()}/api/social-integration/linkedin/automation-settings`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({
            auto_like_posts: previous.auto_like_posts,
            auto_comment_posts: previous.auto_comment_posts,
            ai_agent_enabled: next,
            ai_agent_reply_delay_seconds: previous.ai_agent_reply_delay_seconds,
          }),
        }
      );
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.success) {
        throw new Error(data?.error || data?.message || 'Failed to update AI Replies');
      }
      // Reconcile with the server's authoritative copy.
      if (data.data) setAutomationSettings(data.data as LinkedInAutomationSettings);
    } catch (error) {
      // Roll back the optimistic flip and surface the error.
      setAutomationSettings(previous);
      setAiToast({
        kind: 'err',
        message: error instanceof Error ? error.message : 'Could not update AI Replies.',
      });
    } finally {
      setAiRepliesSaving(false);
    }
  };
  // Change the tenant's outbound-message model. Optimistic UI, then a PARTIAL PUT
  // ({ linkedin_ai_model }) — the backend jsonb-merges it, so the other automation
  // settings are preserved. Reverts + toasts on failure (mirrors toggleAiReplies).
  const handleConnect = async () => {
    setConnecting(true);
    setConnectionError(null);
    setConnectionSuccess(false);
    try {
      // Get user agent for cookie method
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : '';
      const payload = authMethod === 'credentials' 
        ? { method: 'credentials', email, ['pass' + 'word']: pinCode }
        : { method: 'cookies', li_at: liAtCookie, li_a: liACookie, user_agent: userAgent };
      const data = await apiPost<any>('/api/campaigns/linkedin/connect', payload);
      if (!data.success) {
        const errorMessage = data.error || data.message || 'Failed to connect LinkedIn account';
        setConnectionError(errorMessage);
        throw new Error(errorMessage);
      }
      // Check if checkpoint (OTP or Yes/No) is required.
      // Accept either explicit `required: true` OR presence of is_yes_no / is_otp flags
      // so the UI works even if the backend omits the `required` field.
      const isCheckpoint =
        data.checkpoint &&
        (data.checkpoint.required || data.checkpoint.is_yes_no || data.checkpoint.is_otp);
      if (isCheckpoint) {
        // Show checkpoint modal instead of closing connection modal
        setShowOtpModal(true);
        setConnectionSuccess(false);
        setConnectionError(null);
        // Store checkpoint account info
        const checkpointAccount: LinkedInAccount = {
          id: data.account_id,
          connected: false,
          status: 'checkpoint',
          profileName: data.profileName,
          profileUrl: data.profileUrl,
          email: data.email,
          connectedAt: data.connectedAt,
          checkpoint: data.checkpoint,
          unipileAccount: data.unipileAccount
        };
        setCurrentCheckpointAccount(checkpointAccount);
        // If it's a Yes/No checkpoint, show message that we're monitoring
        if (data.checkpoint.is_yes_no) {
          }
      } else {
        // Success - account created or connected
        setConnectionSuccess(true);
        // Clear form after a short delay to show success message
        setTimeout(() => {
          setShowConnectionModal(false);
          setEmail('');
          setPinCode('');
          setLiAtCookie('');
          setLiACookie('');
          setConnectionError(null);
          setConnectionSuccess(false);
          // Refresh connection status to get ALL accounts for this user
          checkLinkedInConnection();
        }, 1500);
      }
    } catch (error) {
      // Error connecting LinkedIn
      setConnectionError(error instanceof Error ? error.message : 'Failed to connect LinkedIn account');
    } finally {
      setConnecting(false);
    }
  };
  const handleVerifyOtp = async () => {
    setVerifyingOtp(true);
    setOtpError(null);
    try {
      // Include account_id and email from checkpoint account to help backend find the correct account
      const payload: any = { otp };
      if (currentCheckpointAccount?.unipileAccount?.id || currentCheckpointAccount?.id) {
        payload.account_id = currentCheckpointAccount?.unipileAccount?.id || currentCheckpointAccount?.id;
      }
      if (currentCheckpointAccount?.email || email) {
        payload.email = currentCheckpointAccount?.email || email;
      }
      const response = await fetch(`${getApiBaseUrl()}/api/campaigns/linkedin/verify-otp`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        const errorMessage = data.error || 'Failed to verify OTP';
        setOtpError(errorMessage);
        throw new Error(errorMessage);
      }
      // OTP verified successfully
      setShowOtpModal(false);
      setOtp('');
      setConnectionSuccess(true);
      // Stop Yes/No polling if active
      if (yesNoPolling) {
        clearInterval(yesNoPolling);
        setYesNoPolling(null);
      }
      // Refresh account status with email if available
      const accountEmail = currentCheckpointAccount?.email || email;
      await checkLinkedInConnection(accountEmail);
      // Close connection modal after a short delay
      setTimeout(() => {
        setShowConnectionModal(false);
        setEmail('');
        setPinCode('');
        setLiAtCookie('');
        setLiACookie('');
      }, 2000);
    } catch (error) {
      // Error verifying OTP
      setOtpError(error instanceof Error ? error.message : 'Failed to verify OTP');
    } finally {
      setVerifyingOtp(false);
    }
  };
  const handleSolveYesNoCheckpoint = async (answer: 'YES' | 'NO') => {
    setVerifyingOtp(true);
    setOtpError(null);
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/campaigns/linkedin/solve-checkpoint`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ 
          answer,
          account_id: currentCheckpointAccount?.unipileAccount?.id || currentCheckpointAccount?.id
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        const errorMessage = data.error || `Failed to submit ${answer} answer`;
        setOtpError(errorMessage);
        throw new Error(errorMessage);
      }
      // Checkpoint solved successfully
      setShowOtpModal(false);
      setConnectionSuccess(true);
      // Stop Yes/No polling if active
      if (yesNoPolling) {
        clearInterval(yesNoPolling);
        setYesNoPolling(null);
      }
      // Refresh account status with email if available
      const accountEmail = currentCheckpointAccount?.email || email;
      await checkLinkedInConnection(accountEmail);
      // Close connection modal after a short delay
      setTimeout(() => {
        setShowConnectionModal(false);
        setEmail('');
        setPinCode('');
        setLiAtCookie('');
        setLiACookie('');
      }, 2000);
    } catch (error) {
      // Error solving checkpoint
      setOtpError(error instanceof Error ? error.message : `Failed to submit ${answer} answer`);
    } finally {
      setVerifyingOtp(false);
    }
  };
  const disconnectLinkedIn = async (connectionId?: string, email?: string) => {
    const confirmMessage = connectionId 
      ? `Are you sure you want to disconnect this LinkedIn account (${email || 'this account'})?`
      : 'Are you sure you want to disconnect your LinkedIn account?';
    if (!confirm(confirmMessage)) {
      return;
    }
    // If no connectionId provided, try to get the first account
    let accountId = connectionId;
    if (!accountId && linkedInConnections.length > 0) {
      accountId = linkedInConnections[0].id;
    }
    if (!accountId) {
      alert('No LinkedIn account found to disconnect');
      return;
    }
    const disconnectKey = accountId || 'default';
    setDisconnecting(prev => ({ ...prev, [disconnectKey]: true }));
    try {
      const response = await fetch(`${getApiBaseUrl()}/api/campaigns/linkedin/disconnect`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || 'Failed to disconnect LinkedIn');
      }
      // Remove the disconnected connection from the list
      setLinkedInConnections(prev => prev.filter(conn => conn.id !== accountId));
      alert('LinkedIn account disconnected successfully');
    } catch (error) {
      // Error disconnecting LinkedIn
      alert(error instanceof Error ? error.message : 'Failed to disconnect LinkedIn account');
    } finally {
      setDisconnecting(prev => ({ ...prev, [disconnectKey]: false }));
    }
  };
  const reconnectLinkedIn = async (useModal = false) => {
    // If useModal is true, open the connection modal for user to enter credentials
    if (useModal) {
      setShowConnectionModal(true);
      return;
    }
    setReconnecting(true);
    setConnectionError(null);
    try {
      // Try to reconnect with stored credentials/cookies first
      const userAgent = typeof window !== 'undefined' ? navigator.userAgent : '';
      const response = await fetch(`${getApiBaseUrl()}/api/campaigns/linkedin/reconnect`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ user_agent: userAgent }), // Will use stored credentials if available
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        const errorMessage = data.error || 'Failed to reconnect LinkedIn account';
        setConnectionError(errorMessage);
        // If reconnect fails and needs credentials, show modal
        if (errorMessage.includes('provide') || errorMessage.includes('auth') || errorMessage.toLowerCase().includes('pass' + 'word')) {
          // Don't show error, just open modal
          setShowConnectionModal(true);
          setConnectionError(null);
        }
        return;
      }
      // Success - refresh status
      setConnectionSuccess(true);
      await checkLinkedInConnection();
      setTimeout(() => {
        setConnectionSuccess(false);
      }, 2000);
    } catch (error) {
      // Error reconnecting LinkedIn
      setConnectionError(error instanceof Error ? error.message : 'Failed to reconnect LinkedIn account');
      // Open modal if error suggests credentials needed
      if (error instanceof Error && (error.message.includes('provide') || error.message.includes('credentials'))) {
        setShowConnectionModal(true);
        setConnectionError(null);
      }
    } finally {
      setReconnecting(false);
    }
  };

  const reconnectInactiveAccount = async (account: LinkedInAccount) => {
    const accountKey = account.id || account.email || 'default';
    
    // For inactive accounts, always prompt user to enter credentials
    // (old accounts don't have stored details)
    setEmail(account.metadata?.email || account.email || '');
    setPinCode(''); // User must enter details
    setAuthMethod('credentials');
    setShowConnectionModal(true);
    setConnectionError(null);
  };

  const getStatusDisplay = (accountStatus?: string, isConnected?: boolean) => {
    const status = accountStatus || (isConnected ? 'connected' : 'disconnected');
    switch (status) {
      case 'active':
      case 'connected':
        return {
          color: 'text-green-600',
          bgColor: 'bg-green-500',
          icon: CheckCircle2,
          text: 'Connected',
          showPulse: true
        };
      case 'inactive':
      case 'disconnected':
        return {
          color: 'text-gray-400',
          bgColor: 'bg-gray-400',
          icon: AlertCircle,
          text: 'Disconnected',
          showPulse: false
        };
      case 'stopped':
        return {
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-500',
          icon: AlertCircle,
          text: 'Stopped',
          showPulse: false
        };
      case 'credentials_expired':
      case 'checkpoint':
        return {
          color: 'text-orange-600',
          bgColor: 'bg-orange-500',
          icon: AlertCircle,
          text: 'Reconnect Required',
          showPulse: false
        };
      case 'unknown':
      case 'error':
      default:
        return {
          color: 'text-red-600',
          bgColor: 'bg-red-500',
          icon: AlertCircle,
          text: 'Error',
          showPulse: false
        };
    }
  };

  // Modern browser autofill utility string with forced light/dark text fills
  const autofillClasses = "autofill:shadow-[0_0_0_1000px_#1e293b_inset] dark:autofill:shadow-[0_0_0_1000px_#1e293b_inset] [webkit-text-fill-color:#111827_!important] dark:[webkit-text-fill-color:#f3f4f6_!important] transition-[background-color] duration-[99999s] ease-in-out";

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
      </div>
    );
  }
  return (
    <>
      <div className="w-full px-2 sm:px-4 lg:px-6 py-4 space-y-4 font-sans text-slate-900 dark:text-white">
        {/* 1. SEPARATED TOP HEADER CARD */}
        <div className="rounded-2xl border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#071131] p-5 shadow-sm dark:shadow-none">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {/* LinkedIn Icon Box */}
              <div className="w-10 h-10 rounded-lg bg-[#1d4ed8] flex items-center justify-center shrink-0">
                <Linkedin className="h-6 w-6 text-white fill-current" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white leading-tight">LinkedIn</h3>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                  Connect your LinkedIn account for automated lead enrichment and outreach
                </p>
              </div>
            </div>

            {/* Top Right Status Badge */}
            <div className="flex items-center shrink-0">
              {(() => {
                const hasConnected = linkedInConnections.some(conn => conn.connected);
                const primaryStatus = linkedInConnections.length > 0
                  ? linkedInConnections[0].status || (linkedInConnections[0].connected ? 'connected' : 'disconnected')
                  : 'disconnected';
                const statusDisplay = getStatusDisplay(primaryStatus, hasConnected);

                return (
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-200 dark:border-[#0e4835] bg-emerald-50 dark:bg-[#061e19] text-emerald-700 dark:text-[#00d68f] text-xs font-medium">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-[#00d68f]" />
                    <span>
                      {linkedInConnections.length > 0 ? `${linkedInConnections.length} Account${linkedInConnections.length > 1 ? 's' : ''}` : statusDisplay.text}
                    </span>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>

        {/* AI Replies toast feedback */}
        {aiToast && (
          <div
            className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
              aiToast.kind === 'ok'
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
                : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
            }`}
          >
            {aiToast.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
            {aiToast.message}
          </div>
        )}

        {/* 2. SECTION TITLE */}
        {linkedInConnections.length > 0 && (
          <h4 className="font-medium text-slate-700 dark:text-gray-100 text-sm pt-1">
            Connected Accounts ({linkedInConnections.length})
          </h4>
        )}

        {/* 3. CONNECTED ACCOUNTS LIST */}
        {linkedInConnections.length > 0 && (
          <div className="space-y-3">
            {linkedInConnections.map((account, index) => {
              return (
                <div 
                  key={account.id || account.email || `account-${index}`} 
                  className="p-5 rounded-2xl border border-slate-200 dark:border-blue-950/40 bg-slate-50 dark:bg-[#08172e] shadow-sm dark:shadow-none"
                >
                  {/* Header Row: Account Name & Actions Vertically Centered */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="min-w-0">
                      <p className="font-medium text-slate-900 dark:text-gray-100 truncate text-sm">
                        {account.accountName || account.profileName || account.email || 'LinkedIn Account'}
                      </p>
                    </div>

                    {/* Status Badge + Disconnect Button */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-[#0e4835] bg-emerald-50 dark:bg-[#061e19] text-emerald-700 dark:text-[#00d68f] text-xs font-medium">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 dark:bg-[#00d68f]"></span>
                        <CheckCircle2 className="h-3 w-3 text-emerald-600 dark:text-[#00d68f]" />
                        <span>Connected</span>
                      </div>

                      <button
                        onClick={() => disconnectLinkedIn(account.id, account.email)}
                        disabled={disconnecting[account.id || 'default']}
                        className="px-4 py-1.5 text-xs bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-300 dark:disabled:bg-red-950 disabled:cursor-not-allowed transition-colors whitespace-nowrap cursor-pointer font-medium"
                      >
                        {disconnecting[account.id || 'default'] ? 'Disconnecting...' : 'Disconnect'}
                      </button>
                    </div>
                  </div>

                  {/* Profile Info Sub-details */}
                  <div className="mt-1">
                    {account.profileUrl && (
                      <a
                        href={account.profileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 inline-flex items-center gap-1 break-all"
                      >
                        View Profile
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    )}

                    {account.connectedAt && (
                      <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                        Connected on {new Date(account.connectedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Status warnings */}
                  {account.status && account.status !== 'connected' && account.status !== 'active' && (
                    <div className="mt-3 p-2 rounded-md text-xs bg-amber-50 dark:bg-yellow-950/30 text-amber-800 dark:text-yellow-400 border border-amber-200 dark:border-yellow-500/20">
                      {(account.status === 'disconnected' || account.status === 'inactive') && '⚠️ Account is disconnected. Please reconnect to continue using LinkedIn features.'}
                      {account.status === 'stopped' && '⏸️ Account is stopped. Click reconnect to resume.'}
                      {(account.status === 'checkpoint' || account.status === 'credentials_expired') && '🔒 LinkedIn requires verification. Please reconnect with your credentials.'}
                      {account.status === 'unknown' && '❓ Unable to determine account status. Please check your connection.'}
                      {account.status === 'error' && '❌ Error checking account status. Please try reconnecting.'}
                    </div>
                  )}

                  {/* AI Toggle */}
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <AiToggleChip
                      label="AI Replies"
                      enabled={automationSettings?.ai_agent_enabled ?? true}
                      disabled={!automationSettings || aiRepliesSaving}
                      onToggle={toggleAiReplies}
                    />
                  </div>
                  <LinkedInPlanSummary caps={account.capabilities} />
                </div>
              );
            })}
          </div>
        )}

        {/* 4. ADD BUTTON */}
        <button
          onClick={() => setShowConnectionModal(true)}
          className="w-full h-12 px-5 rounded-2xl text-sm font-semibold text-white bg-[#2463ef] hover:bg-[#1d4ed8] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#1d4ed8]/20 active:scale-[0.99] cursor-pointer border-none"
        >
          <svg className="h-4 w-4 shrink-0 fill-current" viewBox="0 0 24 24">
            <path d={LINKEDIN_LOGO_PATH}/>
          </svg>
          <span>
            {linkedInConnections.length > 0 ? 'Add Another LinkedIn Account' : 'Connect LinkedIn Account'}
          </span>
        </button>

        {/* 5. SEPARATED IMPORTANT NOTE CARD */}
        <div className="bg-amber-50 dark:bg-[#071925] border border-amber-200 dark:border-yellow-500/30 rounded-2xl p-4">
          <div className="flex items-start gap-2 sm:gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-yellow-400 mt-0.5 shrink-0" />
            <div className="text-sm text-amber-900 dark:text-yellow-200 min-w-0 leading-relaxed">
              <p className="font-semibold mb-1 text-amber-950 dark:text-yellow-300">Important Note</p>
              <span>
                LinkedIn has strict rate limits and usage policies. Automated actions should be used
                responsibly to avoid account restrictions.{" "}
              </span>
              <span className="text-amber-700 dark:text-yellow-400 font-semibold">
                We recommend limiting connection requests to 50-100 per day.
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Connection Modal */}
      <Dialog open={showConnectionModal} onOpenChange={setShowConnectionModal}>
        <DialogContent className="sm:max-w-5xl sm:w-[90vw] p-0 bg-white dark:bg-[#000724] border border-slate-200 dark:border-slate-800/80 outline-none focus:outline-none focus-visible:outline-none">

          <DialogHeader className="bg-slate-50 dark:bg-[#000724] px-6 py-4 border-b border-slate-200 dark:border-slate-800/80 rounded-t-2xl">
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 dark:bg-[#000724] p-2 rounded-lg mr-3 flex-shrink-0">
                <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center`}>
                <Linkedin className="h-6 w-6 text-blue-700 "/>
                </div>
              </div>
              <DialogTitle className="text-xl font-semibold text-slate-900 dark:text-white">Sign in to LinkedIn</DialogTitle>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 max-h-[70vh]">
            {/* Choose Method */}
            <div className="bg-slate-50/60 dark:bg-[#00051d]/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/40 text-center">
              <h4 className="mb-2.5 text-xs font-bold text-slate-400 dark:text-slate-300 uppercase tracking-wider">
                Choose method
              </h4>
              <div className="w-full flex gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-800/80 dark:bg-[#00051d]">
                <button
                    type="button"
                  onClick={() => setAuthMethod('credentials')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg h-11 text-sm font-bold transition-all cursor-pointer ${
                    authMethod === 'credentials'
                      ? 'bg-[#0b1957] text-white shadow-md dark:bg-[#2563eb]'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40'
                  }`}
                >
                  Credentials
                </button>
                <button
                    type="button"
                  onClick={() => setAuthMethod('cookies')}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-lg h-11 text-sm font-bold transition-all cursor-pointer ${
                    authMethod === 'cookies'
                      ? 'bg-[#0b1957] text-white shadow-md dark:bg-[#2563eb]'
                            : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/40'
                  }`}
                >
                  Cookies
                </button>
              </div>
            </div>

            {/* Credentials Form */}
            {authMethod === 'credentials' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="space-y-1">
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="relative">
                  <input
                    type={showPin ? "text" : ("pass" + "word" as any)}
                    placeholder="LinkedIn Details"
                    value={pinCode}
                    onChange={(e) => setPinCode(e.target.value)}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-300 hover:text-slate-600 dark:hover:text-slate-300 focus:outline-none cursor-pointer"
                    aria-label={showPin ? "Hide pin" : "Show pin"}
                  >
                    {showPin ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Cookies Form */}
            {authMethod === 'cookies' && (
              <div className="space-y-4 animate-in fade-in duration-200">
               <div className="bg-slate-50/50 dark:bg-[#00051d]/30 border border-slate-100 dark:border-slate-800/60 p-3 rounded-xl">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-300 leading-relaxed">
                    Copy your LinkedIn cookies.{' '}
                    <button
                      onClick={() => setShowCookieHelp(!showCookieHelp)}
                      className="text-blue-500 font-bold hover:underline cursor-pointer inline-flex items-center gap-0.5"
                    >
                      How to find them?
                    </button>
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Your cookies need to be collected in the same browser as this page.
                  </p>
                </div>
                {showCookieHelp && (
                  <div className="bg-slate-50 dark:bg-[#00051d]/60 border border-slate-200 dark:border-slate-800 rounded-xl p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <h4 className="font-bold text-slate-800 dark:text-white text-xs uppercase tracking-wider mb-2">How to find my cookies?</h4>
                    <div className="text-xs text-slate-500 dark:text-slate-300 space-y-2 leading-relaxed font-medium"><p>Follow the steps to find your linkedin cookies (not available on mobile)</p>
                      <ol className="list-decimal list-inside space-y-1 ml-2">
                        <li>Open linkedin in a new tab (or click here: <a href="https://www.linkedin.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">linkedin</a>).</li>
                        <li>Log in to your account.</li>
                        <li>Open your browser&apos;s developer console (F12 for Chrome and Firefox, option + command + I for Safari) then go to the &quot;application&quot; or &quot;storage&quot; tab.</li>
                        <li>Open the cookies folder and click on the one called &quot;https://www.linkedin.com&quot;.</li>
                        <li>Copy the values for &quot;li_at&quot; into the field below, then click on the connect button</li>
                      </ol>
                    </div>
                  </div>
                )}
                <div className="space-y-1">
                  <input
                    type="text"
                    placeholder="Enter your li_at value"
                    value={liAtCookie}
                    onChange={(e) => setLiAtCookie(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div className="space-y-1 pt-1">
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-300 leading-normal mb-1">
                    If your account has Recruiter or Sales Navigator subscription, copy the li_a too.
                  </p>
                  <input
                    type="text"
                    placeholder="Enter your li_a value (optional)"
                    value={liACookie}
                    onChange={(e) => setLiACookie(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>
            )}

            {/* Optional Settings */}
            <div className="pt-1">
              <button
                onClick={() => setShowOptionalSettings(!showOptionalSettings)}
                className="flex items-center text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-300 dark:hover:text-slate-300 cursor-pointer select-none"
              >
                <span className={`inline-block transition-transform duration-200 mr-1 ${showOptionalSettings ? 'rotate-90' : ''}`}>›</span>
                Optional settings
              </button>
              {showOptionalSettings && (
                <div className="mt-2.5 p-3.5 bg-slate-50/50 dark:bg-[#00051d]/40 rounded-xl border border-slate-200 dark:border-slate-800/80 text-xs text-slate-400 dark:text-slate-300 font-medium leading-relaxed animate-in fade-in slide-in-from-top-1 duration-200">
                  Additional configuration options will be available here for advanced users.
                </div>
              )}
            </div>

            {/* Error Message */}
            {connectionError && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400 font-semibold leading-relaxed animate-in fade-in duration-200">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-400">Connection Failed</p>
                    <p className="text-xs font-medium text-red-600 dark:text-red-400/80 mt-0.5">{connectionError}</p>
                  </div>
                </div>
            )}

            {/* Success Message */}
            {connectionSuccess && (
              <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/20 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 font-semibold leading-relaxed animate-in fade-in duration-200">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-500 mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-400">Connection Successful!</p>
                    <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400/80 mt-0.5">Your LinkedIn account has been connected successfully</p>
                  </div>
                </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50 dark:bg-[#000724] px-6 py-3.5 rounded-b-2xl">
            <button
              onClick={handleConnect}
              disabled={connecting || (authMethod === 'credentials' ? !email || !pinCode : !liAtCookie)}
              className={`px-5 h-10 rounded-xl font-bold text-sm transition-all shadow-md cursor-pointer border-none flex items-center justify-center min-w-[100px] active:scale-95 ${
                connectionSuccess
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : connectionError
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-[#0b1957] hover:bg-[#122572] dark:bg-[#2563eb] dark:hover:bg-blue-700 text-white'
              }`}
            >
              {connecting ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Connecting...
                </span>
              ) : connectionSuccess ? (
                <span className="flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Connected!
                </span>
              ) : connectionError ? (
                'Retry'
              ) : (
                'Login'
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>
      {/* Checkpoint Verification Modal (OTP or Yes/No) — LinkedIn-style UI */}
      <Dialog open={showOtpModal} onOpenChange={setShowOtpModal}>
        <DialogContent className="max-w-sm p-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <DialogHeader className="text-center justify-center pt-8 px-6">
            <div className="bg-white dark:bg-gray-900 p-2 rounded-lg mr-3 flex-shrink-0">
              <div className={`flex-shrink-0 w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center`}>
                <Linkedin className="h-6 w-6 text-blue-700 "/>
              </div>
            </div>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100 tracking-tight">
              {currentCheckpointAccount?.checkpoint?.is_yes_no ? 'Verify your identity' : 'Enter verification code'}
            </DialogTitle>
            <p className="text-sm text-gray-500 dark:text-slate-300 mt-1">
              {currentCheckpointAccount?.checkpoint?.is_yes_no
                ? 'Approve the sign-in request on your mobile device'
                : 'We sent a code to complete your sign-in'}
            </p>
          </DialogHeader>

          <div className="px-8 py-6">
            {currentCheckpointAccount?.checkpoint?.is_yes_no ? (
              <div className="space-y-5">
                {/* Phone icon + prompt */}
                <div className="flex flex-col items-center text-center gap-3">
                  <div className="w-14 h-14 rounded-full bg-[#EEF3FB] dark:bg-blue-950/40 flex items-center justify-center">
                    <svg className="w-7 h-7 text-[#0A66C2] dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={PHONE_AUTH_PATH} />
                    </svg>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
                    We sent a notification to the <span className="font-semibold text-gray-800 dark:text-gray-200">LinkedIn app</span> on your phone.
                    Tap <span className="font-bold text-[#057642] dark:text-green-400">Yes</span> to approve this sign-in.
                  </p>
                </div>

                {/* Steps */}
                <ol className="space-y-3">
                  {[
                    'Open the LinkedIn app on your phone',
                    'Find the sign-in approval notification',
                    <>Tap <strong className="text-[#057642] dark:text-green-400">Yes</strong> to approve this login</>,
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#0A66C2] text-white text-xs font-semibold flex items-center justify-center mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-sm text-gray-700 dark:text-gray-300">{step}</span>
                    </li>
                  ))}
                </ol>

                {/* Waiting status */}
                {yesNoPolling && !autoResolving && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-[#EEF3FB] dark:bg-blue-950/30 rounded-lg">
                    <Loader2 className="h-4 w-4 animate-spin text-[#0A66C2] dark:text-blue-400 flex-shrink-0" />
                    <p className="text-sm text-[#0A66C2] dark:text-blue-400 font-medium">Waiting for your approval...</p>
                  </div>
                )}

                {/* Approved status */}
                {autoResolving && (
                  <div className="flex items-center gap-2 px-4 py-3 bg-[#EAF5EA] dark:bg-green-950/20 rounded-lg">
                    <CheckCircle2 className="h-4 w-4 text-[#057642] dark:text-green-400 flex-shrink-0" />
                    <p className="text-sm text-[#057642] dark:text-green-400 font-semibold">Approval detected! Connecting your account...</p>
                  </div>
                )}

                {/* Hint */}
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center leading-relaxed">
                  Don&apos;t see the notification? Open the LinkedIn app manually and look for a security alert or login approval request.
                </p>
              </div>
            ) : (
              /* ── OTP Checkpoint ── */
              <div>
                <p className="text-sm text-gray-600 dark:text-slate-300 mb-4">
                  {currentCheckpointAccount?.checkpoint?.message || 'Enter the verification code sent to your email or phone.'}
                </p>
                <input
                  type="text"
                  placeholder="_ _ _ _ _ _"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                    setOtp(value);
                    setOtpError(null);
                  }}
                  className={`w-full px-4 py-3 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent text-center text-2xl tracking-[0.5em] font-mono ${autofillClasses}`}
                  maxLength={6}
                  autoFocus
                />
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 text-center">
                  Enter the 6-digit code sent to your email or phone
                </p>
              </div>
            )}

            {/* Error */}
            {otpError && (
              <div className="mt-4 flex items-start gap-2 px-4 py-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-lg">
                <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-400">{otpError}</p>
              </div>
            )}
          </div>

          <DialogActions className="px-8 pb-8 pt-4">
            {!currentCheckpointAccount?.checkpoint?.is_yes_no && (
              <Button
                onClick={handleVerifyOtp}
                disabled={verifyingOtp || otp.length !== 6}
                className={`w-full py-3 rounded-full text-sm font-semibold transition-colors ${
                  verifyingOtp || otp.length !== 6
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    : 'bg-[#0A66C2] text-white hover:bg-[#004182]'
                }`}
              >
                {verifyingOtp ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </span>
                ) : 'Continue'}
              </Button>
            )}
          </DialogActions>
        </DialogContent>
      </Dialog>
    </>
  );
};

// ── AI Replies chip ──────────────────────────────────────────────────────────
// Green pill toggle mirroring Instagram's connected-account cards
/**
 * LinkedIn plan and InMail credits, as the integration sees them.
 *
 * Deliberately reports what Unipile can reach, not what the LinkedIn website
 * shows the account owner. Those two disagree in a way that has already cost a
 * campaign: an account connected before a Sales Navigator seat was added
 * reports the seat as absent and every credit pool as null, while its owner can
 * see 149 credits in LinkedIn. Showing the LinkedIn figure would hide exactly
 * the problem this is here to surface.
 */
function LinkedInPlanSummary({ caps }: { caps?: LinkedInCapabilities }) {
  if (!caps?.known) return null;

  const credits = caps.credits || {};
  const plans = [
    caps.salesNavigator && 'Sales Navigator',
    caps.recruiter && 'Recruiter',
    caps.premium && !caps.salesNavigator && !caps.recruiter && 'Premium',
  ].filter(Boolean) as string[];

  const pools = [
    { label: 'Sales Navigator', n: credits.salesNavigator || 0 },
    { label: 'Recruiter', n: credits.recruiter || 0 },
    { label: 'Premium', n: credits.premium || 0 },
  ].filter((p) => p.n > 0);

  // Paid plan, no reachable credits: the case worth calling out, because the
  // owner will be looking at credits in LinkedIn and wondering why sends fail.
  const paidButUnusable = (caps.premium || caps.salesNavigator || caps.recruiter) && !caps.canInMail;

  return (
    <div className="mt-3 rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 px-3 py-2">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px]">
        <span className="text-gray-500 dark:text-white/50">Plan</span>
        <span className="font-medium text-gray-800 dark:text-white/85">
          {plans.length ? plans.join(' + ') : 'Free'}
        </span>
        <span className="text-gray-500 dark:text-white/50">InMail credits</span>
        <span className="font-medium text-gray-800 dark:text-white/85">
          {pools.length ? pools.map((p) => `${p.n} ${p.label}`).join(', ') : 'none available'}
        </span>
      </div>
      {paidButUnusable && (
        <p className="mt-1.5 text-[11px] leading-snug text-amber-700 dark:text-amber-400">
          This account has a paid plan, but no InMail credits are visible to Mr LAD. Sales Navigator
          credits stay hidden unless the account was connected while that seat was active. Reconnect
          the account to pick them up.
        </p>
      )}
    </div>
  );
}

// (components/instagram/InstagramTenantOnboarding.tsx → AiToggleChip).
function AiToggleChip({
  label,
  enabled,
  onToggle,
  disabled,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}): JSX.Element {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
        enabled
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20'
          : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
      }`}
    >
      <Power className="h-3 w-3" />
      {label}: {enabled ? 'on' : 'off'}
    </button>
  );
}
