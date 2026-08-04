'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { cn } from "@/lib/utils";
// Same-origin fetcher — hits the Next.js proxy at /api/instagram-conversations/*
// rather than lib/api (which prepends NEXT_PUBLIC_BACKEND_URL = LAD_backend :3004).
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from '@/components/ui/badge';
import { igGet as apiGet, igPost as apiPost, igPatch as apiPatch, igDelete as apiDelete } from './instagram-api';
import { InstagramTenantOnboarding } from './InstagramTenantOnboarding';
import {
  Target, Loader2, Plus, Trash2, CheckCircle2,
  AlertCircle, Power, Link as LinkIcon, Building2, ArrowLeft,
  Instagram as InstagramIcon, Lock, BookOpen, MessageCircle, Edit3, Hash, List
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
    <div className="min-h-screen bg-white text-slate-800 dark:bg-[#00051d] dark:text-white">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
        {/* Back link — operator opened this page from /settings?tab=integrations
            (or the conversations chat-header AI Settings icons). Give them a
            one-click way home so they don't have to use the browser back button. */}
        <button
          type="button"
          onClick={() => router.push('/settings?tab=integrations')}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-[#0b1957] dark:text-slate-400 dark:hover:text-white transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
          Back to Integrations
        </button>

        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Instagram AI</h1>
          <p className="mt-1.5 text-sm text-slate-600 leading-relaxed max-w-3xl dark:text-slate-300">
            Manage connected Instagram accounts and AI Goals. Toggle AI replies, comments, and likes per account from the Accounts tab.
          </p>
        </header>

        <nav className="mb-8 flex gap-1 rounded-xl border border-slate-200 bg-slate-100 dark:border-blue-950/40 dark:bg-[#071131]/70 p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-bold transition-all cursor-pointer ${
                  active
                    ? 'bg-[#0b1957] text-white shadow-sm'
                    : 'text-slate-700 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-[#0c1b43]'
                }`}
              >
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </nav>

          <div className="space-y-6">
        {tab === 'accounts' && <InstagramTenantOnboarding />}
        {tab === 'goals' && <AIGoalsPanel />}
        </div>
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
      titleIcon={Target}
      blurb="Every AI reply (DM + comment) will be biased toward whichever active goal best matches the message."
    >
      <div className="mb-4 flex items-center justify-end">
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-[#0b1957] hover:bg-[#0b1957]/90 dark:bg-[#1d4ed8] dark:hover:bg-blue-700 px-4 h-10 text-sm font-bold text-white transition-all cursor-pointer shadow-sm active:scale-95"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" /> New goal
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
          <div key={g.id} className="rounded-xl border border-slate-200 bg-white dark:border-blue-950/40 dark:bg-[#071131]/80 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white">{g.name}</h4>
                  <Badge className="rounded-full bg-slate-800/70 text-slate-200 border border-slate-700/80 px-2.5 text-[10px] font-bold uppercase">{g.goal_type.replace('_', ' ')}</Badge>
                  {g.applies_to_dms && <Badge className="rounded-full bg-indigo-900/60 text-indigo-200 border border-indigo-700/50 px-2.5 text-[10px] font-bold">DMs</Badge>}
                  {g.applies_to_comments && <Badge className="rounded-full bg-pink-900/60 text-pink-200 border border-pink-700/50 px-2.5 text-[10px] font-bold">Comments</Badge>}
                </div>
                {g.description && <p className="text-xs text-slate-500 dark:text-slate-400 font-medium leading-relaxed mt-1">{g.description}</p>}
                {g.call_to_action && (
                  <p className="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500">CTA: <span className="font-semibold text-slate-700 dark:text-slate-300">&quot;{g.call_to_action}&quot;</span></p>
                )}
                {g.target_url && (
                  <p className="mt-1 text-xs font-medium text-slate-400 dark:text-slate-500 break-all">Link: <span className="text-blue-500 underline font-semibold">{g.target_url}</span></p>
                )}
                {Array.isArray(g.keyword_triggers) && g.keyword_triggers.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {g.keyword_triggers.map((k) => (
                      <span key={k} className="rounded-md bg-slate-900/50 text-slate-200 px-2 py-0.5 text-[10px] font-bold font-mono">{k}</span>
                    ))}
                  </div>
                )}
                <div className="mt-3 pt-2 border-t border-blue-950/40 flex gap-4 text-[11px] font-semibold text-slate-300">
                  <span>Impressions: <span className="text-slate-700 dark:text-slate-300 font-bold">{g.impressions_count}</span></span>
                  <span>Conversions: <span className="text-slate-700 dark:text-slate-300 font-bold">{g.conversions_count}</span></span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-3 shrink-0">
                <ToggleSwitch
                  checked={g.is_active}
                  onChange={(v) => onToggle(g.id, v)}
                  label={g.is_active ? 'Active' : 'Paused'}
                />
                <button
                  onClick={() => onDelete(g.id)}
                  className="rounded-lg p-2 text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 transition-colors cursor-pointer"
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
    <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 space-y-4 animate-in fade-in-50 duration-200 shadow-inner dark:border-blue-950/40 dark:bg-[#071131]/80">
      <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">New Goal Configuration</h4>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Goal Name *" icon={BookOpen}>
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Book a discovery call" />
        </Field>
        <Field label="Type" icon={List}>
          <Select
              value={type || undefined}
              onValueChange={(val: string) => setType(val)}
          >
            <SelectTrigger className="w-full h-11 px-3 text-sm border border-slate-200 bg-white text-slate-900 rounded-xl focus:ring-0 focus-visible:ring-0 focus:border-blue-700 focus:border dark:border-blue-950/40 dark:bg-slate-800/50 dark:text-white dark:focus:border-blue-700 font-semibold transition-all">
              <SelectValue placeholder="Select type..." />
            </SelectTrigger>

            <SelectContent className="bg-white border border-slate-200 dark:bg-[#071131] dark:border-blue-950/40">
              {GOAL_TYPES.map((t) => (
                  <SelectItem
                      key={t.value}
                      value={t.value}
                      /* FIXED: Passed only raw text to fix the blank dropdown bug, and used sub-selectors like [&>span]:!text-... to style the text layers safely from the outside */
                      className="pl-3 pr-6 text-xs justify-start transition-colors cursor-pointer text-slate-800 dark:text-white dark:focus:bg-[#2563eb] dark:focus:text-white dark:data-[state=checked]:focus:bg-[#2563eb] dark:data-[state=checked]:focus:text-white"
                  >
                    {/* FIXED: No wrapping elements here — raw text makes Radix render your labels perfectly */}
                    {t.label}
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Call to action" icon={MessageCircle}>
          <input value={cta} onChange={(e) => setCta(e.target.value)} className={inputClass} placeholder="Tap the link in bio to book" />
        </Field>
        <Field label="Target URL" icon={LinkIcon}>
          <input value={url} onChange={(e) => setUrl(e.target.value)} className={inputClass} placeholder="https://cal.com/your-link" />
        </Field>
        <Field label="Description" className="sm:col-span-2" icon={Edit3}>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={cn(inputClass, "resize-none")} placeholder="What's this goal for?" />
        </Field>
        <Field label="Keyword triggers (comma-separated)" className="sm:col-span-2" icon={Hash}>
          <input value={keywords} onChange={(e) => setKeywords(e.target.value)} className={inputClass} placeholder="course, price, demo, book" />
        </Field>
        <div className="flex items-center gap-5 text-sm sm:col-span-2 pt-1">
          <label className="inline-flex items-center gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300 select-none group font-medium">
            <input type="checkbox" checked={dms} onChange={(e) => setDms(e.target.checked)} className="cursor-pointer h-4 w-4 rounded accent-[#0b1957] dark:accent-[#1d4ed8]" />
              <span className="group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Apply to DMs</span>
          </label>
          <label className="inline-flex items-center gap-2.5 cursor-pointer text-slate-700 dark:text-slate-300 select-none group font-medium">
            <input type="checkbox" checked={comments} onChange={(e) => setComments(e.target.checked)} className="cursor-pointer h-4 w-4 rounded accent-[#0b1957] dark:accent-[#1d4ed8]" />
              <span className="group-hover:text-slate-900 dark:group-hover:text-white transition-colors">Apply to Comments</span>
          </label>
        </div>
      </div>
      {err && <ErrorBanner message={err} />}
      <div className="mt-4 flex justify-end gap-2 pt-2 border-t border-blue-950/40">
        <button onClick={onCancel} className="rounded-xl border border-slate-200 bg-slate-50 px-4 h-10 text-sm font-bold text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors dark:border-blue-950/40 dark:bg-[#071131]/70 dark:text-slate-200 dark:hover:bg-[#0c1b43]">Cancel</button>
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#0b1957] px-5 h-10 text-sm font-bold text-white hover:opacity-95 disabled:opacity-50 transition-all shadow-md cursor-pointer">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save Goal
        </button>
      </div>
    </div>
  );
};

// ── shared bits ─────────────────────────────────────────────────────────────

const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-500 outline-none focus:border-blue-700 focus:ring-0 focus-visible:ring-0 transition-all dark:border-blue-950/40 dark:bg-slate-800/50 dark:text-white dark:placeholder-slate-400';

const Field: React.FC<{ label: string; className?: string; icon?: React.ElementType; children: React.ReactNode }> = ({ label, className, icon: Icon, children }) => {
  const renderChild = () => {
    if (!Icon) return children;
    if (React.isValidElement(children)) {
      const childProps = { ...(children.props as any) };
      childProps.className = cn(childProps.className, 'pl-10');
      return React.cloneElement(children, childProps);
    }
    return children;
  };

  return (
    <label className={`block ${className || ''}`}>
      <div className="mb-1.5 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
        {Icon ? <Icon className="h-3.5 w-3.5 text-slate-400" /> : null}
        <span>{label}</span>
      </div>
      <div className={Icon ? 'relative' : ''}>
        {Icon ? <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /> : null}
        {renderChild()}
      </div>
    </label>
  );
};

const Section: React.FC<{ title: string; titleIcon?: React.ElementType; blurb: string; children: React.ReactNode }> = ({ title, titleIcon: TitleIcon, blurb, children }) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm dark:border-blue-950/40 dark:bg-[#071131]/80">
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        {TitleIcon ? <TitleIcon className="h-5 w-5 text-[#0b1957]" /> : null}
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
      </div>
      <p className="mt-1 text-sm text-slate-600 leading-relaxed dark:text-slate-300">{blurb}</p>
    </div>
    {children}
  </div>
);

const Loader: React.FC = () => (
  <div className="flex items-center gap-2 py-10 text-sm font-medium text-slate-400 dark:text-slate-500">
    <Loader2 className="h-4 w-4 animate-spin text-[#0b1957] dark:text-[#1d4ed8]" /> Loading…
  </div>
);

const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div className="mb-3 flex items-center gap-2.5 rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400 font-semibold leading-relaxed">
    <AlertCircle className="h-4 w-4 flex-shrink-0 text-red-500" /> {message}
  </div>
);

const EmptyState: React.FC<{ icon: React.ElementType; title: string; blurb: string; action?: React.ReactNode }> = ({ icon: Icon, title, blurb, action }) => (
  <div className="rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center dark:border-blue-950/40 dark:bg-[#071131]/70">
    <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
      <Icon className="h-5 w-5" />
    </div>
    <h3 className="text-base font-bold text-slate-900 dark:text-white">{title}</h3>
    <p className="mt-1 text-sm text-slate-600 max-w-sm mx-auto leading-relaxed dark:text-slate-300">{blurb}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);

const ToggleSwitch: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label?: string }> = ({ checked, onChange, label }) => (
  <label className="inline-flex cursor-pointer items-center gap-2.5 text-xs font-bold uppercase tracking-wider select-none">
    {label && <span className="text-slate-300">{label}</span>}
    <span className="relative inline-flex h-5 w-9 items-center">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span className="absolute inset-0 rounded-full bg-slate-800/60 transition peer-checked:bg-[#22c55e]" />
      <span className="absolute left-0.5 h-4 w-4 transform rounded-full bg-slate-300 transition peer-checked:translate-x-4 shadow-sm" />
    </span>
  </label>
);

const AddAccountInline: React.FC<{ onAdd: (payload: any) => Promise<void> }> = ({ onAdd }) => {
  const [providerType, setProviderType] = useState<'meta' | 'unipile'>('meta');

  return (
    <div className="rounded-xl border border-blue-950/40 bg-[#071131]/70 p-4">
      <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="text-sm font-bold text-white flex items-center gap-2">
          <InstagramIcon className="h-4 w-4 text-slate-200" />
          Connect an Instagram account
        </div>
        <div className="inline-flex gap-1 rounded-lg border border-blue-950/40 bg-[#071131]/70 p-0.5 text-xs font-semibold">
          <button
            onClick={() => setProviderType('meta')}
            className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${providerType === 'meta' ? 'bg-[#0b1957] text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
          ><LinkIcon className="h-3.5 w-3.5" /> Meta (official)</button>
          <button
            onClick={() => setProviderType('unipile')}
            className={`rounded-md px-2.5 py-1 transition-all cursor-pointer ${providerType === 'unipile' ? 'bg-[#0b1957] text-white shadow-sm' : 'text-slate-300 hover:text-white'}`}
          ><Power className="h-3.5 w-3.5" /> Direct sign-in</button>
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
    <div className="space-y-3">
      <p className="text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
        Paste the connection ID for your linked Instagram session.
        Direct sign-in is the only option that supports auto-liking comments.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Connection ID" icon={Hash}>
          <input value={provider} onChange={(e) => setProvider(e.target.value)} className={inputClass} placeholder="Connection ID" />
        </Field>
        <Field label="Instagram handle (optional)" icon={InstagramIcon}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} placeholder="Instagram handle (optional)" />
        </Field>
      </div>
      {err && <div className="mt-2"><ErrorBanner message={err} /></div>}
      <div className="mt-3 flex justify-end">
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#0b1957] dark:bg-[#1d4ed8] px-4 h-10 text-sm font-bold text-white hover:opacity-95 disabled:opacity-50 transition-all cursor-pointer shadow-sm">
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
    <div className="space-y-4">
      <p className="text-xs text-slate-400 dark:text-slate-400 leading-relaxed">
        Pull these values from Meta App Dashboard → Instagram → &quot;Use cases&quot; → &quot;Customize&quot;. Required permissions:
        <span className="font-semibold text-slate-600 dark:text-slate-300"> instagram_business_basic, instagram_manage_comments, instagram_business_manage_messages</span>.
        Auto-liking comments is <span className="text-amber-500 dark:text-amber-400 font-bold">not supported</span> via Meta&apos;s official API.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Meta app ID" icon={Building2}>
          <input value={appId} onChange={(e) => setAppId(e.target.value)} className={inputClass} placeholder="2020267418916137" />
        </Field>
        <Field label="Meta app secret" icon={Power}>
          <input type="password" value={appSecret} onChange={(e) => setAppSecret(e.target.value)} className={inputClass} placeholder="●●●●●●●●" />
        </Field>
        <Field label="Verify token (you make this up)" icon={Lock}>
          <input value={verifyToken} onChange={(e) => setVerifyToken(e.target.value)} className={inputClass} placeholder="random-string-paste-into-meta-too" />
        </Field>
        <Field label="Long-lived access token" icon={LinkIcon}>
          <div className="flex gap-2">
            <input type="password" value={accessToken} onChange={(e) => setAccessToken(e.target.value)} className={`${inputClass} flex-1`} placeholder="EAAB…" />
            <button onClick={verifyToken_} disabled={verifying} className="rounded-xl border border-blue-950/40 px-3 text-xs font-bold text-white bg-[#071131]/80 hover:bg-[#0c1b43] transition-colors cursor-pointer shrink-0">
              {verifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Verify'}
            </button>
          </div>
        </Field>
        <Field label="Instagram user ID" icon={LinkIcon}>
          <input value={igUserId} onChange={(e) => setIgUserId(e.target.value)} className={inputClass} placeholder="17841401281270777" />
        </Field>
        <Field label="Instagram handle (optional)" icon={Target}>
          <input value={username} onChange={(e) => setUsername(e.target.value)} className={inputClass} placeholder="@naveenyeluru" />
        </Field>
      </div>
      {verified && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/20 px-3 py-2.5 text-xs text-emerald-200 font-medium">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          Verified — ID <code className="font-mono bg-slate-900 px-1 py-0.5 rounded text-slate-200">{verified.id}</code>
          {verified.username && <> · @{verified.username}</>}
        </div>
      )}
      {err && <div className="mt-2"><ErrorBanner message={err} /></div>}
      <div className="rounded-xl border border-blue-950/40 bg-[#071131]/70 p-3.5 text-xs text-slate-300 leading-relaxed">
        <div className="mb-1 font-bold text-slate-200">Set up the webhook on Meta side:</div>
        <div>Callback URL: <code className="text-[#0b1957] dark:text-primary font-mono">{`${typeof window !== 'undefined' ? window.location.origin : 'https://your-host'}/api/instagram-conversations/webhook/meta`}</code></div>
        <div className="mt-0.5">Verify token: whatever you typed above (Meta will probe with it once).</div>
        <div className="mt-0.5">Subscribe to fields: <code className="font-mono text-slate-600 dark:text-slate-300">messages</code>, <code className="font-mono text-slate-600 dark:text-slate-300">comments</code>, <code className="font-mono text-slate-600 dark:text-slate-300">mentions</code>.</div>
      </div>
      <div className="mt-3 flex justify-end">
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-[#0b1957] dark:bg-[#1d4ed8] px-4 h-10 text-sm font-bold text-white hover:opacity-95 disabled:opacity-50 transition-all shadow-md cursor-pointer">
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
