'use client';
export const dynamic = 'force-dynamic';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2, User, Database, MessageSquare, Cpu, ClipboardList,
  CheckCircle2, XCircle, Loader2, ChevronRight, ChevronLeft,
  Eye, EyeOff, Copy, Check, AlertCircle, Info, ShieldOff,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';

const SUPER_ADMIN_EMAIL = 'admin@techiemaya.com';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  // Step 1 — Company
  companyName: string;
  slug: string;
  email: string;
  planTier: string;
  environment: 'develop' | 'stage';

  // Step 2 — Admin User
  adminFirstName: string;
  adminLastName: string;
  adminEmail: string;
  adminPassword: string;

  // Step 3 — Database
  createDatabase: boolean;
  customDbUrl: string;

  // Step 4 — WABA (optional)
  enableWaba: boolean;
  wabaSlug: string;
  wabaPhoneNumberId: string;
  wabaToken: string;
  wabaPhoneNumber: string;
  wabaDisplayName: string;
  wabaAccountId: string;
  wabaVerifyToken: string;
  wabaAppSecret: string;

  // Step 5 — Features & Voice
  features: string[];
  featureFlags: string[];
  capabilities: string[];
  enableVoice: boolean;
  voiceAgentName: string;
  voicePhoneNumber: string;
  voiceProvider: string;
}

interface ProvisionResult {
  success: boolean;
  tenantId?: string;
  userId?: string;
  dbName?: string;
  credentials?: {
    email: string;
    password: string;
    loginUrl: string;
  };
  steps?: StepLog[];
  error?: string;
}

