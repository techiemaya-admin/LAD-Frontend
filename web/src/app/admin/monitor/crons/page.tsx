'use client';

import React from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { useCronHealth, type CronHeartbeat } from '@lad/frontend-features/lad-monitor';

function relativeTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '-';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function interval(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
  return `${Math.round(seconds / 86400)}d`;
}

function JobStatus({ job }: { job: CronHeartbeat }) {
  if (job.stale) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/40 dark:text-red-300">
        <XCircle className="h-3 w-3" /> Stale
      </span>
    );
  }
  if (job.lastStatus === 'error') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
        <AlertTriangle className="h-3 w-3" /> Erroring
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
      <CheckCircle2 className="h-3 w-3" /> Healthy
    </span>
  );
}

export default function MonitorCronsPage() {
  const { data, loading, error, refetch } = useCronHealth();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Scheduled Jobs (deadman&apos;s-switch)</h2>
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
          Failed to load cron health: {error.message}
        </div>
      ) : null}

      {data && data.totalJobs > 0 ? (
        <div
          className={`mb-4 flex items-center gap-2 rounded-lg border p-3 text-sm ${
            data.healthy
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300'
              : 'border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300'
          }`}
        >
          {data.healthy ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {data.healthy
            ? `All ${data.totalJobs} job(s) ticking on schedule.`
            : `${data.staleJobs.length} job(s) stale: ${data.staleJobs.join(', ')}`}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last beat</th>
              <th className="px-4 py-3 font-medium">Interval</th>
              <th className="px-4 py-3 font-medium">Failures</th>
              <th className="px-4 py-3 font-medium">Last error</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading && !data ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="px-4 py-3"><div className="h-5 animate-pulse rounded bg-gray-100 dark:bg-gray-800" /></td></tr>
              ))
            ) : !data || data.totalJobs === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No heartbeats recorded yet. Run migration 015 and let the scheduler tick once.
                </td>
              </tr>
            ) : (
              data.jobs.map((job) => (
                <tr key={job.jobName} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3 font-mono text-gray-900 dark:text-gray-100">{job.jobName}</td>
                  <td className="px-4 py-3"><JobStatus job={job} /></td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{relativeTime(job.secondsSinceBeat)}</td>
                  <td className="px-4 py-3 text-gray-500">every {interval(job.expectedIntervalSeconds)}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{job.consecutiveFailures}</td>
                  <td className="px-4 py-3 max-w-xs truncate text-gray-500" title={job.lastError || ''}>{job.lastError || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        A job goes <span className="font-medium text-red-500">Stale</span> after missing 3× its expected interval. External monitors should watch
        <code className="mx-1 font-mono">GET /health/crons</code> (returns 503 when any job is stale).
      </p>
    </div>
  );
}
