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
  Reply, Hand, BarChart3, TrendingDown, Rocket, Zap, Lightbulb, 
  Megaphone, Gauge, Trophy, Moon, Sun
} from 'lucide-react';
import { useCampaignAnalytics } from '@lad/frontend-features/campaigns';
import { useCampaignStats } from '@lad/frontend-features/campaigns';
import { useToast } from '@/components/ui/app-toaster';
import AnalyticsCharts from '@/components/analytics/AnalyticsCharts';
import { Loader2 } from 'lucide-react';
import { LiveBadge } from '@/components/LiveBadge';

const platformConfig = {
  linkedin: {
    name: 'LinkedIn',
    icon: Linkedin,
    color: '#0A66C2',
    gradient: 'from-[#0A66C2] to-[#004182]',
  },
  email: {
    name: 'Email',
    icon: Mail,
    color: '#F59E0B',
    gradient: 'from-[#F59E0B] to-[#D97706]',
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: MessageCircle,
    color: '#25D366',
    gradient: 'from-[#25D366] to-[#128C7E]',
  },
  voice: {
    name: 'Voice',
    icon: Phone,
    color: '#8B5CF6',
    gradient: 'from-[#8B5CF6] to-[#7C3AED]',
  },
};
export default function CampaignAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { push } = useToast();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const { analytics, loading, error } = useCampaignAnalytics(campaignId);
  // Real-time stats
  const { stats: liveStats, error: statsError } = useCampaignStats();
  const isConnected = !statsError && Boolean(liveStats);
  const liveStatsAny = liveStats as any;
  useEffect(() => {
    if (error) {
      push({ variant: 'error', title: 'Error', description: String(error) || 'Failed to load analytics' });
      router.push('/campaigns');
    }
  }, [error, push, router]);
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gradient-to-br from-indigo-500 to-purple-600">
        <Card className="p-8 rounded-2xl text-center">
          <Loader2 className="h-10 w-10 animate-spin text-indigo-600 mx-auto" />
          <p className="mt-4 font-semibold">Loading Advanced Analytics...</p>
        </Card>
      </div>
    );
  }
  if (!analytics) {
    return (
      <div className="p-6 bg-slate-900 min-h-screen">
        <p className="text-white">No analytics data available</p>
      </div>
    );
  }
  const stepTypes = analytics?.step_analytics?.map((s: any) => s.type?.toLowerCase()) || [];
  const hasLinkedIn = stepTypes.some((t: string) => t?.includes('linkedin') || t?.includes('connection'));
  const hasEmail = stepTypes.some((t: string) => t?.includes('email'));
  const hasWhatsApp = stepTypes.some((t: string) => t?.includes('whatsapp'));
  const hasVoice = stepTypes.some((t: string) => t?.includes('voice') || t?.includes('call'));
  const platformAnalytics = [
    hasLinkedIn && { platform: 'linkedin', actions: analytics?.metrics?.connection_requests_sent ?? 0, sent: analytics?.metrics?.linkedin_messages_sent ?? 0, connected: analytics?.metrics?.connection_requests_accepted ?? 0, replied: analytics?.metrics?.linkedin_messages_replied ?? 0, rate: analytics?.metrics?.connection_rate ?? 0 },
    hasEmail && { platform: 'email', actions: analytics?.metrics?.emails_sent ?? 0, sent: analytics?.metrics?.emails_sent ?? 0, connected: analytics?.overview?.connected ?? 0, replied: analytics?.overview?.replied ?? 0, rate: analytics?.metrics?.open_rate ?? 0 },
    hasWhatsApp && { platform: 'whatsapp', actions: analytics?.metrics?.whatsapp_messages_sent ?? 0, sent: analytics?.metrics?.whatsapp_messages_sent ?? 0, connected: 0, replied: analytics?.metrics?.whatsapp_messages_replied ?? 0, rate: analytics?.metrics?.reply_rate ?? 0 },
    hasVoice && { platform: 'voice', actions: analytics?.metrics?.voice_calls_made ?? 0, sent: analytics?.metrics?.voice_calls_made ?? 0, connected: analytics?.metrics?.voice_calls_answered ?? 0, replied: 0, rate: ((analytics?.metrics?.voice_calls_answered ?? 0) / (analytics?.metrics?.voice_calls_made || 1)) * 100 },
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
        { name: 'LinkedIn', value: analytics?.metrics?.connection_requests_sent ?? 0 },
        { name: 'Email', value: analytics?.metrics?.emails_sent ?? 0 },
        { name: 'Voice', value: analytics?.metrics?.voice_calls_made ?? 0 },
      ];
  const channelBreakdownFiltered = channelBreakdownRaw.filter((c: any) => c.value > 0);
  // Ensure at least one item for the pie chart
  const channelBreakdown = channelBreakdownFiltered.length > 0 ? channelBreakdownFiltered : [{ name: 'No Data', value: 1 }];
  const funnel = extendedAnalytics?.charts?.funnel?.length
    ? extendedAnalytics.charts.funnel
    : [
        { stage: 'Leads', count: analytics?.overview?.total_leads ?? 0 },
        { stage: 'Messaged', count: analytics?.metrics?.linkedin_messages_sent ?? 0 },
        { stage: 'Replied', count: analytics?.metrics?.linkedin_messages_replied ?? 0 },
      ];
  // Theme colors
  const theme = {
    bg: isDarkMode ? 'bg-slate-900' : 'bg-gradient-to-br from-indigo-50 via-blue-50 to-violet-50',
    cardBg: isDarkMode ? 'bg-slate-800/80' : 'bg-white',
    cardBorder: isDarkMode ? 'border-white/10' : 'border-slate-200',
    textPrimary: isDarkMode ? 'text-white' : 'text-slate-900',
    textSecondary: isDarkMode ? 'text-white/60' : 'text-slate-600',
    textTertiary: isDarkMode ? 'text-white/50' : 'text-slate-500',
    statBg: isDarkMode ? 'bg-white/5' : 'bg-slate-50',
    statBorder: isDarkMode ? 'border-white/10' : 'border-slate-200',
    progressBg: isDarkMode ? 'bg-white/10' : 'bg-slate-200',
  };
  return (
    <div className={`p-6 ${theme.bg} min-h-screen overflow-auto transition-all duration-300`}>
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-700 rounded-2xl p-8 mb-8 relative overflow-hidden shadow-2xl">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-8 left-1/3 w-36 h-36 bg-blue-500/15 rounded-full blur-3xl" />
        <div className="relative z-10 flex justify-between items-start flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-4 mb-4">
              <Button 
                onClick={() => router.push('/campaigns')} 
                variant="ghost" 
                size="icon"
                className="bg-white/20 text-white hover:bg-white/30"
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <Badge className="bg-white/20 text-white font-semibold border-0">
                <Rocket className="h-3 w-3 mr-1" />
                Advanced Analytics
              </Badge>
            </div>
            <h1 className="text-4xl font-extrabold text-white mb-2">{analytics.campaign.name}</h1>
            <div className="flex items-center gap-4 flex-wrap">
              <Badge className="bg-white/20 text-white capitalize font-semibold border-0">
                <div className={`w-2 h-2 rounded-full mr-2 ${analytics.campaign.status === 'running' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                {analytics.campaign.status}
              </Badge>
              <p className="text-white/80">Created {new Date(analytics.campaign.created_at).toLocaleDateString()}</p>
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <LiveBadge isConnected={isConnected} showOffline className="font-semibold" />

            <Button 
              variant="ghost" 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="bg-white/20 text-white font-semibold px-4 hover:bg-white/30"
            >
              {isDarkMode ? <Sun className="h-4 w-4 mr-2" /> : <Moon className="h-4 w-4 mr-2" />}
              {isDarkMode ? 'Light' : 'Dark'}
            </Button>
            <Button 
              onClick={() => router.push(`/campaigns/${campaignId}/analytics/leads`)} 
              className="bg-white text-indigo-600 font-semibold px-6 hover:bg-white/90"
            >
              <Users className="h-4 w-4 mr-2" />
              View Leads
            </Button>
            <Button 
              variant="outline" 
              onClick={() => router.push(`/onboarding?campaignId=${campaignId}`)} 
              className="border-white text-white hover:bg-white/10"
            >
              Edit Campaign
            </Button>
          </div>
        </div>
      </div>
      {/* Quick Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 mb-8">
        <Card className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-6 relative overflow-hidden ${isDarkMode ? '' : 'shadow-md'} transition-all hover:shadow-lg`}>
          <div className="absolute top-3 right-3">
            <Avatar className="bg-indigo-100 h-10 w-10">
              <Users className="h-5 w-5 text-indigo-600" />
            </Avatar>
          </div>
          <p className={`${theme.textSecondary} text-sm mb-2`}>Total Leads</p>
          <h2 className={`text-4xl font-extrabold ${theme.textPrimary}`}>{liveStatsAny?.leads_count ?? analytics.overview.total_leads}</h2>
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="h-4 w-4 text-emerald-500" />
            <p className="text-emerald-500 text-xs font-semibold">Active Campaign</p>
          </div>
        </Card>
        <Card className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-6 relative overflow-hidden ${isDarkMode ? '' : 'shadow-md'} transition-all hover:shadow-lg`}>
          <div className="absolute top-3 right-3">
            <Avatar className="bg-emerald-100 h-10 w-10">
              <Send className="h-5 w-5 text-emerald-600" />
            </Avatar>
          </div>
          <p className={`${theme.textSecondary} text-sm mb-2`}>Messages Sent</p>
          <h2 className={`text-4xl font-extrabold ${theme.textPrimary}`}>{liveStatsAny?.sent_count ?? analytics.overview.sent}</h2>
          <div className="flex items-center gap-1 mt-2">
            <Zap className="h-4 w-4 text-amber-500" />
            <p className="text-amber-500 text-xs font-semibold">Outreach</p>
          </div>
        </Card>
        <Card className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-6 relative overflow-hidden ${isDarkMode ? '' : 'shadow-md'} transition-all hover:shadow-lg`}>
          <div className="absolute top-3 right-3">
            <Avatar className="bg-blue-100 h-10 w-10">
              <Linkedin className="h-5 w-5 text-blue-600" />
            </Avatar>
          </div>
          <p className={`${theme.textSecondary} text-sm mb-2`}>Connected</p>
          <h2 className={`text-4xl font-extrabold ${theme.textPrimary}`}>{liveStatsAny?.connected_count ?? analytics.overview.connected}</h2>
          <div className="flex items-center gap-1 mt-2">
            <CheckCircle className="h-4 w-4 text-blue-600" />
            <p className="text-blue-600 text-xs font-semibold">{analytics.metrics.connection_rate?.toFixed(1) ?? 0}% Rate</p>
          </div>
        </Card>
        <Card className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-6 relative overflow-hidden ${isDarkMode ? '' : 'shadow-md'} transition-all hover:shadow-lg`}>
          <div className="absolute top-3 right-3">
            <Avatar className="bg-amber-100 h-10 w-10">
              <Reply className="h-5 w-5 text-amber-600" />
            </Avatar>
          </div>
          <p className={`${theme.textSecondary} text-sm mb-2`}>Replied</p>
          <h2 className={`text-4xl font-extrabold ${theme.textPrimary}`}>{liveStatsAny?.replied_count ?? analytics.overview.replied}</h2>
          <div className="flex items-center gap-1 mt-2">
            <Trophy className="h-4 w-4 text-amber-500" />
            <p className="text-amber-500 text-xs font-semibold">{analytics.metrics.reply_rate?.toFixed(1) ?? 0}% Rate</p>
          </div>
        </Card>
      </div>
      {/* Analytics Charts Section */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-6">
          <Avatar className="bg-gradient-to-br from-emerald-500 to-emerald-600 h-11 w-11">
            <BarChart3 className="h-5 w-5 text-white" />
          </Avatar>
          <div>
            <h2 className={`text-2xl font-bold ${theme.textPrimary}`}>Visual Analytics</h2>
            <p className={`${theme.textSecondary} text-sm`}>Charts and graphs for deeper insights</p>
          </div>
        </div>
        <div className={isDarkMode ? 'analytics-dark' : ''}>
          <AnalyticsCharts data={{ leadsOverTime, channelBreakdown, funnel }} />
        </div>
      </div>
      {/* Channel Performance Cards */}
      {platformAnalytics.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="bg-gradient-to-br from-indigo-500 to-purple-600 h-11 w-11">
              <Lightbulb className="h-5 w-5 text-white" />
            </Avatar>
            <div>
              <h2 className={`text-2xl font-bold ${theme.textPrimary}`}>Channel Performance</h2>
              <p className={`${theme.textSecondary} text-sm`}>Real-time analytics for your active channels</p>
            </div>
            <LiveBadge isConnected={isConnected} className="ml-auto font-semibold animate-pulse text-xs" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {platformAnalytics.map((item: any) => {
              const config = platformConfig[item.platform as keyof typeof platformConfig];
              const PlatformIcon = config.icon;
              return (
                <Card 
                  key={item.platform} 
                  className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl overflow-hidden transition-all duration-300 ${isDarkMode ? '' : 'shadow-md'} hover:-translate-y-2 hover:shadow-xl`}
                  style={{ borderColor: `${config.color}40` }}
                >
                  <div className={`bg-gradient-to-br ${config.gradient} p-5 flex items-center justify-between`}>
                    <div className="flex items-center gap-3">
                      <Avatar className="bg-white/20 h-12 w-12">
                        <PlatformIcon className="h-6 w-6 text-white" />
                      </Avatar>
                      <div>
                        <h3 className="text-lg font-bold text-white">{config.name}</h3>
                        <p className="text-white/80 text-xs">Channel Analytics</p>
                      </div>
                    </div>
                    <Badge className="bg-white/20 text-white font-semibold text-xs border-0">
                      {item.actions > 0 ? 'Active' : 'Ready'}
                    </Badge>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <div className={`text-center p-3 ${theme.statBg} rounded-xl border ${theme.statBorder}`}>
                        <h4 className="text-2xl font-extrabold" style={{ color: config.color }}>{item.actions}</h4>
                        <p className={`${theme.textSecondary} text-xs`}>Actions</p>
                      </div>
                      <div className={`text-center p-3 ${theme.statBg} rounded-xl border ${theme.statBorder}`}>
                        <h4 className="text-2xl font-extrabold text-emerald-500">{item.sent}</h4>
                        <p className={`${theme.textSecondary} text-xs`}>Sent</p>
                      </div>
                      <div className={`text-center p-3 ${theme.statBg} rounded-xl border ${theme.statBorder}`}>
                        <h4 className="text-2xl font-extrabold text-blue-500">{item.connected}</h4>
                        <p className={`${theme.textSecondary} text-xs`}>Connected</p>
                      </div>
                      <div className={`text-center p-3 ${theme.statBg} rounded-xl border ${theme.statBorder}`}>
                        <h4 className="text-2xl font-extrabold text-amber-500">{item.replied}</h4>
                        <p className={`${theme.textSecondary} text-xs`}>Replied</p>
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between mb-2">
                        <p className={`${theme.textSecondary} text-sm`}>Success Rate</p>
                        <p className="font-bold" style={{ color: config.color }}>{item.rate.toFixed(1)}%</p>
                      </div>
                      <Progress value={Math.min(item.rate, 100)} className="h-2" />
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
        <Card className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl h-full ${isDarkMode ? '' : 'shadow-md'} transition-all`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="bg-blue-500/20">
                <BarChart3 className="h-5 w-5 text-blue-600" />
              </Avatar>
              <h3 className={`text-xl font-bold ${theme.textPrimary}`}>Outreach Metrics</h3>
            </div>
            <div className="space-y-5">
              {[
                { label: 'Sent', value: analytics.overview.sent, icon: Send, color: '#6366F1' },
                { label: 'Delivered', value: analytics.overview.delivered, icon: CheckCircle, color: '#10B981' },
                { label: 'Opened', value: analytics.overview.opened, icon: ExternalLink, color: '#8B5CF6' },
                { label: 'Clicked', value: analytics.overview.clicked, icon: Hand, color: '#EC4899' },
                { label: 'Connected', value: analytics.overview.connected, icon: Linkedin, color: '#0A66C2' },
                { label: 'Replied', value: analytics.overview.replied, icon: Reply, color: '#F59E0B' },
              ].map((metric) => (
                <div 
                  key={metric.label} 
                  className={`flex justify-between items-center p-4 ${theme.statBg} rounded-xl border ${theme.statBorder}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9" style={{ backgroundColor: `${metric.color}20` }}>
                      <metric.icon className="h-4 w-4" style={{ color: metric.color }} />
                    </Avatar>
                    <p className={theme.textSecondary}>{metric.label}</p>
                  </div>
                  <p className={`text-xl font-bold ${theme.textPrimary}`}>{metric.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <Card className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl h-full ${isDarkMode ? '' : 'shadow-md'} transition-all`}>
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="bg-purple-500/20">
                <Gauge className="h-5 w-5 text-purple-600" />
              </Avatar>
              <h3 className={`text-xl font-bold ${theme.textPrimary}`}>Performance Rates</h3>
            </div>
            <div className="space-y-6">
              {[
                { label: 'Delivery Rate', value: analytics.metrics.delivery_rate ?? 0, color: '#10B981' },
                { label: 'Open Rate', value: analytics.metrics.open_rate ?? 0, color: '#8B5CF6' },
                { label: 'Click Rate', value: analytics.metrics.click_rate ?? 0, color: '#EC4899' },
                { label: 'Connection Rate', value: analytics.metrics.connection_rate ?? 0, color: '#0A66C2' },
                { label: 'Reply Rate', value: analytics.metrics.reply_rate ?? 0, color: '#F59E0B' },
              ].map((rate) => (
                <div key={rate.label}>
                  <div className="flex justify-between mb-2">
                    <p className={theme.textSecondary}>{rate.label}</p>
                    <p className="font-bold" style={{ color: rate.color }}>{rate.value.toFixed(1)}%</p>
                  </div>
                  <Progress value={rate.value} className="h-2.5" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      {/* No Steps Message */}
      {(!analytics.step_analytics || analytics.step_analytics.length === 0) && platformAnalytics.length === 0 && (
        <Card className={`${theme.cardBg} border ${theme.cardBorder} rounded-2xl p-12 text-center ${isDarkMode ? '' : 'shadow-md'} transition-all`}>
          <Avatar className="bg-gradient-to-br from-indigo-500 to-purple-600 h-20 w-20 mx-auto mb-6">
            <Megaphone className="h-10 w-10 text-white" />
          </Avatar>
          <h2 className={`text-2xl ${theme.textPrimary} font-bold mb-2`}>No Campaign Steps Yet</h2>
          <p className={`${theme.textSecondary} mb-6`}>Add steps to your campaign to start seeing analytics data here</p>
          <Button 
            onClick={() => router.push(`/campaigns/${campaignId}`)} 
            className="bg-gradient-to-br from-indigo-500 to-purple-600 font-semibold"
          >
            Configure Campaign
          </Button>
        </Card>
      )}
    </div>
  );
}