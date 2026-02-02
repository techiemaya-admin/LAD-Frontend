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
  // Use analytics data directly, no real-time stats hook available
  const isConnected = analytics?.campaign?.status === 'running';

  useEffect(() => {
    if (error) {
      push({ variant: 'error', title: 'Error', description: error || 'Failed to load analytics' });
      router.push('/campaigns');
    }
  }, [error, push, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Card className="p-8 rounded-2xl text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto" />
          <p className="mt-4 font-semibold">Loading Advanced Analytics...</p>
        </Card>
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
    <div className="p-6 h-full overflow-auto transition-all duration-300" style={{ background: isDarkMode ? '#0F172A' : '#F8F9FE' }}>
      {/* Hero Header */}
      <div className="bg-white rounded-2xl p-8 mb-8 relative overflow-hidden shadow-sm border border-slate-200">
        <div className="absolute top-[-50px] right-[-50px] w-[200px] h-[200px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%)' }} />
        <div className="absolute bottom-[-30px] left-[30%] w-[150px] h-[150px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)' }} />
        <div className="flex justify-between items-start relative z-10 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns')} className="bg-slate-100 text-slate-800 hover:bg-slate-200">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Badge className="bg-slate-100 text-slate-800 font-semibold">
                <Rocket className="w-3 h-3 mr-1" style={{ color: '#6366F1' }} />
                Advanced Analytics
              </Badge>
            </div>
            <h3 className="text-3xl font-extrabold text-slate-800 mb-2">{analytics.campaign.name}</h3>
            <div className="flex items-center gap-4 flex-wrap">
              <Badge className="bg-slate-100 text-slate-800 capitalize font-semibold">
                <div className="w-2 h-2 rounded-full ml-1 mr-2" style={{ backgroundColor: analytics.campaign.status === 'running' ? '#10B981' : '#F59E0B' }} />
                {analytics.campaign.status}
              </Badge>
              <p className="text-slate-500">Created {new Date(analytics.campaign.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <Badge 
              className={`font-semibold ${isConnected ? 'bg-green-100 text-green-600 border-green-300' : 'bg-red-100 text-red-600 border-red-300'}`}
              style={{ border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` }}
            >
              {isConnected ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
              {isConnected ? 'Live' : 'Offline'}
            </Badge>
            <Button onClick={() => router.push(`/campaigns/${campaignId}/analytics/leads`)} className="bg-indigo-500 text-white font-semibold px-6 hover:bg-indigo-600" style={{ boxShadow: '0 2px 8px rgba(99, 102, 241, 0.25)' }}>
              <Users className="w-4 h-4 mr-2" />
              View Leads
            </Button>
            <Button variant="outline" onClick={() => router.push(`/onboarding?campaignId=${campaignId}`)} className="border-indigo-500 text-indigo-500 font-semibold border-2 hover:bg-indigo-50">
              Edit Campaign
            </Button>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <Card style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)' }} className="rounded-xl p-6 relative overflow-hidden transition-all duration-300">
          <div className="absolute top-2.5 right-2.5">
            <Avatar className="w-10 h-10" style={{ backgroundColor: 'rgba(99, 102, 241, 0.1)' }}>
              <AvatarFallback><Users className="w-5 h-5" style={{ color: '#6366F1' }} /></AvatarFallback>
            </Avatar>
          </div>
          <p className="text-sm mb-2" style={{ color: theme.textSecondary }}>Total Leads</p>
          <h3 className="text-3xl font-extrabold" style={{ color: theme.textPrimary }}>{analytics.overview.total_leads}</h3>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <p className="text-xs font-semibold text-green-500">Active Campaign</p>
          </div>
        </Card>
        <Card style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)' }} className="rounded-xl p-6 relative overflow-hidden transition-all duration-300">
          <div className="absolute top-2.5 right-2.5">
            <Avatar className="w-10 h-10" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)' }}>
              <AvatarFallback><Send className="w-5 h-5" style={{ color: '#10B981' }} /></AvatarFallback>
            </Avatar>
          </div>
          <p className="text-sm mb-2" style={{ color: theme.textSecondary }}>{sentLabel}</p>
          <h3 className="text-3xl font-extrabold" style={{ color: theme.textPrimary }}>{primarySentCount}</h3>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {hasLinkedIn && (
              <Badge className="h-5 text-xs font-semibold" style={{ backgroundColor: 'rgba(10, 102, 194, 0.1)', color: '#0A66C2' }}>
                <Linkedin className="w-3 h-3 mr-1" style={{ color: '#0A66C2' }} />
                {analyticsAny?.platform_metrics?.linkedin?.sent ?? 0}
              </Badge>
            )}
            {hasEmail && (
              <Badge className="h-5 text-xs font-semibold" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                <Mail className="w-3 h-3 mr-1" style={{ color: '#F59E0B' }} />
                {analyticsAny?.platform_metrics?.email?.sent ?? 0}
              </Badge>
            )}
            {hasWhatsApp && (
              <Badge className="h-5 text-xs font-semibold" style={{ backgroundColor: 'rgba(37, 211, 102, 0.1)', color: '#25D366' }}>
                <MessageCircle className="w-3 h-3 mr-1" style={{ color: '#25D366' }} />
                {analyticsAny?.platform_metrics?.whatsapp?.sent ?? 0}
              </Badge>
            )}
            {hasVoice && (
              <Badge className="h-5 text-xs font-semibold" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}>
                <Phone className="w-3 h-3 mr-1" style={{ color: '#8B5CF6' }} />
                {analyticsAny?.platform_metrics?.voice?.sent ?? 0}
              </Badge>
            )}
            {!hasLinkedIn && !hasEmail && !hasWhatsApp && !hasVoice && (
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-semibold text-amber-500">Outreach</p>
              </div>
            )}
          </div>
        </Card>
        <Card style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)' }} className="rounded-xl p-6 relative overflow-hidden transition-all duration-300">
          <div className="absolute top-2.5 right-2.5">
            <Avatar className="w-10 h-10" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)' }}>
              <AvatarFallback><Linkedin className="w-5 h-5" style={{ color: '#3B82F6' }} /></AvatarFallback>
            </Avatar>
          </div>
          <p className="text-sm mb-2" style={{ color: theme.textSecondary }}>Connected</p>
          <h3 className="text-3xl font-extrabold" style={{ color: theme.textPrimary }}>{analytics.overview.connected}</h3>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {hasLinkedIn && (
              <Badge className="h-5 text-xs font-semibold" style={{ backgroundColor: 'rgba(10, 102, 194, 0.1)', color: '#0A66C2' }}>
                <Linkedin className="w-3 h-3 mr-1" style={{ color: '#0A66C2' }} />
                {analyticsAny?.platform_metrics?.linkedin?.connected ?? 0}
              </Badge>
            )}
            {hasEmail && (
              <Badge className="h-5 text-xs font-semibold" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                <Mail className="w-3 h-3 mr-1" style={{ color: '#F59E0B' }} />
                {analyticsAny?.platform_metrics?.email?.connected ?? 0}
              </Badge>
            )}
            {hasWhatsApp && (
              <Badge className="h-5 text-xs font-semibold" style={{ backgroundColor: 'rgba(37, 211, 102, 0.1)', color: '#25D366' }}>
                <MessageCircle className="w-3 h-3 mr-1" style={{ color: '#25D366' }} />
                {analyticsAny?.platform_metrics?.whatsapp?.connected ?? 0}
              </Badge>
            )}
            {hasVoice && (
              <Badge className="h-5 text-xs font-semibold" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}>
                <Phone className="w-3 h-3 mr-1" style={{ color: '#8B5CF6' }} />
                {analyticsAny?.platform_metrics?.voice?.connected ?? 0}
              </Badge>
            )}
            {!hasLinkedIn && !hasEmail && !hasWhatsApp && !hasVoice && (
              <div className="flex items-center gap-1">
                <CheckCircle className="w-4 h-4 text-blue-500" />
                <p className="text-xs font-semibold text-blue-500">{analytics.metrics.connection_rate?.toFixed(1) ?? 0}% Rate</p>
              </div>
            )}
          </div>
        </Card>
        <Card style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)' }} className="rounded-xl p-6 relative overflow-hidden transition-all duration-300">
          <div className="absolute top-2.5 right-2.5">
            <Avatar className="w-10 h-10" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)' }}>
              <AvatarFallback><Reply className="w-5 h-5" style={{ color: '#F59E0B' }} /></AvatarFallback>
            </Avatar>
          </div>
          <p className="text-sm mb-2" style={{ color: theme.textSecondary }}>Replied</p>
          <h3 className="text-3xl font-extrabold" style={{ color: theme.textPrimary }}>{analytics.overview.replied}</h3>
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {hasLinkedIn && (
              <Badge className="h-5 text-xs font-semibold" style={{ backgroundColor: 'rgba(10, 102, 194, 0.1)', color: '#0A66C2' }}>
                <Linkedin className="w-3 h-3 mr-1" style={{ color: '#0A66C2' }} />
                {analyticsAny?.platform_metrics?.linkedin?.replied ?? 0}
              </Badge>
            )}
            {hasEmail && (
              <Badge className="h-5 text-xs font-semibold" style={{ backgroundColor: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}>
                <Mail className="w-3 h-3 mr-1" style={{ color: '#F59E0B' }} />
                {analyticsAny?.platform_metrics?.email?.replied ?? 0}
              </Badge>
            )}
            {hasWhatsApp && (
              <Badge className="h-5 text-xs font-semibold" style={{ backgroundColor: 'rgba(37, 211, 102, 0.1)', color: '#25D366' }}>
                <MessageCircle className="w-3 h-3 mr-1" style={{ color: '#25D366' }} />
                {analyticsAny?.platform_metrics?.whatsapp?.replied ?? 0}
              </Badge>
            )}
            {hasVoice && (
              <Badge className="h-5 text-xs font-semibold" style={{ backgroundColor: 'rgba(139, 92, 246, 0.1)', color: '#8B5CF6' }}>
                <Phone className="w-3 h-3 mr-1" style={{ color: '#8B5CF6' }} />
                {analyticsAny?.platform_metrics?.voice?.replied ?? 0}
              </Badge>
            )}
            {!hasLinkedIn && !hasEmail && !hasWhatsApp && !hasVoice && (
              <div className="flex items-center gap-1">
                <Trophy className="w-4 h-4 text-amber-500" />
                <p className="text-xs font-semibold text-amber-500">{analytics.metrics.reply_rate?.toFixed(1) ?? 0}% Rate</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Analytics Charts Section */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="w-11 h-11" style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}>
            <AvatarFallback><BarChart className="w-5 h-5 text-white" /></AvatarFallback>
          </Avatar>
          <div>
            <h5 className="text-xl font-bold" style={{ color: theme.textPrimary }}>Visual Analytics</h5>
            <p className="text-sm" style={{ color: theme.textSecondary }}>Charts and graphs for deeper insights</p>
          </div>
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

      {/* Live Activity Feed */}
      <div className="mb-8">
        <LiveActivityTable campaignId={campaignId} maxHeight={500} pageSize={50} />
      </div>

      {/* Channel Performance Cards */}
      {platformAnalytics.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-11 h-11" style={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)' }}>
              <AvatarFallback><Lightbulb className="w-5 h-5 text-white" /></AvatarFallback>
            </Avatar>
            <div>
              <h5 className="text-xl font-bold" style={{ color: theme.textPrimary }}>Channel Performance</h5>
              <p className="text-sm" style={{ color: theme.textSecondary }}>Real-time analytics for your active channels</p>
            </div>
            <Badge className="ml-auto font-semibold animate-pulse" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981' }}>
              <Activity className="w-4 h-4 mr-1" style={{ color: '#10B981' }} />
              Live
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {platformAnalytics.map((item: any) => {
              const config = platformConfig[item.platform as keyof typeof platformConfig];
              const PlatformIcon = config.icon;
              return (
                <Card key={item.platform} style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)' }} className="rounded-xl overflow-hidden transition-all duration-300 hover:transform hover:-translate-y-2">
                  <div className="p-5 flex items-center justify-between" style={{ background: config.gradient }}>
                    <div className="flex items-center gap-4">
                      <Avatar className="w-12 h-12" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
                        <AvatarFallback><PlatformIcon className="w-6 h-6 text-white" /></AvatarFallback>
                      </Avatar>
                      <div>
                        <h6 className="text-lg font-bold text-white">{config.name}</h6>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>Channel Analytics</p>
                      </div>
                    </div>
                    <Badge className="text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.2)', color: '#fff' }}>
                      {item.actions > 0 ? 'Active' : 'Ready'}
                    </Badge>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-4 rounded-lg border" style={{ backgroundColor: theme.statBg, borderColor: theme.statBorder }}>
                        <h4 className="text-2xl font-extrabold" style={{ color: config.color }}>{item.actions}</h4>
                        <p className="text-xs" style={{ color: theme.textSecondary }}>Actions</p>
                      </div>
                      <div className="text-center p-4 rounded-lg border" style={{ backgroundColor: theme.statBg, borderColor: theme.statBorder }}>
                        <h4 className="text-2xl font-extrabold text-green-500">{item.sent}</h4>
                        <p className="text-xs" style={{ color: theme.textSecondary }}>Sent</p>
                      </div>
                      <div className="text-center p-4 rounded-lg border" style={{ backgroundColor: theme.statBg, borderColor: theme.statBorder }}>
                        <h4 className="text-2xl font-extrabold text-blue-500">{item.connected}</h4>
                        <p className="text-xs" style={{ color: theme.textSecondary }}>Connected</p>
                      </div>
                      <div className="text-center p-4 rounded-lg border" style={{ backgroundColor: theme.statBg, borderColor: theme.statBorder }}>
                        <h4 className="text-2xl font-extrabold text-amber-500">{item.replied}</h4>
                        <p className="text-xs" style={{ color: theme.textSecondary }}>Replied</p>
                      </div>
                    </div>
                    <div className="mt-6">
                      <div className="flex justify-between mb-2">
                        <p className="text-sm" style={{ color: theme.textSecondary }}>Success Rate</p>
                        <p className="font-bold" style={{ color: config.color }}>{item.rate.toFixed(1)}%</p>
                      </div>
                      <div className="relative h-2 rounded-full" style={{ backgroundColor: theme.progressBg }}>
                        <div className="absolute h-2 rounded-full" style={{ width: `${Math.min(item.rate, 100)}%`, background: config.gradient }}></div>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Performance Metrics Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)' }} className="rounded-xl h-full transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar style={{ backgroundColor: 'rgba(59, 130, 246, 0.2)' }}>
                <AvatarFallback><BarChart className="w-5 h-5" style={{ color: '#3B82F6' }} /></AvatarFallback>
              </Avatar>
              <h6 className="text-lg font-bold" style={{ color: theme.textPrimary }}>Outreach Metrics</h6>
            </div>
            <div className="flex flex-col gap-5">
              {[
                { label: 'Sent', value: analytics.overview.sent, icon: Send, color: '#6366F1' },
                { label: 'Delivered', value: analytics.overview.delivered, icon: CheckCircle, color: '#10B981' },
                { label: 'Opened', value: analytics.overview.opened, icon: ExternalLink, color: '#8B5CF6' },
                { label: 'Clicked', value: analytics.overview.clicked, icon: MousePointerClick, color: '#EC4899' },
                { label: 'Connected', value: analytics.overview.connected, icon: Linkedin, color: '#0A66C2' },
                { label: 'Replied', value: analytics.overview.replied, icon: Reply, color: '#F59E0B' },
              ].map((metric) => (
                <div key={metric.label} className="flex justify-between items-center p-4 rounded-lg border" style={{ backgroundColor: theme.statBg, borderColor: theme.statBorder }}>
                  <div className="flex items-center gap-4">
                    <Avatar className="w-9 h-9" style={{ backgroundColor: `${metric.color}20` }}>
                      <AvatarFallback><metric.icon className="w-4 h-4" style={{ color: metric.color }} /></AvatarFallback>
                    </Avatar>
                    <p style={{ color: theme.textSecondary }}>{metric.label}</p>
                  </div>
                  <h6 className="text-lg font-bold" style={{ color: theme.textPrimary }}>{metric.value}</h6>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card style={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)' }} className="rounded-xl h-full transition-all duration-300">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar style={{ backgroundColor: 'rgba(139, 92, 246, 0.2)' }}>
                <AvatarFallback><Gauge className="w-5 h-5" style={{ color: '#8B5CF6' }} /></AvatarFallback>
              </Avatar>
              <h6 className="text-lg font-bold" style={{ color: theme.textPrimary }}>Performance Rates</h6>
            </div>
            <div className="flex flex-col gap-6">
              {[
                { label: 'Delivery Rate', value: analytics.overview.sent ? ((analytics.overview.delivered / analytics.overview.sent) * 100) : (analytics.metrics.delivery_rate ?? 0), color: '#10B981' },
                { label: 'Open Rate', value: analytics.overview.delivered ? ((analytics.overview.opened / analytics.overview.delivered) * 100) : (analytics.metrics.open_rate ?? 0), color: '#8B5CF6' },
                { label: 'Click Rate', value: analytics.overview.opened ? ((analytics.overview.clicked / analytics.overview.opened) * 100) : (analytics.metrics.click_rate ?? 0), color: '#EC4899' },
                { label: 'Connection Rate', value: analytics.overview.sent ? ((analytics.overview.connected / analytics.overview.sent) * 100) : (analytics.metrics.connection_rate ?? 0), color: '#0A66C2' },
                { label: 'Reply Rate', value: analytics.overview.connected ? ((analytics.overview.replied / analytics.overview.connected) * 100) : (analytics.metrics.reply_rate ?? 0), color: '#F59E0B' },
              ].map((rate) => (
                <div key={rate.label}>
                  <div className="flex justify-between mb-2">
                    <p style={{ color: theme.textSecondary }}>{rate.label}</p>
                    <p className="font-bold" style={{ color: rate.color }}>{rate.value.toFixed(1)}%</p>
                  </div>
                  <div className="relative h-2.5 rounded-full overflow-hidden" style={{ backgroundColor: theme.progressBg }}>
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
