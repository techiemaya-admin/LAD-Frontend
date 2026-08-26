'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Users,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Building2,
  UploadCloud,
  Briefcase,
  Contact,
  CheckSquare,
  Clock,
  Folder,
  Filter,
  Handshake,
  ClipboardCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

const ZOHO_API = '/api/social-integration/zoho';

const ZOHO_REGIONS: { value: string; label: string }[] = [
  { value: 'us', label: 'United States (.com)' },
  { value: 'eu', label: 'Europe (.eu)' },
  { value: 'in', label: 'India (.in)' },
  { value: 'au', label: 'Australia (.com.au)' },
  { value: 'jp', label: 'Japan (.jp)' },
  { value: 'ca', label: 'Canada (.ca)' },
  { value: 'sa', label: 'Saudi Arabia (.sa)' },
  { value: 'cn', label: 'China (.com.cn)' },
];

interface ZohoAccount {
  connected: boolean;
  region?: string;
  api_domain?: string;
  connected_user?: { name?: string | null; email?: string | null } | null;
  connected_at?: string;
  last_synced?: string;
  counts?: { contacts?: number; leads?: number; deals?: number; tasks?: number } | null;
  auto_sync_enabled?: boolean;
  syncing?: boolean;
  sync_error?: string | Record<string, string> | null;
}

