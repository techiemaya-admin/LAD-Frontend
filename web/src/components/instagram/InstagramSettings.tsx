'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
// Same-origin fetcher — hits the Next.js proxy at /api/instagram-conversations/*
// rather than lib/api (which prepends NEXT_PUBLIC_BACKEND_URL = LAD_backend :3004).
import { igGet as apiGet, igPost as apiPost, igPatch as apiPatch, igDelete as apiDelete } from './instagram-api';
import { InstagramTenantOnboarding } from './InstagramTenantOnboarding';
import {
  Target, Loader2, Plus, Trash2, CheckCircle2,
  AlertCircle, Power, Link as LinkIcon, Building2, ArrowLeft,
} from 'lucide-react';

type Tab = 'accounts' | 'goals';

type InstagramAccount = {
  id: string;
  provider?: 'meta' | 'unipile' | string;
  provider_account_id?: string | null;
  meta_app_id?: string | null;
  meta_ig_user_id?: string | null;
  meta_verify_token?: string | null;
  meta_access_token_expires_at?: string | null;
  instagram_username?: string | null;
  display_name?: string | null;
  ai_replies_enabled: boolean;
  ai_comments_enabled: boolean;
  ai_likes_enabled: boolean;
  comment_window_hours: number;
  status: string;
};

type Goal = {
  id: string;
  name: string;
  description?: string | null;
  goal_type: string;
  target_url?: string | null;
  call_to_action?: string | null;
  applies_to_dms: boolean;
  applies_to_comments: boolean;
  keyword_triggers?: string[] | null;
  priority: number;
  is_active: boolean;
  impressions_count: number;
  conversions_count: number;
};

const GOAL_TYPES = [
  { value: 'book_call', label: 'Book a call' },
  { value: 'capture_email', label: 'Capture email' },
  { value: 'drive_sale', label: 'Drive a sale' },
  { value: 'increase_followers', label: 'Increase followers' },
  { value: 'reply_dm', label: 'Reply to DM' },
  { value: 'custom', label: 'Custom' },
];

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
  // Accounts comes first — it's the fundamental setup; nothing else
  // works without at least one connected Instagram account.
  { id: 'accounts', label: 'Accounts', icon: Building2 },
  { id: 'goals',    label: 'AI Goals', icon: Target },
];

