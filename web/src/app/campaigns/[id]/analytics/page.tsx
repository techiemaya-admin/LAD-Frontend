'use client';
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ArrowLeft, TrendingUp, Users, Send, CheckCircle, Mail, ExternalLink,
  AlertCircle, Linkedin, Phone, MessageCircle,
  Reply, MousePointerClick, BarChart, Activity, Rocket, Zap, Lightbulb,
  Megaphone, Gauge, Moon, Sun, Wifi, WifiOff, Loader2, RadioTower,
  SquarePen, Sparkles, ChevronDown, ChevronUp, RefreshCw
} from 'lucide-react';
import { useCampaignAnalytics, useCampaignLeads } from '@lad/frontend-features/campaigns';
import { useToast } from '@/components/ui/app-toaster';
import AnalyticsCharts from '@/components/analytics/AnalyticsCharts';
import { LiveActivityTable } from '@/components/campaigns';
import { LiveBadge } from '@/components/LiveBadge';
import { proxyPost } from '@/lib/api';

const platformConfig = {
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: '#0A66C2',
    gradient: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)',
  },
  email: {
    name: 'Email',
    icon: Mail,
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: MessageCircle,
    color: '#25D366',
    gradient: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
  },
  voice: {
    name: 'Voice',
    icon: Phone,
    color: '#8B5CF6',
    gradient: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  },
};

