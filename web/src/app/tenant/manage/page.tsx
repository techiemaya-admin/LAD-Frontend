'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, Search, RefreshCw, Copy, Check, ChevronDown, ChevronUp,
  ShieldOff, Loader2, Database, User, Mail, Phone, Globe, Calendar,
  CheckCircle2, XCircle, Shield, Layers, Key, Plus, ExternalLink,
  Activity, CreditCard,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

const SUPER_ADMIN_EMAIL = 'admin@techiemaya.com';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TenantRow {
  id: string;
  name: string;
  slug: string;
  status: string;
  plan_tier: string;
  email: string;
  created_at: string;
  has_db: boolean;
  db_label: string;
}

interface TenantUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  is_active: boolean;
  email_verified: boolean;
  created_at: string;
  role: string;
  credit_balance: number;
}

interface TenantDetail {
  tenant: {
    id: string; name: string; slug: string; status: string; plan_tier: string;
    email: string; phone: string; website: string; created_at: string;
    updated_at: string; db_name: string; db_label: string; db_url: string; has_db: boolean;
  };
  users: TenantUser[];
  feature_flags: { feature_key: string; is_enabled: boolean }[];
  tenant_features: { feature_key: string; enabled: boolean }[];
  capabilities: { capability_key: string; enabled: boolean }[];
  environment: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusColor(s: string) {
  if (s === 'active') return 'text-green-400 bg-green-900/20 border-green-800/50';
  if (s === 'suspended') return 'text-amber-400 bg-amber-900/20 border-amber-800/50';
  return 'text-gray-400 bg-gray-800/40 border-gray-700';
}

function planColor(p: string) {
  if (p === 'enterprise') return 'text-purple-300 bg-purple-900/20 border-purple-700/50';
  if (p === 'professional') return 'text-blue-300 bg-blue-900/20 border-blue-700/50';
  return 'text-gray-400 bg-gray-800/30 border-gray-700';
}

// ─── CopyButton ───────────────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button onClick={copy} className="ml-1.5 text-gray-600 hover:text-gray-300 transition-colors shrink-0">
      {copied ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
    </button>
  );
}

// ─── Detail Panel ─────────────────────────────────────────────────────────────

