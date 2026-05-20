'use client';

/**
 * Instagram Tenant Onboarding
 * ============================
 * Mirrors the WhatsApp TenantOnboarding component so operators see the
 * same shape of page across channels:
 *   - List of existing accounts on the tenant
 *   - "Onboard New Instagram Account" form
 *   - Disconnect / status toggle on individual rows
 *
 * Backed by the existing LAD-Instagram-Comms endpoints:
 *   GET    /api/accounts          → list
 *   POST   /api/accounts          → create (meta or direct-login provider)
 *   PATCH  /api/accounts/{id}     → update fields (ai_replies_enabled, etc.)
 *   DELETE /api/accounts/{id}     → soft-delete
 *
 * No backend changes needed — the create endpoint already accepts both
 * provider credential shapes.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';
import {
  Plus, Trash2, RefreshCw, Loader2, CheckCircle2, AlertCircle, Power, Eye, EyeOff,
  X as XIcon, Instagram as InstagramIcon,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────

type Provider = 'meta' | 'unipile';

interface InstagramAccount {
  id: string;
  tenant_id: string;
  provider: Provider | string;
  provider_account_id: string | null;
  meta_app_id: string | null;
  meta_ig_user_id: string | null;
  meta_verify_token: string | null;
  meta_access_token_expires_at: string | null;
  instagram_username: string | null;
  display_name: string | null;
  profile_picture_url: string | null;
  ai_replies_enabled: boolean;
  ai_comments_enabled: boolean;
  ai_likes_enabled: boolean;
  ai_model: string | null;
  status: string;
  last_verified_at: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateAccountForm {
  provider: Provider;
  display_name: string;
  instagram_username: string;
  tenant_id: string;
  ai_model: string;
  // Meta-only fields
  meta_app_id: string;
  meta_app_secret: string;
  meta_verify_token: string;
  meta_access_token: string;
  meta_ig_user_id: string;
  // Direct-login-only fields
  provider_account_id: string;
}

const INITIAL_FORM: CreateAccountForm = {
  provider: 'meta',
  display_name: '',
  instagram_username: '',
  tenant_id: '',
  ai_model: 'gemini-2.5-flash',
  meta_app_id: '',
  meta_app_secret: '',
  meta_verify_token: '',
  meta_access_token: '',
  meta_ig_user_id: '',
  provider_account_id: '',
};

const AI_MODELS = [
  { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash' },
  { id: 'gpt-4o-mini',      label: 'GPT-4o Mini' },
  { id: 'gpt-4o',           label: 'GPT-4o' },
  { id: 'claude-sonnet-4',  label: 'Claude Sonnet 4' },
];

// ── API helpers ──────────────────────────────────────────────────────────────

const ACCOUNTS_API = '/api/instagram-conversations/accounts';

async function fetchAccounts(): Promise<InstagramAccount[]> {
  const res = await fetchWithTenant(ACCOUNTS_API);
  if (!res.ok) return [];
  const data = await res.json();
  if (Array.isArray(data?.accounts)) return data.accounts;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

async function createAccount(
  form: CreateAccountForm,
): Promise<{ success: boolean; account?: InstagramAccount; error?: string }> {
  // Build a body that only includes fields relevant to the chosen provider
  // — keeps the backend free of empty-string noise that would otherwise
  // override stored defaults during a re-connect.
  const body: Record<string, any> = {
    provider:           form.provider,
    display_name:       form.display_name || undefined,
    instagram_username: form.instagram_username || undefined,
    tenant_id:          form.tenant_id || undefined,
    ai_model:           form.ai_model || undefined,
  };
  if (form.provider === 'meta') {
    Object.assign(body, {
      meta_app_id:        form.meta_app_id,
      meta_app_secret:    form.meta_app_secret,
      meta_verify_token:  form.meta_verify_token,
      meta_access_token:  form.meta_access_token,
      meta_ig_user_id:    form.meta_ig_user_id,
    });
  } else {
    body.provider_account_id = form.provider_account_id;
  }
  // Strip undefined / empty string keys
  Object.keys(body).forEach((k) => {
    if (body[k] === undefined || body[k] === '') delete body[k];
  });

  try {
    const res = await fetchWithTenant(ACCOUNTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      return { success: false, error: data?.detail || data?.error || `HTTP ${res.status}` };
    }
    // The backend returns either { account } (provision) or the row directly
    return { success: true, account: data?.account ?? data };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function patchAccount(
  id: string,
  updates: Record<string, any>,
): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchWithTenant(`${ACCOUNTS_API}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data?.detail || data?.error || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function deleteAccount(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetchWithTenant(`${ACCOUNTS_API}/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { success: false, error: data?.detail || data?.error || `HTTP ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// ── Toast ────────────────────────────────────────────────────────────────────

type Toast = { kind: 'ok' | 'err'; message: string } | null;

// ── Component ────────────────────────────────────────────────────────────────

export const InstagramTenantOnboarding: React.FC = () => {
  const [accounts, setAccounts] = useState<InstagramAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [form, setForm] = useState<CreateAccountForm>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast>(null);
  const [showSecrets, setShowSecrets] = useState(false);
  // Instagram sign-in modal — same pattern as LinkedIn's connection modal.
  // When the operator finishes sign-in here we just stash the returned
  // connection id into the form's provider_account_id field; the outer
  // "Connect Instagram account" button does the actual upsert.
  const [showSignIn, setShowSignIn] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    else setLoading(true);
    try {
      setAccounts(await fetchAccounts());
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4500);
    return () => clearTimeout(t);
  }, [toast]);

  const canSubmit = useMemo(() => {
    if (form.provider === 'meta') {
      return Boolean(
        form.meta_app_id &&
        form.meta_app_secret &&
        form.meta_verify_token &&
        form.meta_access_token &&
        form.meta_ig_user_id,
      );
    }
    return Boolean(form.provider_account_id);
  }, [form]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit || submitting) return;
      setSubmitting(true);
      const result = await createAccount(form);
      setSubmitting(false);
      if (result.success) {
        setToast({ kind: 'ok', message: 'Instagram account connected.' });
        setForm(INITIAL_FORM);
        await load(true);
      } else {
        setToast({ kind: 'err', message: result.error || 'Failed to connect account.' });
      }
    },
    [form, canSubmit, submitting, load],
  );

  // Modal state for the "AI Likes unavailable on Meta" explanation. We open
  // this instead of toggling when an operator clicks AI Likes on a Meta
  // account — Meta's official Graph API has no comment-like endpoint, so
  // turning it on would just silently do nothing.
  const [likesUnavailableOpen, setLikesUnavailableOpen] = useState(false);

  const handleToggleAi = useCallback(
    async (account: InstagramAccount, field: 'ai_replies_enabled' | 'ai_comments_enabled' | 'ai_likes_enabled') => {
      const next = !account[field];

      // Hard gate: AI Likes is unsupported on Meta-provider accounts because
      // Meta's Instagram Graph API exposes no comment-like endpoint. Show
      // the explainer modal and bail without touching the toggle. We only
      // gate the ENABLE direction — turning a stuck-on toggle OFF still works.
      if (field === 'ai_likes_enabled' && next === true && account.provider === 'meta') {
        setLikesUnavailableOpen(true);
        return;
      }

      // Optimistic
      setAccounts((rows) => rows.map((a) => (a.id === account.id ? { ...a, [field]: next } : a)));
      const result = await patchAccount(account.id, { [field]: next });
      if (!result.success) {
        // Roll back
        setAccounts((rows) => rows.map((a) => (a.id === account.id ? { ...a, [field]: !next } : a)));
        setToast({ kind: 'err', message: result.error || 'Could not update setting.' });
      }
    },
    [],
  );

  const handleDisconnect = useCallback(
    async (account: InstagramAccount) => {
      const confirmed = window.confirm(
        `Disconnect Instagram account "${account.instagram_username || account.display_name || account.id}"? You can reconnect later with fresh credentials.`,
      );
      if (!confirmed) return;
      const result = await deleteAccount(account.id);
      if (result.success) {
        setToast({ kind: 'ok', message: 'Account disconnected.' });
        await load(true);
      } else {
        setToast({ kind: 'err', message: result.error || 'Disconnect failed.' });
      }
    },
    [load],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-8">
      {toast && (
        <div
          className={`flex items-center gap-2 rounded-lg border p-3 text-sm ${
            toast.kind === 'ok'
              ? 'border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200'
              : 'border-rose-300 bg-rose-50 text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
          }`}
        >
          {toast.kind === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {/* ── Existing accounts ─────────────────────────────────────── */}
      <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-white/10 dark:bg-white/5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-semibold">Connected Instagram accounts</h2>
            <p className="text-sm text-neutral-600 mt-0.5 dark:text-white/60">
              Each account links an Instagram identity (Meta or direct login) to this tenant.
            </p>
          </div>
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-md border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-neutral-500 dark:text-white/60">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading accounts…</span>
          </div>
        ) : accounts.length === 0 ? (
          <div className="rounded-lg border border-dashed border-neutral-300 px-4 py-8 text-center text-sm text-neutral-500 dark:border-white/10 dark:text-white/60">
            No Instagram accounts yet. Use the form below to connect one.
          </div>
        ) : (
          <ul className="divide-y divide-neutral-200 dark:divide-white/5">
            {accounts.map((a) => (
              <li key={a.id} className="py-4 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-neutral-900 dark:text-white">
                        {a.display_name || a.instagram_username || 'Untitled account'}
                      </span>
                      <ProviderBadge provider={a.provider} />
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="mt-1 text-xs text-neutral-600 space-y-0.5 dark:text-white/60">
                      {a.instagram_username && <div>@{a.instagram_username}</div>}
                      {a.meta_ig_user_id && <div>Meta IG User ID: <span className="font-mono">{a.meta_ig_user_id}</span></div>}
                      {a.provider_account_id && <div>Connection ID: <span className="font-mono">{a.provider_account_id}</span></div>}
                      {a.last_verified_at && (
                        <div>Last verified: {new Date(a.last_verified_at).toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleDisconnect(a)}
                      className="flex items-center gap-1.5 rounded-md border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200 dark:hover:bg-rose-500/20"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Disconnect
                    </button>
                  </div>
                </div>

                {/* Per-account AI toggles — same shape as the AI Replies tab,
                    just exposed here for quick scanning across accounts. */}
                <div className="mt-3 flex flex-wrap gap-2">
                  <AiToggleChip
                    label="AI Replies"
                    enabled={a.ai_replies_enabled}
                    onToggle={() => handleToggleAi(a, 'ai_replies_enabled')}
                  />
                  <AiToggleChip
                    label="AI Comments"
                    enabled={a.ai_comments_enabled}
                    onToggle={() => handleToggleAi(a, 'ai_comments_enabled')}
                  />
                  <AiToggleChip
                    label="AI Likes"
                    enabled={a.ai_likes_enabled}
                    onToggle={() => handleToggleAi(a, 'ai_likes_enabled')}
                    unavailable={a.provider === 'meta' && !a.ai_likes_enabled}
                    unavailableTitle="AI Likes isn't supported via Meta's official API — only available with direct sign-in (Unipile)."
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── Onboard new account ───────────────────────────────────── */}
      <section className="rounded-xl border border-neutral-200 bg-neutral-50 p-5 dark:border-white/10 dark:bg-white/5">
        <h2 className="text-lg font-semibold mb-1">Onboard new Instagram account</h2>
        <p className="text-sm text-neutral-600 mb-5 dark:text-white/60">
          Mirrors the WhatsApp tenant onboarding flow — connect a provider, link to an existing tenant or auto-create one.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Provider toggle */}
          <FieldGroup label="Provider">
            <div className="grid grid-cols-2 gap-2">
              {(['meta', 'unipile'] as Provider[]).map((p) => {
                const active = form.provider === p;
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, provider: p }))}
                    className={`rounded-lg border px-3 py-2 text-sm font-medium transition ${
                      active
                        ? 'border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900'
                        : 'border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:text-white/80 dark:hover:bg-white/10'
                    }`}
                  >
                    {p === 'meta'
                      ? 'Meta (official Instagram Graph API)'
                      : 'Direct sign-in (username & password)'}
                  </button>
                );
              })}
            </div>
          </FieldGroup>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Display name" hint="Friendly label shown in the app">
              <Input
                value={form.display_name}
                onChange={(v) => setForm((f) => ({ ...f, display_name: v }))}
                placeholder="e.g. Acme Studio"
              />
            </Field>
            <Field label="Instagram username" hint="@handle (without the @)">
              <Input
                value={form.instagram_username}
                onChange={(v) => setForm((f) => ({ ...f, instagram_username: v }))}
                placeholder="e.g. acmestudio"
              />
            </Field>

            <Field label="Tenant ID" hint="Optional — leave blank to use the active tenant" full>
              <Input
                value={form.tenant_id}
                onChange={(v) => setForm((f) => ({ ...f, tenant_id: v }))}
                placeholder="e.g. e0a3e9ca-3f46-4bb0-ac10-a91b5c1d20b5"
                mono
              />
            </Field>

            <Field label="AI Model" hint="LLM used for AI Replies + Comments">
              <select
                value={form.ai_model}
                onChange={(e) => setForm((f) => ({ ...f, ai_model: e.target.value }))}
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:ring-white/30"
              >
                {AI_MODELS.map((m) => (
                  <option key={m.id} value={m.id} className="bg-white text-neutral-900 dark:bg-neutral-900 dark:text-white">
                    {m.label}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex items-end justify-end pb-1">
              <button
                type="button"
                onClick={() => setShowSecrets((s) => !s)}
                className="flex items-center gap-1.5 text-xs text-neutral-600 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white"
              >
                {showSecrets ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                {showSecrets ? 'Hide secrets' : 'Show secrets'}
              </button>
            </div>
          </div>

          {/* Provider-specific credentials */}
          {form.provider === 'meta' ? (
            <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-4 dark:border-white/10 dark:bg-white/5">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-white/50">
                Meta Graph API credentials
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="App ID" required>
                  <Input
                    value={form.meta_app_id}
                    onChange={(v) => setForm((f) => ({ ...f, meta_app_id: v }))}
                    placeholder="e.g. 1234567890123456"
                    mono
                  />
                </Field>
                <Field label="App Secret" required>
                  <Input
                    value={form.meta_app_secret}
                    onChange={(v) => setForm((f) => ({ ...f, meta_app_secret: v }))}
                    placeholder="From Facebook App dashboard"
                    type={showSecrets ? 'text' : 'password'}
                    mono
                  />
                </Field>
                <Field label="Verify Token" required hint="Used for webhook signature validation">
                  <Input
                    value={form.meta_verify_token}
                    onChange={(v) => setForm((f) => ({ ...f, meta_verify_token: v }))}
                    placeholder="Choose any string — paste the same value into Meta webhooks setup"
                  />
                </Field>
                <Field label="Access Token" required>
                  <Input
                    value={form.meta_access_token}
                    onChange={(v) => setForm((f) => ({ ...f, meta_access_token: v }))}
                    placeholder="Long-lived Instagram Graph API token"
                    type={showSecrets ? 'text' : 'password'}
                    mono
                  />
                </Field>
                <Field label="Instagram User ID" required hint="Returned by /me?fields=id" full>
                  <Input
                    value={form.meta_ig_user_id}
                    onChange={(v) => setForm((f) => ({ ...f, meta_ig_user_id: v }))}
                    placeholder="e.g. 17841400000000000"
                    mono
                  />
                </Field>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-neutral-200 bg-white p-4 space-y-3 dark:border-white/10 dark:bg-white/5">
              <div className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-white/50">
                Instagram sign-in
              </div>
              <p className="text-sm text-neutral-600 dark:text-white/70">
                Sign in to Instagram with your email + password (same pattern as
                LinkedIn). We&apos;ll handle the connection and return a
                connection id automatically.
              </p>
              {form.provider_account_id ? (
                <div className="flex items-center justify-between gap-3 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200">
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    Signed in — account <span className="font-mono">{form.provider_account_id}</span> ready to connect.
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, provider_account_id: '' }))}
                    className="text-xs underline hover:opacity-80"
                  >
                    Use a different account
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSignIn(true)}
                  className="inline-flex items-center gap-2 rounded-md bg-gradient-to-r from-[#DD2A7B] to-[#515BD4] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                >
                  <InstagramIcon className="h-4 w-4" />
                  Sign in to Instagram
                </button>
              )}
              <details className="text-xs text-neutral-500 dark:text-white/50">
                <summary className="cursor-pointer hover:text-neutral-700 dark:hover:text-white/80">
                  Or paste a connection id manually
                </summary>
                <div className="mt-2">
                  <Input
                    value={form.provider_account_id}
                    onChange={(v) => setForm((f) => ({ ...f, provider_account_id: v }))}
                    placeholder="e.g. WS_xxxxx — paste if you already have a connection id"
                    mono
                  />
                </div>
              </details>
            </div>
          )}

          {showSignIn && (
            <InstagramSignInModal
              onClose={() => setShowSignIn(false)}
              onSuccess={(accountId) => {
                setForm((f) => ({ ...f, provider_account_id: accountId }));
                setShowSignIn(false);
                setToast({
                  kind: 'ok',
                  message: 'Signed in to Instagram. Click "Connect" below to finish onboarding.',
                });
              }}
            />
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setForm(INITIAL_FORM)}
              disabled={submitting}
              className="rounded-md border border-neutral-200 bg-transparent px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
            >
              Reset
            </button>
            <button
              type="submit"
              disabled={!canSubmit || submitting}
              className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-neutral-900 dark:hover:bg-white/90"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Connecting…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Connect Instagram account
                </>
              )}
            </button>
          </div>
        </form>
      </section>

      {/* Explainer modal — fires when an operator clicks "AI Likes" on a
          Meta-connected account. Meta's Instagram Graph API has no comment-
          like endpoint; only Unipile-provider accounts can auto-like. */}
      {likesUnavailableOpen && (
        <LikesUnavailableModal onClose={() => setLikesUnavailableOpen(false)} />
      )}
    </div>
  );
};