export default function CampaignAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { push } = useToast();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { analytics, loading, error } = useCampaignAnalytics(campaignId);
  // SSE connection for real-time updates is handled in useCampaignAnalytics hook
  const isConnected = analytics?.campaign?.status === 'running';

  // ── Bulk Follow-up state ───────────────────────────────────────────────────
  const { leads: allLeads, loading: leadsLoading } = useCampaignLeads(campaignId);
  const [followupPanelOpen, setFollowupPanelOpen] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<string>>(new Set());
  const [bulkChannel, setBulkChannel] = useState<string>('');
  const [bulkStatus, setBulkStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [leadProgress, setLeadProgress] = useState<Array<{ id: string; name: string; status: 'pending' | 'sending' | 'done' | 'error'; message?: string; error?: string }>>([]);
  const [bulkDoneCount, setBulkDoneCount] = useState(0);

  // ── All bulk follow-up hooks MUST live here — before any early returns ─────

  // Channels used in this campaign (derived from step_analytics; safe when analytics is null)
  const campaignChannels = useMemo(() => {
    const types = (analytics as any)?.step_analytics?.map((s: any) => s.type?.toLowerCase()) || [];
    const channels: { value: string; label: string; icon: React.ReactNode }[] = [];
    if (types.some((t: string) => t.includes('linkedin')))
      channels.push({ value: 'linkedin', label: 'LinkedIn', icon: <Linkedin className="w-3.5 h-3.5" /> });
    if (types.some((t: string) => t.includes('email')))
      channels.push({ value: 'email',    label: 'Email',    icon: <Mail className="w-3.5 h-3.5" /> });
    if (types.some((t: string) => t.includes('whatsapp')))
      channels.push({ value: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle className="w-3.5 h-3.5" /> });
    return channels;
  }, [analytics]);

  // LinkedIn → only accepted-connection leads; email/whatsapp → all leads
  const selectableLeads = useMemo(() => {
    if (!allLeads) return [];
    if (bulkChannel === 'linkedin') {
      return (allLeads as any[]).filter((l: any) =>
        l.has_connected === true ||
        l.status?.toLowerCase().includes('connect') ||
        l.status?.toLowerCase().includes('accept')
      );
    }
    return allLeads as any[];
  }, [allLeads, bulkChannel]);

  // Auto-select the first available channel once analytics load
  useEffect(() => {
    if (campaignChannels.length && !bulkChannel) {
      setBulkChannel(campaignChannels[0].value);
    }
  }, [campaignChannels, bulkChannel]);

  // Drop selected leads that are no longer in the selectable set when channel changes
  useEffect(() => {
    if (!selectableLeads.length) return;
    const validIds = new Set(selectableLeads.map((l: any) => l.id));
    setSelectedLeadIds(prev => {
      const filtered = new Set([...prev].filter(id => validIds.has(id)));
      return filtered.size === prev.size ? prev : filtered;
    });
  }, [selectableLeads]);

  // Total manual follow-ups sent across all leads in this campaign
  const totalFollowupsSent = useMemo(
    () => ((allLeads as any[]) || []).reduce((sum: number, l: any) => sum + (l.manual_followup_count || 0), 0),
    [allLeads]
  );

  const toggleLead = useCallback((id: string) => {
    setSelectedLeadIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    const ids = selectableLeads.map((l: any) => l.id);
    setSelectedLeadIds(prev => prev.size === ids.length ? new Set() : new Set(ids));
  }, [selectableLeads]);

  const startBulkFollowup = useCallback(async () => {
    if (!selectedLeadIds.size || !bulkChannel) return;
    const selected = selectableLeads.filter((l: any) => selectedLeadIds.has(l.id));
    const initial = selected.map((l: any) => ({
      id: l.id, name: l.name || l.first_name || 'Lead', status: 'pending' as const,
    }));
    setLeadProgress(initial);
    setBulkDoneCount(0);
    setBulkStatus('running');

    let done = 0;
    for (const lead of selected) {
      setLeadProgress(prev => prev.map(p => p.id === lead.id ? { ...p, status: 'sending' } : p));
      try {
        const preview = await proxyPost<{ success: boolean; message: string | null; error?: string }>(
          `/api/campaigns/${campaignId}/leads/${lead.id}/preview-followup`,
          { channel: bulkChannel }
        );
        if (!preview.success || !preview.message) throw new Error(preview.error || 'No message generated');
        const send = await proxyPost<{ success: boolean; error?: string }>(
          `/api/campaigns/${campaignId}/leads/${lead.id}/send-followup`,
          { channel: bulkChannel, message: preview.message }
        );
        if (!send.success) throw new Error(send.error || 'Send failed');
        done++;
        setBulkDoneCount(done);
        setLeadProgress(prev => prev.map(p => p.id === lead.id ? { ...p, status: 'done', message: preview.message! } : p));
      } catch (e: any) {
        done++;
        setBulkDoneCount(done);
        setLeadProgress(prev => prev.map(p => p.id === lead.id ? { ...p, status: 'error', error: e.message } : p));
      }
    }
    setBulkStatus('done');
    push({ title: 'Follow-up Complete', description: `Sent ${done} messages via ${bulkChannel}` });
  }, [selectedLeadIds, bulkChannel, selectableLeads, campaignId, push]);

  // ── Error handler (also a hook — stays before early returns) ─────────────
  useEffect(() => {
    if (error) {
      push({ variant: 'error', title: 'Error', description: String(error) || 'Failed to load analytics' });
      router.push('/campaigns');
    }
  }, [error, push, router]);

  if (loading) {
    return (
      <div className="p-3 bg-[#F8F9FE] dark:bg-[#000724] h-full overflow-auto">
        {/* Skeleton Header */}
        <div className="mb-5 flex flex-col sm:flex-row justify-between mt-10 items-stretch sm:items-start gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-8 w-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-10 w-64 bg-gray-200 rounded animate-pulse"></div>
            </div>
            <div className="flex items-center gap-3 ml-11 flex-wrap">
              <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-6 w-16 bg-gray-200 rounded animate-pulse"></div>
              <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-28 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>
        </div>

        {/* Skeleton Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>

        {/* Skeleton Activity Table */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm mb-8">
          <div className="p-4 border-b border-[#E2E8F0]">
            <div className="flex justify-between items-center">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
              <div className="flex gap-2">
                <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
          </div>
          <div className="p-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex gap-4 py-3 border-b border-gray-100">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-40 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton Charts */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 mb-8">
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-64 bg-gray-200 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Skeleton 3-Column Metrics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-9 w-9 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-3 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded animate-pulse"></div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!analytics || !analytics.campaign) {
    return (
      <div className="p-6 bg-slate-900 min-h-screen">
        <p className="text-white">No analytics data available</p>
        <Button onClick={() => router.push('/campaigns')} className="mt-4">
          Back to Campaigns
        </Button>
      </div>
    );
  }

  const stepTypes = analytics?.step_analytics?.map((s: any) => s.type?.toLowerCase()) || [];
  const hasLinkedIn = stepTypes.some((t: string) => t?.includes('linkedin') || t?.includes('connection'));
  const hasEmail = stepTypes.some((t: string) => t?.includes('email'));
  const hasWhatsApp = stepTypes.some((t: string) => t?.includes('whatsapp'));
  const hasVoice = stepTypes.some((t: string) => t?.includes('voice') || t?.includes('call'));

  // Dynamic label for sent metric based on primary outreach type
  const sentLabel = hasLinkedIn ? 'Connections Sent' : hasEmail ? 'Emails Sent' : hasWhatsApp ? 'WhatsApp Sent' : hasVoice ? 'Calls Made' : 'Messages Sent';

  // Calculate the primary sent count based on campaign type
  const analyticsAny = analytics as any;
  const primarySentCount = hasLinkedIn
    ? (analyticsAny?.platform_metrics?.linkedin?.sent ?? 0)
    : hasEmail
      ? (analyticsAny?.platform_metrics?.email?.sent ?? 0)
      : hasWhatsApp
        ? (analyticsAny?.platform_metrics?.whatsapp?.sent ?? 0)
        : hasVoice
          ? (analyticsAny?.platform_metrics?.voice?.sent ?? 0)
          : (analytics.overview.sent);

  const platformAnalytics = [
    hasLinkedIn && {
      platform: 'linkedin',
      actions: analyticsAny?.platform_metrics?.linkedin?.sent ?? analytics?.metrics?.connection_requests_sent ?? 0,
      sent: analyticsAny?.platform_metrics?.linkedin?.sent ?? analytics?.metrics?.linkedin_messages_sent ?? 0,
      connected: analyticsAny?.platform_metrics?.linkedin?.connected ?? analytics?.metrics?.connection_requests_accepted ?? 0,
      replied: analyticsAny?.platform_metrics?.linkedin?.replied ?? analytics?.metrics?.linkedin_messages_replied ?? 0,
      rate: analyticsAny?.platform_metrics?.linkedin?.sent ? ((analyticsAny.platform_metrics.linkedin.connected / analyticsAny.platform_metrics.linkedin.sent) * 100) : (analytics?.metrics?.connection_rate ?? 0)
    },
    hasEmail && {
      platform: 'email',
      actions: analyticsAny?.platform_metrics?.email?.sent ?? analytics?.metrics?.emails_sent ?? 0,
      sent: analyticsAny?.platform_metrics?.email?.sent ?? analytics?.metrics?.emails_sent ?? 0,
      connected: analyticsAny?.platform_metrics?.email?.connected ?? analytics?.overview?.connected ?? 0,
      replied: analyticsAny?.platform_metrics?.email?.replied ?? analytics?.overview?.replied ?? 0,
      rate: analyticsAny?.platform_metrics?.email?.sent ? ((analyticsAny.platform_metrics.email.replied / analyticsAny.platform_metrics.email.sent) * 100) : (analytics?.metrics?.open_rate ?? 0)
    },
    hasWhatsApp && {
      platform: 'whatsapp',
      actions: analyticsAny?.platform_metrics?.whatsapp?.sent ?? analytics?.metrics?.whatsapp_messages_sent ?? 0,
      sent: analyticsAny?.platform_metrics?.whatsapp?.sent ?? analytics?.metrics?.whatsapp_messages_sent ?? 0,
      connected: analyticsAny?.platform_metrics?.whatsapp?.connected ?? 0,
      replied: analyticsAny?.platform_metrics?.whatsapp?.replied ?? analytics?.metrics?.whatsapp_messages_replied ?? 0,
      rate: analyticsAny?.platform_metrics?.whatsapp?.sent ? ((analyticsAny.platform_metrics.whatsapp.replied / analyticsAny.platform_metrics.whatsapp.sent) * 100) : (analytics?.metrics?.reply_rate ?? 0)
    },
    hasVoice && {
      platform: 'voice',
      actions: analyticsAny?.platform_metrics?.voice?.sent ?? analytics?.metrics?.voice_calls_made ?? 0,
      sent: analyticsAny?.platform_metrics?.voice?.sent ?? analytics?.metrics?.voice_calls_made ?? 0,
      connected: analyticsAny?.platform_metrics?.voice?.connected ?? analytics?.metrics?.voice_calls_answered ?? 0,
      replied: analyticsAny?.platform_metrics?.voice?.replied ?? 0,
      rate: analyticsAny?.platform_metrics?.voice?.sent ? ((analyticsAny.platform_metrics.voice.connected / analyticsAny.platform_metrics.voice.sent) * 100) : (((analytics?.metrics?.voice_calls_answered ?? 0) / (analytics?.metrics?.voice_calls_made || 1)) * 100)
    },
  ].filter(Boolean);

  // ── Chart data for AnalyticsCharts ─────────────────────────────────────────
  const extendedAnalytics = analytics as any;

  // 1. Timeline — multi-series daily data
  const chartTimeline: Array<{ date: string; sent?: number; delivered?: number; connected?: number; replied?: number }> =
    extendedAnalytics?.timeline?.length
      ? extendedAnalytics.timeline.map((t: any) => ({
          date:      t.date,
          sent:      t.sent      ?? undefined,
          delivered: t.delivered ?? undefined,
          connected: t.connected ?? undefined,
          replied:   t.replied   ?? undefined,
        }))
      : [
          { date: 'Campaign', sent: analytics?.overview?.sent ?? 0, connected: analytics?.overview?.connected ?? 0, replied: analytics?.overview?.replied ?? 0 },
        ];

  // 2. Conversion Funnel with colours
  const funnelStageLabel = hasLinkedIn ? 'Connected' : hasEmail ? 'Delivered' : hasWhatsApp ? 'Delivered' : hasVoice ? 'Answered' : 'Messaged';
  const funnelStageCount = hasLinkedIn
    ? (analytics?.overview?.connected ?? 0)
    : (analytics?.overview?.delivered ?? 0);
  const chartFunnel = [
    { stage: 'Leads',    count: analytics?.overview?.total_leads ?? 0,             color: '#0b1957' },
    { stage: 'Sent',     count: analytics?.overview?.sent        ?? 0,             color: '#6366f1' },
    { stage: funnelStageLabel, count: funnelStageCount,                            color: '#06b6d4' },
    { stage: 'Replied',  count: analytics?.overview?.replied     ?? 0,             color: '#22c55e' },
  ].filter(s => s.count > 0 || s.stage === 'Leads');

  // 3. Step performance
  const chartSteps = (analytics?.step_analytics ?? []).map((s: any) => ({
    title:     s.title || s.type || 'Step',
    sent:      s.sent      || s.total_executions || 0,
    connected: s.connected || 0,
    replied:   s.replied   || 0,
    errors:    s.errors    || 0,
  }));

  // 4. Lead status donut
  const chartLeadStatus = [
    { name: 'Active',    value: analytics?.overview?.active_leads    ?? 0, color: '#6366f1' },
    { name: 'Completed', value: analytics?.overview?.completed_leads ?? 0, color: '#22c55e' },
    { name: 'Stopped',   value: analytics?.overview?.stopped_leads   ?? 0, color: '#f43f5e' },
    { name: 'Pending',   value: Math.max(
        (analytics?.overview?.total_leads ?? 0) -
        (analytics?.overview?.active_leads ?? 0) -
        (analytics?.overview?.completed_leads ?? 0) -
        (analytics?.overview?.stopped_leads ?? 0),
        0
      ), color: '#94a3b8' },
  ];

  // 5. Channel comparison
  const chartChannels = [
    hasLinkedIn && { name: 'LinkedIn',  sent: analyticsAny?.platform_metrics?.linkedin?.sent  ?? 0, connected: analyticsAny?.platform_metrics?.linkedin?.connected  ?? 0, replied: analyticsAny?.platform_metrics?.linkedin?.replied  ?? 0 },
    hasEmail    && { name: 'Email',     sent: analyticsAny?.platform_metrics?.email?.sent     ?? 0, connected: analyticsAny?.platform_metrics?.email?.connected     ?? 0, replied: analyticsAny?.platform_metrics?.email?.replied     ?? 0 },
    hasWhatsApp && { name: 'WhatsApp',  sent: analyticsAny?.platform_metrics?.whatsapp?.sent  ?? 0, connected: analyticsAny?.platform_metrics?.whatsapp?.connected  ?? 0, replied: analyticsAny?.platform_metrics?.whatsapp?.replied  ?? 0 },
    hasVoice    && { name: 'Voice',     sent: analyticsAny?.platform_metrics?.voice?.sent     ?? 0, connected: analyticsAny?.platform_metrics?.voice?.connected     ?? 0, replied: analyticsAny?.platform_metrics?.voice?.replied     ?? 0 },
  ].filter(Boolean) as Array<{ name: string; sent: number; connected: number; replied: number }>;

  const campaignType = hasLinkedIn ? 'linkedin' : hasEmail ? 'email' : hasWhatsApp ? 'whatsapp' : hasVoice ? 'voice' : 'mixed';

  // Theme colors
  const theme = {
    bg: isDarkMode ? '#1644ad' : 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 50%, #DDD6FE 100%)',
    cardBg: isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'white',
    cardBorder: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
    textPrimary: isDarkMode ? 'white' : '#1E293B',
    textSecondary: isDarkMode ? 'rgba(255,255,255,0.6)' : '#64748B',
    textTertiary: isDarkMode ? 'rgba(255,255,255,0.5)' : '#94A3B8',
    statBg: isDarkMode ? 'rgba(255,255,255,0.05)' : '#F8FAFC',
    statBorder: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
    progressBg: isDarkMode ? 'rgba(255,255,255,0.1)' : '#E2E8F0',
  };

  return (
    <div className="p-3 bg-[#F8F9FE] dark:bg-[#000724] h-full overflow-auto">
      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row justify-between mt-10 items-stretch sm:items-start gap-4">
        <div className="flex-1">
          <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns')} className="h-8 w-8">
            <ArrowLeft className="w-6 h-6" />
          </Button>
          <div className="flex items-center gap-3 mb-3">

            <RadioTower className="w-8 h-8 text-[#1E293B] dark:text-white" />
            <h1 className="text-2xl sm:text-4xl font-bold text-[#1E293B] dark:text-white capitalize">
              {analytics.campaign.name}
            </h1>
          </div>
          <div className="flex items-center gap-3 ml-11 flex-wrap">
            <Badge className="capitalize" style={{ backgroundColor: analytics.campaign.status === 'running' ? '#dbfce7' : '#FEF3C7', color: analytics.campaign.status === 'running' ? 'green' : '#D97706' }}>
              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: analytics.campaign.status === 'running' ? '#10B981' : '#F59E0B' }} />
              {analytics.campaign.status}
            </Badge>
            <LiveBadge isConnected={isConnected} showOffline className="font-semibold" />
            <p className="text-sm text-[#64748B] dark:text-[#7a8ba3]">Created {new Date(analytics.campaign.created_at).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="flex gap-3 items-start">
          <Button
            onClick={() => router.push(`/campaigns/${campaignId}/analytics/leads`)}
            className="bg-[#0b1957] text-white rounded-xl font-semibold px-3 py-1.5 shadow-[0_4px_20px_rgba(11,25,87,0.3)] hover:bg-[#0a1540]"
          >
            <Users className="w-4 h-4 mr-2" />
            View Leads
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/onboarding?campaignId=${campaignId}`)}
            className="border-[#0b1957] text-[#0b1957] font-semibold border-2 hover:bg-[#0b1957]/5 rounded-xl"
          >
            <SquarePen />
            Edit Campaign
          </Button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="flex gap-4 mb-6 flex-wrap items-stretch">
        {/* Total Leads */}
        <div
          className="w-full sm:w-[calc(50%-8px)] md:w-[calc(25%-12px)] cursor-pointer"
          onClick={() => router.push(`/campaigns/${campaignId}/analytics/leads?filter=all`)}
        >
          <div className="bg-white dark:bg-[#1a2a43] rounded-[20px] border border-slate-200 dark:border-[#262831] shadow-sm w-full flex flex-col h-full min-h-[120px] transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.02]">
            <div className="flex-1 flex flex-col p-4">
              <div className="flex flex-col h-full">
                <div className="flex justify-end mb-2">
                  <Avatar className="bg-blue-100 w-12 h-12 rounded-full">
                    <AvatarFallback className="bg-blue-100">
                      <Users className="w-6 h-6 text-blue-600" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <p className="text-sm text-slate-500 dark:text-[#7a8ba3] mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    Total Leads
                  </p>
                  <h5 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {analytics.overview.total_leads}
                  </h5>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sent (Dynamic) */}
        <div
          className="w-full sm:w-[calc(50%-8px)] md:w-[calc(25%-12px)] cursor-pointer"
          onClick={() => router.push(`/campaigns/${campaignId}/analytics/leads?filter=sent`)}
        >
          <div className="bg-white dark:bg-[#1a2a43] rounded-[20px] border border-slate-200 dark:border-[#262831] shadow-sm w-full flex flex-col h-full min-h-[120px] transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.02]">
            <div className="flex-1 flex flex-col p-4">
              <div className="flex flex-col h-full">
                <div className="flex justify-end mb-2">
                  <Avatar className="bg-green-100 w-12 h-12 rounded-full">
                    <AvatarFallback className="bg-green-100">
                      <Send className="w-6 h-6 text-green-600" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <p className="text-sm text-slate-500 dark:text-[#7a8ba3] mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {sentLabel}
                  </p>
                  <h5 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {primarySentCount}
                  </h5>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Connected */}
        <div
          className="w-full sm:w-[calc(50%-8px)] md:w-[calc(25%-12px)] cursor-pointer"
          onClick={() => router.push(`/campaigns/${campaignId}/analytics/leads?filter=connected`)}
        >
          <div className="bg-white dark:bg-[#1a2a43] rounded-[20px] border border-slate-200 dark:border-[#262831] shadow-sm w-full flex flex-col h-full min-h-[120px] transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.02]">
            <div className="flex-1 flex flex-col p-4">
              <div className="flex flex-col h-full">
                <div className="flex justify-end mb-2">
                  <Avatar className="bg-indigo-100 w-12 h-12 rounded-full">
                    <AvatarFallback className="bg-indigo-100">
                      <Linkedin className="w-6 h-6 text-indigo-600" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <p className="text-sm text-slate-500 dark:text-[#7a8ba3] mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    Connected
                  </p>
                  <h5 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {analytics.overview.connected}
                  </h5>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Replied */}
        <div
          className="w-full sm:w-[calc(50%-8px)] md:w-[calc(25%-12px)] cursor-pointer"
          onClick={() => router.push(`/campaigns/${campaignId}/analytics/leads?filter=replied`)}
        >
          <div className="bg-white dark:bg-[#1a2a43] rounded-[20px] border border-slate-200 dark:border-[#262831] shadow-sm w-full flex flex-col h-full min-h-[120px] transition-all duration-300 ease-out hover:shadow-md hover:scale-[1.02]">
            <div className="flex-1 flex flex-col p-4">
              <div className="flex flex-col h-full">
                <div className="flex justify-end mb-2">
                  <Avatar className="bg-amber-100 w-12 h-12 rounded-full">
                    <AvatarFallback className="bg-amber-100">
                      <Reply className="w-6 h-6 text-amber-600" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <p className="text-sm text-slate-500 dark:text-[#7a8ba3] mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    Lead Contact Back
                  </p>
                  <h5 className="text-2xl font-bold text-slate-800 dark:text-white">
                    {analytics.overview.replied}
                  </h5>
                  {/* Follow-ups sent sub-stat */}
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100">
                    <Sparkles className="w-3.5 h-3.5 text-violet-500 flex-shrink-0" />
                    <span className="text-xs text-slate-500">Follow-ups sent:</span>
                    <span className="text-sm font-bold text-violet-600">{totalFollowupsSent}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="mb-8">
        <LiveActivityTable
          campaignId={campaignId}
          maxHeight={500}
          pageSize={20}
          campaignSteps={analytics?.step_analytics}
        />
      </div>

      {/* ── Bulk Follow-up Panel ────────────────────────────────────────── */}
      <div className="mb-8">
        {/* Collapsed header — always visible */}
        <button
          onClick={() => { setFollowupPanelOpen(v => !v); setBulkStatus('idle'); setLeadProgress([]); setSelectedLeadIds(new Set()); }}
          className="w-full flex items-center justify-between px-5 py-4 bg-white dark:bg-[#1a2a43] rounded-2xl border border-slate-200 dark:border-[#262831] shadow-sm hover:border-[#0b1957]/40 hover:shadow-md transition-all"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#0b1957]/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-[#0b1957]" />
            </div>
            <div className="text-left">
              <p className="font-bold text-[#1E293B] dark:text-white text-base">Send Follow-up</p>
              <p className="text-xs text-slate-500 dark:text-[#7a8ba3]">Select leads → choose channel → AI generates personalised messages and sends</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {selectedLeadIds.size > 0 && !followupPanelOpen && (
              <span className="text-xs bg-[#0b1957] text-white px-2.5 py-1 rounded-full font-semibold">
                {selectedLeadIds.size} selected
              </span>
            )}
            {followupPanelOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </div>
        </button>

        {/* Expanded panel */}
        {followupPanelOpen && (
          <div className="mt-2 bg-white dark:bg-[#1a2a43] rounded-2xl border border-slate-200 dark:border-[#262831] shadow-sm overflow-hidden">
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 px-5 py-4 border-b border-slate-100">
              {/* Select all */}
              <div className="flex items-center gap-2 mr-2">
                <Checkbox
                  id="select-all"
                  checked={selectedLeadIds.size > 0 && selectedLeadIds.size === selectableLeads.length}
                  onCheckedChange={toggleAll}
                  disabled={selectableLeads.length === 0}
                />
                <label htmlFor="select-all" className="text-sm font-medium text-slate-600 cursor-pointer select-none">
                  {selectedLeadIds.size === selectableLeads.length && selectedLeadIds.size > 0
                    ? 'Deselect all'
                    : `Select all (${selectableLeads.length})`}
                </label>
              </div>

              {selectedLeadIds.size > 0 && (
                <span className="text-xs bg-[#0b1957]/10 text-[#0b1957] px-2.5 py-1 rounded-full font-semibold">
                  {selectedLeadIds.size} selected
                </span>
              )}

              <div className="flex-1" />

              {/* Channel dropdown */}
              <Select value={bulkChannel} onValueChange={setBulkChannel}>
                <SelectTrigger className="w-40 h-9 text-sm rounded-xl border-slate-200">
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {campaignChannels.map(ch => (
                    <SelectItem key={ch.value} value={ch.value}>
                      <span className="flex items-center gap-2">{ch.icon}{ch.label}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Send button */}
              <Button
                onClick={startBulkFollowup}
                disabled={!selectedLeadIds.size || !bulkChannel || bulkStatus === 'running'}
                className="bg-[#0b1957] hover:bg-[#1a2d8f] text-white rounded-xl h-9 px-4 gap-2 text-sm font-semibold shadow-sm"
              >
                {bulkStatus === 'running' ? (
                  <><Loader2 className="w-4 h-4 animate-spin" />Sending {bulkDoneCount}/{selectedLeadIds.size}…</>
                ) : (
                  <><Sparkles className="w-4 h-4" />Send Follow-up</>
                )}
              </Button>
            </div>

            {/* Progress list (shown during / after send) */}
            {leadProgress.length > 0 && (
              <div className="px-5 py-3 border-b border-slate-100 max-h-48 overflow-y-auto">
                <div className="space-y-1.5">
                  {leadProgress.map(p => (
                    <div key={p.id} className="flex items-center gap-3 text-sm py-1">
                      <div className="w-5 flex-shrink-0">
                        {p.status === 'pending'  && <div className="w-2 h-2 rounded-full bg-slate-300 mx-auto" />}
                        {p.status === 'sending'  && <Loader2 className="w-4 h-4 animate-spin text-[#0b1957]" />}
                        {p.status === 'done'     && <CheckCircle className="w-4 h-4 text-green-500" />}
                        {p.status === 'error'    && <AlertCircle className="w-4 h-4 text-red-400" />}
                      </div>
                      <span className="font-medium text-slate-700 w-36 truncate">{p.name}</span>
                      {p.status === 'done'  && <span className="text-xs text-slate-400 truncate flex-1">{p.message}</span>}
                      {p.status === 'error' && <span className="text-xs text-red-400 truncate flex-1">{p.error}</span>}
                      {p.status === 'sending' && <span className="text-xs text-[#0b1957] flex-1 flex items-center gap-1"><Sparkles className="w-3 h-3 animate-pulse" />Researching & generating…</span>}
                      {p.status === 'pending' && <span className="text-xs text-slate-300 flex-1">Queued</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lead list with checkboxes */}
            {bulkStatus !== 'running' && (
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {leadsLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Loading leads…</span>
                  </div>
                ) : selectableLeads.length === 0 ? (
                  <div className="text-center py-10 px-6">
                    {bulkChannel === 'linkedin' ? (
                      <>
                        <Linkedin className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm font-medium text-slate-500">No connected leads yet</p>
                        <p className="text-xs text-slate-400 mt-1">LinkedIn follow-ups can only be sent to leads who have accepted your connection request. Switch to Email or WhatsApp to reach all leads.</p>
                      </>
                    ) : (
                      <p className="text-sm text-slate-400">No leads found for this campaign</p>
                    )}
                  </div>
                ) : (
                  selectableLeads.map((lead: any) => (
                    <div
                      key={lead.id}
                      onClick={() => toggleLead(lead.id)}
                      className={`flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${selectedLeadIds.has(lead.id) ? 'bg-[#0b1957]/5' : ''}`}
                    >
                      <Checkbox
                        checked={selectedLeadIds.has(lead.id)}
                        onCheckedChange={() => toggleLead(lead.id)}
                        onClick={e => e.stopPropagation()}
                      />
                      {lead.photo_url ? (
                        <img src={lead.photo_url} alt={lead.name} className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-slate-500">
                            {(lead.first_name?.[0] || lead.name?.[0] || '?').toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{lead.name || `${lead.first_name || ''} ${lead.last_name || ''}`.trim()}</p>
                        <p className="text-xs text-slate-400 truncate">{[lead.title, lead.company].filter(Boolean).join(' · ')}</p>
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0 items-center">
                        {(lead.has_connected || lead.status?.includes('connect')) && (
                          <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">Connected</span>
                        )}
                        {(lead.has_replied || lead.status?.includes('repli')) && (
                          <span className="text-xs bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full font-medium">Replied</span>
                        )}
                        {(lead.has_sent || lead.status?.includes('sent')) && !lead.has_connected && (
                          <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full font-medium">Sent</span>
                        )}
                        {/* Follow-up count badge — increments in real-time via leadProgress */}
                        {(() => {
                          const sentNow = leadProgress.find(p => p.id === lead.id && p.status === 'done') ? 1 : 0;
                          const total = (lead.manual_followup_count || 0) + sentNow;
                          return total > 0 ? (
                            <span className="text-xs bg-violet-50 text-violet-600 border border-violet-200 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              {total} follow-up{total !== 1 ? 's' : ''}
                            </span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Done summary */}
            {bulkStatus === 'done' && (
              <div className="px-5 py-3 bg-green-50 border-t border-green-100 flex items-center justify-between">
                <p className="text-sm font-semibold text-green-700">
                  ✓ Sent {leadProgress.filter(p => p.status === 'done').length} follow-ups via {bulkChannel}
                  {leadProgress.filter(p => p.status === 'error').length > 0 && (
                    <span className="text-red-500 ml-2">({leadProgress.filter(p => p.status === 'error').length} failed)</span>
                  )}
                </p>
                <button
                  onClick={() => { setBulkStatus('idle'); setLeadProgress([]); setSelectedLeadIds(new Set()); }}
                  className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Reset
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Analytics Charts Section */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="w-11 h-11 bg-white border border-slate-200 shadow-sm">
            <AvatarFallback><BarChart className="w-5 h-5 text-[#0b1957]" /></AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h5 className="text-xl font-bold text-[#1E293B] dark:text-white">Visual Analytics</h5>
            <p className="text-sm text-[#64748B] dark:text-[#7a8ba3]">Charts and graphs for deeper insights</p>
          </div>
          <LiveBadge isConnected={isConnected} className="font-semibold animate-pulse text-xs" />
        </div>
        <div style={{
          '--card-bg': isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'white',
          '--card-border': theme.cardBorder,
          '--text-primary': theme.textPrimary,
          '--text-secondary': theme.textSecondary,
        } as React.CSSProperties}>
          <AnalyticsCharts data={{
            timeline:         chartTimeline,
            funnel:           chartFunnel,
            steps:            chartSteps,
            leadStatus:       chartLeadStatus,
            channelBreakdown: chartChannels,
            campaignType,
          }} />
        </div>
      </div>

      {/* Performance Metrics - 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Channel Performance */}
        {platformAnalytics.length > 0 && (
          <Card className="bg-white dark:bg-[#1a2a43] border border-[#E2E8F0] dark:border-[#262831] shadow-sm rounded-xl h-full transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Avatar className="w-9 h-9 bg-white border border-slate-200 shadow-sm">
                  <AvatarFallback><Lightbulb className="w-4 h-4 " /></AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h6 className="text-lg font-bold text-[#1E293B] dark:text-white">Channel Performance</h6>
                  <p className="text-xs text-[#64748B] dark:text-[#7a8ba3]">Active channels</p>
                </div>
                <LiveBadge isConnected={isConnected} className="font-semibold animate-pulse text-xs" />
              </div>
              <div className="flex flex-col gap-4">
                {platformAnalytics.map((item: any) => {
                  const config = platformConfig[item.platform as keyof typeof platformConfig];
                  const PlatformIcon = config.icon;

                  const computedRate = item.sent
                    ? ((item.connected + item.replied) / item.sent) * 100
                    : item.actions
                      ? ((item.connected + item.replied) / item.actions) * 100
                      : 0;
                  const safeRate = Number.isFinite(computedRate) ? computedRate : 0;

                  return (
                    <div key={item.platform} className="p-4 rounded-lg border border-[#E2E8F0] dark:border-[#262831] bg-white dark:bg-[#253456]">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8" style={{ backgroundColor: `${config.color}20` }}>
                            <AvatarFallback>
                              <PlatformIcon className="w-4 h-4" style={{ color: config.color }} />
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-semibold text-[#1E293B]">{config.name}</p>
                            <p className="text-xs text-[#64748B]">{item.actions > 0 ? 'Active' : 'Ready'}</p>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2 mb-3">
                        <div className="text-center">
                          <p className="text-lg font-bold" style={{ color: config.color }}>{item.actions}</p>
                          <p className="text-xs text-[#64748B]">Actions</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-green-600">{item.sent}</p>
                          <p className="text-xs text-[#64748B]">Sent</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-blue-600">{item.connected}</p>
                          <p className="text-xs text-[#64748B]">Connected</p>
                        </div>
                        <div className="text-center">
                          <p className="text-lg font-bold text-violet-600">{totalFollowupsSent}</p>
                          <p className="text-xs text-[#64748B]">Follow-ups</p>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between mb-1">
                          <p className="text-xs text-[#64748B]">Success Rate</p>
                          <p className="text-xs font-bold" style={{ color: config.color }}>{safeRate.toFixed(1)}%</p>
                        </div>
                        <div className="relative h-1.5 rounded-full bg-slate-200">
                          <div
                            className="absolute h-1.5 rounded-full"
                            style={{ width: `${Math.min(safeRate, 100)}%`, backgroundColor: config.color }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}


        <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl h-full transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Avatar className="w-9 h-9 bg-white border border-slate-200 shadow-sm">
                <AvatarFallback><BarChart className="w-4 h-4 text-[#0b1957]" /></AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h6 className="text-lg font-bold text-[#1E293B]">Outreach Metrics</h6>
                <p className="text-xs text-[#64748B]">Message tracking</p>
              </div>
              <LiveBadge isConnected={isConnected} className="font-semibold animate-pulse text-xs" />
            </div>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Sent', value: analytics.overview.sent, icon: Send, color: '#6366F1' },
                { label: 'Delivered', value: analytics.overview.delivered, icon: CheckCircle, color: '#10B981' },
                { label: 'Opened', value: analytics.overview.opened, icon: ExternalLink, color: '#8B5CF6' },
                { label: 'Clicked', value: analytics.overview.clicked, icon: MousePointerClick, color: '#EC4899' },
                { label: 'Connected', value: analytics.overview.connected, icon: Linkedin, color: '#0A66C2' },
                { label: 'Replied', value: analytics.overview.replied, icon: Reply, color: '#F59E0B' },
              ].map((metric) => (
                <div key={metric.label} className="flex justify-between items-center p-4 rounded-lg border border-[#E2E8F0] dark:border-[#262831] bg-white dark:bg-[#253456]">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-9 h-9" style={{ backgroundColor: `${metric.color}20` }}>
                      <AvatarFallback><metric.icon className="w-4 h-4" style={{ color: metric.color }} /></AvatarFallback>
                    </Avatar>
                    <p className="text-[#64748B]">{metric.label}</p>
                  </div>
                  <h6 className="text-lg font-bold text-[#1E293B] dark:text-white">{metric.value}</h6>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl h-full transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Avatar className="w-9 h-9 bg-white border border-slate-200 shadow-sm">
                <AvatarFallback><Gauge className="w-4 h-4 text-[#0b1957]" /></AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h6 className="text-lg font-bold text-[#1E293B]">Performance Rates</h6>
                <p className="text-xs text-[#64748B]">Success percentages</p>
              </div>
              <LiveBadge isConnected={isConnected} className="font-semibold animate-pulse text-xs" />
            </div>
            <div className="flex flex-col gap-4">
              {[
                { label: 'Delivery Rate', value: analytics.overview.sent ? ((analytics.overview.delivered / analytics.overview.sent) * 100) : (analytics.metrics.delivery_rate ?? 0), color: '#10B981' },
                { label: 'Open Rate', value: analytics.overview.delivered ? ((analytics.overview.opened / analytics.overview.delivered) * 100) : (analytics.metrics.open_rate ?? 0), color: '#8B5CF6' },
                { label: 'Click Rate', value: analytics.overview.opened ? ((analytics.overview.clicked / analytics.overview.opened) * 100) : (analytics.metrics.click_rate ?? 0), color: '#EC4899' },
                { label: 'Connection Rate', value: analytics.overview.sent ? ((analytics.overview.connected / analytics.overview.sent) * 100) : (analytics.metrics.connection_rate ?? 0), color: '#0A66C2' },
                { label: 'Reply Rate', value: analytics.overview.connected ? ((analytics.overview.replied / analytics.overview.connected) * 100) : (analytics.metrics.reply_rate ?? 0), color: '#F59E0B' },
              ].map((rate) => (
                <div key={rate.label}>
                  <div className="flex justify-between mb-2">
                    <p className="text-[#64748B]">{rate.label}</p>
                    <p className="font-bold" style={{ color: rate.color }}>{rate.value.toFixed(1)}%</p>
                  </div>
                  <div className="relative h-2.5 rounded-full overflow-hidden bg-slate-200/80">
                    <div className="absolute h-full rounded-full transition-all" style={{ width: `${rate.value}%`, backgroundColor: rate.color }}></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* No Steps Message - Commented out for testing */}
      {/* {(!analytics.step_analytics || analytics.step_analytics.length === 0) && platformAnalytics.length === 0 && (
        <Card style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)' }} className="rounded-xl p-12 text-center transition-all duration-300">
          <Avatar className="w-20 h-20 mx-auto mb-6" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}>
            <AvatarFallback><Megaphone className="w-10 h-10 text-white" /></AvatarFallback>
          </Avatar>
          <h5 className="text-xl font-bold mb-2" style={{ color: theme.textPrimary }}>No Campaign Steps Yet</h5>
          <p className="mb-6" style={{ color: theme.textSecondary }}>Add steps to your campaign to start seeing analytics data here</p>
          <Button onClick={() => router.push(`/campaigns/${campaignId}`)} style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }} className="font-semibold">Configure Campaign</Button>
        </Card>
      )} */}
    </div>
  );
}
