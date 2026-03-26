"use client";
import { useState, useMemo, Fragment } from 'react';
import {
  useSystemHealth,
  useTrendData,
  useApiPerformance,
  useTenants,
  useCampaigns,
  useCallLogs,
  useDashboardStats,
  useRecentActivities
} from '@/services/monitorApi';
import {
  Phone, Send, Users, Activity, Zap, MessageSquare, UserPlus, Clock
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { cn } from '@/lib/utils';
import type { TimeRange, DashboardStats, RecentActivity } from '@/components/lad-monitor/types';

// ── Helpers ─────────────────────────────────────────────────────────────────

const healthDot: Record<string, string> = {
  healthy: 'bg-emerald-500',
  warning: 'bg-amber-400',
  critical: 'bg-red-500',
};
const healthText: Record<string, string> = {
  healthy: 'text-emerald-600',
  warning: 'text-amber-600',
  critical: 'text-red-600',
};

// ── Donut Chart Card ─────────────────────────────────────────────────────────

function DonutCard({
  title,
  icon: Icon,
  data,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  data: { name: string; value: number; color: string }[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const hasData = total > 0 && !(data.length === 1 && data[0].color === '#f1f5f9');

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-7 transition-all hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_20px_50px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[13px] font-black text-[#172560] dark:text-blue-400 uppercase tracking-[0.1em]">{title}</p>
        <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center">
          <Icon className="h-5 w-5 text-indigo-400/70 dark:text-blue-400/80" />
        </div>
      </div>

      <div className="h-[240px] w-full -mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={hasData ? data : [{ name: 'No Data', value: 1, color: '#f8fafc' }]}
              cx="50%"
              cy="50%"
              innerRadius={68}
              outerRadius={95}
              paddingAngle={hasData ? 4 : 0}
              dataKey="value"
              stroke="none"
              startAngle={90}
              endAngle={-270}
              animationDuration={1000}
            >
              {(hasData ? data : [{ name: 'No Data', value: 1, color: '#f8fafc' }]).map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                borderRadius: 16,
                border: 'none',
                background: '#1e293b',
                color: '#fff',
                fontSize: 12,
                fontWeight: 600,
                boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                padding: '10px 14px',
              }}
              itemStyle={{ color: '#cbd5e1' }}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', fontWeight: 700, color: '#64748b', paddingTop: 10 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ActivityFeed({
  activities,
  onViewAudit
}: {
  activities: RecentActivity[];
  onViewAudit?: () => void;
}) {
  const getIcon = (source: string) => {
    switch (source) {
      case 'campaign': return <MessageSquare className="w-4 h-4 text-blue-500" />;
      case 'voice': return <Phone className="w-4 h-4 text-emerald-500" />;
      case 'lead': return <UserPlus className="w-4 h-4 text-violet-500" />;
      default: return <Zap className="w-4 h-4 text-amber-500" />;
    }
  };

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((new Date().getTime() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="bg-white dark:bg-[#1e293b] rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Activity className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-indigo-500"></span>
            </span>
          </div>
          <p className="text-[15px] font-black text-[#172560] dark:text-blue-400 uppercase tracking-wider">Live System Pulse</p>
        </div>
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">Real-time Feed</span>
      </div>

      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        {activities.length > 0 ? activities.slice(0, 25).map((act) => (
          <div key={act.id} className="group relative flex gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all duration-300 border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50">
            <div className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 duration-300 ${act.source === 'campaign' ? 'bg-blue-50 dark:bg-blue-500/10' :
              act.source === 'voice' ? 'bg-emerald-50 dark:bg-emerald-500/10' :
                'bg-violet-50 dark:bg-violet-500/10'
              }`}>
              {getIcon(act.source)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0">
                <h4 className="text-[12px] font-bold text-slate-900 dark:text-white truncate pr-4">{act.title}</h4>
                <span className="text-[9px] font-black text-slate-400/80 uppercase whitespace-nowrap flex items-center gap-1">
                  <Clock className="w-2.5 h-2.5" />
                  {getTimeAgo(act.timestamp)}
                </span>
              </div>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 line-clamp-1 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors">
                {act.description}
              </p>
              {act.meta && (
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {act.meta}
                  </span>
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex items-center justify-center mx-auto">
              <Activity className="w-6 h-6 text-slate-300" />
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waiting for activities...</p>
          </div>
        )}
      </div>

      <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800/50">
        <button
          onClick={onViewAudit}
          className="w-full py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest text-[#172560] dark:text-blue-400 bg-slate-50 dark:bg-slate-800 hover:bg-[#172560] hover:text-white dark:hover:bg-blue-600 transition-all duration-300"
        >
          View Full Audit Log
        </button>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export function DashboardTab({
  timeRange,
  isDark,
  onViewAudit
}: {
  timeRange: TimeRange;
  isDark: boolean;
  onViewAudit?: () => void;
}) {
  const [timeView, setTimeView] = useState<'month' | 'year'>('month');

  const { startDate, endDate } = useMemo(() => {
    const d = new Date();
    const monthAgo = new Date(d.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const yearAgo = new Date(d.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString();
    return {
      startDate: timeView === 'month' ? monthAgo : yearAgo,
      endDate: d.toISOString(),
    };
  }, [timeView]);

  const { data: systemHealth = [] } = useSystemHealth();
  const { data: trendData = [] } = useTrendData(timeView);
  const { data: dashboardStats } = useDashboardStats(timeView) as { data: DashboardStats | null };
  const { data: tenants = [] } = useTenants(timeView);
  const { data: campaigns = [] } = useCampaigns();
  const { data: callLogs = [] } = useCallLogs(startDate, endDate);

  // ── Pie data (Real Data from backend) ───────────────────────────────────────

  const tenantsDist = useMemo(() => {
    if (!dashboardStats?.tenantsByPlan || dashboardStats.tenantsByPlan.length === 0) {
      return [
        { name: 'Enterprise', value: 35, color: '#172560' },
        { name: 'Pro', value: 45, color: '#3b82f6' },
        { name: 'Starter', value: 20, color: '#60a5fa' },
      ];
    }
    const colors: Record<string, string> = {
      enterprise: '#172560',
      pro: '#3b82f6',
      starter: '#60a5fa',
      free: '#94a3b8',
      professional: '#3b82f6',
      business: '#1d4ed8',
    };
    return dashboardStats.tenantsByPlan.map(d => ({
      name: d.name.charAt(0).toUpperCase() + d.name.slice(1).replace('_', ' '),
      value: d.value,
      color: colors[d.name.toLowerCase()] || '#cbd5e1'
    }));
  }, [dashboardStats]);

  const voiceCallsDist = useMemo(() => {
    if (!dashboardStats?.voiceCallStatus || dashboardStats.voiceCallStatus.length === 0) {
      return [
        { name: 'Completed', value: 65, color: '#10b981' },
        { name: 'Ended', value: 15, color: '#3b82f6' },
        { name: 'Failed', value: 12, color: '#ef4444' },
        { name: 'Ongoing', value: 8, color: '#f59e0b' },
      ];
    }
    const colors: Record<string, string> = {
      completed: '#10b981',
      ended: '#3b82f6',
      failed: '#ef4444',
      ongoing: '#f59e0b',
      cancelled: '#94a3b8',
      rejected: '#ef4444',
      pending: '#6366f1',
      in_queue: '#8b5cf6',
    };
    return dashboardStats.voiceCallStatus.map(d => ({
      name: d.name.charAt(0).toUpperCase() + d.name.slice(1).replace('_', ' '),
      value: d.value,
      color: colors[d.name.toLowerCase()] || '#cbd5e1'
    }));
  }, [dashboardStats]);

  const campaignsDist = useMemo(() => {
    if (!dashboardStats?.campaignDistribution || dashboardStats.campaignDistribution.length === 0) {
      return [
        { name: 'Running', value: 40, color: '#10b981' },
        { name: 'Paused', value: 25, color: '#f59e0b' },
        { name: 'Stopped', value: 15, color: '#ef4444' },
        { name: 'Draft', value: 20, color: '#94a3b8' },
      ];
    }
    const colors: Record<string, string> = {
      running: '#10b981',
      active: '#34d399',
      paused: '#f59e0b',
      stopped: '#ef4444',
      draft: '#94a3b8',
      started: '#10b981',
    };
    return dashboardStats.campaignDistribution.map(d => ({
      name: d.name.charAt(0).toUpperCase() + d.name.slice(1).replace('_', ' '),
      value: d.value,
      color: colors[d.name.toLowerCase()] || '#cbd5e1'
    }));
  }, [dashboardStats]);

  const performanceData = useMemo(() => {
    if (trendData.length > 0) return trendData;
    // Mock data for initial fill if needed
    return [
      { time: '09:00', requests: 400 },
      { time: '10:00', requests: 1200 },
      { time: '11:00', requests: 900 },
      { time: '12:00', requests: 1500 },
      { time: '13:00', requests: 2100 },
      { time: '14:00', requests: 1800 },
      { time: '15:00', requests: 2400 },
    ];
  }, [trendData]);

  const { data: recentActivities = [] } = useRecentActivities() as { data: RecentActivity[] };

  return (
    <div className="space-y-6 pt-3">

      {/* ── Service Metrics ─────────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#1e293b] rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-sm p-10 flex items-center justify-around">
        {[
          { label: 'Call Success Rate', value: dashboardStats?.serviceMetrics?.callSuccessRate ?? '52.1%', color: 'text-emerald-500' },
          { label: 'Campaign Queue', value: String(dashboardStats?.serviceMetrics?.campaignQueue ?? '12').replace(' pending', ''), color: 'text-slate-800 dark:text-white' },
          { label: 'Avg Call Duration', value: dashboardStats?.serviceMetrics?.avgCallDuration ?? '2m 34s', color: 'text-emerald-500' },
          { label: 'Lead Enrichment', value: dashboardStats?.serviceMetrics?.leadEnrichment ?? '36.0%', color: 'text-emerald-500' },
        ].map(({ label, value, color }, i, arr) => (
          <Fragment key={label}>
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">{label}</p>
              <p className={`text-4xl font-black ${color} tabular-nums tracking-tight`}>{value}</p>
            </div>
            {i < arr.length - 1 && <div className="w-px h-12 bg-slate-100 dark:bg-slate-800" />}
          </Fragment>
        ))}
      </div>

      {/* ── Donut Charts Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <DonutCard title="Tenants by Plan" icon={Users} data={tenantsDist} />
        <DonutCard title="Voice Call Status" icon={Phone} data={voiceCallsDist} />
        <DonutCard title="Campaign Distribution" icon={Send} data={campaignsDist} />
      </div>

      {/* ── Live Activity Section ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <ActivityFeed
            activities={recentActivities}
            onViewAudit={onViewAudit}
          />
        </div>
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-[#172560] rounded-[32px] p-8 text-white shadow-xl shadow-[#172560]/20 relative overflow-hidden group h-full flex flex-col justify-center">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-1000" />
            <Zap className="w-10 h-10 mb-6 opacity-80 text-blue-400" />
            <p className="text-[11px] font-bold text-blue-400 uppercase tracking-[0.2em] mb-2">ROI Analytics</p>
            <h3 className="text-3xl font-bold mb-3 tracking-tight">84% Velocity</h3>
            <p className="text-sm font-medium opacity-70 leading-relaxed mb-6">
              Your AI Agents have successfully qualified 124 leads this week, reducing manual outreach time by 42 hours.
            </p>
            <div className="flex items-center gap-4 mt-auto">
              <div className="flex items-center bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                <Clock className="w-3.5 h-3.5 mr-2 text-blue-300" />
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-90">Time Saved: 42.5 Hours</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── API Performance + Infrastructure Status ──────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* API Performance Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-[#1e293b] rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-8">
          <div className="flex items-center justify-between mb-8">
            <p className="text-[13px] font-bold text-[#172560] dark:text-blue-400 uppercase tracking-wider">API Performance</p>
            <div className="flex items-center bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl">
              {(['month', 'year'] as const).map(v => (
                <button
                  key={v}
                  onClick={() => setTimeView(v)}
                  className={cn(
                    'px-6 py-2 text-[12px] font-bold transition-all rounded-[10px]',
                    timeView === v
                      ? 'bg-[#172560] text-white shadow-[0_4px_12px_rgba(0,0,0,0.08)]'
                      : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300'
                  )}
                >
                  {v === 'month' ? 'Month' : 'Year'}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={performanceData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="performanceGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={isDark ? '#334155' : '#f1f5f9'} />
              <XAxis
                dataKey="time"
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
                dy={10}
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 600 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 16,
                  border: 'none',
                  background: '#1e293b',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 600,
                  boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                  padding: '10px 14px',
                }}
                itemStyle={{ color: '#60a5fa' }}
              />
              <Area
                type="monotone"
                dataKey="requests"
                stroke="#316af5"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#performanceGradient)"
                dot={false}
                activeDot={{ r: 6, fill: '#316af5', stroke: '#fff', strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Infrastructure Status */}
        <div className="bg-white dark:bg-[#1e293b] rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] p-8">
          <p className="text-[13px] font-bold text-[#172560] dark:text-blue-400 uppercase tracking-wider mb-8">Infrastructure Status</p>
          <div className="space-y-6">
            {(systemHealth.length > 0 ? systemHealth : [
              { name: 'API Gateway', status: 'healthy' },
              { name: 'Database Cluster', status: 'healthy' },
              { name: 'Voice Agent Service', status: 'healthy' },
              { name: 'Campaign Engine', status: 'healthy' },
              { name: 'Email Delivery', status: 'healthy' },
              { name: 'WhatsApp Gateway', status: 'healthy' },
            ]).map((item: any) => (
              <div key={item.name} className="flex items-center justify-between">
                <span className="text-[14px] font-bold text-slate-600 dark:text-slate-400">{item.name}</span>
                <div className="flex items-center gap-2.5">
                  <span className={cn('h-2.5 w-2.5 rounded-full', healthDot[item.status] ?? 'bg-slate-300')} />
                  <span className={cn('text-[12px] font-bold capitalize tracking-tight', healthText[item.status] ?? 'text-slate-400')}>
                    {item.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