interface StepLog {
  step: string;
  status: 'ok' | 'skipped' | 'error' | 'running';
  detail?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_FEATURES = [
  'overview', 'dashboard', 'campaigns', 'conversations', 'settings',
  'ai_assistant', 'ai_business_profile', 'ai_playground_history',
  'apollo_leads', 'followups', 'social_integration', 'deals_pipeline',
  'whatsapp-conversations', 'personal-whatsapp',
  // New billing and ROI features
  'billing_management', 'usage_tracking', 'community_roi',
];

const DEFAULT_FLAGS = [
  'overview', 'dashboard', 'campaigns', 'settings', 'social-integration',
  'whatsapp-conversations', 'personal-whatsapp', 'deals-pipeline', 'ai-icp-assistant',
  // New feature flags
  'billing-management', 'community-roi', 'campaign-execution-logs',
];

const DEFAULT_CAPABILITIES = [
  'view_overview', 'view_campaigns', 'view_conversations', 'view_followups',
  'view_pipeline', 'view_community_roi', 'view_make_call', 'view_call_logs',
  'view_ai_assistant', 'apollo.search', 'apollo.email_reveal',
  'campaigns', 'chat_with_ai', 'deals-pipeline', 'social-integration', 'business-hours',
  // New capabilities
  'view_billing', 'manage_billing_ledger', 'track_usage', 'view_recommendations',
];

const STEPS = [
  { id: 1, label: 'Company',  icon: Building2 },
  { id: 2, label: 'Admin',    icon: User },
  { id: 3, label: 'Database', icon: Database },
  { id: 4, label: 'WABA',     icon: MessageSquare },
  { id: 5, label: 'Features', icon: Cpu },
  { id: 6, label: 'Review',   icon: ClipboardList },
];

const PLAN_TIERS = ['starter', 'professional', 'enterprise', 'custom'];

const defaultForm = (): FormData => ({
  companyName: '',
  slug: '',
  email: '',
  planTier: 'professional',
  environment: 'develop',
  adminFirstName: '',
  adminLastName: '',
  adminEmail: '',
  adminPassword: '',
  createDatabase: true,
  customDbUrl: '',
  enableWaba: false,
  wabaSlug: '',
  wabaPhoneNumberId: '',
  wabaToken: '',
  wabaPhoneNumber: '',
  wabaDisplayName: '',
  wabaAccountId: '',
  wabaVerifyToken: '',
  wabaAppSecret: '',
  features: [...DEFAULT_FEATURES],
  featureFlags: [...DEFAULT_FLAGS],
  capabilities: [...DEFAULT_CAPABILITIES],
  enableVoice: false,
  voiceAgentName: '',
  voicePhoneNumber: '',
  voiceProvider: 'twilio',
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toSlug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function genPassword(len = 14) {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldRow({ label, required, hint, children }: {
  label: string; required?: boolean; hint?: string; children: React.ReactNode;
}) {
  return (
    <div className="mb-5">
      <label className="block text-sm font-medium text-gray-300 mb-1">
        {label}{required && <span className="text-red-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, disabled, type = 'text' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full bg-[#1e2333] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100
                 placeholder-gray-600 focus:outline-none focus:border-purple-500 disabled:opacity-50"
    />
  );
}

function SelectInput({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: string[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full bg-[#1e2333] border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100
                 focus:outline-none focus:border-purple-500"
    >
      {options.map(o => (
        <option key={o} value={o}>{o}</option>
      ))}
    </select>
  );
}

function Toggle({ checked, onChange, label }: {
  checked: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all text-sm font-medium
        ${checked
          ? 'bg-purple-900/40 border-purple-500 text-purple-300'
          : 'bg-[#1e2333] border-gray-700 text-gray-400 hover:border-gray-500'
        }`}
    >
      <div className={`w-9 h-5 rounded-full relative transition-colors ${checked ? 'bg-purple-500' : 'bg-gray-700'}`}>
        <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${checked ? 'translate-x-4' : 'translate-x-0.5'}`} />
      </div>
      {label}
    </button>
  );
}

function TagGroup({ items, selected, onChange }: {
  items: string[]; selected: string[]; onChange: (v: string[]) => void;
}) {
  const toggle = (item: string) => {
    onChange(selected.includes(item) ? selected.filter(x => x !== item) : [...selected, item]);
  };
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => (
        <button
          key={item}
          type="button"
          onClick={() => toggle(item)}
          className={`px-2.5 py-1 rounded text-xs font-mono transition-all border
            ${selected.includes(item)
              ? 'bg-purple-900/50 border-purple-500 text-purple-300'
              : 'bg-[#1e2333] border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
            }`}
        >
          {item}
        </button>
      ))}
    </div>
  );
}

// ─── Step Components ──────────────────────────────────────────────────────────

function StepCompany({ form, set }: { form: FormData; set: (k: keyof FormData, v: any) => void }) {
  const handleName = (v: string) => {
    set('companyName', v);
    if (!form.slug || form.slug === toSlug(form.companyName)) {
      set('slug', toSlug(v));
    }
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-6">Company Details</h2>
      <div className="grid grid-cols-2 gap-x-6">
        <FieldRow label="Company Name" required>
          <TextInput value={form.companyName} onChange={handleName} placeholder="Acme Corp" />
        </FieldRow>
        <FieldRow label="Slug" required hint="Used as DB name: salesmaya_<slug>">
          <TextInput value={form.slug} onChange={v => set('slug', toSlug(v))} placeholder="acme_corp" />
        </FieldRow>
        <FieldRow label="Billing Email" required>
          <TextInput value={form.email} onChange={v => set('email', v)} placeholder="billing@acme.com" type="email" />
        </FieldRow>
        <FieldRow label="Plan Tier">
          <SelectInput value={form.planTier} onChange={v => set('planTier', v)} options={PLAN_TIERS} />
        </FieldRow>
        <FieldRow label="Environment" required hint="Determines which core schema to use">
          <div className="flex gap-3">
            {(['develop', 'stage'] as const).map(env => (
              <button
                key={env}
                type="button"
                onClick={() => set('environment', env)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all
                  ${form.environment === env
                    ? 'bg-purple-900/40 border-purple-500 text-purple-300'
                    : 'bg-[#1e2333] border-gray-700 text-gray-500 hover:border-gray-500'
                  }`}
              >
                {env}
              </button>
            ))}
          </div>
        </FieldRow>
      </div>

      {form.slug && (
        <div className="mt-2 p-3 bg-[#1e2333] border border-gray-700 rounded-lg text-xs font-mono text-gray-400">
          <span className="text-gray-600">DB will be:</span>{' '}
          <span className="text-purple-400">salesmaya_{form.slug}</span>
          {' '}·{' '}
          <span className="text-gray-600">Core schema:</span>{' '}
          <span className="text-blue-400">{form.environment === 'stage' ? 'lad_stage' : 'lad_dev'}</span>
        </div>
      )}
    </div>
  );
}

function StepAdmin({ form, set }: { form: FormData; set: (k: keyof FormData, v: any) => void }) {
  const [showPw, setShowPw] = useState(false);

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-6">Admin User Account</h2>
      <div className="grid grid-cols-2 gap-x-6">
        <FieldRow label="First Name" required>
          <TextInput value={form.adminFirstName} onChange={v => set('adminFirstName', v)} placeholder="Jane" />
        </FieldRow>
        <FieldRow label="Last Name" required>
          <TextInput value={form.adminLastName} onChange={v => set('adminLastName', v)} placeholder="Smith" />
        </FieldRow>
        <FieldRow label="Admin Email" required>
          <TextInput value={form.adminEmail} onChange={v => set('adminEmail', v)} placeholder="jane@acme.com" type="email" />
        </FieldRow>
        <FieldRow label="Password" required hint="Min 8 chars — save this, it won't be shown again">
          <div className="relative">
            <input
              type={showPw ? 'text' : 'password'}
              value={form.adminPassword}
              onChange={e => set('adminPassword', e.target.value)}
              placeholder="••••••••••••••"
              className="w-full bg-[#1e2333] border border-gray-700 rounded-lg px-3 py-2 pr-20 text-sm text-gray-100
                         placeholder-gray-600 focus:outline-none focus:border-purple-500"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
              <button
                type="button"
                onClick={() => set('adminPassword', genPassword())}
                className="text-xs text-purple-400 hover:text-purple-300 px-1"
                title="Generate password"
              >
                Gen
              </button>
              <button
                type="button"
                onClick={() => setShowPw(p => !p)}
                className="text-gray-500 hover:text-gray-300"
              >
                {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>
        </FieldRow>
      </div>
    </div>
  );
}

function StepDatabase({ form, set }: { form: FormData; set: (k: keyof FormData, v: any) => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-6">Tenant Database</h2>

      <div className="mb-6">
        <Toggle
          checked={form.createDatabase}
          onChange={v => set('createDatabase', v)}
          label="Auto-create salesmaya database + run schema DDL"
        />
      </div>

      {form.createDatabase ? (
        <div className="p-4 bg-[#1e2333] border border-green-800/40 rounded-lg text-sm text-gray-400 space-y-1">
          <div className="flex items-center gap-2 text-green-400 font-medium mb-2">
            <CheckCircle2 size={14} />
            <span>Auto-provisioning enabled</span>
          </div>
          <p>• <code className="text-blue-400">CREATE DATABASE salesmaya_{form.slug || '&lt;slug&gt;'}</code></p>
          <p>• <code className="text-blue-400">GRANT ALL PRIVILEGES ON DATABASE salesmaya_{form.slug || '&lt;slug&gt;'} TO dbadmin</code></p>
          <p>• Run full 18-table <code className="text-purple-400">lad_conv_{form.environment === 'stage' ? 'stage' : 'dev'}</code> schema DDL</p>
          <p>• Seed <code className="text-purple-400">chat_settings</code> + LinkedIn prompt templates</p>
          <p>• Register in <code className="text-blue-400">{form.environment === 'stage' ? 'lad_stage' : 'lad_dev'}.tenant_database_config</code></p>
        </div>
      ) : (
        <FieldRow label="Custom Database URL" required hint="Full postgres:// connection string for the tenant database">
          <TextInput
            value={form.customDbUrl}
            onChange={v => set('customDbUrl', v)}
            placeholder="postgresql://user:pass@host:5432/salesmaya_custom"
          />
        </FieldRow>
      )}

      <div className="mt-4 p-3 bg-amber-900/10 border border-amber-800/30 rounded-lg text-xs text-amber-400 flex gap-2">
        <AlertCircle size={14} className="shrink-0 mt-0.5" />
        <span>The backend uses <code>DATABASE_URL</code> env var to connect to the postgres maintenance database for <code>CREATE DATABASE</code> commands. Ensure it has superuser permissions.</span>
      </div>
    </div>
  );
}

function StepWaba({ form, set }: { form: FormData; set: (k: keyof FormData, v: any) => void }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">WhatsApp Business API</h2>
      <p className="text-sm text-gray-500 mb-6">Optional — configure WABA integration for this tenant.</p>

      <div className="mb-6">
        <Toggle checked={form.enableWaba} onChange={v => set('enableWaba', v)} label="Enable WABA integration" />
      </div>

      {form.enableWaba && (
        <div className="space-y-0 grid grid-cols-2 gap-x-6">
          <FieldRow label="Webhook Slug" required hint="Used in webhook URL: /webhook/{slug}">
            <TextInput value={form.wabaSlug} onChange={v => set('wabaSlug', v)} placeholder="primary" />
          </FieldRow>
          <FieldRow label="Phone Number ID" required>
            <TextInput value={form.wabaPhoneNumberId} onChange={v => set('wabaPhoneNumberId', v)} placeholder="1234567890" />
          </FieldRow>
          <FieldRow label="Phone Number" required>
            <TextInput value={form.wabaPhoneNumber} onChange={v => set('wabaPhoneNumber', v)} placeholder="+971501234567" />
          </FieldRow>
          <FieldRow label="Display Name">
            <TextInput value={form.wabaDisplayName} onChange={v => set('wabaDisplayName', v)} placeholder="Acme Support" />
          </FieldRow>
          <FieldRow label="WABA Account ID">
            <TextInput value={form.wabaAccountId} onChange={v => set('wabaAccountId', v)} placeholder="WABA account ID" />
          </FieldRow>
          <FieldRow label="Verify Token" hint="Token set in Meta webhook config for challenge verification">
            <TextInput value={form.wabaVerifyToken} onChange={v => set('wabaVerifyToken', v)} placeholder="e.g. Techiemaya" />
          </FieldRow>
          <div className="col-span-2">
            <FieldRow label="Access Token" required hint="Meta permanent or temporary system user token">
              <TextInput value={form.wabaToken} onChange={v => set('wabaToken', v)} placeholder="EAAxx..." />
            </FieldRow>
          </div>
          <div className="col-span-2">
            <FieldRow label="App Secret" required hint="Facebook App Secret — used to verify webhook HMAC signatures (Meta App Dashboard → Settings → Basic)">
              <TextInput value={form.wabaAppSecret} onChange={v => set('wabaAppSecret', v)} placeholder="32-character hex string" type="password" />
            </FieldRow>
          </div>
        </div>
      )}
    </div>
  );
}

function StepFeatures({ form, set }: { form: FormData; set: (k: keyof FormData, v: any) => void }) {
  const allFeaturesOn = () => { set('features', [...DEFAULT_FEATURES]); set('featureFlags', [...DEFAULT_FLAGS]); set('capabilities', [...DEFAULT_CAPABILITIES]); };
  const allFeaturesOff = () => { set('features', []); set('featureFlags', []); set('capabilities', []); };

  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-2">Features & Capabilities</h2>

      <div className="flex gap-3 mb-5">
        <button onClick={allFeaturesOn} className="text-xs px-3 py-1.5 rounded border border-purple-700 text-purple-400 hover:bg-purple-900/30">
          Enable All Defaults
        </button>
        <button onClick={allFeaturesOff} className="text-xs px-3 py-1.5 rounded border border-gray-700 text-gray-500 hover:border-gray-500">
          Clear All
        </button>
      </div>

      <div className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Tenant Features <span className="text-gray-600 font-normal ml-1">({form.features.length} selected)</span>
          </p>
          <TagGroup items={DEFAULT_FEATURES} selected={form.features} onChange={v => set('features', v)} />
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Feature Flags <span className="text-gray-600 font-normal ml-1">({form.featureFlags.length} selected)</span>
          </p>
          <TagGroup items={DEFAULT_FLAGS} selected={form.featureFlags} onChange={v => set('featureFlags', v)} />
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Owner Capabilities <span className="text-gray-600 font-normal ml-1">({form.capabilities.length} selected)</span>
          </p>
          <TagGroup items={DEFAULT_CAPABILITIES} selected={form.capabilities} onChange={v => set('capabilities', v)} />
        </div>

        <div className="border-t border-gray-800 pt-4">
          <Toggle checked={form.enableVoice} onChange={v => set('enableVoice', v)} label="Enable Voice Agent" />
          {form.enableVoice && (
            <div className="mt-4 grid grid-cols-2 gap-x-6">
              <FieldRow label="Voice Agent Name">
                <TextInput value={form.voiceAgentName} onChange={v => set('voiceAgentName', v)} placeholder="Acme AI Assistant" />
              </FieldRow>
              <FieldRow label="Phone Number" hint="E.164 format">
                <TextInput value={form.voicePhoneNumber} onChange={v => set('voicePhoneNumber', v)} placeholder="+12125550100" />
              </FieldRow>
              <FieldRow label="Provider">
                <SelectInput value={form.voiceProvider} onChange={v => set('voiceProvider', v)} options={['twilio', 'vonage', 'plivo']} />
              </FieldRow>
            </div>
          )}
        </div>

        <div className="border-t border-gray-800 pt-4 mt-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">New Features (Billing & ROI)</p>
          <p className="text-xs text-gray-500 mb-3">These features will be initialized with the tenant's core schema.</p>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.features.includes('billing_management')}
                onChange={e => {
                  const newFeatures = e.target.checked
                    ? [...form.features, 'billing_management']
                    : form.features.filter(f => f !== 'billing_management');
                  set('features', newFeatures);
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-300">💰 Billing Management (ledger, usage tracking)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.features.includes('community_roi')}
                onChange={e => {
                  const newFeatures = e.target.checked
                    ? [...form.features, 'community_roi']
                    : form.features.filter(f => f !== 'community_roi');
                  set('features', newFeatures);
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-300">👥 Community ROI (member relationships, recommendations)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.features.includes('apollo_leads')}
                onChange={e => {
                  const newFeatures = e.target.checked
                    ? [...form.features, 'apollo_leads']
                    : form.features.filter(f => f !== 'apollo_leads');
                  set('features', newFeatures);
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-300">🔍 Apollo Integration (company search, enrichment cache)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.features.includes('usage_tracking')}
                onChange={e => {
                  const newFeatures = e.target.checked
                    ? [...form.features, 'usage_tracking']
                    : form.features.filter(f => f !== 'usage_tracking');
                  set('features', newFeatures);
                }}
                className="w-4 h-4"
              />
              <span className="text-sm text-gray-300">📊 Usage Tracking (LLM billing, campaign logs)</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-800 last:border-0">
      <span className="text-xs text-gray-500 w-44 shrink-0">{label}</span>
      <span className={`text-sm text-gray-200 text-right ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</span>
    </div>
  );
}

function StepReview({ form }: { form: FormData }) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-white mb-4">Review & Confirm</h2>
      <p className="text-sm text-gray-500 mb-6">
        Verify all details before provisioning. This will create the tenant, user, and database.
      </p>

      <div className="space-y-4">
        <div className="bg-[#1a1f2e] rounded-lg border border-gray-800 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Company</p>
          <ReviewRow label="Name" value={form.companyName} />
          <ReviewRow label="Slug" value={form.slug} mono />
          <ReviewRow label="Email" value={form.email} />
          <ReviewRow label="Plan" value={form.planTier} />
          <ReviewRow label="Environment" value={form.environment} />
          <ReviewRow label="DB Name" value={`salesmaya_${form.slug}`} mono />
          <ReviewRow label="Core Schema" value={form.environment === 'stage' ? 'lad_stage' : 'lad_dev'} mono />
        </div>

        <div className="bg-[#1a1f2e] rounded-lg border border-gray-800 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Admin User</p>
          <ReviewRow label="Name" value={`${form.adminFirstName} ${form.adminLastName}`} />
          <ReviewRow label="Email" value={form.adminEmail} />
          <ReviewRow label="Password" value={'*'.repeat(form.adminPassword.length)} mono />
        </div>

        <div className="bg-[#1a1f2e] rounded-lg border border-gray-800 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Database</p>
          <ReviewRow label="Auto-create" value={form.createDatabase ? 'Yes — run full DDL' : 'No — custom URL'} />
          {!form.createDatabase && <ReviewRow label="Custom URL" value={form.customDbUrl} mono />}
        </div>

        <div className="bg-[#1a1f2e] rounded-lg border border-gray-800 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Features & Configuration</p>
          <ReviewRow label="Tenant Features" value={`${form.features.length} enabled`} />
          <ReviewRow label="Feature Flags" value={`${form.featureFlags.length} enabled`} />
          <ReviewRow label="Capabilities" value={`${form.capabilities.length} enabled`} />
          <ReviewRow label="Core Schema Tables" value="37 tables (billing, community ROI, apollo, etc.)" />
          <ReviewRow label="WABA" value={form.enableWaba ? `✓ ${form.wabaPhoneNumber} (slug: ${form.wabaSlug})` : 'Not configured'} />
          {form.enableWaba && <ReviewRow label="Verify Token" value={form.wabaVerifyToken || '(not set)'} />}
          {form.enableWaba && <ReviewRow label="App Secret" value={form.wabaAppSecret ? '••••••••' : '(not set)'} />}
          <ReviewRow label="Voice Agent" value={form.enableVoice ? `✓ ${form.voiceAgentName} (${form.voiceProvider})` : 'Not configured'} />
        </div>
      </div>
    </div>
  );
}

// ─── Provisioning Log ─────────────────────────────────────────────────────────

function ProvisionLog({ logs, done, result, onReset }: {
  logs: StepLog[];
  done: boolean;
  result: ProvisionResult | null;
  onReset: () => void;
}) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copy = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const statusIcon = (s: StepLog['status']) => {
    if (s === 'ok') return <CheckCircle2 size={14} className="text-green-400 shrink-0" />;
    if (s === 'skipped') return <Info size={14} className="text-gray-500 shrink-0" />;
    if (s === 'error') return <XCircle size={14} className="text-red-400 shrink-0" />;
    return <Loader2 size={14} className="text-purple-400 animate-spin shrink-0" />;
  };

  return (
    <div className="space-y-6">
      <div className="bg-[#0e1118] border border-gray-800 rounded-lg p-4 font-mono text-xs space-y-1.5 max-h-80 overflow-y-auto">
        {logs.map((l, i) => (
          <div key={i} className="flex items-start gap-2">
            {statusIcon(l.status)}
            <span className={
              l.status === 'ok' ? 'text-green-300' :
              l.status === 'error' ? 'text-red-300' :
              l.status === 'running' ? 'text-purple-300' :
              'text-gray-600'
            }>
              {l.step}
              {l.detail && <span className="text-gray-600 ml-2">— {l.detail}</span>}
            </span>
          </div>
        ))}
        {!done && (
          <div className="flex items-center gap-2 text-gray-600 animate-pulse">
            <Loader2 size={12} className="animate-spin" />
            <span>Provisioning…</span>
          </div>
        )}
      </div>

      {done && result?.success && (
        <div className="bg-green-900/20 border border-green-700/40 rounded-lg p-5 space-y-4">
          <div className="flex items-center gap-2 text-green-400 font-semibold">
            <CheckCircle2 size={18} />
            <span>Tenant provisioned successfully!</span>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between bg-[#0e1118] rounded px-3 py-2">
              <span className="text-gray-500 text-xs w-28">Tenant ID</span>
              <span className="font-mono text-xs text-purple-300 flex-1 text-right truncate">{result.tenantId}</span>
              <button onClick={() => copy(result.tenantId!, 'tenantId')} className="ml-2 text-gray-600 hover:text-gray-400">
                {copiedField === 'tenantId' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              </button>
            </div>
            <div className="flex items-center justify-between bg-[#0e1118] rounded px-3 py-2">
              <span className="text-gray-500 text-xs w-28">User ID</span>
              <span className="font-mono text-xs text-blue-300 flex-1 text-right truncate">{result.userId}</span>
              <button onClick={() => copy(result.userId!, 'userId')} className="ml-2 text-gray-600 hover:text-gray-400">
                {copiedField === 'userId' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              </button>
            </div>
            {result.dbName && (
            <div className="flex items-center justify-between bg-[#0e1118] rounded px-3 py-2">
              <span className="text-gray-500 text-xs w-28">Database</span>
              <span className="font-mono text-xs text-green-300 flex-1 text-right">{result.dbName}</span>
              <button onClick={() => copy(result.dbName!, 'dbName')} className="ml-2 text-gray-600 hover:text-gray-400">
                {copiedField === 'dbName' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
              </button>
            </div>
            )}
            {result.credentials && (
              <>
                <div className="flex items-center justify-between bg-[#0e1118] rounded px-3 py-2">
                  <span className="text-gray-500 text-xs w-28">Login Email</span>
                  <span className="font-mono text-xs text-gray-200 flex-1 text-right">{result.credentials.email}</span>
                  <button onClick={() => copy(result.credentials!.email, 'email')} className="ml-2 text-gray-600 hover:text-gray-400">
                    {copiedField === 'email' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="flex items-center justify-between bg-[#0e1118] rounded px-3 py-2">
                  <span className="text-gray-500 text-xs w-28">Password</span>
                  <span className="font-mono text-xs text-amber-300 flex-1 text-right">{result.credentials.password}</span>
                  <button onClick={() => copy(result.credentials!.password, 'pw')} className="ml-2 text-gray-600 hover:text-gray-400">
                    {copiedField === 'pw' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>
                </div>
                <div className="flex items-center justify-between bg-[#0e1118] rounded px-3 py-2">
                  <span className="text-gray-500 text-xs w-28">Login URL</span>
                  <span className="font-mono text-xs text-blue-400 flex-1 text-right truncate">{result.credentials.loginUrl}</span>
                  <button onClick={() => copy(result.credentials!.loginUrl, 'url')} className="ml-2 text-gray-600 hover:text-gray-400">
                    {copiedField === 'url' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>
                </div>
              </>
            )}
          </div>

          <button
            onClick={onReset}
            className="w-full py-2 rounded-lg border border-gray-700 text-sm text-gray-400 hover:border-gray-500 hover:text-gray-200 transition-all"
          >
            Provision Another Tenant
          </button>
        </div>
      )}

      {done && result && !result.success && (
        <div className="bg-red-900/20 border border-red-700/40 rounded-lg p-5">
          <div className="flex items-center gap-2 text-red-400 font-semibold mb-2">
            <XCircle size={18} />
            <span>Provisioning failed</span>
          </div>
          <p className="text-sm text-red-300 font-mono">{result.error}</p>
          <button
            onClick={onReset}
            className="mt-4 w-full py-2 rounded-lg border border-red-800 text-sm text-red-400 hover:bg-red-900/30 transition-all"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function TenantOnboardPage() {
  const router = useRouter();

  // ── Auth gate ─────────────────────────────────────────────────────────────
  const [authState, setAuthState] = useState<'loading' | 'allowed' | 'denied' | 'unauthenticated'>('loading');

  useEffect(() => {
    getCurrentUser()
      .then(response => {
        // /api/auth/me returns { success, user: { email, ... } }
        // lib/auth.ts getCurrentUser() returns the raw response object,
        // so email lives at response.user.email (not response.email directly)
        const raw = response as any;
        const email = (raw?.user?.email || raw?.email || '').toLowerCase().trim();
        setAuthState(email === SUPER_ADMIN_EMAIL ? 'allowed' : 'denied');
      })
      .catch(() => {
        setAuthState('unauthenticated');
        router.replace('/login?redirect_url=' + encodeURIComponent('/tenant/onboard/new'));
      });
  }, [router]);

  // ── Form state ────────────────────────────────────────────────────────────
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormData>(defaultForm());
  const [provisioning, setProvisioning] = useState(false);
  const [provisionLogs, setProvisionLogs] = useState<StepLog[]>([]);
  const [provisionDone, setProvisionDone] = useState(false);
  const [provisionResult, setProvisionResult] = useState<ProvisionResult | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const set = useCallback((k: keyof FormData, v: any) => {
    setForm(prev => ({ ...prev, [k]: v }));
    setErrors([]);
  }, []);

  function validateStep(): string[] {
    const errs: string[] = [];
    if (step === 1) {
      if (!form.companyName.trim()) errs.push('Company name is required');
      if (!form.slug.trim()) errs.push('Slug is required');
      if (!form.email.trim() || !form.email.includes('@')) errs.push('Valid billing email is required');
    }
    if (step === 2) {
      if (!form.adminFirstName.trim()) errs.push('First name is required');
      if (!form.adminLastName.trim()) errs.push('Last name is required');
      if (!form.adminEmail.trim() || !form.adminEmail.includes('@')) errs.push('Valid admin email is required');
      if (form.adminPassword.length < 8) errs.push('Password must be at least 8 characters');
    }
    if (step === 3 && !form.createDatabase && !form.customDbUrl.trim()) {
      errs.push('Custom database URL is required when not auto-creating');
    }
    if (step === 4 && form.enableWaba) {
      if (!form.wabaSlug.trim()) errs.push('Webhook slug is required');
      if (!form.wabaPhoneNumberId.trim()) errs.push('WABA Phone Number ID is required');
      if (!form.wabaToken.trim()) errs.push('WABA Access Token is required');
      if (!form.wabaPhoneNumber.trim()) errs.push('WABA Phone Number is required');
      if (!form.wabaAppSecret.trim()) errs.push('Facebook App Secret is required');
    }
    return errs;
  }

  function next() {
    const errs = validateStep();
    if (errs.length) { setErrors(errs); return; }
    setErrors([]);
    setStep(s => Math.min(s + 1, 6));
  }

  function back() {
    setErrors([]);
    setStep(s => Math.max(s - 1, 1));
  }

  async function provision() {
    setProvisioning(true);
    setProvisionLogs([{ step: 'Starting provisioning…', status: 'running' }]);
    setProvisionDone(false);
    setProvisionResult(null);

    try {
      const resp = await fetch('/api/tenant/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          // Company
          company_name:   form.companyName,
          slug:           form.slug,
          company_email:  form.email,
          plan_tier:      form.planTier,
          environment:    form.environment,
          status:         'active',
          // Admin user
          admin_first_name: form.adminFirstName,
          admin_last_name:  form.adminLastName,
          admin_email:      form.adminEmail,
          admin_password:   form.adminPassword,
          // Database
          ...((!form.createDatabase && form.customDbUrl) ? { db_name: undefined } : {}),
          // WABA
          waba_enabled:            form.enableWaba,
          waba_slug:               form.enableWaba ? form.wabaSlug : undefined,
          waba_phone_number_id:    form.enableWaba ? form.wabaPhoneNumberId : undefined,
          waba_access_token:       form.enableWaba ? form.wabaToken : undefined,
          waba_business_account_id:form.enableWaba ? form.wabaAccountId : undefined,
          waba_display_name:       form.enableWaba ? form.wabaDisplayName : undefined,
          waba_verify_token:       form.enableWaba ? form.wabaVerifyToken : undefined,
          waba_app_secret:         form.enableWaba ? form.wabaAppSecret : undefined,
          // Features — explicit arrays override defaults in backend
          features:      form.features,
          feature_flags: form.featureFlags,
          capabilities:  form.capabilities,
          // Voice
          voice_enabled:      form.enableVoice,
          voice_agent_name:   form.enableVoice ? form.voiceAgentName : undefined,
          voice_provider:     form.enableVoice ? form.voiceProvider : undefined,
        }),
      });

      // Backend returns: { success, tenant_id, user_id, db_name, log: string[], credentials: { email, password, login_url } }
      const raw = await resp.json().catch(() => ({ success: false, error: 'Invalid response from server' }));

      // Convert log string array → StepLog[]
      const parseLogLine = (line: string): StepLog => {
        if (line.startsWith('✅') || line.startsWith('🎉')) return { step: line, status: 'ok' };
        if (line.startsWith('⚠️')) return { step: line, status: 'skipped' };
        if (line.startsWith('❌')) return { step: line, status: 'error' };
        return { step: line, status: 'ok' };
      };

      const logs: StepLog[] = (raw.log as string[] || []).map(parseLogLine);

      if (!raw.success && !logs.length) {
        logs.push({ step: raw.error || 'Unknown error', status: 'error' });
      }

      const data: ProvisionResult = {
        success:    raw.success,
        tenantId:   raw.tenant_id,
        userId:     raw.user_id,
        dbName:     raw.db_name,
        error:      raw.error,
        steps:      logs,
        credentials: raw.credentials ? {
          email:    raw.credentials.email,
          password: raw.credentials.password,
          loginUrl: raw.credentials.login_url,
        } : undefined,
      };

      setProvisionLogs(logs);
      setProvisionResult(data);
    } catch (e: any) {
      setProvisionLogs([{ step: `Network error: ${e.message}`, status: 'error' }]);
      setProvisionResult({ success: false, error: e.message });
    } finally {
      setProvisionDone(true);
      setProvisioning(false);
    }
  }

  function reset() {
    setStep(1);
    setForm(defaultForm());
    setErrors([]);
    setProvisionLogs([]);
    setProvisionDone(false);
    setProvisionResult(null);
    setProvisioning(false);
  }

  const isLastStep = step === 6;
  const isProvisioningStep = provisioning || provisionLogs.length > 0;

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
          <p className="text-sm text-gray-500">
            This page is only accessible to super-admin accounts.
            <br />Contact <span className="text-purple-400">{SUPER_ADMIN_EMAIL}</span> if you need access.
          </p>
          <button
            onClick={() => router.back()}
            className="text-sm text-gray-600 hover:text-gray-400 underline underline-offset-2"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-100 flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-600 flex items-center justify-center">
            <Building2 size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white">Tenant Onboarding</h1>
            <p className="text-xs text-gray-500">web.mrlads.com/tenant/onboard/new</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
            form.environment === 'stage'
              ? 'border-amber-700 text-amber-400 bg-amber-900/20'
              : 'border-blue-700 text-blue-400 bg-blue-900/20'
          }`}>
            {form.environment}
          </span>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Step Sidebar */}
        <div className="w-52 shrink-0 border-r border-gray-800 py-8 px-4 space-y-1">
          {STEPS.map(s => {
            const Icon = s.icon;
            const active = s.id === step;
            const done = s.id < step || provisionDone;
            return (
              <button
                key={s.id}
                onClick={() => !provisioning && !isProvisioningStep && setStep(s.id)}
                disabled={provisioning || isProvisioningStep}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left
                  ${active
                    ? 'bg-purple-900/40 text-purple-300 border border-purple-700/50'
                    : done
                    ? 'text-green-400 hover:bg-[#1e2333]'
                    : 'text-gray-600 hover:bg-[#1e2333] hover:text-gray-400'
                  }`}
              >
                {done && s.id < step ? (
                  <CheckCircle2 size={15} className="text-green-500 shrink-0" />
                ) : (
                  <Icon size={15} className="shrink-0" />
                )}
                <span>{s.label}</span>
                {active && <ChevronRight size={13} className="ml-auto text-purple-500" />}
              </button>
            );
          })}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl mx-auto">

            {/* Step progress bar */}
            <div className="flex items-center gap-1 mb-8">
              {STEPS.map((s, i) => (
                <React.Fragment key={s.id}>
                  <div className={`h-1 flex-1 rounded-full transition-all ${s.id <= step ? 'bg-purple-500' : 'bg-gray-800'}`} />
                  {i < STEPS.length - 1 && <div className="w-0" />}
                </React.Fragment>
              ))}
            </div>

            {/* Step content */}
            {isProvisioningStep ? (
              <ProvisionLog
                logs={provisionLogs}
                done={provisionDone}
                result={provisionResult}
                onReset={reset}
              />
            ) : (
              <>
                {step === 1 && <StepCompany form={form} set={set} />}
                {step === 2 && <StepAdmin form={form} set={set} />}
                {step === 3 && <StepDatabase form={form} set={set} />}
                {step === 4 && <StepWaba form={form} set={set} />}
                {step === 5 && <StepFeatures form={form} set={set} />}
                {step === 6 && <StepReview form={form} />}

                {/* Errors */}
                {errors.length > 0 && (
                  <div className="mt-4 p-3 bg-red-900/20 border border-red-800/40 rounded-lg">
                    {errors.map((e, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-red-300">
                        <XCircle size={12} className="shrink-0" />
                        <span>{e}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-800">
                  <button
                    onClick={back}
                    disabled={step === 1}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-700 text-sm text-gray-400
                               hover:border-gray-500 hover:text-gray-200 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  >
                    <ChevronLeft size={15} />
                    Back
                  </button>

                  {isLastStep ? (
                    <button
                      onClick={provision}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500
                                 text-white text-sm font-semibold transition-all shadow-lg shadow-purple-900/40"
                    >
                      <Database size={15} />
                      Provision Tenant
                    </button>
                  ) : (
                    <button
                      onClick={next}
                      className="flex items-center gap-2 px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500
                                 text-white text-sm font-medium transition-all"
                    >
                      Next
                      <ChevronRight size={15} />
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
