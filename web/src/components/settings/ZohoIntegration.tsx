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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
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
    } catch (e) {
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
        setSuccess('Sync started - pulling from Zoho. This can take a minute for large accounts…');
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
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading Zoho status…
      </div>
    );
  }

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!account?.connected) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
              <span className="text-xl font-bold text-red-600 select-none">Z</span>
            </div>
            <div>
              <CardTitle>Zoho CRM</CardTitle>
              <CardDescription>
                Connect your Zoho CRM to sync Contacts, Leads, and Deals - and push Mr LAD leads back into Zoho.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}
          <div className="space-y-2 max-w-sm">
            <label className="text-sm font-medium text-foreground">Zoho data center (region)</label>
            <select
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ZOHO_REGIONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              Pick the region where your Zoho account is hosted (shown in your Zoho URL, e.g. crm.zoho.<b>eu</b>).
            </p>
          </div>
          <Button onClick={handleConnect} disabled={connecting}>
            {connecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Connect with Zoho
          </Button>
        </CardContent>
      </Card>
    );
  }

  // ── Connected ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-red-50 flex items-center justify-center">
                <span className="text-xl font-bold text-red-600 select-none">Z</span>
              </div>
              <div>
                <CardTitle className="flex items-center gap-2">
                  Zoho CRM
                  <Badge variant="secondary" className="bg-green-100 text-green-700">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Connected
                  </Badge>
                </CardTitle>
                <CardDescription>
                  {account.connected_user?.email
                    ? `Connected as ${account.connected_user.email}`
                    : 'Connected'}
                  {account.region ? ` · ${account.region.toUpperCase()}` : ''}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" /> {error}
            </div>
          )}
          {success && (
            <div className="flex items-start gap-2 rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-700">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" /> {success}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-lg border border-border p-3 text-center">
              <div className="text-2xl font-semibold text-foreground">{account.counts?.contacts ?? '-'}</div>
              <div className="text-xs text-muted-foreground">Contacts</div>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <div className="text-2xl font-semibold text-foreground">{account.counts?.leads ?? '-'}</div>
              <div className="text-xs text-muted-foreground">Leads</div>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <div className="text-2xl font-semibold text-foreground">{account.counts?.deals ?? '-'}</div>
              <div className="text-xs text-muted-foreground">Deals</div>
            </div>
            <div className="rounded-lg border border-border p-3 text-center">
              <div className="text-2xl font-semibold text-foreground">{account.counts?.tasks ?? '-'}</div>
              <div className="text-xs text-muted-foreground">Tasks</div>
            </div>
          </div>

          {account.last_synced && (
            <p className="text-xs text-muted-foreground">
              Last synced {new Date(account.last_synced).toLocaleString()}
            </p>
          )}

          <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoSync}
              disabled={savingAutoSync}
              onChange={handleToggleAutoSync}
              className="h-4 w-4 rounded border-input accent-red-600"
            />
            Auto-sync from Zoho every 6 hours
            {savingAutoSync && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          </label>

          <div className="flex flex-wrap gap-2">
            <Button onClick={handleSync} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Download className="h-4 w-4 mr-2" />}
              {syncing ? 'Syncing…' : 'Sync from Zoho'}
            </Button>
            <Button variant="outline" onClick={handleTest} disabled={testing}>
              {testing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Test
            </Button>
            <Button variant="outline" onClick={() => setPushOpen((v) => !v)}>
              <UploadCloud className="h-4 w-4 mr-2" /> Push to Zoho
            </Button>
            <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={handleDisconnect} disabled={disconnecting}>
              {disconnecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Disconnect
            </Button>
          </div>

          {testResult && (
            <p className={`text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
              {testResult.success
                ? `Connection OK - ${testResult.contacts ?? 0} contacts reachable.`
                : 'Connection test failed.'}
            </p>
          )}

          {/* Push-to-Zoho panel */}
          {pushOpen && (
            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <UploadCloud className="h-4 w-4" /> Push a lead into Zoho
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-muted-foreground">Module</label>
                <select
                  value={pushModule}
                  onChange={(e) => setPushModule(e.target.value as 'Leads' | 'Contacts')}
                  className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                >
                  <option value="Leads">Leads</option>
                  <option value="Contacts">Contacts</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Input placeholder="First name" value={pushForm.first_name} onChange={(e) => setPushForm({ ...pushForm, first_name: e.target.value })} />
                <Input placeholder="Last name" value={pushForm.last_name} onChange={(e) => setPushForm({ ...pushForm, last_name: e.target.value })} />
                <Input placeholder="Email (required)" value={pushForm.email} onChange={(e) => setPushForm({ ...pushForm, email: e.target.value })} />
                <Input placeholder="Phone" value={pushForm.phone} onChange={(e) => setPushForm({ ...pushForm, phone: e.target.value })} />
                <Input placeholder="Company" value={pushForm.company_name} onChange={(e) => setPushForm({ ...pushForm, company_name: e.target.value })} />
                <Input placeholder="Title" value={pushForm.title} onChange={(e) => setPushForm({ ...pushForm, title: e.target.value })} />
              </div>
              <div className="flex items-center gap-3">
                <Button size="sm" onClick={handlePush} disabled={pushing}>
                  {pushing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <UploadCloud className="h-4 w-4 mr-2" />}
                  Push
                </Button>
                {pushResult && <span className="text-sm text-muted-foreground">{pushResult}</span>}
              </div>
              <p className="text-xs text-muted-foreground">
                Upserts on Email - re-pushing the same email updates the existing Zoho record. Use the <code>/zoho/push</code> API with <code>lead_ids[]</code> to push campaign leads in bulk.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Records live on the CRM page now */}
      <Card>
        <CardContent className="py-5 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="text-sm font-medium text-foreground">Browse synced records</div>
            <p className="text-sm text-muted-foreground">
              Your Zoho Contacts, Leads, Deals, and Tasks are on the CRM page.
            </p>
          </div>
          <Link href="/crm/zoho">
            <Button variant="outline">
              Open Zoho CRM <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default ZohoIntegration;
