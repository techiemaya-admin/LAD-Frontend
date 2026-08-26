/**
 * Lead Appreciation - review queue.
 *
 * Lists appreciation DMs drafted for accepted LinkedIn connections who posted
 * an achievement. In review mode (the default) every DM waits here for a
 * human decision: Approve queues it for the next gated send window; Reject
 * suppresses it (optionally opting the lead out of all future appreciation).
 *
 * Backend: /api/lead-appreciation/* (LAD_backend features/lead-appreciation).
 */
'use client';

import { useMemo, useState } from 'react';

import {
  useAppreciationSignals,
  useAppreciationStats,
  useApproveAppreciationSignal,
  useRejectAppreciationSignal,
} from '@lad/frontend-features/lead-appreciation';
import type {
  AppreciationSignal,
  AppreciationSignalStatus,
  AppreciationStatusCount,
} from '@lad/frontend-features/lead-appreciation';

const TABS: { key: AppreciationSignalStatus | 'all'; label: string }[] = [
  { key: 'pending_review', label: 'Needs review' },
  { key: 'held_for_review', label: 'Held' },
  { key: 'queued', label: 'Queued' },
  { key: 'sent', label: 'Sent' },
  { key: 'suppressed', label: 'Suppressed' },
  { key: 'all', label: 'All' },
];

const SIGNAL_TYPE_LABELS: Record<string, string> = {
  promotion: 'Promotion',
  new_role: 'New role',
  work_anniversary: 'Work anniversary',
  award: 'Award',
  funding_round: 'Funding round',
  product_launch: 'Product launch',
  publication: 'Publication',
  speaking_engagement: 'Speaking engagement',
  company_milestone: 'Company milestone',
};

function formatDate(value: string | null): string {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleString();
}

function SignalCard({ signal }: { signal: AppreciationSignal }) {
  const approve = useApproveAppreciationSignal();
  const reject = useRejectAppreciationSignal();
  const [editedText, setEditedText] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reviewable =
    signal.status === 'pending_review' || signal.status === 'held_for_review';
  const busy = approve.isPending || reject.isPending;
  const messageText = editedText ?? signal.message_text ?? '';

  const act = async (action: 'approve' | 'reject', optOut = false) => {
    setError(null);
    try {
      if (action === 'approve') {
        await approve.mutateAsync({
          signalId: signal.id,
          messageText:
            editedText && editedText !== signal.message_text
              ? editedText
              : undefined,
        });
      } else {
        await reject.mutateAsync({ signalId: signal.id, optOut });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    }
  };

  return (
    <li className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            {signal.watch_lead_name || 'Unknown lead'}
            {signal.signal_type && (
              <span className="ml-2 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                {SIGNAL_TYPE_LABELS[signal.signal_type] || signal.signal_type}
              </span>
            )}
            <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {signal.status}
            </span>
          </p>
          <p className="mt-0.5 text-xs text-gray-500">
            Posted {formatDate(signal.posted_at)}
            {signal.match_score != null && (
              <> · confidence {Math.round(Number(signal.match_score) * 100)}%</>
            )}
            {signal.skip_reason && <> · {signal.skip_reason}</>}
          </p>
        </div>
        <div className="flex shrink-0 gap-2 text-xs">
          {signal.lead_linkedin_url && (
            <a
              href={signal.lead_linkedin_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:no-underline"
            >
              Profile
            </a>
          )}
          {signal.post_url && (
            <a
              href={signal.post_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline hover:no-underline"
            >
              Post
            </a>
          )}
        </div>
      </div>

      {signal.post_excerpt && (
        <blockquote className="mt-3 border-l-2 border-gray-200 pl-3 text-sm text-gray-600">
          {signal.post_excerpt}
        </blockquote>
      )}

      <div className="mt-3">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Appreciation DM
        </p>
        {reviewable ? (
          <textarea
            value={messageText}
            onChange={(e) => setEditedText(e.target.value)}
            maxLength={400}
            rows={3}
            className="mt-1 w-full rounded-md border border-gray-300 p-2 text-sm text-gray-800 focus:border-blue-500 focus:outline-none"
          />
        ) : (
          <p className="mt-1 whitespace-pre-wrap text-sm text-gray-800">
            {signal.message_text || '-'}
          </p>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}

      {reviewable && (
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy || !messageText.trim()}
            onClick={() => act('approve')}
            className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Approve &amp; queue
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => act('reject')}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            Reject
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => act('reject', true)}
            className="rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            title="Reject and never send appreciation DMs to this lead again"
          >
            Reject + opt lead out
          </button>
        </div>
      )}
    </li>
  );
}

export default function LeadAppreciationPage() {
  const [tab, setTab] = useState<AppreciationSignalStatus | 'all'>(
    'pending_review',
  );
  const params = useMemo(
    () => (tab === 'all' ? { limit: 100 } : { status: tab, limit: 100 }),
    [tab],
  );
  const { data: signals, isLoading, error, refetch } = useAppreciationSignals(params);
  const { data: stats } = useAppreciationStats();

  const pendingCount =
    stats?.find((s: AppreciationStatusCount) => s.status === 'pending_review')?.n ?? 0;

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">
          Lead Appreciation
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Accepted connections who posted an achievement. Approve a drafted DM
          to queue it for the next send window - every send still passes rate
          limits, freshness and safety checks.
          {pendingCount > 0 && (
            <span className="ml-1 font-medium text-gray-700">
              {pendingCount} awaiting review.
            </span>
          )}
        </p>
      </header>

      <nav className="mb-4 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3 py-1 text-sm ${
              tab === t.key
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {isLoading && <p className="text-sm text-gray-500">Loading…</p>}
      {error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          Failed to load signals.{' '}
          <button
            type="button"
            className="underline"
            onClick={() => refetch()}
          >
            Retry
          </button>
        </div>
      )}
      {!isLoading && !error && (signals?.length ?? 0) === 0 && (
        <p className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-500">
          Nothing here yet. Signals appear after the monitor finds fresh
          achievement posts from your accepted connections.
        </p>
      )}
      <ul className="space-y-3">
        {signals?.map((signal: AppreciationSignal) => (
          <SignalCard key={signal.id} signal={signal} />
        ))}
      </ul>
    </main>
  );
}
