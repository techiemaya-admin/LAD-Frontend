"use client";
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { monitorApi as api } from '@/services/monitorApi';
import { useTenants, useDashboardStats, useCampaigns, useVoiceAgents, useCallLogs } from '@/services/monitorApi';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MetricCard } from '@/components/lad-monitor/components/MetricCard';
import { StatusBadge } from '@/components/lad-monitor/components/StatusBadge';
import type { Tenant, TenantPlan, TenantUser, UserRole, UserStatus, TimeRange } from '@/components/lad-monitor/types';
import {
  Search, Plus, ArrowLeft, Users, Send, MessageSquare, Phone,
  Bot, ChevronRight, Trash2,
  Stethoscope, Pencil, Eye, EyeOff,
  ChevronsLeft, ChevronLeft, ChevronsRight, ChevronsRight as ChevronsRightIcon,
  RotateCcw, Volume2, Copy, Sparkles,
  Wallet, ExternalLink, Download, BarChart2, TrendingUp, Calendar, ArrowUpRight, PlusCircle,
  Play, Linkedin, Mail, Instagram, MessageCircle, Video,
  PhoneCall, PhoneOff, PhoneIncoming, Clock, Flame, Sun, Snowflake, Contact,
  ChevronDown, PhoneForwarded, ClipboardList,
  BookUser, ShieldCheck, Link as LinkIcon, Coins, CheckCircle2
} from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';

const planColor: Record<TenantPlan, string> = {
  free: 'text-green-700 bg-green-50 border-green-200',
  trial: 'text-amber-700 bg-amber-50 border-amber-200',
  starter: 'text-slate-600 bg-slate-100 border-slate-200',
  pro: 'text-blue-700 bg-blue-50 border-blue-200',
  enterprise: 'text-purple-700 bg-purple-50 border-purple-200',
  professional: 'text-indigo-700 bg-indigo-50 border-indigo-200',
  business: 'text-cyan-700 bg-cyan-50 border-cyan-200',
  enterprise_starter: 'text-purple-700 bg-purple-50 border-purple-200',
  enterprise_professional: 'text-purple-700 bg-purple-50 border-purple-200',
  enterprise_business: 'text-purple-700 bg-purple-50 border-purple-200',
};

const LiIcon = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

const roleColor: Record<UserRole, string> = {
  admin: 'bg-red-50 text-red-700 border-red-200',
  manager: 'bg-blue-50 text-blue-700 border-blue-200',
  agent: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  viewer: 'bg-muted text-muted-foreground',
};

const statusColor: Record<UserStatus, string> = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-red-50 text-red-700 border-red-200',
};


