'use client';

import React from 'react';
import { RefreshCw, AlertTriangle, XCircle, Clock, CheckCircle2, Megaphone, ListChecks, Ban } from 'lucide-react';
import { useTaskHealth } from '@lad/frontend-features/lad-monitor';
import { StatCard } from '../components/StatCard';

function relativeTime(iso: string | null): string {
  if (!iso) return '-';
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 0) return 'in future';
  if (secs < 60) return `${secs}s ago`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return `${Math.floor(secs / 86400)}d ago`;
}

export default function MonitorTasksPage() {
  const { data, loading, error, refetch } = useTaskHealth();
  const s = data?.summary;
  const stuckAlert = !!s && s.stuck > (data?.stuckAlertThreshold ?? 0);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Queue Tasks (follow-ups)</h2>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          Failed to load task health: {error.message}
        </div>
      ) : null}

      {stuckAlert ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          <XCircle className="h-4 w-4" />
          {s!.stuck} stuck task(s) - overdue past {data!.graceMinutes}m and never executed. The Cloud Tasks worker may be stalled.
        </div>
      ) : null}

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : s ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
            <StatCard title="Stuck" value={s.stuck} icon={XCircle} accent={s.stuck > 0 ? 'text-red-500' : 'text-gray-400'} subtitle="overdue, unran" />
            <StatCard title="Failed" value={s.failed} icon={AlertTriangle} accent={s.failed > 0 ? 'text-amber-500' : 'text-gray-400'} subtitle="ran, errored" />
            <StatCard title="Dead-letter" value={s.dead_letter} icon={Ban} accent={s.dead_letter > 0 ? 'text-rose-600' : 'text-gray-400'} subtitle="terminal" />
            <StatCard title="Pending" value={s.pending} icon={Clock} accent="text-blue-500" subtitle="due in future" />
            <StatCard title="Executed" value={s.executed} icon={CheckCircle2} accent="text-emerald-500" />
            <StatCard title="Campaign errors" value={s.campaignActivityErrors7d} icon={Megaphone} accent="text-pink-500" subtitle="last 7d" />
          </div>

          {data && data.byTenant.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {data.byTenant.map((t) => (
                <span key={t.tenant_id} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                  {t.tenant_name || t.tenant_id}: <span className="text-red-500">{t.stuck} stuck</span> · <span className="text-amber-500">{t.failed} failed</span> · <span className="text-rose-600">{t.dead_letter} dead</span>
                </span>
              ))}
            </div>
          ) : null}

          {data?.wabaFollowups ? (
            <div className="mt-6">
              <h3 className="mb-2 text-sm font-semibold text-gray-900 dark:text-gray-100">
                WhatsApp follow-ups (WABA) <span className="text-gray-400">· {data.wabaFollowups.tenantsChecked} tenant DB(s)</span>
              </h3>
              <div className="grid grid-cols-3 gap-3 md:max-w-md">
                <StatCard title="Stuck" value={data.wabaFollowups.stuck} icon={XCircle} accent={data.wabaFollowups.stuck > 0 ? 'text-red-500' : 'text-gray-400'} />
                <StatCard title="Failed" value={data.wabaFollowups.failed} icon={AlertTriangle} accent={data.wabaFollowups.failed > 0 ? 'text-amber-500' : 'text-gray-400'} />
                <StatCard title="Pending" value={data.wabaFollowups.pending} icon={Clock} accent="text-blue-500" />
              </div>
              {data.wabaFollowups.byTenant.length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.wabaFollowups.byTenant.map((t) => (
                    <span key={t.tenant_id} className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300">
                      {t.tenant_name || t.tenant_id}: <span className="text-red-500">{t.stuck} stuck</span> · <span className="text-amber-500">{t.failed} failed</span>
                    </span>
                  ))}
                </div>
              ) : null}
              <p className="mt-2 text-xs text-gray-400">
                Conversational follow-ups (per-tenant <code className="font-mono">followup_schedule</code>). Failed counts need the tenant&apos;s table to have <code className="font-mono">last_error</code> - older tenants may report 0.
              </p>
            </div>
          ) : null}

          <h3 className="mb-2 mt-6 text-sm font-semibold text-gray-900 dark:text-gray-100">
            Problem tasks <span className="text-gray-400">({data?.problems.length ?? 0})</span>
          </h3>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
              <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/50">
                <tr>
                  <th className="px-4 py-3 font-medium">Tenant</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Problem</th>
                  <th className="px-4 py-3 font-medium">Attempts</th>
                  <th className="px-4 py-3 font-medium">Scheduled</th>
                  <th className="px-4 py-3 font-medium">Last error</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {data && data.problems.length > 0 ? (
                  data.problems.map((p) => (
                    <tr key={p.id} className="align-top hover:bg-gray-50 dark:hover:bg-gray-800/40">
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{p.tenantName || p.tenantId}</td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.bookingType || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          p.problem === 'dead_letter'
                            ? 'bg-rose-200 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200'
                            : p.problem === 'failed'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                        }`}>
                          {p.problem.replace('_', '-')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{p.executionAttempts}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-gray-500">{relativeTime(p.taskScheduledAt)}</td>
                      <td className="px-4 py-3 max-w-xs truncate text-gray-500" title={p.lastError || ''}>{p.lastError || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-emerald-600 dark:text-emerald-400">No failed or stuck tasks 🎉</td></tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-gray-400">
            Booking/deal follow-ups run via Cloud Tasks (not crons). <span className="font-medium text-red-500">Stuck</span> = overdue past {data?.graceMinutes}m and never executed (worker/queue stalled); <span className="font-medium text-amber-500">Failed</span> = ran but errored. External monitors can watch <code className="font-mono">GET /health/tasks</code> (503 when stuck &gt; {data?.stuckAlertThreshold}).
          </p>
        </>
      ) : null}
    </div>
  );
}
