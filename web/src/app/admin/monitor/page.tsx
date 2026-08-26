'use client';

import React from 'react';
import {
  Building2, Users, Megaphone, Phone, UserPlus, Bot, MessagesSquare, Activity, RefreshCw,
} from 'lucide-react';
import { useDashboardStats } from '@lad/frontend-features/lad-monitor';
import { StatCard } from './components/StatCard';
import { DonutChart } from './components/DonutChart';

export default function MonitorDashboardPage() {
  const { data, loading, error, refetch } = useDashboardStats();

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">Overview</h2>
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
          Failed to load dashboard: {error.message}
        </div>
      ) : null}

      {loading && !data ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
          ))}
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard title="Tenants" value={data.totalTenants} icon={Building2} accent="text-blue-500" />
            <StatCard title="Users" value={data.totalUsers} icon={Users} accent="text-indigo-500" />
            <StatCard title="Campaigns" value={data.totalCampaigns} subtitle={`${data.activeCampaigns} active`} icon={Megaphone} accent="text-emerald-500" />
            <StatCard title="Voice Agents" value={data.voiceAgents} icon={Bot} accent="text-purple-500" />
            <StatCard title="Total Calls" value={data.totalCalls} subtitle={`${data.callsToday} today`} icon={Phone} accent="text-cyan-500" />
            <StatCard title="Pipeline Leads" value={data.totalLeads} subtitle={`${data.pipelineLeads} today`} icon={UserPlus} accent="text-amber-500" />
            <StatCard title="Conversations" value={data.totalConversations} subtitle={`${data.conversations} today`} icon={MessagesSquare} accent="text-pink-500" />
            <StatCard title="Call Success" value={data.serviceMetrics.callSuccessRate} subtitle={`avg ${data.serviceMetrics.avgCallDuration}`} icon={Activity} accent="text-green-500" />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatCard title="Campaign Queue" value={data.serviceMetrics.campaignQueue} />
            <StatCard title="Lead Enrichment" value={data.serviceMetrics.leadEnrichment} />
            <StatCard title="Active Campaigns" value={data.activeCampaigns} />
            <StatCard title="Calls Today" value={data.callsToday} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <DonutChart title="Tenants by Plan" data={data.tenantsByPlan} />
            <DonutChart title="Voice Call Status" data={data.voiceCallStatus} />
            <DonutChart title="Campaign Status" data={data.campaignDistribution} />
          </div>

          {data.generatedAt ? (
            <p className="mt-4 text-right text-xs text-gray-400">
              Updated {new Date(data.generatedAt).toLocaleString()}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