// ── Sub-components ──────────────────────────────────────────────────────────

function LikesUnavailableModal({ onClose }: { onClose: () => void }): JSX.Element {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-w-md w-full rounded-2xl border bg-white p-6 shadow-xl dark:border-white/10 dark:bg-neutral-900"
      >
        <div className="mb-3 flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-amber-500" />
          <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
            AI Likes isn&apos;t available with Meta sign-in
          </h3>
        </div>
        <p className="text-sm leading-relaxed text-neutral-600 dark:text-white/70">
          Meta&apos;s official Instagram Graph API doesn&apos;t expose a way to
          like comments on your posts — it&apos;s a documented limitation, not
          something we can work around.
        </p>
        <p className="mt-3 text-sm leading-relaxed text-neutral-600 dark:text-white/70">
          AI Likes is only supported on accounts connected via
          <span className="mx-1 inline-flex rounded bg-neutral-100 px-1.5 py-0.5 text-xs font-medium text-neutral-900 dark:bg-white/10 dark:text-white">
            Direct sign-in
          </span>
          (Instagram credentials / cookies, routed through Unipile). Your other
          AI features (Replies, Comments) work normally on Meta.
        </p>
        <p className="mt-3 text-xs text-neutral-500 dark:text-white/50">
          To enable AI Likes for this account, reconnect it using the Direct
          sign-in option in the onboarding form below.
        </p>
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-white/90"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  full,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  full?: boolean;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-medium text-neutral-700 mb-1.5 dark:text-white/80">
        {label}
        {required && <span className="text-rose-600 ml-1 dark:text-rose-300">*</span>}
        {hint && <span className="text-neutral-500 font-normal ml-2 dark:text-white/40">{hint}</span>}
      </label>
      {children}
    </div>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }): JSX.Element {
  return (
    <div>
      <label className="block text-xs font-medium text-neutral-700 mb-1.5 dark:text-white/80">{label}</label>
      {children}
    </div>
  );
}

