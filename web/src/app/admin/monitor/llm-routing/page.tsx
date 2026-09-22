'use client';

import React, { useMemo, useState } from 'react';
import { Route, RefreshCw, Plus, Trash2, AlertTriangle, Lock, Save, X } from 'lucide-react';
import { useLlmRouting, useMonitorTenants } from '@lad/frontend-features/lad-monitor';
import type { LlmRoutingEntry, LlmProvider } from '@lad/frontend-features/lad-monitor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

/**
 * Per-tenant, per-feature LLM routing.
 *
 * A tenant with NO rules here runs on the platform default - that is the normal
 * state, and the empty view says so rather than looking broken. Rules are the
 * exception, added when a tenant needs a specific model for a specific job.
 */

// The feature catalogue comes from /meta, not from here. A hardcoded list in
// the frontend drifts from what the backend can actually route - and worse, it
// offered features whose call sites ignore routing entirely, so the rule saved
// and did nothing.

const PROVIDER_LABEL: Record<LlmProvider, string> = {
  anthropic: 'Claude',
  openai: 'OpenAI',
  gemini: 'Gemini',
  deepseek: 'DeepSeek',
};

export default function MonitorLlmRoutingPage() {
  const { data: tenants, loading: tenantsLoading } = useMonitorTenants({});
  const [tenantId, setTenantId] = useState<string | null>(null);
  const { meta, features, loading, saving, error, refetch, saveChain, clearChain } =
    useLlmRouting(tenantId);

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<LlmRoutingEntry[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const configured = useMemo(
    () => new Map(features.map((f) => [f.featureKey, f])),
    [features]
  );

  const tenantList = Array.isArray(tenants) ? tenants : [];

  function startEdit(featureKey: string) {
    setSaveError(null);
    setEditing(featureKey);
    setDraft(
      configured.get(featureKey)?.chain.map((c) => ({ provider: c.provider, model: c.model })) ?? [
        { provider: 'anthropic', model: '' },
      ]
    );
  }

  async function commit(featureKey: string) {
    setSaveError(null);
    try {
      await saveChain(featureKey, draft.filter((d) => d.model.trim()));
      setEditing(null);
    } catch (err) {
      // The server rejects unpriceable models and provider-locked features  - 
      // show its reason verbatim, it is the actionable part.
      setSaveError(err instanceof Error ? err.message : 'Save failed');
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">LLM Routing</h2>
          <p className="text-xs text-gray-500">
            Pin a model per feature for a tenant, with ordered fallbacks. No rule = platform default.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={tenantId ?? '__none__'}
            onValueChange={(value) => {
              setTenantId(value === '__none__' ? null : value);
              setEditing(null);
            }}
            disabled={tenantsLoading}
          >
            <SelectTrigger className="h-8 min-w-[180px] border-gray-200 bg-white text-xs dark:border-blue-950/40 dark:bg-[#071131] dark:text-gray-200">
              <SelectValue placeholder={tenantsLoading ? 'Loading tenants…' : 'Select a tenant…'} />
            </SelectTrigger>
            <SelectContent className="border-gray-200 bg-white dark:border-blue-950/40 dark:bg-[#071131]">
              <SelectItem value="__none__">Select a tenant…</SelectItem>
              {tenantList.map((t: { id: string; name: string }) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => refetch()}
            disabled={!tenantId}
            className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-blue-950/40 dark:text-gray-300 dark:hover:bg-[#253456]"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* A fallback bills a different model than the one pinned - say so up front. */}
      <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Fallbacks change what the tenant is billed for. If the primary fails, usage is charged
          against whichever provider actually answered - and output quality differs between models.
        </span>
      </div>

      {!tenantId && (
        <div className="rounded-lg border border-dashed border-gray-300 p-8 text-center text-sm text-gray-500 dark:border-blue-950/40">
          Select a tenant to view or change its model routing.
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
          {error.message}
        </div>
      )}

      {tenantId && (
        <div className="space-y-2">
          {(meta?.features ?? []).map((f) => {
            const rule = configured.get(f.key);
            const locked = meta?.nonRoutableFeatures?.[f.key];
            const notWired = !f.wired;
            const isEditing = editing === f.key;

            return (
              <div
                key={f.key}
                className={`rounded-lg border p-3 dark:border-blue-950/40 dark:bg-[#071131] ${
                  locked || notWired
                    ? 'border-gray-100 opacity-60 dark:border-blue-950/40'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <Route className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {f.label}
                      </span>
                      {(locked || notWired) && <Lock className="h-3 w-3 text-gray-400" />}
                    </div>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {locked
                        || (notWired
                          ? `${f.hint} - not yet wired to routing; a rule here would be ignored.`
                          : f.hint)}
                    </p>
                  </div>

                  {!locked && !notWired && !isEditing && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => startEdit(f.key)}
                        className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-blue-950/40 dark:text-gray-300 dark:hover:bg-[#253456]"
                      >
                        {rule ? 'Edit' : 'Set model'}
                      </button>
                      {rule && (
                        <button
                          onClick={() => clearChain(f.key)}
                          disabled={saving}
                          title="Revert to the platform default"
                          className="rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-500 hover:bg-gray-50 disabled:opacity-40 dark:border-blue-950/40 dark:hover:bg-[#253456]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {!isEditing && (
                  <div className="mt-2 text-xs">
                    {rule ? (
                      <div className="flex flex-wrap items-center gap-1.5">
                        {rule.chain.map((c, i) => (
                          <React.Fragment key={`${c.provider}-${c.model}-${i}`}>
                            {i > 0 && <span className="text-gray-400">→</span>}
                            <span
                              className={`rounded-md px-2 py-0.5 font-mono ${
                                i === 0
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300'
                                  : 'bg-gray-100 text-gray-600 dark:bg-[#253456] dark:text-gray-400'
                              }`}
                            >
                              {PROVIDER_LABEL[c.provider]} · {c.model}
                            </span>
                          </React.Fragment>
                        ))}
                        {rule.updatedBy && (
                          <span className="text-gray-400">· set by {rule.updatedBy}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400">Platform default</span>
                    )}
                  </div>
                )}

                {isEditing && (
                  <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-blue-950/40">
                    {draft.map((entry, i) => (
                      <div key={i} className="flex flex-wrap items-center gap-2">
                        <span className="w-16 shrink-0 text-xs text-gray-500">
                          {i === 0 ? 'Primary' : `Fallback ${i}`}
                        </span>
                        <Select
                          value={entry.provider}
                          onValueChange={(value) => {
                            const provider = value as LlmProvider;
                            const next = [...draft];
                            // Drop the model if the new provider does not serve it  - 
                            // leaving it would show an empty select and fail on save.
                            const stillValid = (meta?.models?.[provider] ?? []).some(
                              (m) => m.model === next[i].model
                            );
                            next[i] = { provider, model: stillValid ? next[i].model : '' };
                            setDraft(next);
                          }}
                        >
                          <SelectTrigger className="h-8 w-[120px] border-gray-200 bg-white px-2 text-xs dark:border-blue-950/40 dark:bg-[#071131] dark:text-gray-200">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-gray-200 bg-white dark:border-blue-950/40 dark:bg-[#071131]">
                            {(meta?.providers ?? []).map((p) => (
                              <SelectItem key={p} value={p}>{PROVIDER_LABEL[p] ?? p}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Select
                          value={entry.model || undefined}
                          onValueChange={(value) => {
                            const next = [...draft];
                            next[i] = { ...next[i], model: value };
                            setDraft(next);
                          }}
                        >
                          <SelectTrigger className="h-8 min-w-[260px] flex-1 border-gray-200 bg-white px-2 font-mono text-xs dark:border-blue-950/40 dark:bg-[#071131] dark:text-gray-200">
                            <SelectValue placeholder="Select a model…" />
                          </SelectTrigger>
                          <SelectContent className="border-gray-200 bg-white dark:border-blue-950/40 dark:bg-[#071131]">
                            {(meta?.models?.[entry.provider] ?? []).map((m) => (
                              <SelectItem key={m.model} value={m.model} className="font-mono text-xs">
                                {m.model}
                                {m.input != null && m.output != null
                                  ? `  ($${m.input}/$${m.output} per 1M)`
                                  : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          onClick={() => setDraft(draft.filter((_, j) => j !== i))}
                          disabled={draft.length === 1}
                          className="rounded-lg border border-gray-200 px-2 py-1 text-gray-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-30 dark:border-blue-950/40 dark:hover:border-red-900/60 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {saveError && (
                      <div className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-300">
                        {saveError}
                      </div>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => setDraft([...draft, { provider: 'gemini', model: '' }])}
                        disabled={draft.length >= 4}
                        title={draft.length >= 4 ? 'Maximum 4 entries' : 'Add a fallback'}
                        className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:border-blue-950/40 dark:text-gray-300 dark:hover:bg-[#253456]"
                      >
                        <Plus className="h-3 w-3" /> Fallback
                      </button>
                      <div className="flex-1" />
                      <button
                        onClick={() => { setEditing(null); setSaveError(null); }}
                        className="rounded-lg px-2.5 py-1 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => commit(f.key)}
                        disabled={saving || !draft.some((d) => d.model.trim())}
                        className="flex items-center gap-1 rounded-lg bg-blue-500 px-3 py-1 text-xs font-medium text-white hover:bg-blue-600 disabled:opacity-40"
                      >
                        <Save className="h-3 w-3" /> {saving ? 'Saving…' : 'Save'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
