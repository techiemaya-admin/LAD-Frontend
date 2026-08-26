'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  MessageSquare,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Smartphone,
  Loader2,
  QrCode,
  LogOut,
  Wifi,
  WifiOff,
  Users,
  Search,
  User,
  ChevronDown,
  ChevronUp,
  UserCheck,
  Bot,
  Check
} from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faWhatsapp } from '@fortawesome/free-brands-svg-icons';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTenant } from '@/contexts/TenantContext';
import { WhatsAppRelinkBanner, type LinkState } from './WhatsAppRelinkBanner';

// ── Types ────────────────────────────────────────────────────────

type ConnectionStatus = 'disconnected' | 'connecting' | 'qr_scanning' | 'pairing' | 'connected' | 'error';

interface PersonalAccount {
  id: string;
  status: string;
  phone_number: string | null;
  connected_at: string | null;
  gateway_account_id: string | null;
  qr_code?: string;
  pairing_code?: string | null;
  method?: 'qr' | 'pairing_code';
  qr_expires_in?: number;
}

interface AutoAssignConfig {
  enabled: boolean;
  saved_contacts_to: string;
  unsaved_contacts_to: string;
}

interface TeamMember {
  user_id: string;
  name: string;
  email: string;
  phone: string | null;
  active_count: number;
}

interface SyncedContact {
  phone: string;
  name: string | null;
  whatsapp_id: string | null;
  synced_at: string | null;
  is_saved: boolean;
}

// ── API helpers ──────────────────────────────────────────────────

const PERSONAL_WA_API = '/api/personal-whatsapp';

async function getAutoAssignConfig(tenantId: string | null): Promise<AutoAssignConfig> {
  try {
    const headers: Record<string, string> = {};
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
    const res = await fetch(`${PERSONAL_WA_API}/auto-assign`, { headers });
    if (!res.ok) return { enabled: false, saved_contacts_to: 'human_agent', unsaved_contacts_to: 'AI' };
    const data = await res.json();
    return data?.data || { enabled: false, saved_contacts_to: 'human_agent', unsaved_contacts_to: 'AI' };
  } catch {
    return { enabled: false, saved_contacts_to: 'human_agent', unsaved_contacts_to: 'AI' };
  }
}

async function updateAutoAssignConfig(tenantId: string | null, config: Partial<AutoAssignConfig>): Promise<AutoAssignConfig | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
    const res = await fetch(`${PERSONAL_WA_API}/auto-assign`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(config),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.data || null;
  } catch {
    return null;
  }
}

async function fetchTeamMembers(tenantId: string | null): Promise<TeamMember[]> {
  try {
    const headers: Record<string, string> = {};
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
    const res = await fetch(`${PERSONAL_WA_API}/threads/team/workload`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function bulkAssign(
  tenantId: string | null,
  userId: string | null,
  filter: 'all' | 'unassigned',
): Promise<{ success: boolean; assigned: number; total: number } | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
    const res = await fetch(`${PERSONAL_WA_API}/conversations/bulk-assign`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        user_id: userId,  // null = release to AI Agent
        filter,
        reason: userId ? 'bulk_assign_settings' : 'bulk_release_to_ai',
      }),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

interface ContactsResponse {
  data: SyncedContact[];
  total: number;
  page: number;
  limit: number;
}

async function fetchSyncedContacts(
  tenantId: string | null,
  opts: { page?: number; limit?: number; search?: string } = {},
): Promise<ContactsResponse> {
  const empty = { data: [], total: 0, page: 1, limit: 100 };
  try {
    const headers: Record<string, string> = {};
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
    const params = new URLSearchParams();
    params.set('page', String(opts.page || 1));
    params.set('limit', String(opts.limit || 100));
    if (opts.search) params.set('search', opts.search);
    const res = await fetch(`${PERSONAL_WA_API}/contacts?${params}`, { headers });
    if (!res.ok) return empty;
    const data = await res.json();
    return {
      data: data?.contacts || data?.data || [],
      total: data?.total || 0,
      page: data?.page || 1,
      limit: data?.limit || 100,
    };
  } catch {
    return empty;
  }
}

async function createAccount(
  tenantId: string | null,
  phoneNumber?: string | null,
): Promise<PersonalAccount | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (tenantId) headers['X-Tenant-ID'] = tenantId;

    const res = await fetch(`${PERSONAL_WA_API}/accounts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(phoneNumber ? { phone_number: phoneNumber } : {}),
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getAccountStatus(accountId: string, tenantId: string | null): Promise<PersonalAccount | null> {
  try {
    const headers: Record<string, string> = {};
    if (tenantId) headers['X-Tenant-ID'] = tenantId;

    const res = await fetch(`${PERSONAL_WA_API}/accounts/${accountId}`, { headers });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function logoutAccount(accountId: string, tenantId: string | null): Promise<boolean> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (tenantId) headers['X-Tenant-ID'] = tenantId;

    const res = await fetch(`${PERSONAL_WA_API}/logout`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ account_id: accountId, reason: 'user_requested' }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Is the account still there after a disconnect?
 *
 * Disconnected used to be assumed the moment the request returned, so a logout
 * that changed nothing server-side still painted the UI as disconnected - and
 * the next page load, reading the same untouched state, showed Connected again.
 * Re-reading the account list is what turns that silent failure into a message.
 */
async function isStillConnected(tenantId: string | null): Promise<boolean> {
  const accounts = await listAccounts(tenantId);
  return accounts.some((acc) => acc.status === 'connected');
}

/** Read the auth token from the `token` cookie. Null during SSR. */
function readTokenCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split(';') : [];
  for (const cookie of cookies) {
    const [rawName, ...rawValueParts] = cookie.trim().split('=');
    if (rawName?.trim() === 'token') {
      return decodeURIComponent(rawValueParts.join('=') || '');
    }
  }
  return null;
}

async function listAccounts(tenantId: string | null): Promise<PersonalAccount[]> {
  try {
    const token = readTokenCookie();

    const headers: Record<string, string> = {};
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${PERSONAL_WA_API}/accounts`, { headers });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.accounts) ? data.accounts : [];
  } catch {
    return [];
  }
}