function Input({
  value,
  onChange,
  placeholder,
  type = 'text',
  mono,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  mono?: boolean;
}): JSX.Element {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/30 dark:focus:ring-white/30 ${
        mono ? 'font-mono' : ''
      }`}
    />
  );
}

function ProviderBadge({ provider }: { provider: string }): JSX.Element {
  const isMeta = provider === 'meta';
  return (
    <span
      className={`text-[10px] font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${
        isMeta
          ? 'bg-blue-100 text-blue-700 border border-blue-200 dark:bg-blue-500/15 dark:text-blue-200 dark:border-blue-500/30'
          : 'bg-purple-100 text-purple-700 border border-purple-200 dark:bg-purple-500/15 dark:text-purple-200 dark:border-purple-500/30'
      }`}
    >
      {isMeta ? 'Meta' : 'Direct'}
    </span>
  );
}

function StatusBadge({ status }: { status: string }): JSX.Element {
  const lower = (status || '').toLowerCase();
  const active = lower === 'active' || lower === 'connected';
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded ${
        active
          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:border-emerald-500/30'
          : 'bg-neutral-100 text-neutral-600 border border-neutral-200 dark:bg-white/10 dark:text-white/60 dark:border-white/10'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-neutral-400 dark:bg-white/40'}`} />
      {status || 'unknown'}
    </span>
  );
}

