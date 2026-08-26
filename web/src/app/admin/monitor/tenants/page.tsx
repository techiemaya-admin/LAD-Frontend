'use client';

import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useMonitorTenants } from '@lad/frontend-features/lad-monitor';

function fmtMoney(n: number, currency: string) {
  const symbol = currency === 'USD' ? '$' : `${currency} `;
  return `${symbol}${(n || 0).toFixed(2)}`;
}

export default function MonitorTenantsPage() {
  const { data, loading, error, refetch } = useMonitorTenants({ includeConversations: true });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
          Tenant Health <span className="text-gray-400">({data.length})</span>
        </h2>
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
          Failed to load tenants: {error.message}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
          <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-3 font-medium">Tenant</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Users</th>
              <th className="px-4 py-3 font-medium">Campaigns</th>
              <th className="px-4 py-3 font-medium">Calls</th>
              <th className="px-4 py-3 font-medium">Leads</th>
              <th className="px-4 py-3 font-medium">Agents</th>
              <th className="px-4 py-3 font-medium">Convos</th>
              <th className="px-4 py-3 font-medium">Msgs (7d)</th>
              <th className="px-4 py-3 font-medium">Contacts</th>
              <th className="px-4 py-3 font-medium">Balance</th>
              <th className="px-4 py-3 font-medium">Error %</th>
              <th className="px-4 py-3 font-medium">Setup</th>
              <th className="px-4 py-3 font-medium">Last login</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {loading && data.length === 0 ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td colSpan={14} className="px-4 py-3">
                    <div className="h-5 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                  </td>
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={14} className="px-4 py-8 text-center text-gray-400">No tenants found</td>
              </tr>
            ) : (
              data.map((t) => (
                <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{t.name}</div>
                    <div className="text-xs capitalize text-gray-400">{t.plan}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        t.status === 'active'
                          ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      {t.status || 'unknown'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.activeUsers}/{t.users.length}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.activeCampaigns}/{t.campaigns}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.calls}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.pipelineLeads}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.voiceAgentsCount}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.conversations?.totalConversations ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.conversations?.messagesLast7d ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{t.conversations?.totalContacts ?? '-'}</td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">{fmtMoney(t.billing.creditsBalance, t.billing.currency)}</td>
                  <td className="px-4 py-3">
                    <span className={t.errorRate > 20 ? 'text-red-600 dark:text-red-400' : t.errorRate > 5 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500'}>
                      {t.errorRate}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                        <div
                          className={`h-full ${t.setup.percent >= 75 ? 'bg-emerald-500' : t.setup.percent >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${t.setup.percent}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{t.setup.percent}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{t.lastLoginAt ? new Date(t.lastLoginAt).toLocaleDateString() : 'Never'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-gray-400">
        Convos / Msgs / Contacts are read live from each tenant&apos;s own database (dual-DB). A blank value means that tenant&apos;s DB was unreachable or unprovisioned.
      </p>
    </div>
  );
}
