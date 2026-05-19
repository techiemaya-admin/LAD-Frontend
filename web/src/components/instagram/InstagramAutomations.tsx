'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
// Same-origin fetcher — hits the Next.js proxy at /api/instagram-conversations/*
// rather than lib/api (which prepends NEXT_PUBLIC_BACKEND_URL = LAD_backend :3004).
import { igGet as apiGet, igPost as apiPost, igPatch as apiPatch, igDelete as apiDelete } from './instagram-api';
import {
  Zap, GitBranch, BookOpen, Ticket, Download, Plus, Trash2, Loader2,
  AlertCircle, Power,
} from 'lucide-react';

type Tab = 'automations' | 'flows' | 'faq' | 'coupons' | 'lead-magnets';

const TABS: { id: Tab; label: string; icon: React.ElementType; blurb: string }[] = [
  { id: 'automations',  label: 'Automations',  icon: Zap,
    blurb: 'Trigger → action rules. Keywords, story mentions, first DMs, ad clicks.' },
  { id: 'flows',        label: 'Flows',        icon: GitBranch,
    blurb: 'Multi-step conversation flows for qualification, demos, and quizzes.' },
  { id: 'faq',          label: 'FAQ',          icon: BookOpen,
    blurb: 'Keyword-keyed canned answers. Cheap fast-path before the LLM.' },
  { id: 'coupons',      label: 'Coupons',      icon: Ticket,
    blurb: 'Giveaway batches & unique codes — one issued per claim.' },
  { id: 'lead-magnets', label: 'Lead Magnets', icon: Download,
    blurb: 'Files / links delivered automatically when a keyword fires.' },
];

const API = '/api/instagram-conversations';

export const InstagramAutomations: React.FC = () => {
  const search = useSearchParams();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>((search.get('tab') as Tab) || 'automations');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', tab);
    router.replace(`/instagram/automations?${params.toString()}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Instagram Automations</h1>
          <p className="mt-1 text-sm text-white/60">
            ManyChat-parity automations — trigger rules, multi-step flows, FAQ answers, coupon distribution, lead magnet delivery.
          </p>
        </header>

        <nav className="mb-6 grid grid-cols-2 gap-1 rounded-lg border border-white/10 bg-white/5 p-1 sm:grid-cols-5">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${
                  active ? 'bg-white text-neutral-900' : 'text-white/70 hover:bg-white/5'
                }`}>
                <Icon className="h-4 w-4" /> {t.label}
              </button>
            );
          })}
        </nav>

        <p className="mb-4 text-sm text-white/50">
          {TABS.find((t) => t.id === tab)?.blurb}
        </p>

        {tab === 'automations'  && <AutomationsPanel />}
        {tab === 'flows'        && <FlowsPanel />}
        {tab === 'faq'          && <FaqPanel />}
        {tab === 'coupons'      && <CouponsPanel />}
        {tab === 'lead-magnets' && <LeadMagnetsPanel />}
      </div>
    </div>
  );
};

// ── shared bits ─────────────────────────────────────────────────────────────

const ErrorBanner: React.FC<{ message: string }> = ({ message }) => (
  <div className="mb-3 flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
    <AlertCircle className="h-4 w-4" /> {message}
  </div>
);

const Loader: React.FC = () => (
  <div className="flex items-center gap-2 py-6 text-sm text-white/60">
    <Loader2 className="h-4 w-4 animate-spin" /> Loading…
  </div>
);

const Card: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="rounded-2xl border border-white/10 bg-neutral-900 p-6">
    <h2 className="mb-5 text-xl font-semibold">{title}</h2>
    {children}
  </div>
);

const inputClass =
  'w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-sm text-white placeholder-white/30 outline-none focus:border-white/30';

const Field: React.FC<{ label: string; className?: string; children: React.ReactNode }> = ({ label, className, children }) => (
  <label className={`block ${className || ''}`}>
    <div className="mb-1 text-xs text-white/60">{label}</div>
    {children}
  </label>
);

