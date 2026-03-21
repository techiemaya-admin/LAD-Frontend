'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  Loader2,
  Save,
  CheckCircle,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Globe,
  Smartphone,
  Bot,
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

// ── Types ────────────────────────────────────────────────────────

interface WhatsAppAccount {
  id: string;
  tenant_id: string;
  slug: string;
  display_name: string;
  ai_model: string;
  timezone: string;
  status: string;
  conversation_flow_template: string;
  phone_number_id: string | null;
  business_account_id: string | null;
}

interface CreateAccountForm {
  display_name: string;
  slug: string;
  database_url: string;
  tenant_id: string;         // Optional — leave blank to auto-create a new tenant
  phone_number_id: string;
  access_token: string;
  business_account_id: string;
  verify_token: string;
  ai_model: string;
  ai_api_key: string;
  timezone: string;
  conversation_flow_template: string;
}

// ── API helpers ──────────────────────────────────────────────────

const ADMIN_API = '/api/whatsapp-conversations/admin/whatsapp-accounts';

async function fetchAccounts(): Promise<WhatsAppAccount[]> {
  const res = await fetchWithTenant(ADMIN_API);
  const data = await res.json();
  return data.success ? data.data : [];
}

async function createAccount(form: CreateAccountForm): Promise<{ success: boolean; data?: any; error?: string }> {
  const body: Record<string, any> = { ...form };
  // Remove empty optional fields (including tenant_id — blank = auto-create new tenant)
  for (const key of ['tenant_id', 'phone_number_id', 'access_token', 'business_account_id', 'verify_token', 'ai_api_key']) {
    if (!body[key]) delete body[key];
  }

  const res = await fetchWithTenant(ADMIN_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return res.json();
}

async function updateAccount(slug: string, updates: Record<string, any>): Promise<{ success: boolean; error?: string }> {
  const res = await fetchWithTenant(`${ADMIN_API}/${encodeURIComponent(slug)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });
  return res.json();
}

async function deactivateAccount(slug: string): Promise<{ success: boolean; error?: string }> {
  const res = await fetchWithTenant(`${ADMIN_API}/${encodeURIComponent(slug)}`, {
    method: 'DELETE',
  });
  return res.json();
}

// ── Constants ────────────────────────────────────────────────────

const FLOW_TEMPLATES = [
  { id: 'generic', label: 'Generic', description: 'Universal AI assistant' },
  { id: 'bni', label: 'BNI', description: 'BNI chapter networking flow' },
  { id: 'real_estate', label: 'Real Estate', description: 'Property inquiries & scheduling' },
  { id: 'ecommerce', label: 'E-Commerce', description: 'Product catalog & orders' },
];

const AI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'gpt-4o', label: 'GPT-4o' },
];

const TIMEZONES = [
  'UTC', 'US/Eastern', 'US/Central', 'US/Pacific',
  'Europe/London', 'Europe/Berlin', 'Asia/Kolkata',
  'Asia/Singapore', 'Australia/Sydney',
];

const INITIAL_FORM: CreateAccountForm = {
  display_name: '',
  slug: '',
  database_url: '',
  tenant_id: '',
  phone_number_id: '',
  access_token: '',
  business_account_id: '',
  verify_token: '',
  ai_model: 'gemini-2.5-flash',
  ai_api_key: '',
  timezone: 'UTC',
  conversation_flow_template: 'generic',
};

// ── Toast (inline) ──────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div
      className={`fixed bottom-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-white text-sm ${
        type === 'success' ? 'bg-green-600' : 'bg-red-600'
      }`}
    >
      {type === 'success' ? <CheckCircle className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
      {message}
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────

export function TenantOnboarding() {
  const [accounts, setAccounts] = useState<WhatsAppAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateAccountForm>({ ...INITIAL_FORM });
  const [creating, setCreating] = useState(false);
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
  }, []);

  const loadAccounts = useCallback(async () => {
    try {
      const data = await fetchAccounts();
      setAccounts(data);
    } catch {
      showToast('Failed to load accounts', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAccounts();
  }, [loadAccounts]);

  // Auto-generate slug from display name
  const handleDisplayNameChange = (value: string) => {
    setForm((prev) => ({
      ...prev,
      display_name: value,
      slug: prev.slug || value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
    }));
  };

  const handleCreate = async () => {
    if (!form.display_name.trim() || !form.slug.trim() || !form.database_url.trim()) {
      showToast('Display name, slug, and database URL are required', 'error');
      return;
    }

    setCreating(true);
    const result = await createAccount(form);
    if (result.success) {
      showToast(`Account "${form.display_name}" created successfully`, 'success');
      setForm({ ...INITIAL_FORM });
      setShowForm(false);
      await loadAccounts();
    } else {
      showToast(result.error || 'Failed to create account', 'error');
    }
    setCreating(false);
  };

  const handleDeactivate = async (slug: string, name: string) => {
    if (!confirm(`Deactivate "${name}"? The account will be disabled but data will be preserved.`)) return;
    const result = await deactivateAccount(slug);
    if (result.success) {
      showToast(`"${name}" deactivated`, 'success');
      await loadAccounts();
    } else {
      showToast(result.error || 'Failed to deactivate', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      {/* Header */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Globe className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">WhatsApp Accounts</h2>
            </div>
            <p className="text-sm text-gray-500">
              Manage tenant WhatsApp accounts. Each account gets its own database, prompts, and conversation flow.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadAccounts}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50"
              title="Refresh accounts"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                New Account
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="p-6 border-b border-gray-100 bg-indigo-50/30">
          <h3 className="text-sm font-semibold text-gray-800 mb-4">Onboard New Tenant</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Display Name */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Display Name *</label>
              <input
                type="text"
                value={form.display_name}
                onChange={(e) => handleDisplayNameChange(e.target.value)}
                placeholder="e.g. Acme Real Estate"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                autoFocus
              />
            </div>

            {/* Slug */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Slug * (webhook URL path)</label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">/webhook/</span>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm((prev) => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))}
                  placeholder="acme-real-estate"
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono"
                />
              </div>
            </div>

            {/* Database URL */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">Database URL *</label>
              <input
                type="text"
                value={form.database_url}
                onChange={(e) => setForm((prev) => ({ ...prev, database_url: e.target.value }))}
                placeholder="postgresql://user:pass@host:5432/dbname"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono"
              />
            </div>

            {/* Tenant ID (optional — link to existing LAD tenant) */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Tenant ID <span className="text-gray-400 font-normal">(optional — leave blank to create a new tenant, or paste an existing LAD tenant UUID to link this account)</span>
              </label>
              <input
                type="text"
                value={form.tenant_id}
                onChange={(e) => setForm((prev) => ({ ...prev, tenant_id: e.target.value.trim() }))}
                placeholder="e.g. e0a3e9ca-3f46-4bb0-ac10-a91b5c1d20b5"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 font-mono"
              />
            </div>

            {/* Flow Template */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Conversation Flow</label>
              <select
                value={form.conversation_flow_template}
                onChange={(e) => setForm((prev) => ({ ...prev, conversation_flow_template: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white"
              >
                {FLOW_TEMPLATES.map((ft) => (
                  <option key={ft.id} value={ft.id}>
                    {ft.label} — {ft.description}
                  </option>
                ))}
              </select>
            </div>

            {/* AI Model */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">AI Model</label>
              <select
                value={form.ai_model}
                onChange={(e) => setForm((prev) => ({ ...prev, ai_model: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Timezone</label>
              <select
                value={form.timezone}
                onChange={(e) => setForm((prev) => ({ ...prev, timezone: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 bg-white"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>{tz}</option>
                ))}
              </select>
            </div>

            {/* AI API Key */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">AI API Key (optional)</label>
              <input
                type="password"
                value={form.ai_api_key}
                onChange={(e) => setForm((prev) => ({ ...prev, ai_api_key: e.target.value }))}
                placeholder="Falls back to server env var"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>

            {/* WhatsApp Phone Number ID */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                <Smartphone className="inline h-3 w-3 mr-1" />
                Phone Number ID
              </label>
              <input
                type="text"
                value={form.phone_number_id}
                onChange={(e) => setForm((prev) => ({ ...prev, phone_number_id: e.target.value }))}
                placeholder="Meta phone number ID"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>

            {/* Access Token */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Access Token</label>
              <input
                type="password"
                value={form.access_token}
                onChange={(e) => setForm((prev) => ({ ...prev, access_token: e.target.value }))}
                placeholder="WhatsApp Cloud API access token"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>

            {/* Business Account ID */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Business Account ID</label>
              <input
                type="text"
                value={form.business_account_id}
                onChange={(e) => setForm((prev) => ({ ...prev, business_account_id: e.target.value }))}
                placeholder="WhatsApp Business Account ID"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>

            {/* Verify Token */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Verify Token</label>
              <input
                type="text"
                value={form.verify_token}
                onChange={(e) => setForm((prev) => ({ ...prev, verify_token: e.target.value }))}
                placeholder="Webhook verification token"
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-5">
            <button
              onClick={handleCreate}
              disabled={creating || !form.display_name.trim() || !form.slug.trim() || !form.database_url.trim()}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create Account
            </button>
            <button
              onClick={() => { setShowForm(false); setForm({ ...INITIAL_FORM }); }}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Accounts list */}
      <div className="divide-y divide-gray-100">
        {accounts.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <Globe className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No WhatsApp accounts configured</p>
            <p className="text-xs mt-1">Create one to get started</p>
          </div>
        ) : (
          accounts.map((account) => {
            const isExpanded = expandedAccount === account.slug;
            const isActive = account.status === 'active';

            return (
              <div key={account.slug} className="group">
                {/* Account header row */}
                <div
                  className="flex items-center gap-3 px-6 py-3.5 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedAccount(isExpanded ? null : account.slug)}
                >
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800 truncate">
                        {account.display_name}
                      </span>
                      <span className={`inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700">
                        {account.conversation_flow_template}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-400 font-mono mt-0.5">/webhook/{account.slug}</p>
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Bot className="h-3 w-3" />
                      {account.ai_model}
                    </span>
                    <span>{account.timezone}</span>
                  </div>

                  {isActive && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeactivate(account.slug, account.display_name);
                      }}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                      title="Deactivate account"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-red-400 hover:text-red-600" />
                    </button>
                  )}
                </div>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-6 pb-4 ml-7">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm bg-gray-50 p-4 rounded-lg">
                      <div>
                        <span className="text-xs text-gray-400">Tenant ID</span>
                        <p className="font-mono text-xs text-gray-600 break-all">{account.tenant_id}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Account ID</span>
                        <p className="font-mono text-xs text-gray-600 break-all">{account.id}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Phone Number ID</span>
                        <p className="font-mono text-xs text-gray-600">{account.phone_number_id || '—'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Business Account ID</span>
                        <p className="font-mono text-xs text-gray-600">{account.business_account_id || '—'}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Webhook URL</span>
                        <p className="font-mono text-xs text-indigo-600">/webhook/{account.slug}</p>
                      </div>
                      <div>
                        <span className="text-xs text-gray-400">Flow Template</span>
                        <p className="text-xs text-gray-600">
                          {FLOW_TEMPLATES.find((f) => f.id === account.conversation_flow_template)?.label || account.conversation_flow_template}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