/**
 * Durable link state, from WAPA's GET /accounts/link-state.
 *
 * Why this exists alongside listAccounts(): when WhatsApp revokes the linked
 * device the service wipes the credentials, so the account DISAPPEARS from
 * /accounts entirely. An empty account list therefore looks identical to "never
 * connected", and the page just shows Disconnected with no explanation - which
 * is how one tenant sat dead for three days without anyone realising the link
 * had been revoked rather than never set up. This endpoint reads the state that
 * survives the wipe, so we can say what actually happened and when.
 */
async function fetchLinkState(tenantId: string | null): Promise<LinkState | null> {
  try {
    const headers: Record<string, string> = {};
    if (tenantId) headers['X-Tenant-ID'] = tenantId;
    const token = readTokenCookie();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${PERSONAL_WA_API}/accounts/link-state`, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || data.success === false) return null;
    return data as LinkState;
  } catch {
    // Fail open: a banner is an extra, it must never break the settings page.
    return null;
  }
}

// ── Component ────────────────────────────────────────────────────

export const WhatsAppIntegration: React.FC = () => {
  const { tenantId } = useTenant();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [account, setAccount] = useState<PersonalAccount | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [linkState, setLinkState] = useState<LinkState | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
  // Linking method: scan a QR, or enter a phone number and type an 8-char code.
  const [linkMethod, setLinkMethod] = useState<'qr' | 'phone'>('qr');
  const [phoneInput, setPhoneInput] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [autoAssign, setAutoAssign] = useState<AutoAssignConfig>({
    enabled: false,
    saved_contacts_to: 'human_agent',
    unsaved_contacts_to: 'AI',
  });
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [autoAssignSaving, setAutoAssignSaving] = useState(false);
  const [contacts, setContacts] = useState<SyncedContact[]>([]);
  const [contactsTotal, setContactsTotal] = useState(0);
  const [contactsPage, setContactsPage] = useState(1);
  const [contactsSearch, setContactsSearch] = useState('');
  const [contactsExpanded, setContactsExpanded] = useState(false);
  const [contactsLoading, setContactsLoading] = useState(false);
  const contactsSearchTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Bulk assign state
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamMembersLoading, setTeamMembersLoading] = useState(false);
  const [bulkAssignUserId, setBulkAssignUserId] = useState<string>('ai_agent');
  const [bulkAssignFilter, setBulkAssignFilter] = useState<'all' | 'unassigned'>('unassigned');
  const [showBulkAssignDialog, setShowBulkAssignDialog] = useState(false);
  const [bulkAssigning, setBulkAssigning] = useState(false);
  const [bulkAssignResult, setBulkAssignResult] = useState<{ assigned: number; total: number } | null>(null);

  const loadContacts = useCallback(async (page = 1, search = '') => {
    setContactsLoading(true);
    const result = await fetchSyncedContacts(tenantId, { page, limit: 100, search });
    setContacts(result.data);
    setContactsTotal(result.total);
    setContactsPage(result.page);
    setContactsLoading(false);
  }, [tenantId]);

  const loadTeamMembers = useCallback(async () => {
    setTeamMembersLoading(true);
    const members = await fetchTeamMembers(tenantId);
    setTeamMembers(members);
    if (members.length > 0 && (!bulkAssignUserId || bulkAssignUserId === 'ai_agent')) {
      // Keep AI Agent as default - don't auto-select first team member
    }
    setTeamMembersLoading(false);
  }, [tenantId, bulkAssignUserId]);

  const handleBulkAssign = useCallback(async () => {
    if (!bulkAssignUserId) return;
    setBulkAssigning(true);
    setBulkAssignResult(null);
    // 'ai_agent' sentinel means unassign (release back to AI)
    const userId = bulkAssignUserId === 'ai_agent' ? null : bulkAssignUserId;
    const result = await bulkAssign(tenantId, userId, bulkAssignFilter);
    if (result?.success) {
      setBulkAssignResult({ assigned: result.assigned, total: result.total });
    }
    setBulkAssigning(false);
    setShowBulkAssignDialog(false);
  }, [tenantId, bulkAssignUserId, bulkAssignFilter]);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // ── Cleanup ─────────────────────────────────────────────────

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => cleanup();
  }, [cleanup]);

  // ── Restore QR session on mount ─────────────────────────────

  useEffect(() => {
    const restoreSession = async () => {
      const accounts = await listAccounts(tenantId);
      const connectedAccount = accounts.find((acc) => acc.status === 'connected');
      if (connectedAccount) {
        setAccount(connectedAccount);
        setStatus('connected');
        // Load contacts when connected
        await loadContacts();
      }

      // Independent of the account list on purpose: the interesting case is
      // when that list came back EMPTY because the credentials were revoked.
      const ls = await fetchLinkState(tenantId);
      setLinkState(ls);
    };

    const loadAutoAssign = async () => {
      const config = await getAutoAssignConfig(tenantId);
      setAutoAssign(config);
    };

    restoreSession();
    loadAutoAssign();
  }, [tenantId]);

  // ── Start QR generation ─────────────────────────────────────

  const startLogin = useCallback(async (phoneNumber?: string) => {
    cleanup();
    setLoading(true);
    setError(null);
    setQrImage(null);
    setPairingCode(null);
    setStatus('connecting');

    const digits = phoneNumber ? phoneNumber.replace(/\D/g, '') : '';
    if (phoneNumber && digits.length < 8) {
      setError('Enter your full number with country code (e.g. 971501234567).');
      setStatus('error');
      setLoading(false);
      return;
    }

    const result = await createAccount(tenantId, digits || null);

    if (!result || !result.id) {
      setError('Failed to start linking. Check that the WhatsApp service is running.');
      setStatus('error');
      setLoading(false);
      return;
    }

    setAccount(result);

    if (result.pairing_code) {
      // Phone-number linking: show the 8-char code to type into WhatsApp.
      setPairingCode(result.pairing_code);
      setStatus('pairing');
    } else if (result.qr_code) {
      try {
        const QRCode = (await import('qrcode')).default;
        const img = await QRCode.toDataURL(result.qr_code, { width: 260, margin: 2 });
        setQrImage(img);
      } catch {
        setQrImage(null);
      }
      setStatus('qr_scanning');
    } else {
      setStatus('connecting');
    }

    setLoading(false);

    // Start countdown timer (QR and pairing codes both expire)
    const expiresIn = result.qr_expires_in || 240;
    setTimer(expiresIn);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          cleanup();
          setQrImage(null);
          setPairingCode(null);
          setStatus('disconnected');
          setError('Link code expired. Please try again.');
          return 0;
        }
        return t - 1;
      });
    }, 1000);

    // Start polling for status
    pollRef.current = setInterval(async () => {
      const statusResult = await getAccountStatus(result.id, tenantId);
      if (!statusResult) return;

      if (statusResult.status === 'connected') {
        cleanup();
        setAccount(statusResult);
        setQrImage(null);
        setPairingCode(null);
        setStatus('connected');
        // The re-link the banner was asking for just happened - drop it now
        // rather than waiting for a reload to refetch the state.
        setLinkState(null);
        // Load contacts after successful connection
        loadContacts();
      } else if (statusResult.status === 'error' || statusResult.status === 'disconnected' || statusResult.status === 'expired') {
        cleanup();
        setQrImage(null);
        setPairingCode(null);
        setStatus('error');
        setError('Connection failed. Please try again.');
      }
      // qr_scanning / pairing / reconnecting → keep polling
    }, 3000);
  }, [tenantId, cleanup]);

  // ── Logout ──────────────────────────────────────────────────

  const handleLogout = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    const ok = await logoutAccount(account.id, tenantId);
    cleanup();

    // Confirm against the server rather than assuming. A disconnect that fails
    // silently must not look identical to one that worked - that gap is what
    // made "disconnect, refresh, still connected" impossible to notice from the UI.
    const stillConnected = ok ? await isStillConnected(tenantId) : true;

    if (!ok || stillConnected) {
      setStatus('connected');
      setError(
        'WhatsApp could not be disconnected - the connection is still active on the server. Please try again, and contact support if it persists.',
      );
      setLoading(false);
      return;
    }

    setAccount(null);
    setQrImage(null);
    setStatus('disconnected');
    setError(null);
    setLinkState(await fetchLinkState(tenantId));
    setLoading(false);
  }, [account, tenantId, cleanup]);

  // ── Auto-assign toggle ─────────────────────────────────────

  const handleAutoAssignToggle = useCallback((checked: boolean) => {
    if (checked) {
      // Enabling: show confirmation dialog
      setShowConfirmDialog(true);
    } else {
      // Disabling: no confirmation needed
      setAutoAssignSaving(true);
      updateAutoAssignConfig(tenantId, { enabled: false }).then((result) => {
        if (result) setAutoAssign(result);
        setAutoAssignSaving(false);
      });
    }
  }, [tenantId]);

  const confirmAutoAssign = useCallback(async () => {
    setAutoAssignSaving(true);
    setShowConfirmDialog(false);
    const result = await updateAutoAssignConfig(tenantId, {
      enabled: true,
      saved_contacts_to: 'human_agent',
      unsaved_contacts_to: 'AI',
    });
    if (result) setAutoAssign(result);
    setAutoAssignSaving(false);
  }, [tenantId]);

  // ── Helpers ─────────────────────────────────────────────────

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  const statusLabel = () => {
    switch (status) {
      case 'connected':
        return { text: 'Connected', classes: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' };
      case 'qr_scanning':
        return { text: 'Waiting for scan...', classes: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' };
      case 'pairing':
        return { text: 'Waiting for code entry...', classes: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' };
      case 'connecting':
        return { text: 'Preparing link...', classes: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' };
      case 'error':
        return { text: 'Error', classes: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400' };
      default:
        return { text: '• Disconnected', classes: 'bg-gray-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' };
    }
  };

  const currentStatusLabel = statusLabel();

  const StatusIcon = () => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-5 w-5 text-green-500 dark:text-green-400" />;
      case 'qr_scanning':
      case 'pairing':
      case 'connecting': return <RefreshCw className="h-5 w-5 text-blue-500 dark:text-indigo-400 animate-spin" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400" />;
      default: return <WifiOff className="h-5 w-5 text-slate-400 dark:text-slate-500" />;
    }
  };

  // ── UI ──────────────────────────────────────────────────────

  return (
    <Card className="rounded-2xl shadow-sm border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#071131]">
      <CardHeader>
        <div className="flex gap-3 items-center">
          <div className="p-4 bg-slate-100 dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-blue-950/40">
            <FontAwesomeIcon
              icon={faWhatsapp}
              size="2x"
              style={{ width: 44, height: 44 }}
              className="text-green-600 dark:text-green-400"
            />
          </div>
          <div>
            <CardTitle className="text-slate-800 dark:text-white">WhatsApp Integration</CardTitle>
            <CardDescription className="text-slate-400 dark:text-slate-300">Connect your personal WhatsApp via QR code</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex justify-between items-center p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-blue-950/40 rounded-xl shadow-sm">
          <div className="flex gap-4 items-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-blue-950/40">
              <Smartphone className="h-5 w-5 text-slate-500 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#0b1957] dark:text-white">Connection Status</p>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold mt-0.5 ${currentStatusLabel.classes}`}>
                {currentStatusLabel.text}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-blue-950/40">
            <StatusIcon />
          </div>
        </div>

        {/* Connected Account Info */}
        {status === 'connected' && account && (
          <div className="p-4 bg-green-50/60 border border-green-200 dark:bg-green-950/20 dark:border-green-900/40 rounded-xl transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-blue-950/40">
                <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
              <span className="text-sm font-semibold text-green-800 dark:text-green-300">Account Connected</span>
            </div>
            {account.phone_number && (
              <p className="text-xs font-medium text-slate-600 dark:text-slate-300">Phone: <span className="font-bold text-slate-800 dark:text-white">+{account.phone_number}</span></p>
            )}
            {account.connected_at && (
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1">
                Since: {new Date(account.connected_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Re-link required - WhatsApp revoked the device (or another client took
            it over). Nothing recovers this on its own. Suppressed once we're
            connected again; the banner itself no-ops for a deliberate logout. */}
        {status !== 'connected' && <WhatsAppRelinkBanner linkState={linkState} />}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-xs p-3 bg-red-50 border border-red-200 dark:bg-red-950/20 dark:border-red-900/50 rounded-xl text-red-700 dark:text-red-400">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-blue-950/40 flex-shrink-0">
              <AlertCircle className="h-4 w-4 text-red-500 dark:text-red-400" />
            </div>
            {error}
          </div>
        )}

        {/* Linking-method toggle + phone input (only while not connected / not mid-link) */}
        {status !== 'connected' && status !== 'qr_scanning' && status !== 'pairing' && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setLinkMethod('qr')}
                disabled={loading}
                className={`text-sm font-medium rounded-lg border px-3 py-2 transition disabled:opacity-50 ${
                  linkMethod === 'qr'
                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-800/70 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`}
              >
                Scan QR code
              </button>
              <button
                type="button"
                onClick={() => setLinkMethod('phone')}
                disabled={loading}
                className={`text-sm font-medium rounded-lg border px-3 py-2 transition disabled:opacity-50 ${
                  linkMethod === 'phone'
                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'border-slate-700 bg-slate-950/60 text-slate-200 hover:bg-slate-800/70 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/70'
                }`}
              >
                Use phone number
              </button>
            </div>

            {linkMethod === 'phone' && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-600">
                  WhatsApp number (with country code, digits only)
                </label>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  placeholder="e.g. 971501234567"
                  disabled={loading}
                  className="w-full rounded-lg border border-gray-300 bg-white dark:bg-slate-800/50 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-400"
                />
              </div>
            )}
          </div>
        )}

        {/* QR Code Display (QR method) */}
        {qrImage && status === 'qr_scanning' && (
          <div className="border-2 border-dashed border-slate-200 dark:border-blue-950/40 p-5 rounded-xl text-center bg-slate-50/50 dark:bg-[#071131]/40">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Scan with WhatsApp</span>
              <span className={`text-sm font-mono ${timer < 60 ? 'text-red-500 font-bold dark:text-red-400' : 'text-slate-500 dark:text-slate-300'}`}>
                {formatTime(timer)}
              </span>
            </div>
            <div className="bg-white p-3 rounded-xl inline-block shadow-sm">
            <img src={qrImage}
              alt="WhatsApp QR Code"
              className="w-56 h-56 rounded-lg mx-auto" />
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-3">
              Open WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a Device
            </p>
          </div>
        )}

        {/* Pairing Code Display (phone-number method) */}
        {pairingCode && status === 'pairing' && (
          <div className="border-2 border-dashed border-gray-300 p-5 rounded-lg text-center">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-700">Enter this code in WhatsApp</span>
              <span className={`text-sm font-mono ${timer < 60 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                {formatTime(timer)}
              </span>
            </div>
            <div className="text-3xl font-mono font-bold tracking-[0.25em] text-gray-900 py-3 select-all">
              {pairingCode.length === 8 ? `${pairingCode.slice(0, 4)}-${pairingCode.slice(4)}` : pairingCode}
            </div>
            <p className="text-xs text-gray-400 mt-3 leading-relaxed">
              Open WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a device &gt;{' '}
              <span className="font-semibold">Link with phone number instead</span> &gt; enter this code
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {status !== 'connected' ? (
          <Button
            onClick={() => (linkMethod === 'phone' ? startLogin(phoneInput) : startLogin())}
            disabled={
              loading ||
              status === 'qr_scanning' ||
              status === 'pairing' ||
              (linkMethod === 'phone' && phoneInput.replace(/\D/g, '').length < 8)
            }
            className="w-full h-11 bg-[#0b1957] dark:bg-[#1e40af] text-white dark:text-white font-semibold rounded-xl transition-all active:scale-[0.98] cursor-pointer shadow-md shadow-[#0b1957]/10"
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : (
              <QrCode className="mr-2 h-4 w-4" />
            )}
            {status === 'qr_scanning'
              ? 'Waiting for scan...'
              : status === 'pairing'
                ? 'Waiting for code entry...'
                : linkMethod === 'phone'
                  ? 'Get pairing code'
                  : 'Generate QR'}
          </Button>
        ) : (
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={loading}
            className="w-full h-11 font-semibold rounded-xl transition-all active:scale-[0.98] cursor-pointer"
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : (
              <LogOut className="mr-2 h-4 w-4" />
            )}
            Disconnect
          </Button>
        )}

        {/* Auto-Assign Settings */}
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3 items-start">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-blue-950/40 mt-0.5">
                <Users className="h-5 w-5 text-slate-500 dark:text-slate-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-white">Auto-assign contacts</p>
                <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 leading-relaxed">
                  Saved contacts are assigned to Human Agent. Unsaved numbers go to AI Agent.
                </p>
              </div>
            </div>
            <Switch
              checked={autoAssign.enabled}
              onCheckedChange={handleAutoAssignToggle}
              disabled={autoAssignSaving}
            />
          </div>
          {autoAssign.enabled && (
            <div className="mt-3 ml-8 space-y-2 bg-slate-50/50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-blue-950/40">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-500 dark:bg-indigo-400" />
                <span className="text-slate-600 dark:text-slate-300">Saved contacts → <span className="font-semibold text-slate-800 dark:text-white">Human Agent</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-slate-600 dark:text-slate-300">Unsaved numbers → <span className="font-semibold text-slate-800 dark:text-white">AI Agent</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Assign All Chats to Team Member */}
        <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
          <div className="flex gap-3 items-start mb-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-blue-950/40 mt-0.5">
              <UserCheck className="h-5 w-5 text-slate-500 dark:text-slate-300" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-white">Assign chats to team member</p>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-0.5 leading-relaxed">
                Bulk-assign conversations so a team member receives forwarded messages.
              </p>
            </div>
          </div>

          {/* Team member selector */}
          <div className="ml-8 space-y-3">
            <div className="flex gap-2 items-center">
              <Select
                      value={bulkAssignUserId || undefined}
                      onValueChange={(val: string) => setBulkAssignUserId(val)}
                      disabled={teamMembersLoading}
                  >
                    <SelectTrigger
                className="flex-1 h-9 px-3 text-sm border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-slate-800/50 text-[#172560] dark:text-white rounded-md focus:ring-1 focus:ring-indigo-500/30"
                onFocus={() => { if (teamMembers.length === 0) loadTeamMembers(); }}
                    >
                      <SelectValue placeholder="Select assignment..." />
                    </SelectTrigger>

                    <SelectContent className="bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-blue-950/40 rounded-xl p-1 shadow-xl min-w-[200px]">
                      {/* AI Agent Option */}
                      <SelectItem
                          value="ai_agent"
                          className="text-sm text-[#172560] dark:text-white focus:bg-primary/95 focus:text-primary-foreground data-[state=checked]:bg-primary/95 data-[state=checked]:text-primary-foreground dark:focus:bg-[#2563eb] dark:focus:text-white dark:data-[state=checked]:bg-blue-600/20 dark:data-[state=checked]:text-white cursor-pointer rounded-lg relative flex items-center justify-between w-full py-2 pl-3 pr-9 [&>span]:w-full [&>span:has(svg)]:hidden *:[data-slot=select-item-indicator]:hidden"
                      >
                        <span className="flex items-center gap-2">🤖 AI Agent (release assignment)</span>
                        {bulkAssignUserId === "ai_agent" && (
                            <Check className="w-4 h-4 text-white dark:text-[#000724] absolute right-3 top-1/2 -translate-y-1/2 z-50 stroke-[3]" />
                        )}
                      </SelectItem>

                {teamMembersLoading && (
                          <SelectItem value="loading_state" disabled className="text-sm text-slate-400 dark:text-slate-300 py-2 pl-3">
                            Loading team members…
                          </SelectItem>
                      )}

                {!teamMembersLoading && teamMembers.length === 0 && (
                  <SelectItem value="empty_state" disabled className="text-sm text-slate-400 dark:text-slate-300 py-2 pl-3">
                            No team members found
                          </SelectItem>
                      )}

                      {/* Render Map Items Group Loop */}
                      {!teamMembersLoading && teamMembers.map((m) => {
                        const isSelected = bulkAssignUserId === m.user_id;
                        return (
                            <SelectItem
                                key={m.user_id}
                                value={m.user_id}
                                className="text-sm text-[#172560] dark:text-white focus:bg-primary/95 focus:text-primary-foreground data-[state=checked]:bg-primary/95 data-[state=checked]:text-primary-foreground dark:focus:bg-[#2563eb] dark:focus:text-white dark:data-[state=checked]:bg-blue-600/20 dark:data-[state=checked]:text-white cursor-pointer rounded-lg relative flex items-center justify-between w-full py-2 pl-3 pr-9 mt-0.5 [&>span]:w-full [&>span:has(svg)]:hidden *:[data-slot=select-item-indicator]:hidden"
                            >
                <span className="flex items-center justify-between w-full">
                  <span>{m.name}</span>
                  {m.active_count > 0 && (
                      <span className="opacity-80 text-xs font-normal ml-1">({m.active_count} active)</span>
                  )}
                </span>
                              {isSelected && (
                                  <Check className="w-4 h-4 text-white dark:text-[#000724] absolute right-3 top-1/2 -translate-y-1/2 z-50 stroke-[3]" />
                              )}
                            </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>

              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2 border-slate-200 dark:border-slate-800"
                onClick={loadTeamMembers}
                disabled={teamMembersLoading}
                title="Refresh team members"
              >
                <RefreshCw className={`h-3.5 w-3.5 text-slate-600 dark:text-slate-300 ${teamMembersLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Radio Filter Matrix Actions */}
            <div className="flex gap-4 text-xs font-medium text-slate-600 dark:text-slate-300 pt-1">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="bulkAssignFilter"
                  value="unassigned"
                  checked={bulkAssignFilter === 'unassigned'}
                  onChange={() => setBulkAssignFilter('unassigned')}
                  className="cursor-pointer h-3.5 w-3.5 accent-[#0b1957] dark:accent-primary"
                  />
                  <span className="group-hover:text-[#0b1957] dark:group-hover:text-white transition-colors">
                {bulkAssignUserId === 'ai_agent' ? 'Assigned chats only' : 'Unassigned chats only'}
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer group">
                <input
                  type="radio"
                  name="bulkAssignFilter"
                  value="all"
                  checked={bulkAssignFilter === 'all'}
                  onChange={() => setBulkAssignFilter('all')}
                  className="cursor-pointer h-3.5 w-3.5 accent-[#0b1957] dark:accent-primary"
                  />
                  <span className="group-hover:text-[#0b1957] dark:group-hover:text-white transition-colors">
                All active chats
                </span>
              </label>
            </div>

            {/* Result feedback */}
            {bulkAssignResult && (
              <div className="flex items-center gap-2 text-xs p-3 bg-green-50 border border-green-200 dark:bg-green-950/20 dark:border-green-900/40 rounded-xl text-green-800 dark:text-green-400">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                {bulkAssignUserId === 'ai_agent'
                  ? `Released ${bulkAssignResult.assigned} of ${bulkAssignResult.total} conversations back to AI Agent.`
                  : `Assigned ${bulkAssignResult.assigned} of ${bulkAssignResult.total} conversations.`}
              </div>
            )}

            <Button
              size="sm"
              className={`w-full h-10 font-bold rounded-xl active:scale-[0.99] transition-all cursor-pointer ${bulkAssignUserId === 'ai_agent' ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-none' : 'bg-[#0b1957] hover:bg-[#0b1957]/90 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground'}`}
              disabled={!bulkAssignUserId || teamMembersLoading}
              onClick={() => {
                setBulkAssignResult(null);
                if (teamMembers.length === 0) {
                  loadTeamMembers();
                }
                setShowBulkAssignDialog(true);
              }}
            >
              {bulkAssignUserId === 'ai_agent' ? (
                <>
                  <Bot className="mr-2 h-4 w-4" />
                  Release to AI Agent
                </>
              ) : (
                <>
                  <UserCheck className="mr-2 h-4 w-4" />
                  Assign Chats
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Synced Contacts List */}
        {status === 'connected' && (
          <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
            <button
              type="button"
              className="flex items-center justify-between w-full text-left focus:outline-none cursor-pointer group"
              onClick={() => {
                if (!contactsExpanded && contacts.length === 0) {
                  loadContacts();
                }
                setContactsExpanded(!contactsExpanded);
              }}
            >
              <div className="flex gap-3 items-center">
                <Users className="h-5 w-5 text-slate-500 dark:text-slate-300" />
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-white group-hover:text-[#0b1957] dark:group-hover:text-primary transition-colors">
                    Synced Contacts
                    {contacts.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-slate-400 dark:text-slate-300">
                        ({contactsTotal} total)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                    Contacts from your connected WhatsApp account
                  </p>
                </div>
              </div>
              {contactsExpanded ? (
                <ChevronUp className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-400 dark:text-slate-500" />
              )}
            </button>

            {contactsExpanded && (
              <div className="mt-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Contact Searching Node Input */}
                <div className="relative">
                  <div className="absolute left-2 top-1/2 transform -translate-y-1/2 flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-900/70 border border-slate-200 dark:border-blue-950/40">
                    <Search className="h-4 w-4 text-slate-400 dark:text-slate-500" />
                  </div>
                  <Input
                    placeholder="Search name or number..."
                    value={contactsSearch}
                    onChange={(e) => {
                      const val = e.target.value;
                      setContactsSearch(val);
                      if (contactsSearchTimerRef.current) clearTimeout(contactsSearchTimerRef.current);
                      contactsSearchTimerRef.current = setTimeout(() => {
                        loadContacts(1, val);
                      }, 400);
                    }}
                    className="pl-9 h-9 text-sm bg-white dark:bg-slate-800/50 border-slate-200 dark:border-blue-950/40 rounded-lg"
                  />
                </div>

                {/* Contacts list */}
                {contactsLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="h-5 w-5 animate-spin text-[#0b1957] dark:text-primary" />
                    <span className="ml-2 text-sm text-slate-500 dark:text-slate-300">Loading contacts...</span>
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="text-center py-10 text-sm text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-[#060e29]/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                    No contacts synced yet. Contacts will appear after WhatsApp syncs your address book.
                  </div>
                ) : (
                  <>
                    <ScrollArea className="h-[360px] pr-2">
                      <div className="space-y-1">
                        {contacts.map((contact) => (
                            <div
                              key={contact.phone}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-[#060e29]/60 border border-transparent dark:hover:border-slate-800/30 transition-all"
                            >
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-900/70 flex items-center justify-center border border-slate-200 dark:border-blue-950/40">
                                {contact.is_saved ? (
                                  <span className="text-sm font-semibold text-[#0b1957] dark:text-primary">
                                    {(contact.name || '?').charAt(0).toUpperCase()}
                                  </span>
                                ) : (
                                  <User className="h-5 w-5 text-slate-400 dark:text-slate-500" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-slate-800 dark:text-white truncate">
                                  {contact.name || contact.phone}
                                </p>
                                {contact.name && (
                                  <p className="text-xs text-slate-400 dark:text-slate-300 font-medium truncate mt-0.5">+{contact.phone}</p>
                                )}
                              </div>
                              <Badge
                                variant={contact.is_saved ? 'default' : 'secondary'}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${contact.is_saved ? 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300'}`}
                              >
                                {contact.is_saved ? 'Saved' : 'Unsaved'}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>

                    {/* Pagination */}
                    {contactsTotal > 100 && (
                      <div className="flex items-center justify-between pt-2 text-xs font-medium text-slate-500 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/40">
                        <span>
                          Showing {(contactsPage - 1) * 100 + 1}-{Math.min(contactsPage * 100, contactsTotal)} of {contactsTotal}
                        </span>
                        <div className="flex gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs rounded-md border-slate-200 dark:border-slate-800 cursor-pointer"
                            disabled={contactsPage <= 1 || contactsLoading}
                            onClick={() => loadContacts(contactsPage - 1, contactsSearch)}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2.5 text-xs rounded-md border-slate-200 dark:border-slate-800 cursor-pointer"
                            disabled={contactsPage * 100 >= contactsTotal || contactsLoading}
                            onClick={() => loadContacts(contactsPage + 1, contactsSearch)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Refresh button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-9 rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-800 cursor-pointer"
                  disabled={contactsLoading}
                  onClick={() => loadContacts(1, contactsSearch)}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-2 ${contactsLoading ? 'animate-spin' : ''}`} />
                  Refresh Contacts
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="bg-white dark:bg-[#000724] border border-slate-200 dark:border-slate-800 max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white font-bold">Enable auto-assign for saved contacts?</DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-300 leading-relaxed text-sm pt-1">
              When enabled, new conversations from your saved WhatsApp contacts will be automatically assigned to a Human Agent. Messages from unsaved numbers will continue to be handled by the AI Agent.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl bg-amber-50/60 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-900/40 p-3.5 text-xs text-amber-800 dark:text-amber-400 font-medium leading-relaxed">
            This means the AI will not respond to messages from your saved contacts. A human agent must handle those conversations manually.
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button onClick={confirmAutoAssign} disabled={autoAssignSaving} className="bg-[#0b1957] dark:bg-primary hover:bg-[#0b1957]/90 dark:hover:bg-primary/90 text-white dark:text-primary-foreground font-semibold rounded-xl h-10 px-4 cursor-pointer">
              {autoAssignSaving && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Yes, enable auto-assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Confirmation Dialog */}
      <Dialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
        <DialogContent className="bg-white dark:bg-[#000724] border border-slate-200 dark:border-slate-800 max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white font-bold">
              {bulkAssignUserId === 'ai_agent'
                ? `Release ${bulkAssignFilter === 'all' ? 'all active' : 'assigned'} chats to AI Agent?`
                : `Assign ${bulkAssignFilter === 'all' ? 'all active' : 'unassigned'} chats?`}
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-300 leading-relaxed text-sm pt-1">
              {bulkAssignUserId === 'ai_agent'
                ? bulkAssignFilter === 'all'
                  ? 'All active conversations will have their team member assignment removed. The AI Agent will resume responding to these chats.'
                  : 'All currently assigned conversations will be released. The AI Agent will resume responding to these chats.'
                : (() => {
                    const member = teamMembers.find((m) => m.user_id === bulkAssignUserId);
                    const name = member?.name || 'the selected team member';
                    return bulkAssignFilter === 'all'
                      ? `All active conversations will be assigned to ${name}. This will override any existing assignments.`
                      : `All conversations not yet assigned to anyone will be assigned to ${name}.`;
                  })()}
            </DialogDescription>
          </DialogHeader>
          <div className={`rounded-xl p-3.5 text-xs font-medium leading-relaxed border ${bulkAssignUserId === 'ai_agent' ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-900/40 dark:text-emerald-400' : 'bg-blue-50/60 border-blue-200 text-blue-800 dark:bg-indigo-950/20 dark:border-indigo-900/40 dark:text-indigo-400'}`}>
            {bulkAssignUserId === 'ai_agent'
              ? 'The AI Agent will automatically start handling messages in the released conversations.'
              : 'Assigned team members will receive a copy of incoming messages on their own WhatsApp so they can reply directly.'}
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              onClick={handleBulkAssign}
              disabled={bulkAssigning}
              className={`font-semibold rounded-xl h-10 px-4 cursor-pointer transition-all ${bulkAssignUserId === 'ai_agent' ? 'bg-emerald-700 hover:bg-emerald-800 text-white shadow-none' : 'bg-[#0b1957] hover:bg-[#0b1957]/90 dark:bg-primary dark:hover:bg-primary/90 text-white dark:text-primary-foreground'}`}
            >
              {bulkAssigning && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              {bulkAssignUserId === 'ai_agent' ? 'Yes, release to AI Agent' : 'Yes, assign chats'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
