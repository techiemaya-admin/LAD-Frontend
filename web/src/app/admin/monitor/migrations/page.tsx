'use client';

import React from 'react';
import { Database, RefreshCw, CheckCircle2, AlertTriangle, HelpCircle, XCircle } from 'lucide-react';
import { useMigrationStatus } from '@lad/frontend-features/lad-monitor';
import { StatCard } from '../components/StatCard';

const STATUS_STYLE: Record<string, { cls: string; Icon: typeof CheckCircle2; label: string }> = {
  current: { cls: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400', Icon: CheckCircle2, label: 'Current' },
  behind: { cls: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400', Icon: AlertTriangle, label: 'Behind' },
  schema_absent: { cls: 'text-gray-500 bg-gray-100 dark:bg-gray-800 dark:text-gray-400', Icon: HelpCircle, label: 'No schema' },
  unreachable: { cls: 'text-red-600 bg-red-50 dark:bg-red-950/30 dark:text-red-400', Icon: XCircle, label: 'Unreachable' },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.unreachable;
  const { Icon } = s;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${s.cls}`}>
      <Icon className="h-3 w-3" />
      {s.label}
    </span>
  );
}

export default function MonitorMigrationsPage() {
  const { data, loading, error, refetch } = useMigrationStatus();
  const s = data?.summary;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-gray-400" />
          <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Per-tenant migration status</h2>
        </div>
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
          Failed to load migration status: {error.message}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : data && s ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard title="Tenants checked" value={s.tenantsChecked} icon={Database} accent="text-blue-500" />
            <StatCard title="Behind" value={s.tenantsBehind} icon={AlertTriangle} accent={s.tenantsBehind ? 'text-amber-500' : 'text-emerald-500'} />
            <StatCard title="Ledger adoption" value={`${s.ledgerAdoption}/${s.tenantsChecked}`} icon={CheckCircle2} accent="text-indigo-500" />
            <StatCard title="Core schema" value={s.coreStatus} icon={s.coreStatus === 'current' ? CheckCircle2 : AlertTriangle} accent={s.coreStatus === 'current' ? 'text-emerald-500' : 'text-amber-500'} />
          </div>

          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Env: core <code>{data.env.coreSchema}</code>, tenant <code>{data.env.tenantSchema}</code>. Applying migrations is an
            API-only super-admin action (<code>POST /api/admin/monitor/migrations/run</code>, dry-run by default).
          </p>

          <div className="mt-4 overflow-x-auto rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <table className="w-full min-w-[560px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-medium text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  <th className="px-4 py-2">Target</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Missing</th>
                  <th className="px-4 py-2">Ledger</th>
                </tr>
              </thead>
              <tbody className="px-4">
                <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
                  <td className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200">{data.core.name}</td>
                  <td className="px-4 py-2"><StatusBadge status={data.core.status} /></td>
                  <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{data.core.missing.join(', ') || '-'}</td>
                  <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{data.core.ledgerPresent ? `${data.core.ledgerVersions.length} recorded` : 'no ledger'}</td>
                </tr>
                {[...data.tenants].sort((a, b) => (a.status === b.status ? 0 : a.status === 'behind' ? -1 : 1)).map((t) => (
                  <tr key={t.target} className="border-b border-gray-100 last:border-0 dark:border-gray-800">
                    <td className="px-4 py-2 text-sm text-gray-900 dark:text-gray-100">{t.name}</td>
                    <td className="px-4 py-2"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">{t.missing.length ? t.missing.join(', ') : <span className="text-emerald-500">-</span>}</td>
                    <td className="px-4 py-2 text-xs">{t.ledgerPresent ? <span className="text-gray-500 dark:text-gray-400">{t.ledgerVersions.length} recorded</span> : <span className="text-amber-500">no ledger</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : null}
    </div>
  );
}
