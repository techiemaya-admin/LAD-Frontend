'use client';

/**
 * Strategy review queue.
 *
 * Tenants can publish a workflow playbook for other tenants to import. Approving
 * one here is what makes it visible platform-wide - the first peer-visible
 * cross-tenant surface on the platform - so the reviewer sees the full sanitized
 * payload (message copy, targeting, node chain) before deciding.
 *
 * The private definition is never shown here because it is never sent: the
 * backend's moderation query selects the sanitized copy only.
 */
import React from 'react';
import { RefreshCw, Check, X, ShieldCheck, Inbox, AlertTriangle } from 'lucide-react';
import { useStrategyReview, type StrategyReviewStatus } from '@lad/frontend-features/lad-monitor';

const TABS: { value: StrategyReviewStatus; label: string }[] = [
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'withdrawn', label: 'Withdrawn' },
];

function relativeTime(iso: string | null): string {
  if (!iso) return '-';
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${Math.max(secs, 0)}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function MonitorStrategiesPage() {
  const [status, setStatus] = React.useState<StrategyReviewStatus>('pending');
  const { data, loading, error, refetch, review, submittingId } = useStrategyReview(status);
  const [noteFor, setNoteFor] = React.useState<Record<string, string>>({});
  const [expanded, setExpanded] = React.useState<string | null>(null);

  const act = async (id: string, decision: 'approve' | 'reject') => {
    try {
      await review(id, decision, noteFor[id]);
    } catch {
      /* surfaced via `error` */
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Shared Strategies</h2>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <p className="mb-4 text-xs text-gray-500 dark:text-gray-400">
        Approving publishes a strategy to every tenant’s Community gallery. Account credentials,
        delivery destinations and uploaded contacts are stripped before it reaches here - what you
        see below is exactly what other tenants would get.
      </p>

      {/* Status tabs */}
      <div className="mb-4 flex gap-1">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setStatus(t.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              status === t.value
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error.message}
        </div>
      ) : null}

      {!loading && data.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 py-12 text-center dark:border-gray-700">
          <Inbox className="mx-auto h-6 w-6 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No {status} strategies.</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {data.map((s) => {
          const nodes = s.shared_definition?.nodes || [];
          const open = expanded === s.id;
          return (
            <div key={s.id} className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
              <div className="flex items-start gap-3 p-3">
                <span className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-violet-100 dark:bg-violet-950/40">
                  <ShieldCheck className="h-4 w-4 text-violet-600 dark:text-violet-300" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100">{s.name}</div>
                  <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {s.tenant_name || s.tenant_id} · submitted {relativeTime(s.submitted_at)}
                    {s.import_count > 0 ? ` · ${s.import_count} imports` : ''}
                  </div>
                  {s.description ? (
                    <p className="mt-1.5 text-xs text-gray-600 dark:text-gray-300">{s.description}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {s.node_types.map((t) => (
                      <span key={t} className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => setExpanded(open ? null : s.id)}
                  className="flex-shrink-0 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {open ? 'Hide' : 'Inspect'}
                </button>
              </div>

              {open ? (
                <div className="border-t border-gray-100 p-3 dark:border-gray-800">
                  {s.shared_definition?.requiresFile ? (
                    <div className="mb-2 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Starts from a file import - the importer supplies their own contact list.
                    </div>
                  ) : null}
                  <div className="mb-2 text-xs font-semibold text-gray-700 dark:text-gray-200">
                    {nodes.length} steps - full shared payload
                  </div>
                  <pre className="max-h-80 overflow-auto rounded-lg bg-gray-50 p-2.5 text-[11px] leading-relaxed text-gray-800 dark:bg-gray-950 dark:text-gray-200">
                    {JSON.stringify(s.shared_definition, null, 2)}
                  </pre>
                </div>
              ) : null}

              {status === 'pending' ? (
                <div className="flex items-center gap-2 border-t border-gray-100 p-3 dark:border-gray-800">
                  <input
                    value={noteFor[s.id] || ''}
                    onChange={(e) => setNoteFor((p) => ({ ...p, [s.id]: e.target.value }))}
                    placeholder="Note (optional - shown to the author)"
                    className="flex-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs outline-none focus:border-gray-400 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  />
                  <button
                    onClick={() => act(s.id, 'reject')}
                    disabled={submittingId === s.id}
                    className="flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                  >
                    <X className="h-3.5 w-3.5" /> Reject
                  </button>
                  <button
                    onClick={() => act(s.id, 'approve')}
                    disabled={submittingId === s.id}
                    className="flex items-center gap-1 rounded-lg bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-800 disabled:opacity-50 dark:bg-gray-100 dark:text-gray-900"
                  >
                    <Check className="h-3.5 w-3.5" /> Approve
                  </button>
                </div>
              ) : s.review_note ? (
                <div className="border-t border-gray-100 px-3 py-2 text-xs text-gray-500 dark:border-gray-800 dark:text-gray-400">
                  Note: {s.review_note}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