// JSON editor with validate-on-blur. Useful for trigger_config / action_config.
const JsonField: React.FC<{ value: any; onChange: (v: any) => void; label: string; height?: number }>
= ({ value, onChange, label, height = 100 }) => {
  const [text, setText] = useState(() => JSON.stringify(value || {}, null, 2));
  const [err, setErr] = useState<string | null>(null);
  return (
    <Field label={label}>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setErr(null); }}
        onBlur={() => {
          try { onChange(text.trim() ? JSON.parse(text) : {}); setErr(null); }
          catch (e: any) { setErr(e.message); }
        }}
        rows={Math.max(3, Math.round(height / 24))}
        className={`${inputClass} font-mono text-xs`}
      />
      {err && <div className="mt-1 text-xs text-red-300">{err}</div>}
    </Field>
  );
};

// ── Automations ─────────────────────────────────────────────────────────────

const TRIGGER_OPTIONS = [
  'dm_keyword','comment_keyword','story_mention','first_dm','ad_click','manual','schedule',
];
const ACTION_OPTIONS = [
  'send_text','run_flow','send_lead_magnet','send_coupon','send_faq_answer',
  'tag_label','assign_human','capture_field','start_quiz',
];

const AutomationsPanel: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await apiGet<any>(`${API}/automations`); setItems(d?.automations || []); }
    catch (e: any) { setError(e?.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const onCreate = async (payload: any) => {
    await apiPost(`${API}/automations`, payload);
    setShowCreate(false); await load();
  };
  const onToggle = async (id: string, is_active: boolean) => {
    await apiPatch(`${API}/automations/${id}`, { is_active }); await load();
  };
  const onDelete = async (id: string) => {
    if (!confirm('Delete this automation?')) return;
    await apiDelete(`${API}/automations/${id}`); await load();
  };

  return (
    <Card title="Automations">
      <div className="mb-5 flex justify-end">
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-900 hover:bg-white/90">
          <Plus className="h-4 w-4" /> New automation
        </button>
      </div>
      {loading && <Loader />}
      {error && <ErrorBanner message={error} />}
      {showCreate && <AutomationForm onCancel={() => setShowCreate(false)} onSubmit={onCreate} />}
      <div className="space-y-3">
        {items.map((a) => (
          <div key={a.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-medium">{a.name}</h4>
                  <span className="rounded bg-violet-500/20 px-1.5 py-0.5 text-xs text-violet-200">{a.trigger_type}</span>
                  <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-200">{a.action_type}</span>
                </div>
                <div className="mt-1 text-xs text-white/50">
                  Fired {a.triggered_count || 0}× · priority {a.priority}
                </div>
                <details className="mt-2 text-xs text-white/60">
                  <summary className="cursor-pointer">trigger_config</summary>
                  <pre className="mt-1 overflow-auto rounded bg-black/40 p-2 text-[11px]">{JSON.stringify(a.trigger_config, null, 2)}</pre>
                </details>
                <details className="mt-1 text-xs text-white/60">
                  <summary className="cursor-pointer">action_config</summary>
                  <pre className="mt-1 overflow-auto rounded bg-black/40 p-2 text-[11px]">{JSON.stringify(a.action_config, null, 2)}</pre>
                </details>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Toggle checked={a.is_active} onChange={(v) => onToggle(a.id, v)} />
                <button onClick={() => onDelete(a.id)} className="rounded p-1.5 text-white/40 hover:bg-white/5 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && !showCreate && <Empty label="No automations yet." />}
      </div>
    </Card>
  );
};

const AutomationForm: React.FC<{ onCancel: () => void; onSubmit: (p: any) => Promise<void> }> = ({ onCancel, onSubmit }) => {
  const [name, setName] = useState('');
  const [triggerType, setTriggerType] = useState('dm_keyword');
  const [actionType, setActionType] = useState('send_text');
  const [priority, setPriority] = useState(100);
  const [triggerCfg, setTriggerCfg] = useState<any>({ keywords: [], match_mode: 'any' });
  const [actionCfg, setActionCfg] = useState<any>({ text: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setErr(null);
    try {
      await onSubmit({
        name, trigger_type: triggerType, action_type: actionType,
        trigger_config: triggerCfg, action_config: actionCfg,
        priority: Number(priority),
      });
    } catch (e: any) { setErr(e?.message); } finally { setSaving(false); }
  };

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <h4 className="mb-3 text-sm font-medium">New automation</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></Field>
        <Field label="Priority"><input type="number" value={priority} onChange={(e) => setPriority(Number(e.target.value))} className={inputClass} /></Field>
        <Field label="Trigger type">
          <select value={triggerType} onChange={(e) => setTriggerType(e.target.value)} className={inputClass}>
            {TRIGGER_OPTIONS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <Field label="Action type">
          <select value={actionType} onChange={(e) => setActionType(e.target.value)} className={inputClass}>
            {ACTION_OPTIONS.map((t) => <option key={t}>{t}</option>)}
          </select>
        </Field>
        <JsonField label="trigger_config" value={triggerCfg} onChange={setTriggerCfg} />
        <JsonField label="action_config" value={actionCfg} onChange={setActionCfg} />
      </div>
      {err && <div className="mt-2"><ErrorBanner message={err} /></div>}
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md border border-white/20 px-3 py-1.5 text-sm">Cancel</button>
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </div>
    </div>
  );
};

// ── Flows ───────────────────────────────────────────────────────────────────

const FlowsPanel: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await apiGet<any>(`${API}/flows`); setItems(d?.flows || []); }
    catch (e: any) { setError(e?.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const onCreate = async (p: any) => { await apiPost(`${API}/flows`, p); setShowCreate(false); await load(); };
  const onToggle = async (id: string, is_active: boolean) => { await apiPatch(`${API}/flows/${id}`, { is_active }); await load(); };
  const onDelete = async (id: string) => { if (!confirm('Delete this flow?')) return; await apiDelete(`${API}/flows/${id}`); await load(); };

  return (
    <Card title="Flows">
      <div className="mb-5 flex justify-end">
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-900">
          <Plus className="h-4 w-4" /> New flow
        </button>
      </div>
      {loading && <Loader />}
      {error && <ErrorBanner message={error} />}
      {showCreate && <FlowForm onCancel={() => setShowCreate(false)} onSubmit={onCreate} />}
      <div className="space-y-3">
        {items.map((f) => (
          <div key={f.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-medium">{f.name}</h4>
                {f.description && <p className="mt-1 text-sm text-white/60">{f.description}</p>}
                <div className="mt-1 text-xs text-white/50">
                  {(f.nodes || []).length} nodes · start: {f.start_node_id || '—'}
                </div>
                <details className="mt-2 text-xs text-white/60">
                  <summary className="cursor-pointer">nodes</summary>
                  <pre className="mt-1 overflow-auto rounded bg-black/40 p-2 text-[11px]">{JSON.stringify(f.nodes, null, 2)}</pre>
                </details>
                <details className="mt-1 text-xs text-white/60">
                  <summary className="cursor-pointer">edges</summary>
                  <pre className="mt-1 overflow-auto rounded bg-black/40 p-2 text-[11px]">{JSON.stringify(f.edges, null, 2)}</pre>
                </details>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Toggle checked={f.is_active} onChange={(v) => onToggle(f.id, v)} />
                <button onClick={() => onDelete(f.id)} className="rounded p-1.5 text-white/40 hover:bg-white/5 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && !showCreate && <Empty label="No flows yet." />}
      </div>
    </Card>
  );
};

const FlowForm: React.FC<{ onCancel: () => void; onSubmit: (p: any) => Promise<void> }> = ({ onCancel, onSubmit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [startNode, setStartNode] = useState('n1');
  const [nodes, setNodes] = useState<any[]>([
    { id: 'n1', type: 'message', text: 'Hey! Thanks for reaching out 👋' },
    { id: 'n2', type: 'capture_field', field: 'email', prompt: 'What email should I send the details to?' },
    { id: 'n3', type: 'message', text: 'Got it — keep an eye on your inbox!' },
    { id: 'n4', type: 'end' },
  ]);
  const [edges, setEdges] = useState<any[]>([
    { from: 'n1', to: 'n2' }, { from: 'n2', to: 'n3' }, { from: 'n3', to: 'n4' },
  ]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    setSaving(true); setErr(null);
    try {
      await onSubmit({ name, description, start_node_id: startNode, nodes, edges });
    } catch (e: any) { setErr(e?.message); } finally { setSaving(false); }
  };

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <h4 className="mb-3 text-sm font-medium">New flow</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></Field>
        <Field label="Start node id"><input value={startNode} onChange={(e) => setStartNode(e.target.value)} className={inputClass} /></Field>
        <Field label="Description" className="sm:col-span-2"><textarea value={description} onChange={(e) => setDescription(e.target.value)} className={inputClass} rows={2} /></Field>
        <JsonField label="nodes" value={nodes} onChange={setNodes} height={220} />
        <JsonField label="edges" value={edges} onChange={setEdges} height={220} />
      </div>
      {err && <div className="mt-2"><ErrorBanner message={err} /></div>}
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md border border-white/20 px-3 py-1.5 text-sm">Cancel</button>
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save flow
        </button>
      </div>
    </div>
  );
};

// ── FAQ ─────────────────────────────────────────────────────────────────────

const FaqPanel: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await apiGet<any>(`${API}/faq`); setItems(d?.entries || []); }
    catch (e: any) { setError(e?.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const onCreate = async (p: any) => { await apiPost(`${API}/faq`, p); setShowCreate(false); await load(); };
  const onToggle = async (id: string, is_active: boolean) => { await apiPatch(`${API}/faq/${id}`, { is_active }); await load(); };
  const onDelete = async (id: string) => { if (!confirm('Delete this FAQ entry?')) return; await apiDelete(`${API}/faq/${id}`); await load(); };

  return (
    <Card title="FAQ entries">
      <div className="mb-5 flex justify-end">
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-900">
          <Plus className="h-4 w-4" /> New FAQ
        </button>
      </div>
      {loading && <Loader />}
      {error && <ErrorBanner message={error} />}
      {showCreate && <FaqForm onCancel={() => setShowCreate(false)} onSubmit={onCreate} />}
      <div className="space-y-3">
        {items.map((e) => (
          <div key={e.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-base font-medium">{e.question}</h4>
                <p className="mt-1 text-sm text-white/70">{e.answer}</p>
                {Array.isArray(e.keywords) && e.keywords.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.keywords.map((k: string) => (
                      <span key={k} className="rounded bg-white/10 px-1.5 py-0.5 text-[11px]">{k}</span>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-xs text-white/50">Served {e.use_count}×</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Toggle checked={e.is_active} onChange={(v) => onToggle(e.id, v)} />
                <button onClick={() => onDelete(e.id)} className="rounded p-1.5 text-white/40 hover:bg-white/5 hover:text-red-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && !showCreate && <Empty label="No FAQ entries yet." />}
      </div>
    </Card>
  );
};

const FaqForm: React.FC<{ onCancel: () => void; onSubmit: (p: any) => Promise<void> }> = ({ onCancel, onSubmit }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [keywords, setKeywords] = useState('');
  const [category, setCategory] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!question || !answer) { setErr('question and answer are required'); return; }
    setSaving(true); setErr(null);
    try {
      await onSubmit({
        question, answer, category: category || undefined,
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
      });
    } catch (e: any) { setErr(e?.message); } finally { setSaving(false); }
  };

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <h4 className="mb-3 text-sm font-medium">New FAQ entry</h4>
      <div className="grid gap-3">
        <Field label="Question"><input value={question} onChange={(e) => setQuestion(e.target.value)} className={inputClass} placeholder="How much does the course cost?" /></Field>
        <Field label="Answer"><textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={3} className={inputClass} /></Field>
        <Field label="Keywords (comma-separated)"><input value={keywords} onChange={(e) => setKeywords(e.target.value)} className={inputClass} placeholder="price, cost, fee" /></Field>
        <Field label="Category (optional)"><input value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass} /></Field>
      </div>
      {err && <div className="mt-2"><ErrorBanner message={err} /></div>}
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md border border-white/20 px-3 py-1.5 text-sm">Cancel</button>
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </div>
    </div>
  );
};

// ── Coupons ─────────────────────────────────────────────────────────────────

const CouponsPanel: React.FC = () => {
  const [batches, setBatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await apiGet<any>(`${API}/coupons/batches`); setBatches(d?.batches || []); }
    catch (e: any) { setError(e?.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const onCreate = async (p: any) => {
    const r = await apiPost<any>(`${API}/coupons/batches`, p);
    if (p._codes?.length && r?.batch?.id) {
      await apiPost(`${API}/coupons/batches/${r.batch.id}/codes`, { codes: p._codes });
    }
    setShowCreate(false); await load();
  };

  return (
    <Card title="Coupon batches">
      <div className="mb-5 flex justify-end">
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-900">
          <Plus className="h-4 w-4" /> New batch
        </button>
      </div>
      {loading && <Loader />}
      {error && <ErrorBanner message={error} />}
      {showCreate && <CouponForm onCancel={() => setShowCreate(false)} onSubmit={onCreate} />}
      <div className="space-y-3">
        {batches.map((b) => (
          <div key={b.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <h4 className="text-base font-medium">{b.name}</h4>
              {b.discount_text && <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-xs text-emerald-200">{b.discount_text}</span>}
              <span className="ml-auto text-xs text-white/50">
                {b.issued_count}/{b.total_codes} issued · {b.redeemed_count} redeemed
              </span>
            </div>
            {b.description && <p className="mt-1 text-sm text-white/60">{b.description}</p>}
          </div>
        ))}
        {!loading && batches.length === 0 && !showCreate && <Empty label="No coupon batches yet." />}
      </div>
    </Card>
  );
};

const CouponForm: React.FC<{ onCancel: () => void; onSubmit: (p: any) => Promise<void> }> = ({ onCancel, onSubmit }) => {
  const [name, setName] = useState('');
  const [discount, setDiscount] = useState('');
  const [description, setDescription] = useState('');
  const [codes, setCodes] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name) { setErr('name is required'); return; }
    setSaving(true); setErr(null);
    const codeList = codes.split(/[\s,]+/).map((c) => c.trim()).filter(Boolean);
    try {
      await onSubmit({ name, description, discount_text: discount || undefined, _codes: codeList });
    } catch (e: any) { setErr(e?.message); } finally { setSaving(false); }
  };

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <h4 className="mb-3 text-sm font-medium">New coupon batch</h4>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} placeholder="Summer 15% off" /></Field>
        <Field label="Discount label"><input value={discount} onChange={(e) => setDiscount(e.target.value)} className={inputClass} placeholder="15% off" /></Field>
        <Field label="Description" className="sm:col-span-2"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} /></Field>
        <Field label="Codes (one per line or comma-separated)" className="sm:col-span-2">
          <textarea value={codes} onChange={(e) => setCodes(e.target.value)} rows={4} className={`${inputClass} font-mono text-xs`} placeholder="SUMMER1&#10;SUMMER2&#10;SUMMER3" />
        </Field>
      </div>
      {err && <div className="mt-2"><ErrorBanner message={err} /></div>}
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md border border-white/20 px-3 py-1.5 text-sm">Cancel</button>
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save batch
        </button>
      </div>
    </div>
  );
};

// ── Lead Magnets ────────────────────────────────────────────────────────────

const LeadMagnetsPanel: React.FC = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try { const d = await apiGet<any>(`${API}/lead-magnets`); setItems(d?.lead_magnets || []); }
    catch (e: any) { setError(e?.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const onCreate = async (p: any) => { await apiPost(`${API}/lead-magnets`, p); setShowCreate(false); await load(); };
  const onDelete = async (id: string) => { if (!confirm('Delete this lead magnet?')) return; await apiDelete(`${API}/lead-magnets/${id}`); await load(); };

  return (
    <Card title="Lead magnets">
      <div className="mb-5 flex justify-end">
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm font-medium text-neutral-900">
          <Plus className="h-4 w-4" /> New lead magnet
        </button>
      </div>
      {loading && <Loader />}
      {error && <ErrorBanner message={error} />}
      {showCreate && <LeadMagnetForm onCancel={() => setShowCreate(false)} onSubmit={onCreate} />}
      <div className="space-y-3">
        {items.map((m) => (
          <div key={m.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h4 className="text-base font-medium">{m.name}</h4>
                {m.description && <p className="mt-1 text-sm text-white/60">{m.description}</p>}
                {m.file_url && <p className="mt-1 text-xs text-white/40 break-all">URL: {m.file_url}</p>}
                <div className="mt-2 text-xs text-white/50">Delivered {m.delivered_count}×</div>
              </div>
              <button onClick={() => onDelete(m.id)} className="rounded p-1.5 text-white/40 hover:bg-white/5 hover:text-red-300">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
        {!loading && items.length === 0 && !showCreate && <Empty label="No lead magnets yet." />}
      </div>
    </Card>
  );
};

const LeadMagnetForm: React.FC<{ onCancel: () => void; onSubmit: (p: any) => Promise<void> }> = ({ onCancel, onSubmit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [textPayload, setTextPayload] = useState('');
  const [deliveryMessage, setDeliveryMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async () => {
    if (!name) { setErr('name is required'); return; }
    if (!fileUrl && !textPayload) { setErr('file_url or text_payload is required'); return; }
    setSaving(true); setErr(null);
    try {
      await onSubmit({
        name, description,
        file_url: fileUrl || undefined, text_payload: textPayload || undefined,
        delivery_message: deliveryMessage || undefined,
      });
    } catch (e: any) { setErr(e?.message); } finally { setSaving(false); }
  };

  return (
    <div className="mb-4 rounded-xl border border-white/10 bg-white/5 p-4">
      <h4 className="mb-3 text-sm font-medium">New lead magnet</h4>
      <div className="grid gap-3">
        <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} className={inputClass} /></Field>
        <Field label="Description"><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className={inputClass} /></Field>
        <Field label="File URL (optional)"><input value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className={inputClass} placeholder="https://…/guide.pdf" /></Field>
        <Field label="Text payload (optional)"><textarea value={textPayload} onChange={(e) => setTextPayload(e.target.value)} rows={2} className={inputClass} /></Field>
        <Field label="Delivery message"><input value={deliveryMessage} onChange={(e) => setDeliveryMessage(e.target.value)} className={inputClass} placeholder="Here's the guide you asked for!" /></Field>
      </div>
      {err && <div className="mt-2"><ErrorBanner message={err} /></div>}
      <div className="mt-3 flex justify-end gap-2">
        <button onClick={onCancel} className="rounded-md border border-white/20 px-3 py-1.5 text-sm">Cancel</button>
        <button onClick={submit} disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-white px-3 py-1.5 text-sm font-medium text-neutral-900 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} Save
        </button>
      </div>
    </div>
  );
};

// ── tiny shared bits ────────────────────────────────────────────────────────

const Empty: React.FC<{ label: string }> = ({ label }) => (
  <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/50">
    {label}
  </div>
);

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void }> = ({ checked, onChange }) => (
  <label className="relative inline-flex h-5 w-9 cursor-pointer items-center">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
    <span className="absolute inset-0 rounded-full bg-white/15 transition peer-checked:bg-emerald-500" />
    <span className="absolute left-0.5 h-4 w-4 transform rounded-full bg-white transition peer-checked:translate-x-4" />
  </label>
);

export default InstagramAutomations;
