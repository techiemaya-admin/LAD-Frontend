'use client';

/**
 * Vertical snapshot prompts — read-only.
 *
 * Two things an operator could not see before: what a vertical template
 * actually says, and what one studio's agent receives once its knob values are
 * substituted in. The second is the one that answers "why did this agent say
 * that?", because a template plus different knobs is a different prompt.
 *
 * There is no edit affordance, deliberately. The template is version-controlled
 * prose shared by every tenant on the edition — a per-tenant copy forks it, so
 * a fix to the vertical stops reaching whoever already has one, and snapshot
 * rollback assumes the prose ships with the version. Changes go through a PR
 * and a deploy. The banner says so rather than leaving someone hunting for a
 * save button that was left out on purpose.
 */
import React from 'react';
import { FileText, Loader2, RefreshCw, Lock, AlertTriangle } from 'lucide-react';
import {
  getVerticalPromptEditions,
  getVerticalTemplate,
  getRenderedVerticalPrompt,
  type VerticalPromptEdition,
} from '@lad/frontend-features/lad-monitor';

type Mode = 'template' | 'rendered';

export function VerticalPromptViewer() {
  const [editions, setEditions] = React.useState<VerticalPromptEdition[]>([]);
  const [vertical, setVertical] = React.useState<string>('');
  const [pipeline, setPipeline] = React.useState<string>('');
  const [version, setVersion] = React.useState<string>('');
  const [mode, setMode] = React.useState<Mode>('template');
  const [tenantId, setTenantId] = React.useState('');

  const [body, setBody] = React.useState<string | null>(null);
  const [meta, setMeta] = React.useState<string>('');
  const [note, setNote] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    getVerticalPromptEditions()
      .then((rows) => {
        setEditions(rows);
        const first = rows[0];
        if (!first) return;
        setVertical(first.key);
        // Default to a pipeline that actually has prose, so the first view is
        // never an empty box.
        const withProse = first.pipelines.find((p) => p.hasTemplate);
        setPipeline((withProse || first.pipelines[0])?.key || '');
      })
      .catch(() => setError('Could not load the vertical editions'));
  }, []);

  const current = editions.find((e) => e.key === vertical);
  const pipelines = current?.pipelines ?? [];

  const load = React.useCallback(async () => {
    if (!vertical || !pipeline) return;
    setLoading(true);
    setError(null);
    setNote(null);
    setBody(null);
    try {
      if (mode === 'template') {
        const t = await getVerticalTemplate(vertical, pipeline, version || undefined);
        setBody(t.template);
        setNote(t.note ?? null);
        setMeta([t.path, t.version ? `v${t.version}` : null].filter(Boolean).join(' · '));
      } else {
        if (!tenantId.trim()) {
          setError('Enter a tenant ID to render for');
          return;
        }
        const r = await getRenderedVerticalPrompt(tenantId.trim(), pipeline);
        setBody(r.data?.prompt ?? null);
        setNote(r.note ?? null);
        setMeta(r.data ? `${r.data.vertical} · v${r.data.version} · ${r.data.pipeline}` : '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load the prompt');
    } finally {
      setLoading(false);
    }
  }, [vertical, pipeline, version, mode, tenantId]);

  React.useEffect(() => {
    if (mode === 'template') load();
    // Rendered mode waits for an explicit tenant — firing on every keystroke
    // would hammer the renderer.
  }, [vertical, pipeline, version, mode, load]);

  const selectCls =
    'rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs text-gray-700 '
    + 'dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200';

  return (
    <section className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-800">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900 dark:text-gray-100">
          <FileText className="h-4 w-4" />
          Vertical Prompts
        </h2>
        <button
          onClick={() => load()}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <p className="mb-4 flex items-start gap-2 rounded-lg bg-gray-50 p-2.5 text-[11px] leading-relaxed text-gray-600 dark:bg-gray-900/60 dark:text-gray-400">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Read-only. A vertical template is shared by every tenant on the edition
          and is version-controlled, so it changes by pull request and deploy —
          not from here. What a studio can change is its own knob values, and
          you can see the effect of those under <strong>Rendered for a tenant</strong>.
        </span>
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select
          className={selectCls}
          value={vertical}
          onChange={(e) => { setVertical(e.target.value); setVersion(''); }}
        >
          {editions.map((e) => (
            <option key={e.key} value={e.key}>
              {e.key}{e.version ? ` (v${e.version})` : ''}
            </option>
          ))}
        </select>

        <select className={selectCls} value={pipeline} onChange={(e) => setPipeline(e.target.value)}>
          {pipelines.map((p) => (
            <option key={p.key} value={p.key}>
              {p.key}{p.hasTemplate ? '' : ' — no prose'}
            </option>
          ))}
        </select>

        {mode === 'template' && (current?.versions?.length ?? 0) > 0 && (
          <select className={selectCls} value={version} onChange={(e) => setVersion(e.target.value)}>
            <option value="">current</option>
            {current!.versions.map((v) => (
              <option key={v} value={v}>v{v}</option>
            ))}
          </select>
        )}

        <div className="ml-auto flex rounded-lg border border-gray-200 p-0.5 dark:border-gray-700">
          {(['template', 'rendered'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium ${
                mode === m
                  ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                  : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {m === 'template' ? 'Template' : 'Rendered for a tenant'}
            </button>
          ))}
        </div>
      </div>

      {mode === 'rendered' && (
        <div className="mb-3 flex gap-2">
          <input
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Tenant ID"
            className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 font-mono text-xs dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
          />
          <button
            onClick={() => load()}
            disabled={!tenantId.trim() || loading}
            className="rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40 dark:bg-gray-100 dark:text-gray-900"
          >
            Render
          </button>
        </div>
      )}

      {error && (
        <p className="mb-3 flex items-start gap-1.5 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-800 dark:bg-amber-500/10 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {meta && <p className="mb-1.5 font-mono text-[10px] text-gray-400">{meta}</p>}

      {loading && (
        <p className="flex items-center gap-2 py-6 text-xs text-gray-500">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
        </p>
      )}

      {!loading && note && (
        <p className="rounded-lg bg-gray-50 p-3 text-xs text-gray-600 dark:bg-gray-900/60 dark:text-gray-400">
          {note}
        </p>
      )}

      {!loading && body && (
        <pre className="max-h-[28rem] overflow-auto rounded-lg border border-gray-200 bg-gray-50 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap text-gray-800 dark:border-gray-800 dark:bg-gray-900/60 dark:text-gray-200">
          {body}
        </pre>
      )}
    </section>
  );
}