function AiToggleChip({
  label,
  enabled,
  onToggle,
  unavailable,
  unavailableTitle,
}: {
  label: string;
  enabled: boolean;
  onToggle: () => void;
  // When true, the chip renders dimmed with a strikethrough and a tooltip
  // (the click still fires onToggle so we can open an explainer modal).
  unavailable?: boolean;
  unavailableTitle?: string;
}): JSX.Element {
  if (unavailable) {
    return (
      <button
        type="button"
        onClick={onToggle}
        title={unavailableTitle}
        className="flex items-center gap-1.5 rounded-full border border-dashed border-neutral-300 bg-neutral-100 px-2.5 py-1 text-[11px] font-medium text-neutral-400 line-through hover:bg-neutral-200 dark:border-white/10 dark:bg-white/5 dark:text-white/30 dark:hover:bg-white/10"
      >
        <Power className="h-3 w-3" />
        {label}: unavailable
      </button>
    );
  }
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium border transition ${
        enabled
          ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200 dark:hover:bg-emerald-500/20'
          : 'border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-white/10 dark:bg-white/5 dark:text-white/60 dark:hover:bg-white/10'
      }`}
    >
      <Power className="h-3 w-3" />
      {label}: {enabled ? 'on' : 'off'}
    </button>
  );
}

// ── Instagram sign-in modal ─────────────────────────────────────────────────
// Mirrors LinkedIn's "Sign in to LinkedIn" modal (Credentials / Cookies
// tabs, optional settings, error display). Posts to a Python endpoint that
// wraps the account-create API. Returns the connection id to the parent so
// the outer onboarding form can submit it through the existing
// /api/accounts POST without extra plumbing.

type SignInMethod = 'credentials' | 'cookies';

interface SignInCheckpoint {
  required: boolean;
  type?: string;
  message?: string;
  sent_to?: string;
}

interface SignInResponse {
  success: boolean;
  account_id?: string;
  checkpoint?: SignInCheckpoint;
  error?: string;
  detail?: string;
}

function InstagramSignInModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (accountId: string) => void;
}): JSX.Element {
  const [method, setMethod] = useState<SignInMethod>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [cookie, setCookie] = useState('');
  const [userAgent, setUserAgent] = useState(
    typeof window !== 'undefined' ? navigator.userAgent : '',
  );
  const [showOptional, setShowOptional] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkpoint, setCheckpoint] = useState<SignInCheckpoint | null>(null);
  const [checkpointCode, setCheckpointCode] = useState('');
  const [partialAccountId, setPartialAccountId] = useState<string | null>(null);

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      setError(null);
      setCheckpoint(null);
      setSubmitting(true);
      try {
        const payload =
          method === 'credentials'
            ? { method: 'credentials', email, password }
            : { method: 'cookies', cookie, user_agent: userAgent };
        const res = await fetchWithTenant(
          '/api/instagram-conversations/accounts/unipile/connect',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          },
        );
        const data: SignInResponse = await res.json();
        if (!res.ok) {
          setError(data.detail || data.error || `HTTP ${res.status}`);
          return;
        }
        if (data.checkpoint?.required) {
          setCheckpoint(data.checkpoint);
          if (data.account_id) setPartialAccountId(data.account_id);
          return;
        }
        if (data.success && data.account_id) {
          onSuccess(data.account_id);
          return;
        }
        setError(data.error || 'Unexpected response from Instagram');
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSubmitting(false);
      }
    },
    [method, email, password, cookie, userAgent, onSuccess],
  );

  const handleCheckpoint = useCallback(
    async () => {
      if (!partialAccountId || !checkpointCode.trim()) return;
      setError(null);
      setSubmitting(true);
      try {
        const res = await fetchWithTenant(
          `/api/instagram-conversations/accounts/unipile/${encodeURIComponent(partialAccountId)}/checkpoint`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code: checkpointCode.trim() }),
          },
        );
        const data: SignInResponse = await res.json();
        if (!res.ok) {
          setError(data.detail || data.error || `HTTP ${res.status}`);
          return;
        }
        if (data.success && data.account_id) {
          onSuccess(data.account_id);
        } else {
          setError(data.error || 'Checkpoint verification did not complete');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setSubmitting(false);
      }
    },
    [partialAccountId, checkpointCode, onSuccess],
  );

  const canSubmit = useMemo(() => {
    if (submitting) return false;
    if (method === 'credentials') return Boolean(email && password);
    return Boolean(cookie);
  }, [method, email, password, cookie, submitting]);

  if (typeof document === 'undefined') return <></>;
  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-neutral-900"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4 dark:border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="rounded-md bg-gradient-to-br from-[#FEDA77] via-[#DD2A7B] to-[#515BD4] p-1.5">
              <InstagramIcon className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              Sign in to Instagram
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-neutral-500 hover:bg-neutral-100 dark:text-white/60 dark:hover:bg-white/10"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-4 px-5 py-5">
          {checkpoint?.required ? (
            <div className="space-y-3">
              <h4 className="text-center text-sm font-semibold text-neutral-900 dark:text-white">
                Instagram requires verification
              </h4>
              <p className="text-center text-xs text-neutral-600 dark:text-white/60">
                {checkpoint.message ||
                  `Instagram sent a code${checkpoint.sent_to ? ` to ${checkpoint.sent_to}` : ''}. Enter it below to finish signing in.`}
              </p>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={checkpointCode}
                onChange={(e) => setCheckpointCode(e.target.value)}
                placeholder="6-digit verification code"
                className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/30"
              />
            </div>
          ) : (
            <>
              {/* Method tabs — Credentials / Cookies, same as LinkedIn */}
              <div className="text-center">
                <h4 className="mb-3 text-base font-semibold text-neutral-700 dark:text-white/80">
                  Choose a method
                </h4>
                <div className="inline-flex rounded-md border border-neutral-200 p-0.5 dark:border-white/10">
                  {(['credentials', 'cookies'] as SignInMethod[]).map((m) => {
                    const active = method === m;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setMethod(m)}
                        className={`rounded px-4 py-1.5 text-sm font-medium transition ${
                          active
                            ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                            : 'text-neutral-600 hover:bg-neutral-100 dark:text-white/60 dark:hover:bg-white/5'
                        }`}
                      >
                        {m === 'credentials' ? 'Credentials' : 'Cookies'}
                      </button>
                    );
                  })}
                </div>
              </div>

              {method === 'credentials' ? (
                <form className="space-y-3" onSubmit={handleSubmit}>
                  <input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email or username"
                    className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/30"
                  />
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Instagram password"
                      className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 pr-9 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:text-white/60 dark:hover:bg-white/10"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </form>
              ) : (
                <form className="space-y-3" onSubmit={handleSubmit}>
                  <p className="text-xs text-neutral-600 dark:text-white/60">
                    Paste your Instagram <span className="font-mono">sessionid</span> cookie from your browser
                    — open <span className="font-mono">instagram.com</span>, DevTools → Application → Cookies.
                  </p>
                  <input
                    type="text"
                    value={cookie}
                    onChange={(e) => setCookie(e.target.value)}
                    placeholder="sessionid cookie value"
                    className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder-neutral-400 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder-white/30 font-mono"
                  />
                </form>
              )}

              {/* Optional settings (user agent) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowOptional((s) => !s)}
                  className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 dark:text-white/60 dark:hover:text-white"
                >
                  <span className={`inline-block transition-transform ${showOptional ? 'rotate-90' : ''}`}>›</span>
                  Optional settings
                </button>
                {showOptional && (
                  <div className="mt-2">
                    <label className="block text-xs text-neutral-600 dark:text-white/60 mb-1">
                      User-Agent (auto-detected from your browser)
                    </label>
                    <input
                      type="text"
                      value={userAgent}
                      onChange={(e) => setUserAgent(e.target.value)}
                      placeholder="Mozilla/5.0 …"
                      className="w-full rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs text-neutral-700 focus:outline-none focus:ring-1 focus:ring-neutral-400 dark:border-white/10 dark:bg-white/5 dark:text-white/70 dark:placeholder-white/30"
                    />
                  </div>
                )}
              </div>
            </>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-rose-300 bg-rose-50 p-2.5 text-xs text-rose-800 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t border-neutral-200 bg-neutral-50 px-5 py-3 dark:border-white/10 dark:bg-white/[0.03]">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-100 disabled:opacity-50 dark:text-white/70 dark:hover:bg-white/5"
          >
            Cancel
          </button>
          {checkpoint?.required ? (
            <button
              type="button"
              onClick={handleCheckpoint}
              disabled={submitting || !checkpointCode.trim()}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#DD2A7B] to-[#515BD4] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Verify
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={!canSubmit}
              className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-[#DD2A7B] to-[#515BD4] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Login
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default InstagramTenantOnboarding;