function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function PaginationBar({ total, pageSize, setPageSize, currentPage, setCurrentPage, noun = 'rows' }: { total: number; pageSize: number; setPageSize: (v: number) => void; currentPage: number; setCurrentPage: (v: number) => void; noun?: string }) {
  const totalPages = Math.ceil(total / pageSize);
  if (total === 0) return null;

  return (
    <div className="flex items-center justify-between px-5 py-4 bg-white dark:bg-[#1e293b] border-t border-slate-100 dark:border-slate-800">
      <div className="text-[13px] font-medium text-slate-400">
        Showing <span className="text-slate-600 dark:text-slate-300 font-bold">{((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)}</span> of <span className="text-slate-600 dark:text-slate-300 font-bold">{total}</span> {noun}
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <span className="text-[13px] font-medium text-slate-400">Page size:</span>
          <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setCurrentPage(1); }}>
            <SelectTrigger className="h-8 w-[70px] text-[12px] font-bold rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white focus:ring-0">
              <SelectValue placeholder={pageSize} />
            </SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
              {[10, 20, 50, 100].map(sz => (
                <SelectItem key={sz} value={String(sz)} className="text-xs font-bold">{sz}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[13px] font-medium text-slate-400">Page <span className="text-slate-800 dark:text-white font-bold">{currentPage}</span> of <span className="text-slate-800 dark:text-white font-bold">{totalPages}</span></span>
          <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden shadow-sm">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-slate-50 dark:hover:bg-slate-800 border-r border-slate-100 dark:border-slate-700 disabled:opacity-20" disabled={currentPage === 1} onClick={() => setCurrentPage(1)}><ChevronsLeft className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-slate-50 dark:hover:bg-slate-800 border-r border-slate-100 dark:border-slate-700 disabled:opacity-20" disabled={currentPage === 1} onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}><ChevronLeft className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-slate-50 dark:hover:bg-slate-800 border-r border-slate-100 dark:border-slate-700 disabled:opacity-20" disabled={currentPage === totalPages} onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}><ChevronRight className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-none hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-20" disabled={currentPage === totalPages} onClick={() => setCurrentPage(totalPages)}><ChevronsRight className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CallLogsTab({ tenantId }: { tenantId: string }) {
  const today = new Date().toISOString().split('T')[0];
  const yearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const { data: rawData, isLoading } = useCallLogs(yearAgo, today, tenantId);
  const rawCalls = rawData || [];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const calls = Array.isArray(rawCalls) ? rawCalls : (
    (rawCalls as any)?.rows ||
    (rawCalls as any)?.data ||
    (rawCalls as any)?.calls ||
    (rawCalls as any)?.items ||
    []
  );
  const srv = (!Array.isArray(rawCalls) && rawCalls && typeof rawCalls === 'object') ? (rawCalls as any) : null;

  // Always compute from actual row data — server pre-computed counts can be stale
  const COMPLETED = new Set(['completed', 'ended', 'success', 'answered', 'connected']);
  const FAILED = new Set(['failed', 'error', 'no-answer', 'no_answer', 'busy', 'rejected', 'cancelled', 'canceled']);
  const ONGOING = new Set(['in-progress', 'in_progress', 'active', 'ongoing', 'ringing', 'initiated']);
  const QUEUED = new Set(['queued', 'waiting', 'in_queue']);

  const totalCalls = srv?.total ?? calls.length;
  const completedCalls = calls.filter((c: any) => COMPLETED.has((c.status || '').toLowerCase())).length;
  const failedCalls = calls.filter((c: any) => FAILED.has((c.status || '').toLowerCase())).length;
  const ongoing = calls.filter((c: any) => ONGOING.has((c.status || '').toLowerCase())).length;
  const ended = calls.filter((c: any) => (c.status || '').toLowerCase() === 'ended').length;
  const queue = calls.filter((c: any) => QUEUED.has((c.status || '').toLowerCase())).length;

  const getTemp = (c: any) => (c.leadTemp || c.temperature || c.leadCategory || c.lead_category || c.analysis_lead_category || c.lead_temp || c.temp || '').toLowerCase();
  const hotLeads = calls.filter((c: any) => getTemp(c).includes('hot')).length;
  const warmLeads = calls.filter((c: any) => getTemp(c).includes('warm')).length;
  const coldLeads = calls.filter((c: any) => getTemp(c).includes('cold')).length;

  const filtered = calls.filter((c: any) => {
    const sm = !search ||
      (c.agentName || c.agent_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.leadName || c.lead_name || '').toLowerCase().includes(search.toLowerCase()) ||
      (c.status || '').toLowerCase().includes(search.toLowerCase());
    const fm = statusFilter === 'all' || (c.status || '').toLowerCase() === statusFilter;
    return sm && fm;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const paged = filtered.slice(pageStart, pageStart + pageSize);

  const fmtStarted = (v: any) => {
    if (!v) return '-';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const CLStatCard = ({ label, value, iconBg, iconColor, icon: IconComponent }: { label: string; value: number | string; iconBg: string; iconColor: string; icon: any }) => (
    <div className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100/60 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between min-h-[120px] transition-all duration-300 hover:shadow-md hover:-translate-y-1">
      <div className="flex justify-end">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg} ${iconColor} dark:bg-opacity-10 transition-transform duration-300 group-hover:scale-110`}>
          <IconComponent className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{value}</p>
      </div>
    </div>
  );

  const StatusBadgeCL = ({ status }: { status: string }) => {
    const s = (status || '').toLowerCase();
    const cfg: Record<string, { cls: string; dot: string; label: string }> = {
      completed: { cls: 'bg-[#ECFDF5] text-[#059669] border-[#D1FAE5]', dot: 'bg-[#10B981]', label: 'Completed' },
      success: { cls: 'bg-[#ECFDF5] text-[#059669] border-[#D1FAE5]', dot: 'bg-[#10B981]', label: 'Completed' },
      ended: { cls: 'bg-slate-50 text-slate-600 border-slate-200', dot: 'bg-slate-400', label: 'Ended' },
      failed: { cls: 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]', dot: 'bg-[#EF4444]', label: 'Failed' },
      error: { cls: 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]', dot: 'bg-[#EF4444]', label: 'Failed' },
      'no-answer': { cls: 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]', dot: 'bg-[#EF4444]', label: 'No Answer' },
      busy: { cls: 'bg-[#FEF2F2] text-[#DC2626] border-[#FEE2E2]', dot: 'bg-[#EF4444]', label: 'Busy' },
      'in-progress': { cls: 'bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]', dot: 'bg-[#3B82F6]', label: 'In Progress' },
      active: { cls: 'bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]', dot: 'bg-[#3B82F6]', label: 'Active' },
      ringing: { cls: 'bg-[#EFF6FF] text-[#2563EB] border-[#DBEAFE]', dot: 'bg-[#3B82F6]', label: 'Ringing' },
      queued: { cls: 'bg-[#FFF9F2] text-[#D97706] border-[#FEF3C7]', dot: 'bg-[#F59E0B]', label: 'Queued' },
    };
    const c = cfg[s] || { cls: 'bg-slate-50 text-slate-500 border-slate-200', dot: 'bg-slate-400', label: status || '-' };
    return <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full border ${c.cls}`}><span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />{c.label}</span>;
  };

  const TypeBadgeCL = ({ type }: { type: string }) => {
    const t = (type || 'outbound').toLowerCase();
    return <span className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1 rounded-full bg-[#FFF9F2] text-[#D97706] border border-[#FEF3C7]">
      <PhoneForwarded className="h-3 w-3" />
      {t === 'outbound' ? 'Outbound' : 'Inbound'}
    </span>;
  };

  const TempBadge = ({ temp }: { temp: string }) => {
    const t = getTemp({ leadTemp: temp, temperature: temp, leadCategory: temp, analysis_lead_category: temp });
    const cfg: Record<string, { cls: string; dot: string; label: string }> = {
      hot: { cls: 'text-[#DC2626] bg-[#FEF2F2] border-[#FEE2E2]', dot: 'bg-[#EF4444]', label: 'Hot' },
      warm: { cls: 'text-[#D97706] bg-[#FFF9F2] border-[#FEF3C7]', dot: 'bg-[#F59E0B]', label: 'Warm' },
      cold: { cls: 'text-[#2563EB] bg-[#EFF6FF] border-[#DBEAFE]', dot: 'bg-[#3B82F6]', label: 'Cold' },
    };
    const key = Object.keys(cfg).find(k => t.includes(k));
    const c = key ? cfg[key] : { cls: 'text-[#64748B] bg-[#F8FAFC] border-[#E2E8F0]', dot: 'bg-[#94A3B8]', label: 'Unknc' };
    return <span className={`inline-flex items-center justify-between gap-1.5 min-w-[90px] text-[11px] font-bold px-3 py-1 rounded-full border ${c.cls}`}>
      <div className="flex items-center gap-1.5">
        <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
        {c.label}
      </div>
      <ChevronDown className="h-3 w-3 opacity-50" />
    </span>;
  };

  return (
    <div className="space-y-5">
      {/* Stat cards — row 1 */}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <CLStatCard label="Total Calls" value={totalCalls} iconBg="bg-blue-50" iconColor="text-blue-500" icon={Contact} />
        <CLStatCard label="Completed Calls" value={completedCalls} iconBg="bg-green-50" iconColor="text-green-500" icon={PhoneCall} />
        <CLStatCard label="Failed Calls" value={failedCalls} iconBg="bg-red-50" iconColor="text-red-500" icon={PhoneOff} />
        <CLStatCard label="Ongoing" value={ongoing} iconBg="bg-purple-50" iconColor="text-purple-500" icon={PhoneIncoming} />
        <CLStatCard label="Queue" value={queue} iconBg="bg-amber-50" iconColor="text-amber-500" icon={Clock} />
        <CLStatCard label="Hot Leads" value={hotLeads} iconBg="bg-orange-50" iconColor="text-orange-500" icon={Flame} />
        <CLStatCard label="Warm Leads" value={warmLeads} iconBg="bg-yellow-50" iconColor="text-yellow-500" icon={Sun} />
        <CLStatCard label="Cold Leads" value={coldLeads} iconBg="bg-cyan-50" iconColor="text-cyan-500" icon={Snowflake} />
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1e293b] overflow-hidden">
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input className="pl-9 pr-4 h-9 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-52 focus:outline-none focus:ring-1 focus:ring-[#172560] dark:focus:ring-blue-500 placeholder:text-slate-400 dark:text-white" placeholder="Search Call Logs..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-9 w-32 rounded-xl border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 dark:text-white"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="in-progress">In Progress</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
              <TableHead className="w-12 px-5 py-4"><Checkbox /></TableHead>
              <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Serial No</TableHead>
              <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Agent</TableHead>
              <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Lead</TableHead>
              <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Type</TableHead>
              <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Status</TableHead>
              <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Started</TableHead>
              <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight text-center">Duration</TableHead>
              <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Tags</TableHead>
              <TableHead className="py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tight">Cost</TableHead>
              <TableHead className="w-12 px-5 py-4"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={9} className="text-center text-slate-400 py-12 text-sm">Loading...</TableCell></TableRow>
            ) : paged.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="text-center text-slate-400 py-12 text-sm">No calls found</TableCell></TableRow>
            ) : paged.map((c: any, i: number) => (
              <TableRow key={c.id || i} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-50 dark:border-slate-800/50">
                <TableCell className="px-5 py-3.5"><Checkbox /></TableCell>
                <TableCell className="py-3.5 text-xs font-medium text-slate-400 dark:text-slate-500 tabular-nums">{pageStart + i + 1}</TableCell>
                <TableCell className="py-3.5 text-sm font-bold text-slate-800 dark:text-white">{c.agentName || c.agent_name || c.voice_agent_name || '-'}</TableCell>
                <TableCell className="py-3.5">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-slate-800 dark:text-white leading-tight">{c.leadName || c.lead_name || '-'}</span>
                    {(c.campaignName || c.campaign_name || c.initiatorName) && (
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                        <span className="truncate max-w-[120px]">{c.campaignName || c.campaign_name || c.initiatorName}</span>
                        <Copy className="h-2.5 w-2.5 cursor-pointer hover:text-indigo-600 dark:hover:text-blue-400 transition-colors" />
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell className="py-3.5"><TypeBadgeCL type={c.type || c.call_type || c.direction || 'outbound'} /></TableCell>
                <TableCell className="py-3.5"><StatusBadgeCL status={c.status || '-'} /></TableCell>
                <TableCell className="py-3.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">{fmtStarted(c.startedAt || c.started_at || c.created_at || c.createdAt)}</TableCell>
                <TableCell className="py-3.5 text-[13px] font-bold tabular-nums text-slate-700 dark:text-slate-300 text-center">{formatDuration(c.duration || c.duration_seconds || c.call_duration)}</TableCell>
                <TableCell className="py-3.5"><TempBadge temp={c.leadTemp || c.temperature || c.leadCategory || c.lead_category || c.analysis_lead_category || c.lead_temp || c.temp || ''} /></TableCell>
                <TableCell className="py-3.5 text-sm font-bold tabular-nums text-slate-800 dark:text-white">{c.cost ? `$${parseFloat(c.cost).toFixed(2)}` : '$0.00'}</TableCell>
                <TableCell className="px-5 py-3.5 text-right"><ClipboardList className="h-4 w-4 text-slate-400 dark:text-slate-500 cursor-pointer hover:text-[#172560] dark:hover:text-blue-400 transition-colors" /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length > 0 && (
          <PaginationBar
            total={filtered.length}
            pageSize={pageSize}
            setPageSize={setPageSize}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            noun="calls"
          />
        )}
      </div>
    </div>
  );
}
function CampaignsTab({ tenant }: { tenant: Tenant }) {
  const cs = tenant.campaignStats;
  const allCampaigns = (tenant.campaignsList || []) as any[];
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  const totalCampaigns = cs?.totalCampaigns ?? allCampaigns.length;
  const activeCampaigns = cs?.activeCampaigns ?? allCampaigns.filter((c: any) => ['running', 'active'].includes((c.status || '').toLowerCase())).length;
  const totalLeads = cs?.totalLeadsGenerated ?? allCampaigns.reduce((s: number, c: any) => s + (c.leads || 0), 0);
  const connSent = cs?.connectionRequestsSent || allCampaigns.reduce((s: number, c: any) => s + (c.sent || 0), 0);
  const totalReplied = allCampaigns.reduce((s: number, c: any) => s + (c.replied || 0), 0);
  const replyRate = cs?.replyRate ?? (connSent > 0 ? (totalReplied / connSent) * 100 : 0);

  const filtered = allCampaigns.filter((c: any) => {
    const nameMatch = !search || (c.name || '').toLowerCase().includes(search.toLowerCase());
    const statusMatch = statusFilter === 'all' || (c.status || '').toLowerCase() === statusFilter.toLowerCase();
    return nameMatch && statusMatch;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (currentPage - 1) * pageSize;
  const paged = filtered.slice(pageStart, pageStart + pageSize);

  const fmtCDate = (v: any) => {
    if (!v || v === '-') return '-';
    const d = new Date(v);
    if (isNaN(d.getTime())) return '-';
    return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
  };

  const LinkedInIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );

  const InstagramIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="#e1306c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
  );

  const WhatsAppIcon = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 1 1 0 0 1 1.1 1.1 8.38 8.38 0 0 1 7.4 6.8z" />
    </svg>
  );

  const statuses = Array.from(new Set(allCampaigns.map((c: any) => (c.status || 'unknown'))));

  const CStatCard = ({ label, value, iconBg, iconColor, icon: IconComponent }: { label: string; value: string | number; iconBg: string; iconColor: string; icon: any }) => (
    <div className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100/60 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between min-h-[120px] transition-all duration-300 hover:shadow-md hover:-translate-y-1">
      <div className="flex justify-end">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${iconBg} ${iconColor} dark:bg-opacity-10 transition-transform duration-300 group-hover:scale-110`}>
          <IconComponent className="w-5 h-5" />
        </div>
      </div>
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{value}</p>
      </div>
    </div>
  );

  const CStatusBadge = ({ status }: { status: string }) => {
    const s = (status || '').toLowerCase();
    const isPaused = s === 'paused' || s === 'unknown' || !s;
    return (
      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter ${!isPaused ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>
        {isPaused ? (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
        ) : (
          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
        )}
        {status || 'Paused'}
      </span>
    );
  };

  const CPill = ({ value, color, icon, label }: { value: any; color: string; icon?: React.ReactNode; label?: string }) => (
    <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-md border ${color}`}>
      {icon}
      {label && <span>{label}</span>}
      <span>{value}</span>
    </span>
  );



  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-4">
        <CStatCard label="Total Campaigns" value={totalCampaigns} iconBg="bg-blue-50/50" iconColor="text-blue-600" icon={BarChart2} />
        <CStatCard label="Active Campaigns" value={activeCampaigns} iconBg="bg-emerald-50/50" iconColor="text-emerald-600" icon={Play} />
        <CStatCard label="Total Leads Generated" value={totalLeads} iconBg="bg-purple-50/50" iconColor="text-purple-600" icon={Users} />
        <CStatCard label="Connection Requests Sent" value={connSent || 0} iconBg="bg-sky-50/50" iconColor="text-sky-600" icon={LinkedInIcon} />
        <CStatCard label="Reply Rate" value={`${replyRate.toFixed(1)}%`} iconBg="bg-amber-50/50" iconColor="text-amber-600" icon={Mail} />
        <CStatCard label="Instagram Connection Rate" value="0.0%" iconBg="bg-pink-50/50" iconColor="text-pink-600" icon={InstagramIcon} />
        <CStatCard label="WhatsApp Connection Rate" value="0.0%" iconBg="bg-emerald-50/50" iconColor="text-emerald-600" icon={WhatsAppIcon} />
        <CStatCard label="Voice Agent Connection Rate" value="0.0%" iconBg="bg-violet-50/50" iconColor="text-violet-600" icon={Video} />
      </div>

      <div className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1e293b] overflow-hidden">
        <div className="flex items-center justify-end gap-3 px-5 py-4 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input className="pl-9 pr-4 h-9 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 w-52 focus:outline-none focus:ring-1 focus:ring-[#172560] dark:focus:ring-blue-500 placeholder:text-slate-400 dark:text-white" placeholder="Search campaigns..." value={search} onChange={e => { setSearch(e.target.value); setCurrentPage(1); }} />
          </div>
          <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}>
            <SelectTrigger className="h-9 w-32 rounded-xl border-slate-200 dark:border-slate-700 text-sm bg-white dark:bg-slate-800 dark:text-white"><SelectValue placeholder="All Status" /></SelectTrigger>
            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
              <SelectItem value="all">All Status</SelectItem>
              {statuses.map(s => <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/80 dark:bg-slate-800/80 border-b border-slate-100 dark:border-slate-800">
              <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-400 py-3 pl-5">Campaign Name</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-400 py-3">Status</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-400 py-3">Channels</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-400 py-3">Actions</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-400 py-3">Leads</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-400 py-3">Sent</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-400 py-3">Connected</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-400 py-3">Replied</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-400 py-3">Credits Used</TableHead>
              <TableHead className="text-xs font-bold text-slate-600 dark:text-slate-400 py-3">Created</TableHead>
              <TableHead className="py-3 w-8 text-right pr-5"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 ? (
              <TableRow><TableCell colSpan={11} className="text-center text-slate-400 dark:text-slate-500 py-12 text-sm">No campaigns found</TableCell></TableRow>
            ) : paged.map((c: any, i: number) => (
              <TableRow key={c.id || i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 transition-colors border-b border-slate-50 dark:border-slate-800/50">
                <TableCell className="py-3.5 pl-5"><span className="text-[13px] font-semibold text-[#6366f1] dark:text-indigo-400 hover:underline cursor-pointer">{c.name || 'Unknown'}</span></TableCell>
                <TableCell className="py-3.5"><CStatusBadge status={c.status || 'Paused'} /></TableCell>
                <TableCell className="py-3.5">
                  <LinkedInIcon className="w-4 h-4 text-[#0a66c2]" />
                </TableCell>
                <TableCell className="py-3.5">
                  <CPill value={`(3)`} label="LinkedIn" color="text-[#0a66c2] dark:text-blue-400 bg-[#f0f7ff] dark:bg-blue-500/10 border-[#e0efff] dark:border-blue-500/20" />
                </TableCell>
                <TableCell className="py-3.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{c.leads ?? 0}</TableCell>
                <TableCell className="py-3.5 text-[13px] font-semibold text-slate-700 dark:text-slate-200 tabular-nums">{c.sent ?? 0}</TableCell>
                <TableCell className="py-3.5"><CPill value={c.connected ?? 0} color="text-[#0a66c2] dark:text-blue-400 bg-[#f0f7ff] dark:bg-blue-500/10 border-[#e0efff] dark:border-blue-500/20" icon={<LinkedInIcon className="w-3 h-3" />} /></TableCell>
                <TableCell className="py-3.5"><CPill value={c.replied ?? 0} color="text-[#0a66c2] dark:text-blue-400 bg-[#f0f7ff] dark:bg-blue-500/10 border-[#e0efff] dark:border-blue-500/20" icon={<LinkedInIcon className="w-3 h-3" />} /></TableCell>
                <TableCell className="py-3.5">
                  <div className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-orange-500 fill-orange-500/10" />
                    <span className="text-[13px] font-bold text-slate-700 dark:text-slate-200 tabular-nums">{c.creditsUsed ?? 0}</span>
                  </div>
                </TableCell>
                <TableCell className="py-3.5 text-[13px] text-slate-500 dark:text-slate-400 whitespace-nowrap tabular-nums">{fmtCDate(c.createdAt)}</TableCell>
                <TableCell className="py-3.5 text-right pr-5"><button className="text-slate-400 hover:text-slate-700 dark:hover:text-white p-1 rounded transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="1.5" /><circle cx="12" cy="12" r="1.5" /><circle cx="12" cy="19" r="1.5" /></svg></button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {filtered.length > 0 && (
          <PaginationBar
            total={filtered.length}
            pageSize={pageSize}
            setPageSize={setPageSize}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            noun="campaigns"
          />
        )}
      </div>
    </div>
  );
}

// ─── Pipeline Tab ─────────────────────────────────────────────────────────────

/** Normalize a stage value to match the STAGE_OPTIONS list */
function normalizeStage(raw: string | undefined | null): string {
  const s = (raw || '').trim();
  const map: Record<string, string> = {
    new: 'New', contacted: 'Contacted', qualified: 'Qualified',
    proposal: 'Proposal', negotiation: 'Negotiation',
    'closed won': 'Closed Won', 'closed lost': 'Closed Lost',
    won: 'Closed Won', lost: 'Closed Lost',
  };
  return map[s.toLowerCase()] ?? (s || 'New');
}

/** Normalize a status value */
function normalizeStatus(raw: string | undefined | null): string {
  const s = (raw || '').trim();
  const map: Record<string, string> = {
    active: 'Active', new: 'New', won: 'Won', lost: 'Lost', pending: 'Pending',
  };
  return map[s.toLowerCase()] ?? (s || 'Active');
}

/** Normalize priority — backend returns 'High' / 'Medium' / 'Low' already */
function normalizePriority(raw: string | undefined | null): string {
  const s = (raw || '').trim();
  const map: Record<string, string> = {
    high: 'High', medium: 'Medium', low: 'Low', critical: 'Critical',
    '2': 'High', '1': 'Medium', '0': 'Low',
  };
  return map[s.toLowerCase()] ?? (s || 'Low');
}

/** Format date exactly as M/D/YYYY (e.g. 2/19/2026) matching the reference */
function fmtDate(val: string | null | undefined): string {
  if (!val || val === '-') return '-';
  const d = new Date(val);
  if (isNaN(d.getTime())) return '-';
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`;
}

/** LinkedIn source badge — exactly like reference screenshot */
const LinkedInBadge = () => (
  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 border border-blue-100 text-[10px] font-bold text-blue-600 whitespace-nowrap">
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect x="2" y="9" width="4" height="12" />
      <circle cx="4" cy="4" r="2" />
    </svg>
    LinkedIn
  </span>
);

/** Render source as a styled badge */
function SourceBadge({ src }: { src: string }) {
  const key = (src || '').toLowerCase();
  if (key.includes('linkedin')) return <LinkedInBadge />;
  if (!src || src === '-') return <span className="text-xs text-slate-400">-</span>;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-600">
      {src}
    </span>
  );
}

const STAGE_OPTIONS = ['New', 'Contacted', 'Qualified', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
const STATUS_OPTIONS = ['All Status', 'New', 'Active', 'Won', 'Lost', 'Pending'];
const PRIORITY_OPTIONS = ['All Priority', 'Low', 'Medium', 'High', 'Critical'];

function PipelineTab({ tenant }: { tenant: Tenant }) {
  const allLeads = (tenant.pipelineLeadsList || []) as any[];

  // Stats — from pre-aggregated campaignStats (comes from analytics aggregate per-tenant)
  // totalLeadsGenerated = leads associated to campaigns (not raw leads table count)
  // connectionRequestsSent, connectionAccepted, messagesSent = direct analytics aggregate
  const cs = tenant.campaignStats;

  // Total Leads in the Pipeline tab = ALL-TIME count (not date-range filtered).
  // pipelineLeadsTotal is the backend all-time count; pipelineLeads is the range-filtered count
  // used only in the main summary boxes.
  const totalLeads = tenant.pipelineLeadsTotal ?? tenant.pipelineLeads ?? allLeads.length;

  // Connection Sent / Success / Message Sent come from the leads table stages (all-time)
  const connectionSent = cs?.connectionRequestsSent ?? 0;
  const successCount = cs?.connectionAccepted ?? 0;
  const messageSent = cs?.messagesSent ?? 0;

  const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [priorityFilter, setPriorityFilter] = useState('All Priority');
  const [sortKey, setSortKey] = useState('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = useState(1);

  const filtered = allLeads
    .filter(l => {
      const name = l.name || '';
      const email = l.email || '';
      const phone = l.phone || '';
      if (search && !name.toLowerCase().includes(search.toLowerCase()) && !email.toLowerCase().includes(search.toLowerCase()) && !phone.includes(search)) return false;
      if (statusFilter !== 'All Status' && normalizeStatus(l.status) !== statusFilter) return false;
      if (priorityFilter !== 'All Priority' && normalizePriority(l.priority) !== priorityFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const va = String(a[sortKey] ?? '');
      const vb = String(b[sortKey] ?? '');
      return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
    });

  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
    setPage(1);
  };

  const SortTh = ({ k, label }: { k: string; label: string }) => (
    <TableHead
      onClick={() => toggleSort(k)}
      className="cursor-pointer select-none hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap py-3"
    >
      <span className="flex items-center gap-1">
        {label}
        <span className="text-slate-300 dark:text-slate-600 text-[10px]">{sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : '↑↓'}</span>
      </span>
    </TableHead>
  );

  /* ── Stat card icons matching the reference screenshot ── */
  const StatCard = ({ label, value, icon: Icon, iconBg, iconColor }: { label: string; value: number; icon: any; iconBg: string; iconColor: string }) => (
    <div className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100/60 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between min-h-[120px] transition-all duration-300 hover:shadow-md hover:-translate-y-1">
      <div className="flex justify-end">
        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center dark:bg-opacity-10 transition-transform duration-300 group-hover:scale-110 shadow-sm", iconBg, iconColor)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div>
        <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400 mb-1">{label}</p>
        <p className="text-2xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{value.toLocaleString()}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 dark:text-white">Deals Pipeline</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Manage your leads and deals for {tenant.name}</p>
      </div>

      {/* ── Stat Cards — 4 columns, icon top-right, big number bottom-left ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard
          label="Total Leads"
          value={totalLeads}
          icon={BookUser}
          iconBg="bg-blue-50"
          iconColor="text-blue-500"
        />
        <StatCard
          label="Connection Sent"
          value={connectionSent}
          icon={LinkIcon}
          iconBg="bg-slate-50 dark:bg-slate-800"
          iconColor="text-slate-500 dark:text-slate-400"
        />
        <StatCard
          label="Success"
          value={successCount}
          icon={ShieldCheck}
          iconBg="bg-emerald-50"
          iconColor="text-emerald-500"
        />
        <StatCard
          label="Message Sent"
          value={messageSent}
          icon={Send}
          iconBg="bg-purple-50"
          iconColor="text-purple-500"
        />
      </div>

      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Kanban / List toggle */}
        <div className="flex items-center border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white dark:bg-slate-800">
          <button
            onClick={() => setViewMode('kanban')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors ${viewMode === 'kanban' ? 'bg-[#172560] dark:bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
            Kanban
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-l border-slate-200 dark:border-slate-700 transition-colors ${viewMode === 'list' ? 'bg-[#172560] dark:bg-blue-600 text-white' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
            List
          </button>
        </div>

        {/* Action buttons */}
        <Button className="h-9 bg-[#172560] dark:bg-blue-600 text-white hover:bg-[#172560]/90 dark:hover:bg-blue-700 text-sm font-semibold rounded-lg">
          <Plus className="h-4 w-4 mr-1.5" /> Add Stage
        </Button>
        <Button className="h-9 bg-[#172560] dark:bg-blue-600 text-white hover:bg-[#172560]/90 dark:hover:bg-blue-700 text-sm font-semibold rounded-lg">
          <Plus className="h-4 w-4 mr-1.5" /> Add Lead
        </Button>

        {/* Right-side: search + filters */}
        <div className="flex-1" />
        <div className="relative w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            className="pl-8 pr-3 h-9 text-sm rounded-lg border border-slate-200 dark:border-slate-700 w-full bg-white dark:bg-slate-800 focus:outline-none focus:ring-1 focus:ring-[#172560]/40 dark:focus:ring-blue-500/40 dark:text-white"
            placeholder="Search leads…"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-[130px] text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="dark:bg-slate-900 dark:border-slate-800">{STATUS_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={priorityFilter} onValueChange={v => { setPriorityFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-[130px] text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 rounded-lg dark:text-white"><SelectValue /></SelectTrigger>
          <SelectContent className="dark:bg-slate-900 dark:border-slate-800">{PRIORITY_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>

      {/* ── List View ── */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                  <SortTh k="name" label="Lead Name" />
                  <SortTh k="email" label="Email" />
                  <SortTh k="phone" label="Phone" />
                  <SortTh k="stage" label="Stage" />
                  <SortTh k="status" label="Status" />
                  <SortTh k="priority" label="Priority" />
                  <SortTh k="amount" label="Amount" />
                  <SortTh k="source" label="Source" />
                  <SortTh k="createdAt" label="Created Date" />
                  <TableHead className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide whitespace-nowrap py-3">Last Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paged.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-slate-400 text-sm">
                      No leads found
                    </TableCell>
                  </TableRow>
                ) : paged.map((l: any, i: number) => {
                  const stage = normalizeStage(l.stage);
                  const status = normalizeStatus(l.status);
                  const priority = normalizePriority(l.priority);
                  // amount already formatted by backend as "$2500" or "-"
                  const amount = l.amount && l.amount !== '-' ? l.amount : '-';

                  return (
                    <TableRow key={l.id || i} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 last:border-b-0 transition-colors">
                      {/* Lead Name */}
                      <TableCell className="py-3 font-bold text-sm text-[#172560] dark:text-blue-400 whitespace-nowrap">
                        {l.name || 'Untitled Lead'}
                      </TableCell>

                      {/* Email */}
                      <TableCell className="py-3 text-sm text-slate-600 dark:text-slate-300 max-w-[200px] truncate">
                        {l.email || '-'}
                      </TableCell>

                      {/* Phone */}
                      <TableCell className="py-3 text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        {l.phone || '-'}
                      </TableCell>

                      {/* Stage — inline select */}
                      <TableCell className="py-3">
                        <Select defaultValue={stage}>
                          <SelectTrigger className="h-7 w-[120px] text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white shadow-none rounded-md">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STAGE_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Status — inline select */}
                      <TableCell className="py-3">
                        <Select defaultValue={status}>
                          <SelectTrigger className="h-7 w-[100px] text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white shadow-none rounded-md">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['New', 'Active', 'Won', 'Lost', 'Pending'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Priority — inline select */}
                      <TableCell className="py-3">
                        <Select defaultValue={priority}>
                          <SelectTrigger className="h-7 w-[100px] text-xs border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 dark:text-white shadow-none rounded-md">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {['Low', 'Medium', 'High', 'Critical'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>

                      {/* Amount */}
                      <TableCell className="py-3 text-sm text-slate-700 whitespace-nowrap">
                        {amount}
                      </TableCell>

                      {/* Source */}
                      <TableCell className="py-3">
                        <SourceBadge src={l.source || ''} />
                      </TableCell>

                      {/* Created Date — M/D/YYYY */}
                      <TableCell className="py-3 text-sm text-slate-500 whitespace-nowrap">
                        {fmtDate(l.createdAt)}
                      </TableCell>

                      {/* Last Activity */}
                      <TableCell className="py-3 text-sm text-slate-400 whitespace-nowrap">
                        {fmtDate(l.lastActivity)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <PaginationBar
            total={filtered.length}
            pageSize={pageSize}
            setPageSize={setPageSize}
            currentPage={page}
            setCurrentPage={setPage}
            noun="leads"
          />
        </div>
      )}

      {/* ── Kanban View ── */}
      {viewMode === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {allLeads.length === 0 && (
            <div className="text-sm text-slate-400 py-10 w-full text-center">No leads found.</div>
          )}
          {Array.from(new Set(allLeads.map((l: any) => normalizeStage(l.stage)))).map(stageName => {
            const stageLeads = allLeads.filter((l: any) => normalizeStage(l.stage) === stageName);
            return (
              <div key={stageName} className="flex-shrink-0 w-72 bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-[#1e293b]">
                  <span className="font-semibold text-sm text-slate-700 dark:text-white">{stageName}</span>
                  <Badge variant="outline" className="text-xs">{stageLeads.length}</Badge>
                </div>
                <div className="p-3 space-y-2 min-h-[120px] max-h-[550px] overflow-y-auto">
                  {stageLeads.map((l: any, i: number) => (
                    <div key={l.id || i} className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-3 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                      <p className="font-semibold text-sm text-[#172560] truncate">{l.name || 'Untitled'}</p>
                      <p className="text-xs text-slate-500 truncate mt-0.5">{l.email || ''}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[11px] text-slate-400">{normalizePriority(l.priority)}</span>
                        <SourceBadge src={l.source || ''} />
                      </div>
                      {l.amount && l.amount !== '-' && (
                        <p className="text-[11px] font-semibold text-slate-600 mt-1">{l.amount}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}

// ─── Voice Agents Management Tab ─────────────────────────────────────────────

function VoiceAgentsManagement({ tenant }: { tenant: Tenant }) {
  const queryClient = useQueryClient();
  const [localAgents, setLocalAgents] = useState(tenant.voiceAgents || []);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(
    localAgents[0]?.id || null
  );
  const [searchQuery, setSearchQuery] = useState('');

  const agents = localAgents;
  const filteredAgents = agents.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isCreating = selectedAgentId === 'new';
  const activeAgent = isCreating
    ? { id: 'new', name: '', gender: 'Female', language: 'en', voiceId: '', instructions: '', systemInstructions: '', provider: 'Vapi', status: 'Active', outboundStarterPrompt: '', inboundStarterPrompt: '' }
    : agents.find(a => a.id === selectedAgentId) || (agents.length > 0 ? agents[0] : null);

  const [formName, setFormName] = useState('');
  const [formGender, setFormGender] = useState('Female');
  const [formLanguage, setFormLanguage] = useState('en');
  const [formVoiceId, setFormVoiceId] = useState('');
  const [formInstructions, setFormInstructions] = useState('');
  const [formSystemPrompt, setFormSystemPrompt] = useState('');
  const [formOutboundPrompt, setFormOutboundPrompt] = useState('');
  const [formInboundPrompt, setFormInboundPrompt] = useState('');

  useEffect(() => {
    if (activeAgent) {
      setFormName(activeAgent.name || '');
      setFormGender(activeAgent.gender || 'Female');
      setFormLanguage(activeAgent.language || 'en');
      setFormVoiceId(activeAgent.voiceId || '');
      setFormInstructions(activeAgent.instructions || '');
      setFormSystemPrompt(activeAgent.systemInstructions || '');
      setFormOutboundPrompt((activeAgent as any).outboundStarterPrompt || '');
      setFormInboundPrompt((activeAgent as any).inboundStarterPrompt || '');
    }
  }, [selectedAgentId]);

  const handleCreateNew = () => {
    setSelectedAgentId('new');
  };

  const handleSave = async () => {
    try {
      const payload = {
        name: formName,
        gender: formGender,
        language: formLanguage,
        voiceId: formVoiceId,
        instructions: formInstructions,
        systemInstructions: formSystemPrompt,
        outboundStarterPrompt: formOutboundPrompt,
        inboundStarterPrompt: formInboundPrompt,
      };

      if (isCreating) {
        const result = await api.createVoiceAgent(payload, tenant.id);
        toast.success('Agent created successfully');
        // Reset state so we are no longer in "creating" mode
        setSelectedAgentId(result?.id || null);
      } else if (selectedAgentId) {
        await api.updateVoiceAgent(selectedAgentId, payload, tenant.id);
        toast.success('Agent changes saved successfully');
      }

      // Invalidate queries to refresh data from server
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    } catch (err) {
      console.error('Failed to save agent:', err);
      toast.error('Failed to save agent. Check console for details.');
    }
  };

  // Helper for status badge
  const AgentStatusBadge = ({ status }: { status: string }) => {
    const isActive = status.toLowerCase() === 'active';
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase transition-all ${isActive ? 'bg-emerald-100/80 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
        {status}
      </span>
    );
  };

  if (agents.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#1e293b] p-12 text-center shadow-sm">
        <div className="w-16 h-16 rounded-2xl bg-violet-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4">
          <Bot className="h-8 w-8 text-violet-600" />
        </div>
        <h3 className="text-lg font-bold text-slate-800">No Voice Agents</h3>
        <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">This tenant hasn't configured any voice agents yet.</p>
        <Button className="mt-5 bg-[#172560] text-white">Create First Agent</Button>
      </div>
    );
  }

  if (!activeAgent) return null;

  return (
    <div className="flex bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm h-[750px] overflow-hidden">
      {/* Sidebar List */}
      <div className="w-[320px] border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/30 dark:bg-slate-900/10">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              Voice Agents
            </h3>
            <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase">{agents.length} Total</span>
          </div>
          <Button
            onClick={handleCreateNew}
            className="w-full bg-[#172560] dark:bg-blue-600 hover:bg-[#172560]/90 dark:hover:bg-blue-700 text-white font-bold h-10 rounded-xl shadow-md shadow-blue-900/10 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4 mr-2" /> Create New Agent
          </Button>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <Input
              placeholder="Search agents by name..."
              className="pl-9 h-10 bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800 rounded-xl text-xs dark:text-white focus-visible:ring-violet-500/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredAgents.map(agent => (
            <button
              key={agent.id}
              onClick={() => setSelectedAgentId(agent.id)}
              className={`w-full text-left p-4 rounded-2xl transition-all border ${selectedAgentId === agent.id
                ? 'bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-500/30 shadow-sm ring-1 ring-blue-50 dark:ring-blue-500/10'
                : 'border-transparent hover:bg-white dark:hover:bg-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700'
                }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${selectedAgentId === agent.id ? 'bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                    <Bot className="h-4 w-4" />
                  </div>
                  <span className={`font-bold text-sm ${selectedAgentId === agent.id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                    {agent.name}
                  </span>
                </div>
                <ChevronRight className={`h-4 w-4 ${selectedAgentId === agent.id ? 'text-blue-500 dark:text-blue-400' : 'text-slate-300 dark:text-slate-600'}`} />
              </div>
              <div className="flex flex-wrap gap-2">
                <AgentStatusBadge status={agent.status} />
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-bold border border-blue-100/50 dark:border-blue-500/20">
                  <svg className="w-2.5 h-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 010 20 15.3 15.3 0 010-20z" /></svg>
                  {agent.language}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-pink-50 dark:bg-pink-500/10 text-pink-600 dark:text-pink-400 text-[10px] font-bold border border-pink-100/50 dark:border-pink-500/20">
                  {agent.gender}
                </span>
              </div>
              {agent.voiceId && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 truncate font-medium">{agent.provider} {agent.voiceId}</p>
              )}
            </button>
          ))}
          {filteredAgents.length === 0 && (
            <div className="py-10 text-center text-slate-400 dark:text-slate-600 text-xs italic">No agents match your search.</div>
          )}
        </div>
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1e293b]">
          <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">{agents.length} agents configured</p>
        </div>
      </div>

      {/* Detail Form Pane */}
      <div className="flex-1 overflow-y-auto bg-slate-50/10 dark:bg-slate-950/20 p-8 scroll-smooth" key={selectedAgentId || 'none'}>
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Agent Configuration</h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Configure and fine-tune your AI voice assistant for {tenant.name}.</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => setSelectedAgentId(agents[0]?.id || null)}
                className="h-10 px-4 rounded-xl border-slate-200 dark:border-slate-800 font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all active:scale-95"
              >
                <RotateCcw className="h-4 w-4 mr-2" /> Clear
              </Button>
              <Button
                onClick={handleSave}
                className="h-10 px-6 rounded-xl bg-[#172560] dark:bg-blue-600 hover:bg-[#172560]/90 dark:hover:bg-blue-700 text-white font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95"
              >
                {isCreating ? 'Create Agent' : 'Save Changes'}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8">
            {/* Section: Basic Details */}
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200/60 dark:border-slate-800 p-8 space-y-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Pencil className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Basic Details</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configure your agent's identity</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-2">
                  <div className="flex items-center justify-between ml-1">
                    <Label className="text-slate-700 dark:text-slate-300 font-bold">Agent Name <span className="text-red-500">*</span></Label>
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">{activeAgent.name?.length || 0}/40</span>
                  </div>
                  <Input
                    placeholder="e.g., Sales Assistant Alex"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl px-5 focus-visible:ring-blue-500/20 text-sm dark:text-white font-medium"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 font-bold ml-1">Voice Gender</Label>
                  <div className="flex gap-2 p-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl h-12 items-center px-1.5">
                    {['Male', 'Female', 'Neutral'].map(g => (
                      <button
                        key={g}
                        onClick={() => setFormGender(g)}
                        className={`flex-1 h-9 rounded-xl text-xs font-bold transition-all ${formGender.toLowerCase() === g.toLowerCase()
                          ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-400 shadow-sm border border-blue-100 dark:border-blue-900/50'
                          : 'text-slate-500 dark:text-slate-500 hover:bg-white/50 dark:hover:bg-slate-800/50'
                          }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Voice & Language */}
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200/60 dark:border-slate-800 p-8 space-y-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Volume2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Voice & Language</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Set the speaking language and preview the voice</p>
                </div>
              </div>

              <div className="flex flex-col md:flex-row items-end gap-5">
                <div className="flex-1 w-full space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 font-bold ml-1">Language</Label>
                  <Select value={formLanguage} onValueChange={setFormLanguage}>
                    <SelectTrigger className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl px-5 text-sm dark:text-white font-medium">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                      <SelectItem value="English">English</SelectItem>
                      <SelectItem value="Spanish">Spanish</SelectItem>
                      <SelectItem value="French">French</SelectItem>
                      <SelectItem value="German">German</SelectItem>
                      <SelectItem value="Hindi">Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1 w-full space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300 font-bold ml-1">Voice ID</Label>
                  <Input
                    placeholder="e.g., poly-alex"
                    value={formVoiceId}
                    onChange={(e) => setFormVoiceId(e.target.value)}
                    className="h-12 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-2xl px-5 text-sm dark:text-white font-medium"
                  />
                </div>
                <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 dark:border-slate-800 font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 gap-2">
                  <Volume2 className="h-4 w-4" /> Preview
                </Button>
              </div>
            </div>

            {/* Section: Instructions */}
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200/60 dark:border-slate-800 p-8 space-y-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Agent Instructions</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Describe the agent's role and conversation constraints</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold ml-1">Behavioral Instructions</Label>
                <textarea
                  className="w-full min-h-[150px] p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-sm dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                />
              </div>
            </div>

            {/* Section: Advanced Prompting */}
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200/60 dark:border-slate-800 p-8 space-y-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 dark:text-white">Advanced Prompting</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Configure low-level system prompts</p>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold ml-1">System Prompt</Label>
                <textarea
                  className="w-full min-h-[120px] p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-sm font-mono dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 transition-all text-xs"
                  value={formSystemPrompt}
                  onChange={(e) => setFormSystemPrompt(e.target.value)}
                />
              </div>
            </div>

            {/* Section: Outbound Call Configuration */}
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200/60 dark:border-slate-800 p-8 space-y-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-pink-50 dark:bg-pink-500/10 flex items-center justify-center text-pink-600 dark:text-pink-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Outbound Call Configuration</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Configure the opening message for outbound calls</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-violet-600 font-bold hover:bg-violet-50 dark:hover:bg-violet-500/10 h-8 gap-2">
                  <Copy className="h-3.5 w-3.5" /> Sample
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold ml-1">Starter Prompt</Label>
                <div className="relative">
                  <textarea
                    className="w-full min-h-[100px] p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-sm dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                    placeholder="The first message the agent speaks when initiating a call..."
                    value={formOutboundPrompt}
                    onChange={(e) => setFormOutboundPrompt(e.target.value)}
                  />
                  <div className="absolute bottom-4 right-5 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">
                    {formOutboundPrompt.length} characters
                  </div>
                </div>
              </div>
            </div>

            {/* Section: Inbound Call Configuration */}
            <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-200/60 dark:border-slate-800 p-8 space-y-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-600 dark:text-cyan-400">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 dark:text-white">Inbound Call Configuration</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Configure how the agent answers incoming calls</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" className="text-violet-600 font-bold hover:bg-violet-50 dark:hover:bg-violet-500/10 h-8 gap-2">
                  <Copy className="h-3.5 w-3.5" /> Sample
                </Button>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700 dark:text-slate-300 font-bold ml-1">Answer Greeting</Label>
                <div className="relative">
                  <textarea
                    className="w-full min-h-[100px] p-5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl text-sm dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/10 dark:focus:ring-blue-500/20 transition-all placeholder:text-slate-400"
                    placeholder="The first message the agent speaks when answering an incoming call..."
                    value={formInboundPrompt}
                    onChange={(e) => setFormInboundPrompt(e.target.value)}
                  />
                  <div className="absolute bottom-4 right-5 text-[10px] font-bold text-slate-400 dark:text-slate-600 uppercase">
                    {formInboundPrompt.length} characters
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TenantDetailTabs({ tenant, onRemoveUser, onEditUser, onAddUser }: {
  tenant: Tenant; onRemoveUser: (id: string) => void; onEditUser: (u: TenantUser) => void; onAddUser: () => void;
}) {
  const queryClient = useQueryClient();
  const [billingTimeRange, setBillingTimeRange] = useState('30 days');

  const handleUpdateRole = async (userId: string, newRole: UserRole) => {
    try {
      await api.updateUser(userId, { role: newRole }, tenant.id);
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      toast.success('User role updated');
    } catch (err) {
      toast.error('Failed to update role');
    }
  };
  return (
    <Tabs defaultValue="team" className="space-y-4">
      <TabsList className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm flex-wrap h-auto p-1.5 gap-1 rounded-xl">
        <TabsTrigger value="team" className="px-5 py-2.5 rounded-lg transition-all data-[state=active]:bg-[#172560] dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white">Team</TabsTrigger>
        <TabsTrigger value="campaigns" className="px-5 py-2.5 rounded-lg transition-all data-[state=active]:bg-[#172560] dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white">Campaigns</TabsTrigger>
        <TabsTrigger value="conversations" className="px-5 py-2.5 rounded-lg transition-all data-[state=active]:bg-[#172560] dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white">Conversations</TabsTrigger>
        <TabsTrigger value="voice-agents" className="px-5 py-2.5 rounded-lg transition-all data-[state=active]:bg-[#172560] dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white">Voice Agents</TabsTrigger>
        <TabsTrigger value="calls" className="px-5 py-2.5 rounded-lg transition-all data-[state=active]:bg-[#172560] dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white">Voice Calls</TabsTrigger>
        <TabsTrigger value="pipeline" className="px-5 py-2.5 rounded-lg transition-all data-[state=active]:bg-[#172560] dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white">Pipeline</TabsTrigger>
        <TabsTrigger value="integrations" className="px-5 py-2.5 rounded-lg transition-all data-[state=active]:bg-[#172560] dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white">Integrations</TabsTrigger>
        <TabsTrigger value="billing" className="px-5 py-2.5 rounded-lg transition-all data-[state=active]:bg-[#172560] dark:data-[state=active]:bg-blue-600 data-[state=active]:text-white font-medium text-slate-500 hover:text-slate-800 dark:hover:text-white">Billing</TabsTrigger>
      </TabsList>

      {/* ── Team Tab ── */}
      <TabsContent value="team" className="space-y-4">
        <div className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1e293b] overflow-hidden">
          <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Team Management</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Manage team members and their page access permissions</p>
            </div>
            <button onClick={onAddUser} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" /></svg>
              Add Team Member
            </button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/60 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <TableHead className="py-3 pl-6 text-xs font-bold text-slate-600 dark:text-slate-400">Name</TableHead>
                <TableHead className="py-3 text-xs font-bold text-slate-600 dark:text-slate-400">Email</TableHead>
                <TableHead className="py-3 text-xs font-bold text-slate-600 dark:text-slate-400">Role</TableHead>
                <TableHead className="py-3 text-xs font-bold text-slate-600 dark:text-slate-400">Status</TableHead>
                <TableHead className="py-3 text-xs font-bold text-slate-600 dark:text-slate-400">Capabilities</TableHead>
                <TableHead className="py-3 text-xs font-bold text-slate-600 dark:text-slate-400">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenant.users?.map((user) => {
                const initials = `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase() || '?';
                const isActive = user.status === 'active';
                return (
                  <TableRow key={user.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/60 border-b border-slate-50 dark:border-slate-800 last:border-b-0 transition-colors">
                    <TableCell className="py-3 pl-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#172560] dark:bg-blue-600 text-white flex items-center justify-center text-xs font-bold flex-shrink-0">{initials}</div>
                        <span className="font-semibold text-sm text-slate-800 dark:text-white">{user.firstName} {user.lastName}</span>
                      </div>
                    </TableCell>
                    <TableCell className="py-3 text-sm text-slate-600 dark:text-slate-300">{user.email}</TableCell>
                    <TableCell className="py-3">
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateRole(user.id, e.target.value as UserRole)}
                        className="text-xs border border-slate-200 dark:border-slate-700 rounded-md px-2 py-1 bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:outline-none"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="agent">Agent</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    </TableCell>
                    <TableCell className="py-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${isActive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20' : 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {isActive ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <ul className="space-y-0.5 text-[11px] text-slate-600 dark:text-slate-300">
                        {((user.capabilities && user.capabilities.length > 0) ? user.capabilities : ['View Overview', 'Scraper', 'Call Logs', 'Pipeline']).map(c => (
                          <li key={c} className="flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-[#172560] dark:bg-blue-500 flex-shrink-0" />{c}</li>
                        ))}
                      </ul>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => onEditUser(user)} className="text-slate-400 hover:text-blue-600 transition-colors p-1.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20">
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button onClick={() => onRemoveUser(user.id)} className="text-slate-400 hover:text-red-600 transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!tenant.users || tenant.users.length === 0) && (
                <TableRow><TableCell colSpan={6} className="text-center text-slate-400 py-10 text-sm">No team members found</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <TabsContent value="campaigns"><CampaignsTab tenant={tenant} /></TabsContent>

      {/* ── Conversations Tab ── */}
      <TabsContent value="conversations">
        <div className="space-y-5">
          {/* Row 1 — Premium Stats Bar */}
          <div className="bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm p-8 flex items-center justify-around">
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">Total Conversations</p>
              <p className="text-4xl font-black text-slate-800 dark:text-white tabular-nums">{tenant.conversations ?? 0}</p>
            </div>
            <div className="w-px h-12 bg-slate-100 dark:bg-slate-800" />
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">🔥 Hot Leads</p>
              <p className="text-4xl font-black text-orange-600 dark:text-orange-400 tabular-nums">{tenant.leadTemperatures?.hot ?? 0}</p>
            </div>
            <div className="w-px h-12 bg-slate-100 dark:bg-slate-800" />
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">☀️ Warm Leads</p>
              <p className="text-4xl font-black text-yellow-600 dark:text-yellow-400 tabular-nums">{tenant.leadTemperatures?.warm ?? 0}</p>
            </div>
            <div className="w-px h-12 bg-slate-100 dark:bg-slate-800" />
            <div className="text-center">
              <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2">❄️ Cold Leads</p>
              <p className="text-4xl font-black text-cyan-600 dark:text-cyan-400 tabular-nums">{tenant.leadTemperatures?.cold ?? 0}</p>
            </div>
          </div>

          {/* Row 2 — rates */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between min-h-[100px] hover:shadow-md transition-shadow">
              <div className="flex justify-end"><div className="w-9 h-9 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="1.8"><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></svg></div></div>
              <div><p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Not Qualified</p><p className="text-2xl font-extrabold text-slate-500 dark:text-slate-400 tabular-nums">{tenant.leadTemperatures?.notQualified ?? 0}</p></div>
            </div>
            {[
              { label: 'Hot Rate', key: 'hot', emoji: '🔥', bg: 'from-orange-50 to-orange-100 dark:from-orange-500/10 dark:to-orange-500/20', border: 'border-orange-200 dark:border-orange-500/20', text: 'text-orange-700 dark:text-orange-400' },
              { label: 'Warm Rate', key: 'warm', emoji: '☀️', bg: 'from-yellow-50 to-yellow-100 dark:from-yellow-500/10 dark:to-yellow-500/20', border: 'border-yellow-200 dark:border-yellow-500/20', text: 'text-yellow-700 dark:text-yellow-400' },
              { label: 'Cold Rate', key: 'cold', emoji: '❄️', bg: 'from-cyan-50 to-cyan-100 dark:from-cyan-500/10 dark:to-cyan-500/20', border: 'border-cyan-200 dark:border-cyan-500/20', text: 'text-cyan-700 dark:text-cyan-400' },
            ].map(({ label, key, emoji, bg, border, text }) => {
              const lt = tenant.leadTemperatures;
              const total = lt ? (lt.hot + lt.warm + lt.cold + lt.notQualified) : 0;
              const val = lt && total > 0 ? ((lt[key as keyof typeof lt] as number) / total * 100).toFixed(1) + '%' : '0.0%';
              return (
                <div key={key} className={`bg-gradient-to-br ${bg} rounded-2xl border ${border} shadow-sm p-5 flex flex-col justify-between min-h-[100px]`}>
                  <div className="flex justify-end"><span className="text-lg">{emoji}</span></div>
                  <div><p className={`text-xs ${text} mb-1`}>{label}</p><p className={`text-2xl font-extrabold ${text} tabular-nums`}>{val}</p></div>
                </div>
              );
            })}
          </div>

          {/* Temperature distribution bar */}
          {(() => {
            const lt = tenant.leadTemperatures;
            const total = lt ? (lt.hot + lt.warm + lt.cold + lt.notQualified) : 0;
            if (!lt || total === 0) return (
              <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-[#1e293b] p-12 text-center">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center mx-auto mb-4"><svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.5"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg></div>
                <p className="text-slate-700 dark:text-slate-300 font-bold">No Conversation Data</p>
                <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">Lead temperature data not available for this tenant yet.</p>
              </div>
            );
            const bars = [
              { label: 'Hot', pct: (lt.hot / total) * 100, color: 'bg-orange-400', count: lt.hot, icon: '🔥' },
              { label: 'Warm', pct: (lt.warm / total) * 100, color: 'bg-yellow-400', count: lt.warm, icon: '☀️' },
              { label: 'Cold', pct: (lt.cold / total) * 100, color: 'bg-cyan-400', count: lt.cold, icon: '❄️' },
              { label: 'Not Qualified', pct: (lt.notQualified / total) * 100, color: 'bg-slate-300', count: lt.notQualified, icon: '⚪' },
            ];
            return (
              <div className="space-y-5">
                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1e293b] p-5">
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Lead Temperature Distribution</p>
                  <div className="flex h-4 rounded-full overflow-hidden gap-0.5 bg-slate-100 dark:bg-slate-800">
                    {bars.filter(b => b.pct > 0).map(b => (
                      <div key={b.label} style={{ width: `${b.pct}%` }} className={`${b.color} ${b.label === 'Hot' ? 'rounded-l-full' : ''} ${b.label === 'Not Qualified' ? 'rounded-r-full' : ''}`} title={`${b.label}: ${b.pct.toFixed(1)}%`} />
                    ))}
                  </div>
                  <div className="flex items-center gap-4 mt-3 flex-wrap">
                    {bars.map(b => (
                      <div key={b.label} className="flex items-center gap-1.5">
                        <span className={`h-2.5 w-2.5 rounded-full ${b.color}`} />
                        <span className="text-xs text-slate-600 dark:text-slate-300">{b.label}</span>
                        <span className="text-xs font-bold text-slate-800 dark:text-white">{b.count}</span>
                        <span className="text-xs text-slate-400 dark:text-slate-500">({b.pct.toFixed(1)}%)</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm bg-white dark:bg-[#1e293b] overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
                    <h4 className="text-sm font-bold text-slate-800 dark:text-white">Lead Temperature Summary</h4>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-slate-50/60 dark:bg-slate-800/60 border-none">
                        <TableHead className="py-2.5 pl-5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</TableHead>
                        <TableHead className="py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Leads</TableHead>
                        <TableHead className="py-2.5 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Share (%)</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bars.map((b) => (
                        <TableRow key={b.label} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors border-slate-50 dark:border-slate-800/50">
                          <TableCell className="py-3 pl-5">
                            <div className="flex items-center gap-2">
                              <span className="text-base">{b.icon}</span>
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{b.label}</span>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 text-sm font-bold text-slate-800 dark:text-white tabular-nums">{b.count.toLocaleString()}</TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-3 w-40">
                              <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div style={{ width: `${b.pct}%` }} className={`h-full ${b.color}`} />
                              </div>
                              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 w-10 text-right">{b.pct.toFixed(1)}%</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })()}
        </div>
      </TabsContent>

      {/* ── Voice Agents Tab ── */}
      <TabsContent value="voice-agents">
        <VoiceAgentsManagement tenant={tenant} />
      </TabsContent>

      <TabsContent value="calls"><CallLogsTab tenantId={tenant.id} /></TabsContent>

      <TabsContent value="pipeline">
        <PipelineTab tenant={tenant} />
      </TabsContent>

      {/* Integrations Tab */}
      <TabsContent value="integrations">
        <div className="space-y-8">
          <section>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Calendar & Email</h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {(() => {
                const gc = tenant.integrations?.find(i => i.name === "Google Calendar");
                const isConnected = gc?.connected ?? false;
                const account = gc?.account || null;
                return (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 bg-white dark:bg-[#1e293b] shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-white">Google Calendar Integration</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Connect your Google account for Calendar and Gmail access</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 border border-transparent dark:border-slate-800/50">
                      <div className="flex items-center gap-2.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" /></svg>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Connection Status</p>
                          <p className="text-xs text-slate-500 dark:text-slate-500">{isConnected ? (account || "Google account connected") : "Google account is not connected"}</p>
                        </div>
                      </div>
                    </div>
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a73e8] hover:bg-[#1a73e8]/90 text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98]">
                      {isConnected ? "Connected" : "Continue with Google"}
                    </button>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 rounded-lg px-3 py-2 border border-blue-100 dark:border-blue-500/20">
                      <strong>Note:</strong> We only access the data you explicitly grant permission for.
                    </p>
                  </div>
                );
              })()}
              {(() => {
                const ms = tenant.integrations?.find(i => i.name === "Microsoft Calendar");
                const isConnected = ms?.connected ?? false;
                const account = ms?.account || null;
                return (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 bg-white dark:bg-[#1e293b] shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="1.8"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-white">Microsoft Calendar Integration</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Connect your Microsoft account for Calendar and Contacts access</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 border border-transparent dark:border-slate-800/50">
                      <div className="flex items-center gap-2.5">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" /></svg>
                        <div>
                          <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Connection Status</p>
                          <p className="text-xs text-slate-500 dark:text-slate-500">{isConnected ? (account || "Microsoft account connected") : "Microsoft account is not connected"}</p>
                        </div>
                      </div>
                    </div>
                    <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#1a73e8] hover:bg-[#1a73e8]/90 text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98]">
                      {isConnected ? "Reconnect" : "Connect"}
                    </button>
                    <p className="text-[11px] text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 rounded-lg px-3 py-2 border border-blue-100 dark:border-blue-500/20">
                      <strong>Note:</strong> We only access the data you explicitly grant permission for.
                    </p>
                  </div>
                );
              })()}
            </div>
          </section>
          <section>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Social Integrations</h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {(() => {
                const li = tenant.integrations?.find(i => i.name === "LinkedIn");
                const allAccounts = li?.accounts || [];
                // Include accounts that are either explicitly 'connected' or 'active'
                const connectedAccounts = allAccounts.filter(acc =>
                  ['connected', 'active'].includes((acc.status || '').toLowerCase())
                );

                return (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 bg-white dark:bg-[#1e293b] shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[#0a66c2] flex items-center justify-center shadow-sm">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="white"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" /></svg>
                        </div>
                        <div>
                          <p className="font-bold text-base text-slate-800 dark:text-white">LinkedIn</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">Connect your LinkedIn account for automated lead enrichment and outreach</p>
                        </div>
                      </div>
                      {connectedAccounts.length > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 px-3 py-1 rounded-full">
                          <CheckCircle2 className="h-3.5 w-3.5" /> {connectedAccounts.length} Accounts
                        </span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-400">Connected Accounts ({connectedAccounts.length})</p>
                      {connectedAccounts.map((acc, idx) => (
                        <div key={acc.id || idx} className="rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 px-4 py-3 space-y-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-slate-800 dark:text-white">{acc.name}</p>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Connected</span>
                              <button className="text-[11px] font-semibold bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-full transition-colors">Disconnect</button>
                            </div>
                          </div>
                          {acc.profileUrl && acc.profileUrl !== "#" && (
                            <a href={acc.profileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1">
                              View Profile
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                            </a>
                          )}
                          <p className="text-[11px] text-slate-400 dark:text-slate-400 font-medium">Connected on {fmtDate(acc.connectedAt)}</p>
                        </div>
                      ))}
                      {connectedAccounts.length === 0 && (
                        <div className="py-6 text-center text-slate-400 dark:text-slate-500 text-xs italic bg-slate-50/50 dark:bg-slate-900/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">No active LinkedIn accounts connected.</div>
                      )}
                    </div>
                    <button className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                      <LiIcon /> Add Another LinkedIn Account
                    </button>
                    <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 p-4 flex gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-100 dark:bg-amber-500/20 flex-shrink-0 flex items-center justify-center text-amber-600 dark:text-amber-400">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-900 dark:text-amber-200 leading-tight">Important Note</p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">LinkedIn accounts are managed via the browser extension for security and compliance. Ensure yours is up-to-date.</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {(() => {
                const slack = tenant.integrations?.find(i => i.name === "Slack");
                const isConnected = slack?.connected ?? false;
                return (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-8 space-y-6 bg-white dark:bg-[#1e293b] shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-5">
                      <div className="w-14 h-14 rounded-[1.25rem] bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex items-center justify-center shadow-sm">
                        <svg width="32" height="32" viewBox="0 0 122.8 122.8" xmlns="http://www.w3.org/2000/svg">
                          <path d="M25.8 77.6c0 7.1-5.8 12.9-12.9 12.9S0 84.7 0 77.6s5.8-12.9 12.9-12.9h12.9v12.9zm6.4 0c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9v32.3c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V77.6z" fill="#e01e5a" />
                          <path d="M45.2 25.8c-7.1 0-12.9-5.8-12.9-12.9S38.1 0 45.2 0s12.9 5.8 12.9 12.9v12.9H45.2zm0 6.4c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H12.9C5.8 58.1 0 52.3 0 45.2s5.8-12.9 12.9-12.9h32.3z" fill="#36c5f0" />
                          <path d="M97 45.2c0-7.1 5.8-12.9 12.9-12.9s12.9 5.8 12.9 12.9-5.8 12.9-12.9 12.9H97V45.2zm-6.4 0c0 7.1-5.8 12.9-12.9 12.9s-12.9-5.8-12.9-12.9V12.9C77.6 5.8 83.4 0 90.5 0s12.9 5.8 12.9 12.9v32.3z" fill="#2eb67d" />
                          <path d="M77.6 97c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9-12.9-5.8-12.9-12.9V97h12.9zm0-6.4c-7.1 0-12.9-5.8-12.9-12.9s5.8-12.9 12.9-12.9h32.3c7.1 0 12.9 5.8 12.9 12.9s-5.8 12.9-12.9 12.9H77.6z" fill="#ecb22e" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-slate-800 dark:text-white">Slack</h4>
                        <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5 max-w-[280px]">
                          Integrate LAD Agent to your Slack workspace to receive regular updates from different products about your business.
                        </p>
                      </div>
                    </div>
                    <button className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 text-sm font-bold shadow-sm transition-all active:scale-[0.98]">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="opacity-60"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                      {isConnected ? "Connected" : "Connect"}
                    </button>
                  </div>
                );
              })()}
            </div>
          </section>
          <section>
            <h3 className="text-base font-bold text-slate-800 dark:text-white mb-4">Messaging</h3>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {(() => {
                const wa = tenant.integrations?.find(i => i.name === "WhatsApp");
                const isConnected = wa?.connected ?? false;
                return (
                  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 bg-white dark:bg-[#1e293b] shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
                      </div>
                      <div>
                        <p className="font-semibold text-sm text-slate-800 dark:text-white">WhatsApp Integration</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Connect using QR code</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 rounded-xl px-4 py-3 border border-transparent dark:border-slate-800/50">
                      <div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Connection Status</p>
                        <p className="text-xs text-slate-500 dark:text-slate-500">{isConnected ? "Connected" : "Disconnected"}</p>
                      </div>
                    </div>
                    <button className="w-full py-2.5 rounded-xl bg-slate-700 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.98]">
                      Generate QR
                    </button>
                  </div>
                );
              })()}
            </div>
          </section>
        </div>
      </TabsContent>

      {/* ── Billing Tab ── */}
      <TabsContent value="billing" className="animate-in fade-in slide-in-from-bottom-2 duration-500">
        {(() => {
          const b = tenant.billing;
          const creditsBalance = b?.creditsBalance ?? 0;
          const monthlyUsage = b?.monthlyUsage ?? 0;
          const totalSpentRaw = b?.totalSpent ?? "$0.00";
          const totalSpentDisplay = typeof totalSpentRaw === "string" && totalSpentRaw.startsWith("$") ? totalSpentRaw : `$${parseFloat(String(totalSpentRaw) || "0").toFixed(2)}`;
          const renewsOn = b?.renewsOn || "March 9, 2026";

          return (
            <div className="space-y-8">
              {/* Header section with company icon and info */}
              <div className="flex items-center gap-5 p-6 bg-white dark:bg-[#1e293b] rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-inner">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 21h18M3 7v1a3 3 0 006 0V7m0 1a3 3 0 006 0V7m0 1a3 3 0 006 0V7M4 21V4a1 1 0 011-1h14a1 1 0 011 1v17M9 21v-4a1 1 0 011-1h4a1 1 0 011 1v4" /></svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">{tenant.name}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-2 mt-0.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" /> Renews on {renewsOn}
                  </p>
                </div>
              </div>

              {/* Top Banner with main stats */}
              <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-[2.5rem] p-12 text-white shadow-2xl shadow-blue-900/20 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl transition-transform group-hover:scale-110 duration-1000" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/10 rounded-full -ml-32 -mb-32 blur-3xl" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 opacity-80">
                      <Wallet className="h-4 w-4" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em]">CURRENT BALANCE</p>
                    </div>
                    <div>
                      <h3 className="text-5xl font-bold tabular-nums tracking-tighter">{creditsBalance.toLocaleString()}</h3>
                      <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">CREDITS AVAILABLE</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 opacity-80">
                      <BarChart2 className="h-4 w-4" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em]">MONTHLY USAGE</p>
                    </div>
                    <div>
                      <h3 className="text-5xl font-bold tabular-nums tracking-tighter">{monthlyUsage.toLocaleString()}</h3>
                      <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">CREDITS THIS MONTH</p>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 opacity-80">
                      <TrendingUp className="h-4 w-4" />
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em]">TOTAL SPENT</p>
                    </div>
                    <div>
                      <h3 className="text-5xl font-bold tabular-nums tracking-tighter">{totalSpentDisplay}</h3>
                      <p className="text-[10px] font-bold opacity-60 mt-1 uppercase tracking-widest">ALL-TIME INVESTMENT</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: "Add Credits", desc: "Purchase credit packages starting at $99", icon: <PlusCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />, iconBg: "bg-blue-50 dark:bg-blue-500/10" },
                  { title: "View Pricing", desc: "See credit costs for all features", icon: <ExternalLink className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />, iconBg: "bg-indigo-50 dark:bg-indigo-500/10" },
                  { title: "Download Report", desc: "Export your usage and billing history", icon: <Download className="h-6 w-6 text-violet-600 dark:text-violet-400" />, iconBg: "bg-violet-50 dark:bg-violet-500/10" },
                ].map((item) => (
                  <button key={item.title} className="group bg-white dark:bg-[#1e293b] p-7 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all text-left flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-lg">{item.title}</h4>
                      <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">{item.desc}</p>
                    </div>
                    <div className={`w-14 h-14 rounded-2xl ${item.iconBg} flex items-center justify-center transition-all group-hover:rotate-6 group-hover:scale-110 shadow-sm`}>
                      {item.icon}
                    </div>
                  </button>
                ))}
              </div>

              {/* Credit Usage Analytics Section */}
              <div className="space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">Credit Usage Analytics</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 font-semibold">Track your credit consumption across features</p>
                  </div>
                  <div className="flex p-1 bg-slate-100/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-xl border border-slate-200/50 dark:border-slate-700/50">
                    {['7 days', '30 days', '90 days'].map((range) => (
                      <button
                        key={range}
                        onClick={() => setBillingTimeRange(range)}
                        className={`px-5 py-2 text-[10px] font-bold uppercase tracking-widest rounded-lg transition-all ${billingTimeRange === range ? 'bg-[#172560] dark:bg-blue-600 text-white shadow-lg shadow-blue-500/30 active:scale-95' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'}`}
                      >
                        Last {range}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Total Credits Used Card */}
                  <div className="bg-white dark:bg-[#1e293b] p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">TOTAL CREDITS USED</p>
                      <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 dark:text-orange-400 group-hover:rotate-12 transition-transform">
                        <Coins className="h-5 w-5" />
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <h2 className="text-5xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tighter">{b?.totalCreditsUsed?.toLocaleString() || '0'}</h2>
                      <div className="mb-2 h-5 min-w-[40px] px-2 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                        <span className="text-[9px] font-bold text-blue-700 dark:text-blue-300">LIVE</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-4 uppercase tracking-widest opacity-60">IN THE LAST 30 DAYS</p>
                  </div>

                  {/* Monthly Trend Card */}
                  <div className="bg-white dark:bg-[#1e293b] p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">MONTHLY TREND</p>
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                        <TrendingUp className="h-5 w-5" />
                      </div>
                    </div>
                    <h2 className="text-5xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums tracking-tighter">{b?.monthlyTrend || '+0.0%'}</h2>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-4 uppercase tracking-widest opacity-60">VS LAST MONTH (0 CREDITS)</p>
                  </div>

                  {/* Most Used Feature Card */}
                  <div className="bg-white dark:bg-[#1e293b] p-8 rounded-[2rem] border border-slate-200/60 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-violet-500" />
                    <div className="flex items-center justify-between mb-6">
                      <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">MOST USED FEATURE</p>
                      <div className="w-10 h-10 rounded-xl bg-violet-50 dark:bg-violet-500/10 flex items-center justify-center text-violet-500 dark:text-violet-400 group-hover:rotate-[-12deg] transition-transform">
                        <Calendar className="h-5 w-5" />
                      </div>
                    </div>
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white truncate tracking-tight">{b?.mostUsedFeature?.name?.replace(/-/g, ' ') || '-'}</h2>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-4 uppercase tracking-widest opacity-60">
                      {b?.mostUsedFeature?.credits?.toLocaleString() || '0'} CREDITS ({b?.mostUsedFeature?.percentage || '0'}%)
                    </p>
                  </div>
                </div>
              </div>

              {/* Usage by Feature Table Section */}
              {b?.usageByFeature && b.usageByFeature.length > 0 && (
                <div className="bg-white dark:bg-[#1e293b] rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden animate-in fade-in duration-700 delay-300">
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-800 dark:text-white text-lg tracking-tight">Usage by Feature</h4>
                      <p className="text-[10px] text-slate-400 dark:text-slate-400 font-bold uppercase mt-1 tracking-[0.1em]">DETAILED BREAKDOWN OF CONSUMPTION</p>
                    </div>
                  </div>
                  <div className="p-0 overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-slate-50/60 dark:bg-slate-800/60 hover:bg-slate-50/60 dark:hover:bg-slate-800/60 border-none">
                          <TableHead className="py-5 pl-10 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-[0.2em]">FEATURE</TableHead>
                          <TableHead className="py-5 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-[0.2em]">CREDITS CONSUMED</TableHead>
                          <TableHead className="py-5 text-[10px] font-bold text-slate-400 dark:text-slate-400 uppercase tracking-[0.2em] pr-10">RELATIVE ALLOCATION</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {b.usageByFeature.map((f, i) => {
                          const total = b.usageByFeature?.reduce((s, x) => s + x.credits, 0) || 1;
                          const pct = Math.round((f.credits / total) * 100);
                          return (
                            <TableRow key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/80 transition-all border-slate-50 dark:border-slate-800/50 border-b last:border-none group">
                              <TableCell className="py-6 pl-10">
                                <div className="flex items-center gap-4">
                                  <div className="w-2.5 h-2.5 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-700" style={{ backgroundColor: f.color }} />
                                  <span className="font-bold text-slate-700 dark:text-slate-300 capitalize text-sm">{f.feature.replace(/-/g, ' ')}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-6 font-bold text-slate-800 dark:text-white tabular-nums text-base">{f.credits.toLocaleString()}</TableCell>
                              <TableCell className="py-6 pr-10">
                                <div className="flex items-center gap-6">
                                  <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner ring-1 ring-slate-200/50 dark:ring-slate-700/50">
                                    <div
                                      className="h-full rounded-full transition-all duration-1000 shadow-sm relative group-hover:brightness-110"
                                      style={{ width: `${pct}%`, backgroundColor: f.color }}
                                    >
                                      <div className="absolute top-0 right-0 h-full w-2 bg-white/20 dark:bg-white/10 blur-[1px]" />
                                    </div>
                                  </div>
                                  <span className="text-[11px] font-bold text-slate-400 dark:text-slate-400 w-10 text-right group-hover:text-slate-600 dark:group-hover:text-slate-200 transition-colors">{pct}%</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </TabsContent>

    </Tabs>
  );
}


export function TenantsUsersTab({ timeRange, onTenantSelect, isDark }: { timeRange: TimeRange; onTenantSelect?: (selected: boolean) => void; isDark: boolean }) {
  const { data: backendTenants = [], isLoading } = useTenants(timeRange);
  const { data: dashboardStats } = useDashboardStats(timeRange);
  const queryClient = useQueryClient();

  const today = new Date().toISOString().split('T')[0];
  const { data: activeCampaigns = [] } = useCampaigns('active');
  const { data: voiceAgents = [] } = useVoiceAgents();
  const { data: callsToday = [] } = useCallLogs(today, today);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showAddTenant, setShowAddTenant] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);

  // Invite tenant form
  const [inviteEmail, setInviteEmail] = useState('');
  const [autoSendInvite, setAutoSendInvite] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  // Add user form
  const [newUser, setNewUser] = useState({ id: '', firstName: '', lastName: '', email: '', role: 'viewer' as UserRole, capabilities: [] as string[] });
  const [showPassword, setShowPassword] = useState(false);

  // Aggregate across ALL tenants - backendTenants already has multi-table summed counts
  // per tenant (campaigns + campaign_analytics, voice_call_logs + voice_call_analysis, etc.)
  const aggregatedCampaigns = (backendTenants || []).reduce((acc: number, t: Tenant) => acc + (t.campaigns || 0), 0);
  const aggregatedCalls = (backendTenants || []).reduce((acc: number, t: Tenant) => acc + (t.calls || 0), 0);
  const aggregatedConvos = (backendTenants || []).reduce((acc: number, t: Tenant) => acc + (t.conversations || 0), 0);
  const aggregatedLeads = (backendTenants || []).reduce((acc: number, t: Tenant) => acc + (t.pipelineLeads || 0), 0);
  const aggregatedUsers = (backendTenants || []).reduce((acc: number, t: Tenant) => acc + (t.activeUsers || 0), 0);
  const aggregatedAgents = (backendTenants || []).reduce((acc: number, t: Tenant) => {
    // voiceAgentsCount is the DB-queried count; fall back to the list length
    const n = t.voiceAgentsCount ?? (Array.isArray(t.voiceAgents) ? t.voiceAgents.length : 0);
    return acc + n;
  }, 0) || dashboardStats?.voiceAgents || (Array.isArray(voiceAgents) ? voiceAgents.length : 0);

  // Summary box values — prefer tenant-aggregated totals (respects time range filter)
  // Fall back to dashboardStats only when backendTenants is not yet loaded
  const dispCampaigns = backendTenants.length > 0 ? aggregatedCampaigns : (dashboardStats?.campaignsToday ?? 0);
  const dispCalls = backendTenants.length > 0 ? aggregatedCalls : (dashboardStats?.callsToday ?? 0);
  const dispConvos = backendTenants.length > 0 ? aggregatedConvos : (dashboardStats?.conversations ?? 0);
  const dispLeads = backendTenants.length > 0 ? aggregatedLeads : (dashboardStats?.pipelineLeads ?? 0);
  const dispUsers = backendTenants.length > 0 ? aggregatedUsers : (dashboardStats?.totalUsers ?? 0);
  const dispAgents = aggregatedAgents;

  // Keep these for any downstream usage
  const voiceAgentsCount = dispAgents;
  const activeUsersCount = dispUsers;
  const conversationsCount = dispConvos;
  const pipelineLeadsCount = dispLeads;

  const rangeLabel = timeRange;

  // Derived filtered list directly from backendTenants
  const filtered = backendTenants.filter((t) => {
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    if (planFilter !== 'all' && t.plan !== planFilter) return false;
    if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const displayedTenants = filtered.map((t) => ({
    ...t,
    campaigns: t.campaigns ?? 0,
    conversations: t.conversations ?? 0,
    calls: t.calls ?? 0,
    pipelineLeads: t.pipelineLeads ?? 0,
    apiCalls: t.apiCalls ?? 0,
  }));

  const handleInviteTenant = async () => {
    if (!inviteEmail) return;
    setIsInviting(true);
    try {
      // Local addition for immediate UI feedback (simulated)
      const mockTenant: Tenant = {
        id: crypto.randomUUID(),
        name: inviteEmail.split('@')[0],
        slug: inviteEmail.split('@')[0].toLowerCase(),
        email: inviteEmail,
        plan: 'starter',
        status: 'healthy',
        activeUsers: 0, apiCalls: 0, errorRate: 0, storageUsed: 0, storageLimit: 1,
        campaigns: 0, conversations: 0, calls: 0, pipelineLeads: 0,
        users: [],
        industry: '-',
        integrations: [],
        voiceAgents: [],
        billing: { creditsBalance: 0, monthlyUsage: 0, totalSpent: '$0.00', plan: 'starter', renewsOn: 'TBD' },
      };

      // Call real API if autoSendInvite is true
      if (autoSendInvite) {
        await api.inviteTenant(inviteEmail);
      }

      queryClient.invalidateQueries({ queryKey: ['tenants'] });
      setShowAddTenant(false);
      setInviteEmail('');
      toast.success(autoSendInvite ? 'Invitation email sent!' : 'Tenant added to list.');
    } catch (err) {
      toast.error('Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleAddUser = async () => {
    if (!selectedTenant) return;
    if (!newUser.firstName || !newUser.lastName || !newUser.email) return;

    try {
      if (newUser.id) {
        // Edit Mode - Call API
        const updatedUser = await api.updateUser(newUser.id, {
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          capabilities: newUser.capabilities
        }, selectedTenant.id);

        queryClient.invalidateQueries({ queryKey: ['tenants'] });
        setSelectedTenant((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            users: prev.users.map((u) =>
              u.id === newUser.id
                ? {
                  ...u,
                  firstName: updatedUser.firstName,
                  lastName: updatedUser.lastName,
                  email: updatedUser.email,
                  role: updatedUser.role,
                  capabilities: updatedUser.metadata?.capabilities || []
                }
                : u
            ),
          };
        });
        toast.success('User updated successfully');
      } else {
        // Add Mode - Call API
        const createdUser = await api.createUser({
          firstName: newUser.firstName,
          lastName: newUser.lastName,
          email: newUser.email,
          role: newUser.role,
          capabilities: newUser.capabilities
        }, selectedTenant.id);

        const user: TenantUser = {
          id: createdUser.id,
          firstName: createdUser.firstName,
          lastName: createdUser.lastName,
          email: createdUser.email,
          role: createdUser.role,
          status: 'active',
          lastActive: 'Just now',
          capabilities: createdUser.capabilities || []
        };

        queryClient.invalidateQueries({ queryKey: ['tenants'] });
        setSelectedTenant((prev) => prev ? { ...prev, users: [...prev.users, user], activeUsers: (prev.activeUsers || 0) + 1 } : null);
        toast.success('Team member added successfully');
      }

      setShowAddUser(false);
      setNewUser({ id: '', firstName: '', lastName: '', email: '', role: 'viewer', capabilities: [] });
    } catch (err) {
      console.error('Failed to add user:', err);
      toast.error('Failed to save user to server');
    }
  };

  const toggleCapability = (key: string) => {
    setNewUser(prev => ({
      ...prev,
      capabilities: prev.capabilities.includes(key)
        ? prev.capabilities.filter(k => k !== key)
        : [...prev.capabilities, key]
    }));
  };

  const openEditUser = (user: TenantUser) => {
    setNewUser({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role || 'viewer',
      capabilities: user.capabilities || []
    });
    setShowAddUser(true);
  };

  const handleRemoveUser = (userId: string) => {
    if (!selectedTenant) return;
    queryClient.invalidateQueries({ queryKey: ['tenants'] });
    setSelectedTenant((prev) => prev ? { ...prev, users: prev.users.filter((u) => u.id !== userId) } : null);
  };

  // Tenant detail view
  if (selectedTenant) {
    const tenant = backendTenants.find((t) => t.id === selectedTenant.id) || selectedTenant;

    return (
      <div className="space-y-6">
        {/* Back button + header */}
        <div className="flex items-start gap-4 mb-6">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-lg bg-[#172560] text-white hover:bg-[#172560]/90 mt-1"
            onClick={() => {
              setSelectedTenant(null);
              onTenantSelect?.(false);
            }}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-[#172560] dark:text-blue-400">{tenant.name}</h2>
              <StatusBadge status={tenant.status} />
              <Badge variant="outline" className={cn(planColor[tenant.plan], "dark:bg-opacity-10 dark:border-blue-500/20")}>{tenant.plan}</Badge>
            </div>
            <p className="text-sm text-muted-foreground dark:text-slate-500">Renews on {tenant.billing?.renewsOn || 'TBD'}</p>
          </div>
        </div>

        {/* Metrics Summary Grid */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6 mb-8">
          <MetricCard
            label="Campaigns"
            value={tenant.campaigns || 0}
            icon={<Send className="h-4 w-4" />}
            iconContainerClassName="bg-orange-50 text-orange-600 border border-orange-100/50"
          />
          <MetricCard
            label="Conversations"
            value={tenant.conversations || 0}
            icon={<MessageSquare className="h-4 w-4" />}
            iconContainerClassName="bg-blue-50 text-blue-600 border border-blue-100/50"
          />
          <MetricCard
            label="Calls"
            value={tenant.calls || 0}
            icon={<Phone className="h-4 w-4" />}
            iconContainerClassName="bg-green-50 text-green-600 border border-green-100/50"
          />
          <MetricCard
            label="Total Leads"
            value={tenant.pipelineLeads || 0}
            icon={<Stethoscope className="h-4 w-4" />}
            iconContainerClassName="bg-cyan-50 text-cyan-600 border border-cyan-100/50"
          />
          <MetricCard
            label="Voice Agents"
            value={tenant.voiceAgents?.length || 0}
            icon={<Bot className="h-4 w-4" />}
            iconContainerClassName="bg-purple-50 text-purple-600 border border-purple-100/50"
          />
          <MetricCard
            label="Active Users"
            value={tenant.activeUsers || 0}
            icon={<Users className="h-4 w-4" />}
            iconContainerClassName="bg-indigo-50 text-indigo-600 border border-indigo-100/50"
          />
        </div>

        {/* Tabs for Team, Voice Agents, Integrations, Billing, Calls, Campaigns, Pipeline Leads */}
        <TenantDetailTabs tenant={tenant} onRemoveUser={handleRemoveUser} onEditUser={openEditUser} onAddUser={() => setShowAddUser(true)} />

        {/* Add/Edit User Dialog */}
        <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
          <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="dark:text-white">{newUser.id ? 'Edit User' : 'Add User'}</DialogTitle>
              <DialogDescription className="dark:text-slate-400">{newUser.id ? 'Update user information' : 'Add a new user to this tenant'}</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="dark:text-slate-300">First Name</Label><Input placeholder="John" value={newUser.firstName} onChange={(e) => setNewUser((p) => ({ ...p, firstName: e.target.value }))} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
                <div><Label className="dark:text-slate-300">Last Name</Label><Input placeholder="Doe" value={newUser.lastName} onChange={(e) => setNewUser((p) => ({ ...p, lastName: e.target.value }))} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
              </div>
              <div><Label className="dark:text-slate-300">Email</Label><Input placeholder="email@example.com" value={newUser.email} onChange={(e) => setNewUser((p) => ({ ...p, email: e.target.value }))} className="dark:bg-slate-800 dark:border-slate-700 dark:text-white" /></div>
              <div>
                <Label className="dark:text-slate-300">Role</Label>
                <Select value={newUser.role} onValueChange={(v) => setNewUser((p) => ({ ...p, role: v as UserRole }))}>
                  <SelectTrigger className="dark:bg-slate-800 dark:border-slate-700 dark:text-white"><SelectValue /></SelectTrigger>
                  <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="manager">Manager</SelectItem>
                    <SelectItem value="agent">Agent</SelectItem>
                    <SelectItem value="viewer">Viewer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-3">
                <Label className="dark:text-slate-300 text-xs font-bold uppercase tracking-wider opacity-70">User Capabilities</Label>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 transition-colors">
                  {['View Overview', 'Scraper', 'Make a Call', 'Call Logs', 'Pipeline', 'Pricing', 'Settings', 'Analytics'].map((cap) => (
                    <div key={cap} className="flex items-center space-x-3 group">
                      <Checkbox
                        id={`cap-${cap}`}
                        checked={newUser.capabilities.includes(cap)}
                        onCheckedChange={() => toggleCapability(cap)}
                        className="data-[state=checked]:bg-[#172560] dark:data-[state=checked]:bg-blue-600 border-slate-300 dark:border-slate-600"
                      />
                      <label
                        htmlFor={`cap-${cap}`}
                        className="text-[13px] font-medium text-slate-600 dark:text-slate-400 group-hover:text-[#172560] dark:group-hover:text-blue-400 transition-colors cursor-pointer select-none"
                      >
                        {cap}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddUser(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Cancel</Button>
              <Button onClick={handleAddUser} className="bg-[#172560] dark:bg-blue-600 text-white hover:bg-[#172560]/90 dark:hover:bg-blue-700">{newUser.id ? 'Save Changes' : 'Add User'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // ── Tenant list view ──────────────────────────────────────────────────────
  return (
    <div className="space-y-5">

      {/* ── Summary stat cards (white, light icons, matching screenshot exactly) ── */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {/* Row 1 */}
        <div className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100/60 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between min-h-[125px] transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <div className="flex items-start justify-between">
            <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Total Campaigns</p>
            <div className="w-10 h-10 rounded-full bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-400 transition-transform duration-300 group-hover:scale-110">
              <Send className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{dispCampaigns}</p>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">↑ 12%</span>
          </div>
        </div>

        <div className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100/60 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between min-h-[125px] transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <div className="flex items-start justify-between">
            <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Total Conversations</p>
            <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-500/10 flex items-center justify-center text-blue-400 transition-transform duration-300 group-hover:scale-110">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{dispConvos}</p>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">↑ 8%</span>
          </div>
        </div>

        <div className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100/60 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between min-h-[125px] transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <div className="flex items-start justify-between">
            <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Total Calls</p>
            <div className="w-10 h-10 rounded-full bg-green-50 dark:bg-green-500/10 flex items-center justify-center text-green-400 transition-transform duration-300 group-hover:scale-110">
              <Phone className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{dispCalls}</p>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">↑ 20%</span>
          </div>
        </div>

        {/* Row 2 */}
        <div className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100/60 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between min-h-[125px] transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <div className="flex items-start justify-between">
            <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Total Pipeline Leads</p>
            <div className="w-10 h-10 rounded-full bg-cyan-50 dark:bg-cyan-500/10 flex items-center justify-center text-cyan-400 transition-transform duration-300 group-hover:scale-110">
              <Stethoscope className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{dispLeads}</p>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">↑ 15%</span>
          </div>
        </div>

        <div className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100/60 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between min-h-[125px] transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <div className="flex items-start justify-between">
            <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Voice Agents</p>
            <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-500/10 flex items-center justify-center text-purple-400 transition-transform duration-300 group-hover:scale-110">
              <Bot className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{dispAgents}</p>
          </div>
        </div>

        <div className="group bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100/60 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between min-h-[125px] transition-all duration-300 hover:shadow-md hover:-translate-y-1">
          <div className="flex items-start justify-between">
            <p className="text-[13px] font-medium text-slate-500 dark:text-slate-400">Active Users</p>
            <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-500/10 flex items-center justify-center text-indigo-400 transition-transform duration-300 group-hover:scale-110">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="flex items-end justify-between">
            <p className="text-3xl font-bold text-slate-800 dark:text-white tabular-nums tracking-tight">{dispUsers}</p>
            <span className="text-xs font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">↑ 5%</span>
          </div>
        </div>
      </div>

      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 w-[130px] text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm dark:text-white">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="healthy">Healthy</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
          </SelectContent>
        </Select>

        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="h-9 w-[130px] text-sm bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm dark:text-white">
            <SelectValue placeholder="All Plans" />
          </SelectTrigger>
          <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="free">Free</SelectItem>
            <SelectItem value="trial">Trial</SelectItem>
            <SelectItem value="starter">Starter</SelectItem>
            <SelectItem value="pro">Pro</SelectItem>
            <SelectItem value="professional">Professional</SelectItem>
            <SelectItem value="business">Business</SelectItem>
            <SelectItem value="enterprise">Enterprise</SelectItem>
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search tenants…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm text-sm dark:text-white"
          />
        </div>

        <Button
          onClick={() => setShowAddTenant(true)}
          className="ml-auto h-9 px-5 bg-[#172560] dark:bg-blue-600 text-white hover:bg-[#172560]/90 dark:hover:bg-blue-700 shadow-sm text-sm font-semibold rounded-full transition-all active:scale-95"
        >
          <Plus className="h-4 w-4 mr-2" /> Invite Tenant
        </Button>
      </div>

      {/* ── Tenant cards grid ──────────────────────────────────────────────── */}
      {isLoading && backendTenants.length === 0 ? (
        /* Skeleton loading cards while /tenants API resolves (can be slow) */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-100 dark:border-slate-800 p-5 h-36 animate-pulse shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="h-2.5 w-2.5 rounded-full bg-slate-200 dark:bg-slate-700" />
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
              </div>
              <div className="flex gap-1.5 mb-4">
                <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 rounded-full" />
                <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 rounded-full" />
              </div>
              <div className="flex gap-4">
                <div className="h-3 w-8 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-3 w-8 bg-slate-100 dark:bg-slate-800 rounded" />
                <div className="h-3 w-8 bg-slate-100 dark:bg-slate-800 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {displayedTenants.map((t) => (
            <button
              key={t.id}
              className="text-left w-full bg-white dark:bg-[#1e293b] rounded-2xl border border-slate-200/80 dark:border-slate-700 shadow-sm p-5 hover:shadow-md hover:border-[#172560]/30 transition-all duration-200 group"
              onClick={() => {
                setSelectedTenant(t);
                onTenantSelect?.(true);
              }}
            >
              {/* Name row */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {/* Status dot */}
                  <span className={`flex-shrink-0 h-2.5 w-2.5 rounded-full mt-0.5 ${['active', 'healthy'].includes(t.status) ? 'bg-green-500' :
                    t.status === 'warning' ? 'bg-amber-500' :
                      t.status === 'critical' ? 'bg-red-500' : 'bg-slate-400'
                    }`} />
                  <span className="font-bold text-[#172560] dark:text-white text-sm leading-tight group-hover:underline truncate">
                    {t.name}
                  </span>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0 group-hover:text-[#172560] dark:group-hover:text-blue-400 transition-colors mt-0.5" />
              </div>

              {/* Badges — status + plan side by side */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {/* Status badge */}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${planColor[t.status as TenantPlan] || 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                  {t.status}
                </span>
                {/* Plan badge */}
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize ${planColor[t.plan] || 'text-slate-600 bg-slate-100 border-slate-200'}`}>
                  {t.plan}
                </span>
              </div>

              {/* Icon metrics row */}
              <div className="flex items-center gap-4" title={`C: ${t.campaigns}, V: ${t.calls}`}>
                <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Send className="h-3.5 w-3.5 text-orange-400" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{t.campaigns ?? 0}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Phone className="h-3.5 w-3.5 text-green-400" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{t.calls ?? 0}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Bot className="h-3.5 w-3.5 text-purple-400" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{t.voiceAgents?.length ?? 0}</span>
                </span>
                <span className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <Users className="h-3.5 w-3.5 text-indigo-400" />
                  <span className="font-semibold text-slate-700 dark:text-slate-300">{t.activeUsers ?? 0}</span>
                </span>
              </div>
            </button>
          ))}

          {/* Empty states */}
          {backendTenants.length === 0 && (
            <div className="col-span-full flex flex-col items-center justify-center p-14 space-y-3 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-white/50 dark:bg-slate-900/20 backdrop-blur-sm">
              <div className="w-16 h-16 rounded-3xl bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mb-2 shadow-inner">
                <Users className="h-8 w-8 text-slate-300 dark:text-slate-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-700 dark:text-slate-200 text-lg">No Tenants Found</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                  We couldn't fetch any tenant data. This might be a connection issue or an empty database.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => window.location.reload()} className="mt-4 rounded-xl border-slate-200 dark:border-slate-700 dark:text-white dark:hover:bg-slate-800">
                <RotateCcw className="h-3.5 w-3.5 mr-2" /> Refresh Page
              </Button>
            </div>
          )}
          {backendTenants.length > 0 && displayedTenants.length === 0 && (
            <p className="col-span-full text-center text-muted-foreground py-8 text-sm">
              No tenants match your filters.
            </p>
          )}
        </div>
      )}

      {/* ── Add Tenant Dialog (unchanged) ──────────────────────────────────── */}
      <Dialog open={showAddTenant} onOpenChange={setShowAddTenant}>
        <DialogContent className="max-w-md dark:bg-slate-900 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-[#172560] dark:text-blue-400">Invite Tenant</DialogTitle>
            <DialogDescription className="dark:text-slate-400">Quickly onboard a new organization by their email.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email" className="text-sm font-semibold text-slate-700 dark:text-slate-300">Work Email Address</Label>
              <div className="relative">
                <Input
                  id="invite-email"
                  type="email"
                  placeholder="name@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="pl-4 h-12 bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-950 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-xl shadow-sm dark:text-white dark:placeholder:text-slate-500"
                />
              </div>
            </div>

            <div className="flex items-center space-x-3 p-4 bg-blue-50/50 dark:bg-blue-500/10 rounded-2xl border border-blue-100/50 dark:border-blue-500/20 transition-all hover:bg-blue-50 dark:hover:bg-blue-500/20">
              <input
                type="checkbox"
                id="auto-invite"
                checked={autoSendInvite}
                onChange={(e) => setAutoSendInvite(e.target.checked)}
                className="h-5 w-5 rounded-lg border-blue-300 dark:border-blue-700 text-blue-600 focus:ring-blue-500 transition-all cursor-pointer"
              />
              <div className="space-y-0.5 cursor-pointer" onClick={() => setAutoSendInvite(!autoSendInvite)}>
                <label htmlFor="auto-invite" className="text-sm font-bold text-blue-900 dark:text-blue-200 cursor-pointer">
                  Send invitation email automatically
                </label>
                <p className="text-xs text-blue-600/80 dark:text-blue-400/80">
                  Recipient will receive a secure onboarding link immediately.
                </p>
              </div>
            </div>
          </div >
          <DialogFooter className="sm:justify-between gap-3">
            <Button
              variant="ghost"
              onClick={() => setShowAddTenant(false)}
              className="text-slate-500 hover:bg-slate-100 h-11 px-6 rounded-xl font-medium"
            >
              Cancel
            </Button>
            <Button
              onClick={handleInviteTenant}
              disabled={!inviteEmail || isInviting}
              className="bg-[#172560] text-white hover:bg-[#111f4d] shadow-lg shadow-blue-900/10 h-11 px-8 rounded-xl font-bold transition-all transform active:scale-95"
            >
              {isInviting ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </div>
              ) : (
                'Send Invitation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent >
      </Dialog >
    </div >
  );
}