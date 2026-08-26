'use client';

/**
 * Founding-group applications from the public /community landing page.
 *
 * The source column is the point of this screen: it answers "is the InMail
 * campaign actually working, or is this all organic traffic?" - which is the
 * only way to know whether to send more of them.
 */
import React from 'react';
import { RefreshCw, Inbox, Linkedin, FileText, Globe, Users, HelpCircle } from 'lucide-react';
import {
  useCommunitySignups,
  type SignupSource,
  type SignupStatus,
} from '@lad/frontend-features/lad-monitor';

const STATUS_TABS: { value: SignupStatus | undefined; label: string }[] = [
  { value: undefined, label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'declined', label: 'Declined' },
  { value: 'spam', label: 'Spam' },
];

const SOURCE_META: Record<SignupSource, { label: string; cls: string; Icon: React.ElementType }> = {
  inmail: { label: 'InMail', cls: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300', Icon: Linkedin },
  pdf: { label: 'PDF', cls: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300', Icon: FileText },
  landing: { label: 'Organic', cls: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300', Icon: Globe },
  referral: { label: 'Referral', cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300', Icon: Users },
  other: { label: 'Other', cls: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300', Icon: HelpCircle },
};

function when(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function MonitorSignupsPage() {
  const [status, setStatus] = React.useState<SignupStatus | undefined>(undefined);
  const { data, summary, loading, error, refetch, setStatus: save, savingId } =
    useCommunitySignups(status);

  // Source mix across whatever is currently loaded - the attribution answer.
  const bySource = data.reduce<Record<string, number>>((acc, s) => {
    acc[s.source] = (acc[s.source] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Community Signups
        </h2>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Attribution mix */}
      {data.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {Object.entries(bySource)
            .sort((a, b) => b[1] - a[1])
            .map(([src, n]) => {
              const meta = SOURCE_META[src as SignupSource] || SOURCE_META.other;
              const pct = Math.round((n / data.length) * 100);
              return (
                <span
                  key={src}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${meta.cls}`}
                >
                  <meta.Icon className="h-3.5 w-3.5" />
                  {meta.label}: {n} ({pct}%)
                </span>
              );
            })}
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-1">
        {STATUS_TABS.map((t) => (
          <button
            key={t.label}
            onClick={() => setStatus(t.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              status === t.value
                ? 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            {t.label}
            {t.value && summary[t.value] ? (
              <span className="ml-1.5 opacity-60">{summary[t.value]}</span>
            ) : null}
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
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No signups yet.</p>
        </div>
      ) : null}

      <div className="space-y-3">
        {data.map((s) => {
          const meta = SOURCE_META[s.source] || SOURCE_META.other;
          return (
            <div
              key={s.id}
              className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900"
            >
              <div className="flex flex-wrap items-start gap-x-3 gap-y-1.5">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {s.full_name}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${meta.cls}`}
                    >
                      <meta.Icon className="h-3 w-3" />
                      {meta.label}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    <a href={`mailto:${s.email}`} className="hover:underline">
                      {s.email}
                    </a>
                    {s.company ? ` · ${s.company}` : ''} · {when(s.created_at)}
                    {s.client_volume ? ` · would deploy to ${s.client_volume}` : ''}
                  </div>
                  {s.linkedin_url ? (
                    <a
                      href={s.linkedin_url.startsWith('http') ? s.linkedin_url : `https://${s.linkedin_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-block text-xs text-sky-600 hover:underline dark:text-sky-400"
                    >
                      {s.linkedin_url}
                    </a>
                  ) : null}
                  {s.playbook ? (
                    <p className="mt-2 rounded-lg bg-gray-50 p-2.5 text-xs leading-relaxed text-gray-700 dark:bg-gray-950 dark:text-gray-300">
                      {s.playbook}
                    </p>
                  ) : null}
                </div>

                <select
                  value={s.status}
                  disabled={savingId === s.id}
                  onChange={(e) => save(s.id, e.target.value as SignupStatus).catch(() => {})}
                  className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs font-medium text-gray-700 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  {(['new', 'contacted', 'accepted', 'declined', 'spam'] as SignupStatus[]).map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
