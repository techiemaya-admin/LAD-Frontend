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
} from 'lucide-react';

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
import { useTenant } from '@/contexts/TenantContext';

// ── Types ────────────────────────────────────────────────────────

type ConnectionStatus = 'disconnected' | 'connecting' | 'qr_scanning' | 'connected' | 'error';

interface PersonalAccount {
  id: string;
  status: string;
  phone_number: string | null;
  connected_at: string | null;
  gateway_account_id: string | null;
  qr_code?: string;
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

async function createAccount(tenantId: string | null): Promise<PersonalAccount | null> {
  try {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (tenantId) headers['X-Tenant-ID'] = tenantId;

    const res = await fetch(`${PERSONAL_WA_API}/accounts`, {
      method: 'POST',
      headers,
      body: JSON.stringify({}),
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

async function listAccounts(tenantId: string | null): Promise<PersonalAccount[]> {
  try {
    const token = typeof document !== 'undefined'
      ? (() => {
          const cookies = document.cookie ? document.cookie.split(';') : [];
          for (const cookie of cookies) {
            const [rawName, ...rawValueParts] = cookie.trim().split('=');
            const name = rawName?.trim();
            if (name === 'token') {
              return decodeURIComponent(rawValueParts.join('=') || '');
            }
          }
          return null;
        })()
      : null;

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

// ── Component ────────────────────────────────────────────────────

export const WhatsAppIntegration: React.FC = () => {
  const { tenantId } = useTenant();
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [account, setAccount] = useState<PersonalAccount | null>(null);
  const [qrImage, setQrImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timer, setTimer] = useState(0);
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
      // Keep AI Agent as default — don't auto-select first team member
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
    };

    const loadAutoAssign = async () => {
      const config = await getAutoAssignConfig(tenantId);
      setAutoAssign(config);
    };

    restoreSession();
    loadAutoAssign();
  }, [tenantId]);

  // ── Start QR generation ─────────────────────────────────────

  const startLogin = useCallback(async () => {
    cleanup();
    setLoading(true);
    setError(null);
    setQrImage(null);
    setStatus('connecting');

    const result = await createAccount(tenantId);

    if (!result || !result.id) {
      setError('Failed to initiate QR. Check that the WhatsApp service is running.');
      setStatus('error');
      setLoading(false);
      return;
    }

    setAccount(result);

    // Generate QR image from QR string
    if (result.qr_code) {
      try {
        const QRCode = (await import('qrcode')).default;
        const img = await QRCode.toDataURL(result.qr_code, { width: 260, margin: 2 });
        setQrImage(img);
      } catch {
        setQrImage(null);
      }
    }

    setStatus('qr_scanning');
    setLoading(false);

    // Start countdown timer
    const expiresIn = result.qr_expires_in || 240;
    setTimer(expiresIn);
    timerRef.current = setInterval(() => {
      setTimer((t) => {
        if (t <= 1) {
          cleanup();
          setQrImage(null);
          setStatus('disconnected');
          setError('QR code expired. Please try again.');
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
        setStatus('connected');
        // Load contacts after successful connection
        loadContacts();
      } else if (statusResult.status === 'error' || statusResult.status === 'disconnected' || statusResult.status === 'expired') {
        cleanup();
        setQrImage(null);
        setStatus('error');
        setError('Connection failed. Please try again.');
      }
      // If qr_scanning or reconnecting, keep polling
    }, 3000);
  }, [tenantId, cleanup]);

  // ── Logout ──────────────────────────────────────────────────

  const handleLogout = useCallback(async () => {
    if (!account) return;
    setLoading(true);
    await logoutAccount(account.id, tenantId);
    cleanup();
    setAccount(null);
    setQrImage(null);
    setStatus('disconnected');
    setError(null);
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
      case 'connected': return 'Connected';
      case 'qr_scanning': return 'Waiting for scan...';
      case 'connecting': return 'Generating QR...';
      case 'error': return 'Error';
      default: return 'Disconnected';
    }
  };

  const StatusIcon = () => {
    switch (status) {
      case 'connected': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'qr_scanning':
      case 'connecting': return <RefreshCw className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'error': return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return <WifiOff className="h-5 w-5 text-gray-400" />;
    }
  };

  // ── UI ──────────────────────────────────────────────────────

  return (
    <Card>
      <CardHeader>
        <div className="flex gap-3 items-center">
          <div className="p-2 bg-green-100 rounded-lg">
            <MessageSquare className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <CardTitle>WhatsApp Integration</CardTitle>
            <CardDescription>Connect your personal WhatsApp via QR code</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
          <div className="flex gap-3 items-center">
            <Smartphone className="h-5 w-5 text-gray-500" />
            <div>
              <p className="text-sm font-medium text-gray-800">Connection Status</p>
              <p className="text-xs text-gray-500">{statusLabel()}</p>
            </div>
          </div>
          <StatusIcon />
        </div>

        {/* Connected Account Info */}
        {status === 'connected' && account && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">Account Connected</span>
            </div>
            {account.phone_number && (
              <p className="text-xs text-green-700">Phone: {account.phone_number}</p>
            )}
            {account.connected_at && (
              <p className="text-xs text-green-600 mt-1">
                Since: {new Date(account.connected_at).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 text-xs p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* QR Code Display */}
        {qrImage && status === 'qr_scanning' && (
          <div className="border-2 border-dashed border-gray-300 p-5 rounded-lg text-center">
            <div className="flex justify-between items-center mb-3">
              <span className="text-sm font-medium text-gray-700">Scan with WhatsApp</span>
              <span className={`text-sm font-mono ${timer < 60 ? 'text-red-500 font-bold' : 'text-gray-500'}`}>
                {formatTime(timer)}
              </span>
            </div>
            <img
              src={qrImage}
              alt="WhatsApp QR Code"
              className="mx-auto w-64 h-64 rounded-lg"
            />
            <p className="text-xs text-gray-400 mt-3">
              Open WhatsApp &gt; Settings &gt; Linked Devices &gt; Link a Device
            </p>
          </div>
        )}

        {/* Action Buttons */}
        {status !== 'connected' ? (
          <Button
            onClick={startLogin}
            disabled={loading || status === 'qr_scanning'}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2 h-4 w-4" />
            ) : (
              <QrCode className="mr-2 h-4 w-4" />
            )}
            {status === 'qr_scanning' ? 'Waiting for scan...' : 'Generate QR'}
          </Button>
        ) : (
          <Button
            variant="destructive"
            onClick={handleLogout}
            disabled={loading}
            className="w-full"
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
        <div className="border-t pt-4 mt-2">
          <div className="flex items-start justify-between gap-4">
            <div className="flex gap-3 items-start">
              <Users className="h-5 w-5 text-gray-500 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-800">Auto-assign contacts</p>
                <p className="text-xs text-gray-500 mt-0.5">
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
            <div className="mt-3 ml-8 space-y-1.5">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-gray-600">Saved contacts → <span className="font-medium text-gray-800">Human Agent</span></span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-gray-600">Unsaved numbers → <span className="font-medium text-gray-800">AI Agent</span></span>
              </div>
            </div>
          )}
        </div>

        {/* Assign All Chats to Team Member */}
        <div className="border-t pt-4 mt-2">
          <div className="flex gap-3 items-start mb-3">
            <UserCheck className="h-5 w-5 text-gray-500 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-800">Assign chats to team member</p>
              <p className="text-xs text-gray-500 mt-0.5">
                Bulk-assign conversations so a team member receives forwarded messages.
              </p>
            </div>
          </div>

          {/* Team member selector */}
          <div className="ml-8 space-y-3">
            <div className="flex gap-2 items-center">
              <select
                className="flex-1 h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                value={bulkAssignUserId}
                onChange={(e) => setBulkAssignUserId(e.target.value)}
                onFocus={() => { if (teamMembers.length === 0) loadTeamMembers(); }}
                disabled={teamMembersLoading}
              >
                <option value="ai_agent">🤖 AI Agent (release assignment)</option>
                {teamMembersLoading && <option value="" disabled>Loading team members…</option>}
                {!teamMembersLoading && teamMembers.length === 0 && (
                  <option value="" disabled>No team members found</option>
                )}
                {teamMembers.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.name}{m.active_count > 0 ? ` (${m.active_count} active)` : ''}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                size="sm"
                className="h-9 px-2"
                onClick={loadTeamMembers}
                disabled={teamMembersLoading}
                title="Refresh team members"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${teamMembersLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Filter: all vs unassigned */}
            <div className="flex gap-4 text-xs text-gray-600">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="bulkAssignFilter"
                  value="unassigned"
                  checked={bulkAssignFilter === 'unassigned'}
                  onChange={() => setBulkAssignFilter('unassigned')}
                  className="cursor-pointer"
                />
                {bulkAssignUserId === 'ai_agent' ? 'Assigned chats only' : 'Unassigned chats only'}
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="bulkAssignFilter"
                  value="all"
                  checked={bulkAssignFilter === 'all'}
                  onChange={() => setBulkAssignFilter('all')}
                  className="cursor-pointer"
                />
                All active chats
              </label>
            </div>

            {/* Result feedback */}
            {bulkAssignResult && (
              <div className="flex items-center gap-2 text-xs p-2.5 bg-green-50 border border-green-200 rounded-lg text-green-700">
                <CheckCircle className="h-4 w-4 flex-shrink-0" />
                {bulkAssignUserId === 'ai_agent'
                  ? `Released ${bulkAssignResult.assigned} of ${bulkAssignResult.total} conversations back to AI Agent.`
                  : `Assigned ${bulkAssignResult.assigned} of ${bulkAssignResult.total} conversations.`}
              </div>
            )}

            <Button
              size="sm"
              className={`w-full ${bulkAssignUserId === 'ai_agent' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`}
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
          <div className="border-t pt-4 mt-2">
            <button
              type="button"
              className="flex items-center justify-between w-full text-left"
              onClick={() => {
                if (!contactsExpanded && contacts.length === 0) {
                  loadContacts();
                }
                setContactsExpanded(!contactsExpanded);
              }}
            >
              <div className="flex gap-3 items-center">
                <Users className="h-5 w-5 text-gray-500" />
                <div>
                  <p className="text-sm font-medium text-gray-800">
                    Synced Contacts
                    {contacts.length > 0 && (
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        ({contactsTotal} total)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Contacts from your connected WhatsApp account
                  </p>
                </div>
              </div>
              {contactsExpanded ? (
                <ChevronUp className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-400" />
              )}
            </button>

            {contactsExpanded && (
              <div className="mt-3 space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
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
                    className="pl-9 h-9 text-sm"
                  />
                </div>

                {/* Contacts list */}
                {contactsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Loading contacts...</span>
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400">
                    No contacts synced yet. Contacts will appear after WhatsApp syncs your address book.
                  </div>
                ) : (
                  <>
                    <ScrollArea className="h-[360px]">
                      <div className="space-y-0.5">
                        {contacts.map((contact) => (
                            <div
                              key={contact.phone}
                              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                                {contact.is_saved ? (
                                  <span className="text-sm font-medium text-gray-600">
                                    {(contact.name || '?').charAt(0).toUpperCase()}
                                  </span>
                                ) : (
                                  <User className="h-5 w-5 text-gray-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">
                                  {contact.name || contact.phone}
                                </p>
                                {contact.name && (
                                  <p className="text-xs text-gray-500 truncate">+{contact.phone}</p>
                                )}
                              </div>
                              <Badge
                                variant={contact.is_saved ? 'default' : 'secondary'}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {contact.is_saved ? 'Saved' : 'Unsaved'}
                              </Badge>
                            </div>
                          ))}
                      </div>
                    </ScrollArea>

                    {/* Pagination */}
                    {contactsTotal > 100 && (
                      <div className="flex items-center justify-between pt-2 text-xs text-gray-500">
                        <span>
                          Showing {(contactsPage - 1) * 100 + 1}–{Math.min(contactsPage * 100, contactsTotal)} of {contactsTotal}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            disabled={contactsPage <= 1 || contactsLoading}
                            onClick={() => loadContacts(contactsPage - 1, contactsSearch)}
                          >
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
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
                  className="w-full"
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enable auto-assign for saved contacts?</DialogTitle>
            <DialogDescription>
              When enabled, new conversations from your saved WhatsApp contacts will be automatically assigned to a Human Agent. Messages from unsaved numbers will continue to be handled by the AI Agent.
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
            This means the AI will not respond to messages from your saved contacts. A human agent must handle those conversations manually.
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button onClick={confirmAutoAssign} disabled={autoAssignSaving}>
              {autoAssignSaving && <Loader2 className="animate-spin mr-2 h-4 w-4" />}
              Yes, enable auto-assign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Assign Confirmation Dialog */}
      <Dialog open={showBulkAssignDialog} onOpenChange={setShowBulkAssignDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAssignUserId === 'ai_agent'
                ? `Release ${bulkAssignFilter === 'all' ? 'all active' : 'assigned'} chats to AI Agent?`
                : `Assign ${bulkAssignFilter === 'all' ? 'all active' : 'unassigned'} chats?`}
            </DialogTitle>
            <DialogDescription>
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
          <div className={`rounded-lg p-3 text-xs ${bulkAssignUserId === 'ai_agent' ? 'bg-emerald-50 border border-emerald-200 text-emerald-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
            {bulkAssignUserId === 'ai_agent'
              ? 'The AI Agent will automatically start handling messages in the released conversations.'
              : 'Assigned team members will receive a copy of incoming messages on their own WhatsApp so they can reply directly.'}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setShowBulkAssignDialog(false)} disabled={bulkAssigning}>
              Cancel
            </Button>
            <Button
              onClick={handleBulkAssign}
              disabled={bulkAssigning}
              className={bulkAssignUserId === 'ai_agent' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
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