function DetailPanel({ tenantId, environment, onClose }: {
  tenantId: string; environment: string; onClose: () => void;
}) {
  const [detail, setDetail] = useState<TenantDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'overview' | 'users' | 'features' | 'capabilities'>('overview');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/tenant/manage/${tenantId}?environment=${environment}`, { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) setDetail(d);
        else setError(d.error || 'Failed to load');
      })
      .catch(() => setError('Network error'))
      .finally(() => setLoading(false));
  }, [tenantId, environment]);

  const TABS = [
    { id: 'overview',     label: 'Overview' },
    { id: 'users',        label: `Users${detail ? ` (${detail.users.length})` : ''}` },
    { id: 'features',     label: 'Features' },
    { id: 'capabilities', label: 'Capabilities' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[#0d1117] border border-gray-800 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-purple-600/30 border border-purple-700/50 flex items-center justify-center">
              <Building2 size={15} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{detail?.tenant.name || 'Loading…'}</p>
              <p className="text-xs text-gray-500 font-mono">{tenantId}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-300 text-lg font-light">✕</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 px-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`text-xs font-medium py-3 px-4 border-b-2 transition-colors -mb-px
                ${tab === t.id
                  ? 'border-purple-500 text-purple-300'
                  : 'border-transparent text-gray-600 hover:text-gray-400'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex justify-center py-12">
              <Loader2 size={24} className="text-purple-500 animate-spin" />
            </div>
          )}
          {error && <p className="text-sm text-red-400 text-center py-8">{error}</p>}

          {detail && !loading && (
            <>
              {/* OVERVIEW TAB */}
              {tab === 'overview' && (
                <div className="space-y-4">
                  {/* Tenant IDs */}
                  <div className="bg-[#1a1f2e] rounded-xl border border-gray-800 overflow-hidden">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 border-b border-gray-800">
                      Identifiers
                    </p>
                    {[
                      { label: 'Tenant ID',  value: detail.tenant.id,   icon: Building2 },
                      { label: 'User ID',    value: detail.users[0]?.id || '—', icon: User },
                      { label: 'Database',   value: detail.tenant.db_name || detail.tenant.db_label || '—', icon: Database },
                      { label: 'DB URL',     value: detail.tenant.db_url || '—', icon: Key },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/50 last:border-0">
                        <Icon size={13} className="text-gray-600 shrink-0" />
                        <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
                        <span className="font-mono text-xs text-gray-200 flex-1 truncate">{value}</span>
                        {value !== '—' && <CopyBtn text={value} />}
                      </div>
                    ))}
                  </div>

                  {/* Credentials */}
                  <div className="bg-[#1a1f2e] rounded-xl border border-gray-800 overflow-hidden">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 border-b border-gray-800">
                      Login Credentials
                    </p>
                    {[
                      { label: 'Email',     value: detail.users[0]?.email || detail.tenant.email || '—', icon: Mail },
                      { label: 'Login URL', value: 'https://web.mrlads.com/login', icon: ExternalLink },
                    ].map(({ label, value, icon: Icon }) => (
                      <div key={label} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/50 last:border-0">
                        <Icon size={13} className="text-gray-600 shrink-0" />
                        <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
                        <span className={`text-xs flex-1 truncate ${label === 'Login URL' ? 'text-blue-400' : 'text-gray-200'}`}>{value}</span>
                        <CopyBtn text={value} />
                      </div>
                    ))}
                  </div>

                  {/* Company info */}
                  <div className="bg-[#1a1f2e] rounded-xl border border-gray-800 overflow-hidden">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 py-3 border-b border-gray-800">
                      Company
                    </p>
                    {[
                      { label: 'Name',        value: detail.tenant.name,     icon: Building2 },
                      { label: 'Slug',        value: detail.tenant.slug,     icon: Activity },
                      { label: 'Email',       value: detail.tenant.email,    icon: Mail },
                      { label: 'Phone',       value: detail.tenant.phone,    icon: Phone },
                      { label: 'Website',     value: detail.tenant.website,  icon: Globe },
                      { label: 'Plan',        value: detail.tenant.plan_tier,icon: CreditCard },
                      { label: 'Status',      value: detail.tenant.status,   icon: CheckCircle2 },
                      { label: 'Environment', value: detail.environment,     icon: Layers },
                      { label: 'Created',     value: fmt(detail.tenant.created_at), icon: Calendar },
                    ].map(({ label, value, icon: Icon }) => (
                      value ? (
                        <div key={label} className="flex items-center gap-3 px-4 py-3 border-b border-gray-800/50 last:border-0">
                          <Icon size={13} className="text-gray-600 shrink-0" />
                          <span className="text-xs text-gray-500 w-24 shrink-0">{label}</span>
                          <span className="text-xs text-gray-200 flex-1">{value}</span>
                        </div>
                      ) : null
                    ))}
                  </div>
                </div>
              )}

              {/* USERS TAB */}
              {tab === 'users' && (
                <div className="space-y-3">
                  {detail.users.length === 0 && (
                    <p className="text-sm text-gray-600 text-center py-8">No users found</p>
                  )}
                  {detail.users.map(u => (
                    <div key={u.id} className="bg-[#1a1f2e] rounded-xl border border-gray-800 overflow-hidden">
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
                        <div className="w-8 h-8 rounded-full bg-purple-700/40 flex items-center justify-center text-xs font-semibold text-purple-300">
                          {u.first_name?.[0]}{u.last_name?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-white truncate">{u.first_name} {u.last_name}</p>
                          <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        </div>
                        <div className="flex gap-1.5">
                          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium capitalize ${
                            u.role === 'owner' ? 'text-amber-300 border-amber-700 bg-amber-900/20' : 'text-gray-400 border-gray-700'
                          }`}>{u.role}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${u.is_active ? 'text-green-400 border-green-800 bg-green-900/20' : 'text-gray-500 border-gray-700'}`}>
                            {u.is_active ? 'active' : 'inactive'}
                          </span>
                        </div>
                      </div>
                      {[
                        { label: 'User ID',       value: u.id },
                        { label: 'Email',         value: u.email },
                        { label: 'Phone',         value: u.phone },
                        { label: 'Credits',       value: u.credit_balance?.toString() },
                        { label: 'Email Verified',value: u.email_verified ? 'Yes' : 'No' },
                        { label: 'Joined',        value: fmt(u.created_at) },
                      ].filter(r => r.value).map(({ label, value }) => (
                        <div key={label} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800/40 last:border-0">
                          <span className="text-xs text-gray-500 w-28 shrink-0">{label}</span>
                          <span className="font-mono text-xs text-gray-300 flex-1 truncate">{value}</span>
                          {(label === 'User ID' || label === 'Email') && <CopyBtn text={value!} />}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* FEATURES TAB */}
              {tab === 'features' && (
                <div className="space-y-4">
                  <div className="bg-[#1a1f2e] rounded-xl border border-gray-800 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Feature Flags</p>
                    <div className="flex flex-wrap gap-2">
                      {detail.feature_flags.map(f => (
                        <span key={f.feature_key} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-mono
                          ${f.is_enabled ? 'border-green-800 text-green-400 bg-green-900/20' : 'border-gray-700 text-gray-600'}`}>
                          {f.is_enabled ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                          {f.feature_key}
                        </span>
                      ))}
                      {detail.feature_flags.length === 0 && <p className="text-xs text-gray-600">None</p>}
                    </div>
                  </div>
                  <div className="bg-[#1a1f2e] rounded-xl border border-gray-800 p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tenant Features</p>
                    <div className="flex flex-wrap gap-2">
                      {detail.tenant_features.map(f => (
                        <span key={f.feature_key} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-mono
                          ${f.enabled ? 'border-blue-800 text-blue-400 bg-blue-900/20' : 'border-gray-700 text-gray-600'}`}>
                          {f.enabled ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                          {f.feature_key}
                        </span>
                      ))}
                      {detail.tenant_features.length === 0 && <p className="text-xs text-gray-600">None</p>}
                    </div>
                  </div>
                </div>
              )}

              {/* CAPABILITIES TAB */}
              {tab === 'capabilities' && (
                <div className="bg-[#1a1f2e] rounded-xl border border-gray-800 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                    Owner Capabilities ({detail.capabilities.filter(c => c.enabled).length} active)
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {detail.capabilities.map(c => (
                      <span key={c.capability_key} className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-mono
                        ${c.enabled ? 'border-purple-800 text-purple-400 bg-purple-900/20' : 'border-gray-700 text-gray-600'}`}>
                        {c.enabled ? <Shield size={10} /> : <XCircle size={10} />}
                        {c.capability_key}
                      </span>
                    ))}
                    {detail.capabilities.length === 0 && <p className="text-xs text-gray-600">None</p>}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TenantManagePage() {
  const router = useRouter();

  // Auth gate
  const [authState, setAuthState] = useState<'loading' | 'allowed' | 'denied' | 'unauthenticated'>('loading');
  useEffect(() => {
    getCurrentUser()
      .then((response: any) => {
        const email = (response?.user?.email || response?.email || '').toLowerCase().trim();
        setAuthState(email === SUPER_ADMIN_EMAIL ? 'allowed' : 'denied');
      })
      .catch(() => {
        setAuthState('unauthenticated');
        router.replace('/login?redirect_url=' + encodeURIComponent('/tenant/manage'));
      });
  }, [router]);

  // State
  const [environment, setEnvironment] = useState<'develop' | 'stage'>('develop');
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async (env: string) => {
    setLoading(true);
    setError('');
    try {
      const r = await fetch(`/api/tenant/manage?environment=${env}`, { credentials: 'include' });
      const d = await r.json();
      if (d.success) setTenants(d.tenants || []);
      else setError(d.error || 'Failed to load tenants');
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authState === 'allowed') load(environment);
  }, [authState, environment, load]);

  const filtered = tenants.filter(t =>
    [t.name, t.slug, t.email, t.plan_tier].some(v =>
      (v || '').toLowerCase().includes(search.toLowerCase())
    )
  );

  // ── Auth gate renders ─────────────────────────────────────────────────────
  if (authState === 'loading' || authState === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <Loader2 size={28} className="text-purple-500 animate-spin" />
      </div>
    );
  }

  if (authState === 'denied') {
    return (
      <div className="min-h-screen bg-[#0d1117] text-gray-100 flex items-center justify-center">
        <div className="text-center max-w-sm space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-red-900/30 border border-red-800/50 flex items-center justify-center">
              <ShieldOff size={28} className="text-red-400" />
            </div>
          </div>
          <h1 className="text-xl font-semibold text-white">Access Restricted</h1>
          <p className="text-sm text-gray-500">Super-admin only.</p>
          <button onClick={() => router.back()} className="text-sm text-gray-600 hover:text-gray-400 underline underline-offset-2">Go back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Tenant Management</h1>
            <p className="text-xs text-gray-500">{tenants.length} tenant{tenants.length !== 1 ? 's' : ''} · {environment}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Environment toggle */}
          <div className="flex rounded-lg border border-gray-700 overflow-hidden">
            {(['develop', 'stage'] as const).map(env => (
              <button
                key={env}
                onClick={() => setEnvironment(env)}
                className={`px-3 py-1.5 text-xs font-medium transition-colors
                  ${environment === env
                    ? 'bg-purple-700 text-white'
                    : 'text-gray-500 hover:text-gray-300'
                  }`}
              >
                {env}
              </button>
            ))}
          </div>
          <button
            onClick={() => load(environment)}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-700 text-xs text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          <button
            onClick={() => router.push('/tenant/onboard/new')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-medium transition-colors"
          >
            <Plus size={12} />
            New Tenant
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-6 py-3 border-b border-gray-800">
        <div className="relative max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, slug, email, plan…"
            className="w-full bg-[#1e2333] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-200
                       placeholder-gray-600 focus:outline-none focus:border-purple-500"
          />
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 py-4">
        {error && (
          <div className="text-sm text-red-400 text-center py-8">{error}</div>
        )}

        {loading && (
          <div className="flex justify-center py-16">
            <Loader2 size={24} className="text-purple-500 animate-spin" />
          </div>
        )}

        {!loading && !error && (
          <div className="rounded-xl border border-gray-800 overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 bg-[#161b27] border-b border-gray-800 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <span>Company</span>
              <span>Plan</span>
              <span>Status</span>
              <span>Database</span>
              <span>Created</span>
              <span></span>
            </div>

            {filtered.length === 0 && (
              <div className="py-16 text-center text-sm text-gray-600">
                {search ? 'No tenants match your search' : 'No tenants found'}
              </div>
            )}

            {filtered.map((t, i) => (
              <div
                key={t.id}
                className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3.5 items-center
                  border-b border-gray-800/60 last:border-0 hover:bg-[#161b27] transition-colors cursor-pointer
                  ${i % 2 === 0 ? 'bg-[#0d1117]' : 'bg-[#0f1420]'}`}
                onClick={() => setSelectedId(t.id)}
              >
                {/* Company */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-purple-700/30 border border-purple-700/40 flex items-center justify-center text-xs font-bold text-purple-300 shrink-0">
                      {t.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{t.name}</p>
                      <p className="text-xs text-gray-500 truncate font-mono">{t.email}</p>
                    </div>
                  </div>
                </div>

                {/* Plan */}
                <span className={`inline-flex text-xs px-2 py-0.5 rounded-full border font-medium w-fit ${planColor(t.plan_tier)}`}>
                  {t.plan_tier}
                </span>

                {/* Status */}
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium w-fit ${statusColor(t.status)}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${t.status === 'active' ? 'bg-green-400' : 'bg-gray-500'}`} />
                  {t.status}
                </span>

                {/* Database */}
                <div className="flex items-center gap-1.5">
                  <Database size={11} className={t.has_db ? 'text-green-500' : 'text-gray-600'} />
                  <span className="text-xs text-gray-400 font-mono truncate">
                    {t.db_label?.split(' - ')[0] || (t.has_db ? 'configured' : '—')}
                  </span>
                </div>

                {/* Created */}
                <span className="text-xs text-gray-500">{fmt(t.created_at)}</span>

                {/* Action */}
                <button
                  onClick={e => { e.stopPropagation(); setSelectedId(t.id); }}
                  className="flex items-center gap-1 text-xs text-purple-400 hover:text-purple-300 transition-colors px-2 py-1 rounded border border-purple-800/40 hover:border-purple-600/60"
                >
                  View
                  <ExternalLink size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail panel modal */}
      {selectedId && (
        <DetailPanel
          tenantId={selectedId}
          environment={environment}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