export const InstagramSettings: React.FC = () => {
  const search = useSearchParams();
  const router = useRouter();
  const initialTab = (search.get('tab') as Tab) || 'accounts';
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    router.replace(`/instagram/settings?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="min-h-screen bg-white text-neutral-900 dark:bg-neutral-950 dark:text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Back link — operator opened this page from /settings?tab=integrations
            (or the conversations chat-header AI Settings icons). Give them a
            one-click way home so they don't have to use the browser back button. */}
        <button
          type="button"
          onClick={() => router.push('/settings?tab=integrations')}
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-neutral-600 hover:text-neutral-900 dark:text-white/70 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Integrations
        </button>

        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Instagram AI</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-white/60">
            Manage connected Instagram accounts and AI Goals. Toggle AI replies, comments, and likes per account from the Accounts tab.
          </p>
        </header>

        <nav className="mb-6 flex gap-1 rounded-lg border border-neutral-200 bg-neutral-100/60 p-1 dark:border-white/10 dark:bg-white/5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  active
                    ? 'bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-white dark:bg-white dark:text-neutral-900'
                    : 'text-neutral-600 hover:bg-neutral-200/60 dark:text-white/70 dark:hover:bg-white/5'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

        {tab === 'accounts' && <InstagramTenantOnboarding />}
        {tab === 'goals' && <AIGoalsPanel />}
      </div>
    </div>
  );
};

// ── AI Goals ───────────────────────────────────────────────────────────────

const AIGoalsPanel: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ success: boolean; goals: Goal[] }>(
        '/api/instagram-conversations/goals',
      );
      setGoals(data?.goals || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load goals');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const onCreate = async (payload: Partial<Goal>) => {
    await apiPost('/api/instagram-conversations/goals', payload);
    setShowCreate(false);
    await load();
  };

  const onToggle = async (id: string, is_active: boolean) => {
    await apiPatch(`/api/instagram-conversations/goals/${id}`, { is_active });
    await load();
  };

  const onDelete = async (id: string) => {
    if (!confirm('Delete this goal? This action is reversible — the goal is soft-deleted.')) return;
    await apiDelete(`/api/instagram-conversations/goals/${id}`);
    await load();
  };

  return (
    <Section
      title="AI Goals"
      blurb="Every AI reply (DM + comment) will be biased toward whichever active goal best matches the message."
    >
      <div className="mb-5 flex items-center justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-white/90"
        >
          <Plus className="h-4 w-4" /> New goal
        </button>
      </div>

      {loading && <Loader />}
      {error && <ErrorBanner message={error} />}

      {showCreate && (
        <GoalForm onCancel={() => setShowCreate(false)} onSubmit={onCreate} />
      )}

      {!loading && goals.length === 0 && !showCreate && (
        <EmptyState
          icon={Target}
          title="No goals yet"
          blurb="Create your first AI Goal — bookings, sales, email captures — and AI will steer every reply toward it."
        />
      )}

      <div className="mt-4 space-y-3">
        {goals.map((g) => (
          <div key={g.id} className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="text-base font-medium">{g.name}</h4>
                  <span className="rounded bg-neutral-200 dark:bg-white/10 px-1.5 py-0.5 text-xs">{g.goal_type}</span>
                  {g.applies_to_dms && <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-xs text-violet-200">DMs</span>}
                  {g.applies_to_comments && <span className="rounded bg-pink-500/20 px-1.5 py-0.5 text-xs text-pink-200">Comments</span>}
                </div>
                {g.description && <p className="mt-1 text-sm text-neutral-600 dark:text-white/60">{g.description}</p>}
                {g.call_to_action && (
                  <p className="mt-2 text-xs text-neutral-500 dark:text-white/50">CTA: <span className="text-neutral-800 dark:text-white/80">"{g.call_to_action}"</span></p>
                )}
                {g.target_url && (
                  <p className="mt-1 text-xs text-neutral-500 dark:text-white/50 break-all">Link: {g.target_url}</p>
                )}
                {Array.isArray(g.keyword_triggers) && g.keyword_triggers.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {g.keyword_triggers.map((k) => (
                      <span key={k} className="rounded bg-neutral-200 dark:bg-white/10 px-1.5 py-0.5 text-[11px] text-neutral-700 dark:text-white/70">{k}</span>
                    ))}
                  </div>
                )}
                <div className="mt-3 flex gap-4 text-xs text-neutral-600 dark:text-white/60">
                  <span>Impressions: <span className="text-white">{g.impressions_count}</span></span>
                  <span>Conversions: <span className="text-white">{g.conversions_count}</span></span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <ToggleSwitch
                  checked={g.is_active}
                  onChange={(v) => onToggle(g.id, v)}
                  label={g.is_active ? 'Active' : 'Paused'}
                />
                <button
                  onClick={() => onDelete(g.id)}
                  className="rounded p-1.5 text-neutral-400 dark:text-white/40 hover:bg-neutral-100 dark:hover:bg-white/5 hover:text-red-300"
                  title="Delete goal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
};

const GoalForm: React.FC<{ onCancel: () => void; onSubmit: (g: Partial<Goal>) => Promise<void> }> = ({ onCancel, onSubmit }) => {
  const [name, setName] = useState('');
  const [type, setType] = useState('book_call');
  const [description, setDescription] = useState('');
  const [cta, setCta] = useState('');
  const [url, setUrl] = useState('');
  const [keywords, setKeywords] = useState('');
  const [dms, setDms] = useState(true);
  const [comments, setComments] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name.trim()) { setErr('Name is required'); return; }
    setSaving(true);
    setErr(null);
    try {
      await onSubmit({
        name: name.trim(),
        goal_type: type,
        description: description.trim() || undefined,
        call_to_action: cta.trim() || undefined,
        target_url: url.trim() || undefined,
        keyword_triggers: keywords.split(',').map((k) => k.trim()).filter(Boolean),
        applies_to_dms: dms,
        applies_to_comments: comments,
      });
    } catch (e: any) {
      setErr(e?.message || 'Failed to create goal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 p-4">
      <h4 className="mb-3 text-sm font-medium">New goal</h4>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Goal name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Book a discovery call" />
        </Field>
        <Field label="Type">
          <select value={type} onChange={(e) => setType(e.target.value)} className={inputClass}>
            {GOAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Call to action">
          <input value={cta} onChange={(e) => setCta(e.target.value)} className={inputClass} placeholder="Tap the link in bio to book" />
        </Field>
        <Field label="Target URL">
          <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputClass} placeholder="https://cal.com/your-link" />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} placeholder="What's this goal for?" />
        </Field>
        <Field label="Keyword triggers (comma-separated)" className="sm:col-span-2">
          <input value={keywords} onChange={(e) => setKeywords(e.target.value)} className={inputClass} placeholder="course, price, demo, book" />
        </Field>
        <div className="flex items-center gap-4 text-sm">
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={dms} onChange={(e) => setDms(e.target.checked)} /> Apply to DMs
          </label>
          <label className="inline-flex items-center gap-2">
            <input type="checkbox" checked={comments} onChange={(e) => setComments(e.target.checked)} /> Apply to Comments
          </label>
        </div>
      </div>
      {err && <ErrorBanner message={err} />}
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md border border-neutral-300 dark:border-white/20 px-3 py-1.5 text-sm text-neutral-800 dark:text-white/80 hover:bg-neutral-100 dark:hover:bg-white/5">Cancel</button>
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save goal
        </button>
      </div>
    </div>
  );
};

// ── shared bits ─────────────────────────────────────────────────────────────

const inputClass =
  'w-full rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 px-2 py-1.5 text-sm text-neutral-900 dark:text-white placeholder-neutral-400 dark:placeholder-white/30 outline-none focus:border-neutral-400 dark:focus:border-white/30';

const Field: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({ label, className, children }) => (
  <label className={`block ${className || ''}`}>
    <div className="mb-1 text-xs text-neutral-600 dark:text-white/60">{label}</div>
    {children}
  </label>
);

const Section: React.FC<{ title: string; blurb: string; children: React.ReactNode }> = ({ title, blurb, children }) => (
  <div className="rounded-2xl border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900 p-6">
    <div className="mb-5">
      <h2 className="text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-neutral-600 dark:text-white/60">{blurb}</p>
    </div>
    {children}
  </div>
);

const Loader: React.FC = () => (
  <div className="flex items-center gap-2 py-8 text-sm text-neutral-600 dark:text-white/60">
    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
  </div>
);

const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div className="mb-3 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
    <AlertCircle className="h-4 w-4" /> {message}
  </div>
);

const EmptyState: React.FC<{ icon: React.ElementType; title: string; blurb: string; action?: React.ReactNode }> = ({ icon: Icon, title, blurb, action }) => (
  <div className="rounded-xl border border-dashed border-neutral-200 dark:border-white/10 p-8 text-center">
    <div className="mx-auto mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200 dark:bg-white/10">
      <Icon className="h-5 w-5 text-neutral-700 dark:text-white/70" />
    </div>
    <h3 className="text-base font-medium">{title}</h3>
    <p className="mt-1 text-sm text-neutral-600 dark:text-white/60">{blurb}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
  <label className="inline-flex cursor-pointer items-center gap-2 text-sm">
    {label && <span className="text-neutral-700 dark:text-white/70">{label}</span>}
    <span className="relative inline-flex h-5 w-9 items-center">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="absolute inset-0 rounded-full bg-neutral-300 dark:bg-white/15 transition peer-checked:bg-emerald-500" />
      <span className="absolute left-0.5 h-4 w-4 transform rounded-full bg-white transition peer-checked:translate-x-4" />
    </span>
  </label>
);

const AddAccountInline: React.FC<{ onAdd: (payload: any) => Promise<void> }> = ({ onAdd }) => {
  const [providerType, setProviderType] = useState<'meta' | 'unipile'>('meta');

  return (
    <div className="rounded-xl border border-neutral-200 dark:border-white/10 bg-neutral-100 dark:bg-white/5 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-sm font-medium">Connect an Instagram account</div>
        <div className="inline-flex gap-1 rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 p-0.5 text-xs">
          <button
            onClick={() => setProviderType('meta')}
            className={`rounded px-2 py-1 ${providerType === 'meta' ? 'bg-white text-neutral-900' : 'text-neutral-700 dark:text-white/70 hover:bg-neutral-100 dark:hover:bg-white/5'}`}
          >Meta (official)</button>
          <button
            onClick={() => setProviderType('unipile')}
            className={`rounded px-2 py-1 ${providerType === 'unipile' ? 'bg-white text-neutral-900' : 'text-neutral-700 dark:text-white/70 hover:bg-neutral-100 dark:hover:bg-white/5'}`}
          >Direct sign-in</button>
        </div>
      </div>
      {providerType === 'meta' ? <MetaConnectForm onAdd={onAdd} /> : <DirectConnectForm onAdd={onAdd} />}
    </div>
  );
};

const DirectConnectForm: React.FC<{ onAdd: (payload: any) => Promise<void> }> = ({ onAdd }) => {
  const [provider, setProvider] = useState('');
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!provider.trim()) { setErr('Connection ID is required'); return; }
    setSaving(true); setErr(null);
    try {
      await onAdd({ provider: 'unipile',
        provider_account_id: provider.trim(),
        instagram_username: username.trim() || undefined });
      setProvider(''); setUsername('');
    } catch (e: any) {
      setErr(e?.message || 'Failed to add account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-xs text-neutral-500 dark:text-white/50 mb-3">
        Paste the connection ID for your linked Instagram session.
        Direct sign-in is the only option that supports auto-liking comments.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input value={provider} onChange={(e) => setProvider(e.target.value)} className={inputClass} placeholder="Connection ID" />
        <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} placeholder="Instagram handle (optional)" />
      </div>
      {err && <div className="mt-2"><ErrorBanner message={err} /></div>}
      <div className="mt-3 flex justify-end">
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />} Connect
        </button>
      </div>
    </div>
  );
};

const MetaConnectForm: React.FC<{ onAdd: (payload: any) => Promise<void> }> = ({ onAdd }) => {
  const [appId, setAppId] = useState('');
  const [appSecret, setAppSecret] = useState('');
  const [verifyToken, setVerifyToken] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [igUserId, setIgUserId] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [saving, setSaving] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<{ id?: string; username?: string; name?: string } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const verifyToken_ = async () => {
    if (!accessToken.trim()) { setErr('Access token is required to verify'); return; }
    setVerifying(true); setErr(null); setVerified(null);
    try {
      const r = await apiPost<any>('/api/instagram-conversations/accounts/verify-meta-token', {
        access_token: accessToken.trim(),
      });
      if (!r?.success) {
        setErr(r?.error || 'Token failed verification');
      } else {
        setVerified(r.profile);
        if (!igUserId && r.profile?.id) setIgUserId(String(r.profile.id));
        if (!username && r.profile?.username) setUsername(r.profile.username);
        if (!displayName && r.profile?.name) setDisplayName(r.profile.name);
      }
    } catch (e: any) {
      setErr(e?.message || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const submit = async () => {
    const missing = [
      ['Meta app ID', appId], ['Meta app secret', appSecret],
      ['Verify token', verifyToken], ['Access token', accessToken],
      ['IG user id', igUserId],
    ].filter(([, v]) => !String(v || '').trim());
    if (missing.length) { setErr(`Missing: ${missing.map(([n]) => n).join(', ')}`); return; }
    setSaving(true); setErr(null);
    try {
      await onAdd({
        provider: 'meta',
        meta_app_id: appId.trim(),
        meta_app_secret: appSecret.trim(),
        meta_verify_token: verifyToken.trim(),
        meta_access_token: accessToken.trim(),
        meta_ig_user_id: igUserId.trim(),
        instagram_username: username.trim() || undefined,
        display_name: displayName.trim() || undefined,
      });
      // Reset on success
      setAppId(''); setAppSecret(''); setVerifyToken(''); setAccessToken('');
      setIgUserId(''); setUsername(''); setDisplayName(''); setVerified(null);
    } catch (e: any) {
      setErr(e?.message || 'Failed to add account');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <p className="text-xs text-neutral-500 dark:text-white/50 mb-3">
        Pull these values from Meta App Dashboard → Instagram → "Use cases" → "Customize". Required permissions:
        <span className="text-neutral-700 dark:text-white/70"> instagram_business_basic, instagram_manage_comments, instagram_business_manage_messages</span>.
        Auto-liking comments is <span className="text-amber-300">not supported</span> via Meta's official API.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Meta app ID">
          <input value={appId} onChange={(e) => setAppId(e.target.value)} className={inputClass} placeholder="2020267418916137" />
        </Field>
        <Field label="Meta app secret">
          <input type="password" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} className={inputClass} placeholder="●●●●●●●●" />
        </Field>
        <Field label="Verify token (you make this up)">
          <input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} className={inputClass} placeholder="random-string-paste-into-meta-too" />
        </Field>
        <Field label="Long-lived access token">
          <div className="flex gap-2">
            <input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className={`${inputClass} flex-1`} placeholder="EAAB…" />
            <button onClick={verifyToken_} disabled={verifying} className="rounded-md border border-neutral-300 dark:border-white/20 px-2 py-1.5 text-xs text-neutral-800 dark:text-white/80 hover:bg-neutral-100 dark:hover:bg-white/5 disabled:opacity-50">
              {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Verify'}
            </button>
          </div>
        </Field>
        <Field label="Instagram user ID">
          <input value={igUserId} onChange={(e) => setIgUserId(e.target.value)} className={inputClass} placeholder="17841401281270777" />
        </Field>
        <Field label="Instagram handle (optional)">
          <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} placeholder="@naveenyeluru" />
        </Field>
      </div>
      {verified && (
        <div className="mt-3 flex items-center gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
          <CheckCircle2 className="h-4 w-4" />
          Verified — id <code className="font-mono">{verified.id}</code>
          {verified.username && <> · @{verified.username}</>}
        </div>
      )}
      {err && <div className="mt-2"><ErrorBanner message={err} /></div>}
      <div className="mt-4 rounded-md border border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-black/30 p-3 text-xs text-neutral-600 dark:text-white/60">
        <div className="mb-1 font-medium text-neutral-800 dark:text-white/80">Set up the webhook on Meta side:</div>
        <div>Callback URL: <code className="text-neutral-800 dark:text-white/90">{`${typeof window !== 'undefined' ? window.location.origin : 'https://your-host'}/api/instagram-conversations/webhook/meta`}</code></div>
        <div>Verify token: whatever you typed above (Meta will probe with it once).</div>
        <div>Subscribe to fields: <code>messages</code>, <code>comments</code>, <code>mentions</code>.</div>
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Power className="h-4 w-4" />} Connect via Meta
        </button>
      </div>
    </div>
  );
};

// ── account hook ────────────────────────────────────────────────────────────

function useAccounts() {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet<{ success: boolean; accounts: InstagramAccount[] }>(
        '/api/instagram-conversations/accounts',
      );
      setAccounts(data?.accounts || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load Instagram accounts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  const toggle = async (id: string, patch: Partial<InstagramAccount>) => {
    await apiPatch(`/api/instagram-conversations/accounts/${id}`, patch);
    await refresh();
  };

  const updateWindow = async (id: string, hours: number) => {
    if (!Number.isFinite(hours) || hours < 1) return;
    await apiPatch(`/api/instagram-conversations/accounts/${id}`, { comment_window_hours: hours });
    await refresh();
  };

  const addAccount = async (payload: Partial<InstagramAccount>) => {
    await apiPost('/api/instagram-conversations/accounts', payload);
    await refresh();
  };

  return { accounts, loading, error, refresh, toggle, updateWindow, addAccount };
}

export default InstagramSettings;