export const ZohoIntegration: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [account, setAccount] = useState<ZohoAccount | null>(null);
  const [region, setRegion] = useState('us');
  const [connecting, setConnecting] = useState(false);
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ contacts?: number; success: boolean } | null>(null);

  const pollingRef = useRef(false);

  // Push panel
  const [pushOpen, setPushOpen] = useState(false);
  const [pushModule, setPushModule] = useState<'Leads' | 'Contacts'>('Leads');
  const [pushForm, setPushForm] = useState({ first_name: '', last_name: '', email: '', phone: '', company_name: '', title: '' });
  const [pushing, setPushing] = useState(false);
  const [pushResult, setPushResult] = useState<string | null>(null);

  // Auto-sync toggle
  const [autoSync, setAutoSync] = useState(false);
  const [savingAutoSync, setSavingAutoSync] = useState(false);

  const checkStatus = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetchWithTenant(`${ZOHO_API}/status`);
      if (res.ok) {
        const data = await res.json();
        setAccount(data?.data || null);
        if (data?.data?.region) setRegion(data.data.region);
        setAutoSync(!!data?.data?.auto_sync_enabled);
      } else {
        setAccount(null);
      }
    } catch {
      setAccount(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Surface OAuth return state (?zoho=connected|error) once on mount.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const zoho = params.get('zoho');
    if (zoho === 'connected') {
      setSuccess('Zoho CRM connected successfully.');
      checkStatus();
    } else if (zoho === 'error') {
      setError(`Zoho connection failed: ${params.get('reason') || 'unknown error'}`);
    }
    if (zoho) {
      params.delete('zoho');
      params.delete('reason');
      const qs = params.toString();
      window.history.replaceState({}, '', `${window.location.pathname}${qs ? `?${qs}` : ''}`);
    }
  }, [checkStatus]);

  const handleConnect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const res = await fetchWithTenant(`${ZOHO_API}/oauth/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ region }),
      });
      const data = await res.json();
      if (res.ok && data?.data?.url) {
        window.location.href = data.data.url;
      } else {
        setError(data?.error || 'Failed to start Zoho connection');
        setConnecting(false);
      }
    } catch {
      setError('Failed to start Zoho connection');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetchWithTenant(`${ZOHO_API}/disconnect`, { method: 'POST' });
      if (res.ok) {
        setAccount({ connected: false });
        setSuccess('Zoho disconnected.');
      } else {
        setError('Failed to disconnect');
      }
    } catch {
      setError('Failed to disconnect');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    setError(null);
    try {
      const res = await fetchWithTenant(`${ZOHO_API}/test`);
      const data = await res.json();
      if (res.ok && data?.success) {
        setTestResult({ success: true, contacts: data?.data?.contacts_count });
      } else {
        setTestResult({ success: false });
        setError(data?.error || 'Connection test failed');
      }
    } catch {
      setTestResult({ success: false });
      setError('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const formatSyncError = (e: unknown): string => {
    if (!e) return '';
    if (typeof e === 'string') return e;
    if (typeof e === 'object') {
      return Object.entries(e as Record<string, string>).map(([k, v]) => `${k} (${v})`).join('; ');
    }
    return String(e);
  };

  // Poll /status until the background sync finishes, then show counts + refresh.
  const pollSyncStatus = useCallback(() => {
    if (pollingRef.current) return; // already polling
    pollingRef.current = true;
    let tries = 0;
    const tick = async () => {
      tries += 1;
      try {
        const res = await fetchWithTenant(`${ZOHO_API}/status`);
        const data = await res.json();
        const d = data?.data;
        if (d && !d.syncing) {
          pollingRef.current = false;
          setSyncing(false);
          setAccount(d);
          if (d.sync_error) {
            setError(`Some modules failed to sync: ${formatSyncError(d.sync_error)}`);
          } else {
            const c = d.counts || {};
            setSuccess(`Synced ${c.contacts || 0} contacts, ${c.leads || 0} leads, ${c.deals || 0} deals, ${c.tasks || 0} tasks.`);
          }
          return;
        }
      } catch { /* transient - keep polling */ }
      if (tries < 120) {
        setTimeout(tick, 3000); // poll up to ~6 min
      } else {
        pollingRef.current = false;
        setSyncing(false);
        setError('Sync is taking longer than expected - check back shortly, then refresh.');
      }
    };
    setTimeout(tick, 3000);
  }, []);

  // If a sync is already running when the card opens, track it to completion.
  useEffect(() => {
    if (account?.syncing && !pollingRef.current) {
      setSyncing(true);
      pollSyncStatus();
    }
  }, [account?.syncing, pollSyncStatus]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetchWithTenant(`${ZOHO_API}/sync`, { method: 'POST' });
      const data = await res.json();
      if (res.ok && data?.success) {
        // Background sync: server returns immediately; poll for completion.
        setSuccess('Sync started — pulling from Zoho. This can take a minute for large accounts…');
        pollSyncStatus();
      } else {
        setSyncing(false);
        setError(data?.error || 'Sync failed');
      }
    } catch {
      setSyncing(false);
      setError('Sync failed');
    }
  };

  const handlePush = async () => {
    if (!pushForm.email) {
      setPushResult('Email is required (Zoho dedupes on Email).');
      return;
    }
    setPushing(true);
    setPushResult(null);
    try {
      const res = await fetchWithTenant(`${ZOHO_API}/push`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: pushModule, records: [pushForm] }),
      });
      const data = await res.json();
      if (res.ok && data?.success) {
        const d = data.data;
        setPushResult(`Pushed to Zoho ${d.module}: ${d.inserted} inserted, ${d.updated} updated${d.failed ? `, ${d.failed} failed` : ''}.`);
        setPushForm({ first_name: '', last_name: '', email: '', phone: '', company_name: '', title: '' });
      } else {
        setPushResult(data?.error || 'Push failed');
      }
    } catch {
      setPushResult('Push failed');
    } finally {
      setPushing(false);
    }
  };

  const handleToggleAutoSync = async () => {
    const next = !autoSync;
    setAutoSync(next); // optimistic
    setSavingAutoSync(true);
    try {
      const res = await fetchWithTenant(`${ZOHO_API}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ auto_sync_enabled: next }),
      });
      if (!res.ok) {
        setAutoSync(!next); // revert
        setError('Failed to update auto-sync setting');
      }
    } catch {
      setAutoSync(!next);
      setError('Failed to update auto-sync setting');
    } finally {
      setSavingAutoSync(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-500 dark:text-[#7a8ba3]">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading Zoho status…
      </div>
    );
  }

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!account?.connected) {
    return (
      <div className="rounded-xl border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#071131] p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
            <span className="text-xl font-bold text-red-600 select-none">Z</span>
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#172560] dark:text-white">Zoho CRM</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Connect your Zoho CRM to sync Contacts, Leads, and Deals — and push Mr LAD leads back into Zoho.
            </p>
          </div>
        </div>
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}
        <div className="space-y-2 max-w-sm">
          <label className="text-sm font-medium text-[#172560] dark:text-white">Zoho data center (region)</label>
          <Select value={region} onValueChange={(val) => setRegion(val)}>
            <SelectTrigger className="w-full rounded-lg border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#040b25] text-sm text-[#172560] dark:text-white h-10">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#071131] border border-slate-200 dark:border-blue-950/40">
              {ZOHO_REGIONS.map((r) => (
                <SelectItem key={r.value} value={r.value} className="text-[#172560] dark:text-white dark:focus:bg-[#2563eb] dark:focus:text-white">
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Pick the region where your Zoho account is hosted (shown in your Zoho URL, e.g. crm.zoho.<b>eu</b>).
          </p>
        </div>
        <button
          type="button"
          onClick={handleConnect}
          disabled={connecting}
          className="h-9 px-4 rounded-lg text-sm font-semibold text-white bg-[#0b1957] hover:bg-[#0b1957]/90 dark:bg-[#2b7cff] dark:hover:bg-[#2b7cff]/90 inline-flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
        >
          {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Connect with Zoho
        </button>
      </div>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  const moduleIcon = (k: string) => {
    if (k === 'contacts') return <Users className="h-4 w-4" />;
    if (k === 'leads') return <Filter className="h-4 w-4" />;
    if (k === 'deals') return <Handshake className="h-4 w-4" />;
    return <ClipboardCheck className="h-4 w-4" />;
  };

  return (
    <div className="space-y-4">
      {/* Main Status Container */}
      <div className="rounded-xl border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#071131] p-6 mx-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center">
              <span className="text-xl font-bold text-red-600 select-none">Z</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-[#172560] dark:text-white">Zoho CRM</h3>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
                  <CheckCircle2 className="h-3 w-3" /> Connected
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {account.connected_user?.email
                  ? `Connected as ${account.connected_user.email}`
                  : 'Connected'}
                {account.region ? ` · ${account.region.toUpperCase()}` : ''}
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 p-3 text-sm text-red-700 dark:text-red-300">
            <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> {error}
          </div>
        )}
        {success && (
          <div className="flex items-start gap-2 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 p-3 text-sm text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" /> {success}
          </div>
        )}

        {/* 4 Module Count Cards (Inner Containers) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['contacts', 'leads', 'deals', 'tasks'] as const).map((k) => (
            <div
              key={k}
              className="rounded-xl border border-slate-200 dark:border-blue-950/40 bg-slate-50 dark:bg-[#040b25] p-3.5 flex items-center gap-3.5"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-[#0e1d4d] text-blue-600 dark:text-blue-400 grid place-items-center shrink-0">
                {moduleIcon(k)}
              </div>
              <div>
                <div className="text-xl font-bold text-[#172560] dark:text-white tabular-nums leading-none">
                  {account.counts?.[k] ?? '0'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 capitalize mt-1 font-medium">{k}</div>
              </div>
            </div>
          ))}
        </div>

        {account.last_synced && (
          <p className="text-xs text-slate-500 dark:text-[#7a8ba3] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Last synced {new Date(account.last_synced).toLocaleString()}
          </p>
        )}

        <label className="flex items-center gap-2.5 text-sm text-[#172560] dark:text-white cursor-pointer select-none font-medium">
          <input
            type="checkbox"
            checked={autoSync}
            disabled={savingAutoSync}
            onChange={handleToggleAutoSync}
            className="h-4 w-4 rounded border-slate-300 dark:border-blue-950/40 accent-[#2563eb] cursor-pointer"
          />
          Auto-sync from Zoho every 6 hours
          {savingAutoSync && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
        </label>

        <div className="flex flex-wrap gap-2.5 pt-1">
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="h-9 px-4 rounded-lg text-sm font-semibold text-white bg-[#0b1957] hover:bg-[#0b1957]/90 dark:bg-[#2b7cff] dark:hover:bg-[#2b7cff]/90 inline-flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {syncing ? 'Syncing…' : 'Sync from Zoho'}
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            className="h-9 px-4 rounded-lg text-sm font-medium text-[#172560] dark:text-white border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#040b25] hover:bg-slate-50 dark:hover:bg-[#0e1d4d] inline-flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Test
          </button>
          <button
            type="button"
            onClick={() => setPushOpen((v) => !v)}
            className="h-9 px-4 rounded-lg text-sm font-medium text-[#172560] dark:text-white border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#040b25] hover:bg-slate-50 dark:hover:bg-[#0e1d4d] inline-flex items-center gap-2 transition-all"
          >
            <UploadCloud className="h-4 w-4" /> Push to Zoho
          </button>
          <button
            type="button"
            onClick={handleDisconnect}
            disabled={disconnecting}
            className="h-9 px-4 rounded-lg text-sm font-medium text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900/60 bg-white dark:bg-[#040b25] hover:bg-red-50 dark:hover:bg-red-950/40 inline-flex items-center gap-2 transition-all disabled:opacity-50"
          >
            {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Disconnect
          </button>
        </div>

        {testResult && (
          <p className={`text-sm ${testResult.success ? 'text-emerald-500' : 'text-red-500'}`}>
            {testResult.success
              ? `Connection OK — ${testResult.contacts ?? 0} contacts reachable.`
              : 'Connection test failed.'}
          </p>
        )}

        {/* Push-to-Zoho panel (Inner Container) */}
        {pushOpen && (
          <div className="rounded-xl border border-slate-200 dark:border-blue-950/40 bg-slate-50 dark:bg-[#040b25] p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#172560] dark:text-white">
              <UploadCloud className="h-4 w-4" /> Push a lead into Zoho
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-slate-500 dark:text-slate-400">Module</label>
              <Select value={pushModule} onValueChange={(val) => setPushModule(val as 'Leads' | 'Contacts')}>
                <SelectTrigger className="w-32 rounded-lg border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#071131] text-sm text-[#172560] dark:text-white h-9">
                  <SelectValue placeholder="Select module" />
                </SelectTrigger>
                <SelectContent className="bg-white dark:bg-[#071131] border border-slate-200 dark:border-blue-950/40">
                  <SelectItem value="Leads" className="text-[#172560] dark:text-white dark:focus:bg-[#2563eb] dark:focus:text-white">Leads</SelectItem>
                  <SelectItem value="Contacts" className="text-[#172560] dark:text-white dark:focus:bg-[#2563eb] dark:focus:text-white">Contacts</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <Input className="dark:bg-[#071131] dark:border-blue-950/40" placeholder="First name" value={pushForm.first_name} onChange={(e) => setPushForm({ ...pushForm, first_name: e.target.value })} />
              <Input className="dark:bg-[#071131] dark:border-blue-950/40" placeholder="Last name" value={pushForm.last_name} onChange={(e) => setPushForm({ ...pushForm, last_name: e.target.value })} />
              <Input className="dark:bg-[#071131] dark:border-blue-950/40" placeholder="Email (required)" value={pushForm.email} onChange={(e) => setPushForm({ ...pushForm, email: e.target.value })} />
              <Input className="dark:bg-[#071131] dark:border-blue-950/40" placeholder="Phone" value={pushForm.phone} onChange={(e) => setPushForm({ ...pushForm, phone: e.target.value })} />
              <Input className="dark:bg-[#071131] dark:border-blue-950/40" placeholder="Company" value={pushForm.company_name} onChange={(e) => setPushForm({ ...pushForm, company_name: e.target.value })} />
              <Input className="dark:bg-[#071131] dark:border-blue-950/40" placeholder="Title" value={pushForm.title} onChange={(e) => setPushForm({ ...pushForm, title: e.target.value })} />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePush}
                disabled={pushing}
                className="h-8 px-3 rounded-lg text-xs font-semibold text-white bg-[#2563eb] hover:bg-blue-700 inline-flex items-center gap-1.5 disabled:opacity-50"
              >
                {pushing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                Push
              </button>
              {pushResult && <span className="text-xs text-slate-500 dark:text-slate-400">{pushResult}</span>}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Upserts on Email — re-pushing the same email updates the existing Zoho record. Use the <code>/zoho/push</code> API with <code>lead_ids[]</code> to push campaign leads in bulk.
            </p>
          </div>
        )}
      </div>

      {/* Bottom Container: Browse synced records */}
      <div className="rounded-xl border border-slate-200 dark:border-blue-950/40 bg-white dark:bg-[#071131] p-5 flex items-center justify-between mx-4 gap-4 flex-wrap">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-[#0e1d4d] text-blue-600 dark:text-blue-400 grid place-items-center shrink-0">
            <Folder className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[#172560] dark:text-white">Browse synced records</div>
            <p className="text-xs text-slate-500 dark:text-[#7a8ba3] truncate">
              Your Zoho Contacts, Leads, Deals, and Tasks are on the CRM page.
            </p>
          </div>
        </div>
        <Link href="/crm/zoho">
          <button
            type="button"
            className="h-9 px-4 rounded-lg text-sm font-medium border border-slate-200 dark:border-blue-950/40 text-[#172560] dark:text-white bg-white dark:bg-[#040b25] hover:bg-slate-50 dark:hover:bg-[#0e1d4d] inline-flex items-center gap-2 transition-all"
          >
            Open Zoho CRM <ChevronRight className="h-4 w-4" />
          </button>
        </Link>
      </div>
    </div>
  );
};

export default ZohoIntegration;
