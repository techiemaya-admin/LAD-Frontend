'use client';

import React, { useState } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import { useCloudLogs, type LogSeverity } from '@lad/frontend-features/lad-monitor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SEVERITIES: Array<LogSeverity | 'ALL'> = ['ALL', 'INFO', 'WARNING', 'ERROR', 'CRITICAL'];

const SEV_STYLES: Record<string, string> = {
  ERROR: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  CRITICAL: 'bg-red-200 text-red-800 dark:bg-red-900/60 dark:text-red-200',
  WARNING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  DEFAULT: 'bg-gray-100 text-gray-600 dark:bg-[#253456] dark:text-gray-400',
};

export default function MonitorLogsPage() {
  const [severity, setSeverity] = useState<LogSeverity | 'ALL'>('ALL');
  const [service, setService] = useState<string>('');
  const { entries, services, configured, loading, error, refetch } = useCloudLogs({
    severity: severity === 'ALL' ? undefined : severity,
    service: service || undefined,
    limit: 100,
  });

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h2 className="mr-auto text-base font-semibold text-gray-900 dark:text-gray-100">Cloud Run Logs</h2>

        <Select
          value={severity}
          onValueChange={(value) => setSeverity(value as LogSeverity | 'ALL')}
        >
          <SelectTrigger className="h-8 min-w-[140px] border-gray-200 bg-white text-xs text-gray-700 dark:border-blue-950/40 dark:bg-[#071131] dark:text-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-gray-200 bg-white dark:border-blue-950/40 dark:bg-[#071131]">
            {SEVERITIES.map((s) => (
              <SelectItem key={s} value={s}>{s === 'ALL' ? 'All severities' : s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={service || '__all__'}
          onValueChange={(value) => setService(value === '__all__' ? '' : value)}
        >
          <SelectTrigger className="h-8 min-w-[140px] border-gray-200 bg-white text-xs text-gray-700 dark:border-blue-950/40 dark:bg-[#071131] dark:text-gray-300">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-gray-200 bg-white dark:border-blue-950/40 dark:bg-[#071131]">
            <SelectItem value="__all__">All services</SelectItem>
            {services.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          onClick={() => refetch()}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-blue-950/40 dark:text-gray-300 dark:hover:bg-[#253456]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!configured ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Cloud Logging is not configured. Set <code className="font-mono">GCP_PROJECT_ID</code> (and credentials via the
            service account / <code className="font-mono">GCP_KEY_FILE</code>) on the backend to enable log streaming.
          </span>
        </div>
      ) : null}

      {error && configured ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {error.message}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-transparent shadow-sm dark:border-blue-950/40">
        <table className="min-w-full divide-y divide-gray-200 text-xs dark:divide-blue-950/40">
          <thead className="bg-slate-50/70 text-left uppercase tracking-wide text-gray-500 dark:bg-[#071131]">
            <tr>
              <th className="px-3 py-2 font-medium">Time</th>
              <th className="px-3 py-2 font-medium">Severity</th>
              <th className="px-3 py-2 font-medium">Service</th>
              <th className="px-3 py-2 font-medium">Message</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-[#262831]">
            {loading && entries.length === 0 ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i}><td colSpan={4} className="px-3 py-2"><div className="h-4 animate-pulse rounded bg-gray-100 dark:bg-[#253456]" /></td></tr>
              ))
            ) : entries.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-400">No log entries</td></tr>
            ) : (
              entries.map((e, i) => (
                <tr key={e.id || i} className="align-top bg-transparent hover:bg-[#f5f7fd] dark:hover:bg-[#0e1a3a] transition-colors">
                  <td className="whitespace-nowrap px-3 py-2 text-gray-500">
                    {e.timestamp ? new Date(e.timestamp).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex rounded px-1.5 py-0.5 font-medium ${SEV_STYLES[e.severity] || SEV_STYLES.DEFAULT}`}>
                      {e.severity}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-gray-600 dark:text-gray-400">{e.service || '-'}</td>
                  <td className="px-3 py-2 font-mono text-gray-700 dark:text-gray-300">
                    {e.httpStatus ? <span className="mr-1 text-gray-400">[{e.httpMethod} {e.httpStatus}]</span> : null}
                    {e.message}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
