'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft, TrendingUp, Users, Send, CheckCircle, Mail, ExternalLink,
  AlertCircle, Linkedin, Phone, MessageCircle,
  Reply, MousePointerClick, BarChart, Activity, Rocket, Zap, Lightbulb, 
  Megaphone, Gauge, Trophy, Moon, Sun, Wifi, WifiOff, Loader2
} from 'lucide-react';
import { useCampaignAnalytics } from '@lad/frontend-features/campaigns';
import { useToast } from '@/components/ui/app-toaster';
import AnalyticsCharts from '@/components/analytics/AnalyticsCharts';
import { LiveActivityTable } from '@/components/campaigns';

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

  useEffect(() => {
    if (error) {
      push({ variant: 'error', title: 'Error', description: String(error) || 'Failed to load analytics' });
      router.push('/campaigns');
    }
  }, [error, push, router]);

  if (loading) {
    return (
      <div className="p-3 bg-[#F8F9FE] h-full overflow-auto">
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

  // Chart data for AnalyticsCharts
  const extendedAnalytics = analytics as any;
  const leadsOverTime = extendedAnalytics?.charts?.leads_over_time?.length
    ? extendedAnalytics.charts.leads_over_time
    : [
        { date: 'Today', leads: analytics?.overview?.total_leads ?? 0 },
        { date: 'Yesterday', leads: Math.max((analytics?.overview?.total_leads ?? 0) - 2, 0) },
      ];

  const channelBreakdownRaw = extendedAnalytics?.charts?.channel_breakdown?.length
    ? extendedAnalytics.charts.channel_breakdown
    : [
        { name: 'LinkedIn', value: analyticsAny?.platform_metrics?.linkedin?.sent ?? analyticsAny?.metrics?.connection_requests_sent ?? 0 },
        { name: 'Email', value: analyticsAny?.platform_metrics?.email?.sent ?? analyticsAny?.metrics?.emails_sent ?? 0 },
        { name: 'Voice', value: analyticsAny?.platform_metrics?.voice?.sent ?? analyticsAny?.metrics?.voice_calls_made ?? 0 },
      ];

  const channelBreakdownFiltered = channelBreakdownRaw.filter((c: any) => c.value > 0);
  // Ensure at least one item for the pie chart
  const channelBreakdown = channelBreakdownFiltered.length > 0 ? channelBreakdownFiltered : [{ name: 'No Data', value: 1 }];

  // Dynamic funnel stage label based on campaign type
  const funnelStageLabel = hasLinkedIn ? 'Connected' : hasEmail ? 'Delivered' : hasWhatsApp ? 'Delivered' : hasVoice ? 'Answered' : 'Messaged';
  const funnelStageCount = hasLinkedIn 
    ? (analytics?.overview?.connected ?? 0)
    : hasEmail
    ? (analytics?.overview?.delivered ?? 0)
    : hasWhatsApp
    ? (analytics?.overview?.delivered ?? 0)
    : hasVoice
    ? (analytics?.overview?.connected ?? 0)
    : (analytics?.metrics?.linkedin_messages_sent ?? 0);

  const funnel = extendedAnalytics?.charts?.funnel?.length
    ? extendedAnalytics.charts.funnel
    : [
        { stage: 'Leads', count: analytics?.overview?.total_leads ?? 0 },
        { stage: funnelStageLabel, count: funnelStageCount },
        { stage: 'Replied', count: analytics?.overview?.replied ?? 0 },
      ];

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
    <div className="p-3 bg-[#F8F9FE] h-full overflow-auto">
      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row justify-between mt-10 items-stretch sm:items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns')} className="h-8 w-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl sm:text-4xl font-bold text-[#1E293B]">
              {analytics.campaign.name}
            </h1>
          </div>
          <div className="flex items-center gap-3 ml-11 flex-wrap">
            <Badge className="capitalize">
              <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: analytics.campaign.status === 'running' ? '#10B981' : '#F59E0B' }} />
              {analytics.campaign.status}
            </Badge>
            <Badge 
              className={`font-semibold ${isConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}
            >
              {isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
            <p className="text-sm text-[#64748B]">Created {new Date(analytics.campaign.created_at).toLocaleDateString()}</p>
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
            Edit Campaign
          </Button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="flex gap-4 mb-6 flex-wrap items-stretch">
        <div className="w-full sm:w-[calc(50%-8px)] md:w-[calc(25%-12px)]">
          <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm w-full flex flex-col h-full min-h-[120px]">
            <div className="flex-1 flex flex-col p-4">
              <div className="flex flex-col h-full">
                <div className="flex justify-end mb-2">
                  <Avatar className="bg-indigo-500 w-8 h-8">
                    <AvatarFallback className="bg-indigo-500">
                      <Users className="w-6 h-6 text-white" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <p className="text-sm text-slate-500 mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    Total Leads
                  </p>
                  <h5 className="text-2xl font-bold text-slate-800">
                    {analytics.overview.total_leads}
                  </h5>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full sm:w-[calc(50%-8px)] md:w-[calc(25%-12px)]">
          <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm w-full flex flex-col h-full min-h-[120px]">
            <div className="flex-1 flex flex-col p-4">
              <div className="flex flex-col h-full">
                <div className="flex justify-end mb-2">
                  <Avatar className="bg-green-500 w-8 h-8">
                    <AvatarFallback className="bg-green-500">
                      <Send className="w-6 h-6 text-white" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <p className="text-sm text-slate-500 mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    {sentLabel}
                  </p>
                  <h5 className="text-2xl font-bold text-slate-800">
                    {primarySentCount}
                  </h5>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full sm:w-[calc(50%-8px)] md:w-[calc(25%-12px)]">
          <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm w-full flex flex-col h-full min-h-[120px]">
            <div className="flex-1 flex flex-col p-4">
              <div className="flex flex-col h-full">
                <div className="flex justify-end mb-2">
                  <Avatar className="bg-[#0077B5] w-8 h-8">
                    <AvatarFallback className="bg-[#0077B5]">
                      <Linkedin className="w-6 h-6 text-white" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <p className="text-sm text-slate-500 mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    Connected
                  </p>
                  <h5 className="text-2xl font-bold text-slate-800">
                    {analytics.overview.connected}
                  </h5>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full sm:w-[calc(50%-8px)] md:w-[calc(25%-12px)]">
          <div className="bg-white rounded-[20px] border border-slate-200 shadow-sm w-full flex flex-col h-full min-h-[120px]">
            <div className="flex-1 flex flex-col p-4">
              <div className="flex flex-col h-full">
                <div className="flex justify-end mb-2">
                  <Avatar className="bg-amber-500 w-8 h-8">
                    <AvatarFallback className="bg-amber-500">
                      <Reply className="w-6 h-6 text-white" />
                    </AvatarFallback>
                  </Avatar>
                </div>
                <div className="flex-1 flex flex-col justify-end">
                  <p className="text-sm text-slate-500 mb-1 overflow-hidden text-ellipsis whitespace-nowrap">
                    Replied
                  </p>
                  <h5 className="text-2xl font-bold text-slate-800">
                    {analytics.overview.replied}
                  </h5>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="mb-8">
        <LiveActivityTable campaignId={campaignId} maxHeight={500} pageSize={50} />
      </div>

      {/* Analytics Charts Section */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="w-11 h-11 bg-white border border-slate-200 shadow-sm">
            <AvatarFallback><BarChart className="w-5 h-5 text-[#0b1957]" /></AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h5 className="text-xl font-bold text-[#1E293B]">Visual Analytics</h5>
            <p className="text-sm text-[#64748B]">Charts and graphs for deeper insights</p>
          </div>
          <Badge className="font-semibold animate-pulse bg-primary text-primary-foreground text-xs">
            Live
          </Badge>
        </div>
        <div style={{
          '--card-bg': isDarkMode ? 'rgba(30, 41, 59, 0.8)' : 'white',
          '--card-border': theme.cardBorder,
          '--text-primary': theme.textPrimary,
          '--text-secondary': theme.textSecondary,
        } as React.CSSProperties}>
          <AnalyticsCharts data={{ leadsOverTime, channelBreakdown, funnel }} />
        </div>
      </div>

      {/* Performance Metrics - 3 Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Channel Performance */}
        {platformAnalytics.length > 0 && (
          <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl h-full transition-all duration-300">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <Avatar className="w-9 h-9 bg-white border border-slate-200 shadow-sm">
                  <AvatarFallback><Lightbulb className="w-4 h-4 text-[#0b1957]" /></AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h6 className="text-lg font-bold text-[#1E293B]">Channel Performance</h6>
                  <p className="text-xs text-[#64748B]">Active channels</p>
                </div>
                <Badge className="font-semibold animate-pulse bg-primary text-primary-foreground text-xs">
                  Live
                </Badge>
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
                    <div key={item.platform} className="p-4 rounded-lg border border-[#E2E8F0] bg-white">
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
                          <p className="text-lg font-bold text-amber-600">{item.replied}</p>
                          <p className="text-xs text-[#64748B]">Replied</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between mb-1">
                          <p className="text-xs text-[#64748B]">Success Rate</p>
                          <p className="text-xs font-bold" style={{ color: config.color }}>{safeRate.toFixed(1)}%</p>
                        </div>
                        <div className="relative h-1.5 rounded-full bg-slate-200">
                          <div className="absolute h-1.5 rounded-full" style={{ width: `${Math.min(safeRate, 100)}%`, backgroundColor: config.color }}></div>
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
              <Badge className="font-semibold animate-pulse bg-primary text-primary-foreground text-xs">
                Live
              </Badge>
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
                <div key={metric.label} className="flex justify-between items-center p-4 rounded-lg border border-[#E2E8F0] bg-white">
                  <div className="flex items-center gap-4">
                    <Avatar className="w-9 h-9" style={{ backgroundColor: `${metric.color}20` }}>
                      <AvatarFallback><metric.icon className="w-4 h-4" style={{ color: metric.color }} /></AvatarFallback>
                    </Avatar>
                    <p className="text-[#64748B]">{metric.label}</p>
                  </div>
                  <h6 className="text-lg font-bold text-[#1E293B]">{metric.value}</h6>
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
              <Badge className="font-semibold animate-pulse bg-primary text-primary-foreground text-xs">
                Live
              </Badge>
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
