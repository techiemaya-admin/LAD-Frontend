'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, Grid, Stack,
  CircularProgress, LinearProgress, Avatar, Chip, Paper, IconButton
} from '@mui/material';
import {
  ArrowBack, TrendingUp, People, Send, CheckCircle, Email, OpenInNew,
  Error as ErrorIcon, LinkedIn as LinkedInIcon, Phone, WhatsApp,
  Reply, TouchApp, BarChart, Timeline, AutoGraph, Rocket, Bolt, Insights, 
  Campaign, Speed as SpeedIcon, EmojiEvents, DarkMode, LightMode, Wifi, WifiOff
} from '@mui/icons-material';
import { useCampaignAnalytics } from '@/features/campaigns/hooks/useCampaignAnalytics';
import { useCampaignStatsLive } from '@sdk/features/campaigns/hooks/useCampaignStatsLive';
import { useToast } from '@/components/ui/app-toaster';
import AnalyticsCharts from '@/components/analytics/AnalyticsCharts';
const platformConfig = {
  linkedin: {
    name: 'LinkedIn',
    icon: LinkedInIcon,
    color: '#0A66C2',
    gradient: 'linear-gradient(135deg, #0A66C2 0%, #004182 100%)',
  },
  email: {
    name: 'Email',
    icon: Email,
    color: '#F59E0B',
    gradient: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
  },
  whatsapp: {
    name: 'WhatsApp',
    icon: WhatsApp,
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
  // Real-time stats
  const { stats: liveStats, isConnected, error: statsError } = useCampaignStatsLive({ 
    campaignId,
    enabled: true 
  });
  useEffect(() => {
    if (error) {
      push({ variant: 'error', title: 'Error', description: error || 'Failed to load analytics' });
      router.push('/campaigns');
    }
  }, [error, push, router]);
  if (loading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <Card sx={{ p: 4, borderRadius: 4, textAlign: 'center' }}>
          <CircularProgress sx={{ color: '#6366F1' }} />
          <Typography sx={{ mt: 2, fontWeight: 600 }}>Loading Advanced Analytics...</Typography>
        </Card>
      </Box>
    );
  }
  if (!analytics) {
    return (
      <Box sx={{ p: 3, bgcolor: '#0F172A', minHeight: '100vh' }}>
        <Typography color="white">No analytics data available</Typography>
      </Box>
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
    bg: isDarkMode ? '#0F172A' : 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 50%, #DDD6FE 100%)',
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
    <Box sx={{ p: 3, background: theme.bg, height: '100%', overflow: 'auto', transition: 'all 0.3s ease' }}>
      {/* Hero Header */}
      <Box sx={{ background: 'linear-gradient(135deg, #1E293B 0%, #334155 100%)', borderRadius: 4, p: 4, mb: 4, position: 'relative', overflow: 'hidden', boxShadow: '0 10px 40px rgba(30, 41, 59, 0.4)' }}>
        <Box sx={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, background: 'radial-gradient(circle, rgba(99, 102, 241, 0.2) 0%, transparent 70%)', borderRadius: '50%' }} />
        <Box sx={{ position: 'absolute', bottom: -30, left: '30%', width: 150, height: 150, background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)', borderRadius: '50%' }} />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'relative', zIndex: 1, flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
              <IconButton onClick={() => router.push('/campaigns')} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}><ArrowBack /></IconButton>
              <Chip icon={<Rocket sx={{ color: '#fff !important' }} />} label="Advanced Analytics" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }} />
            </Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: 'white', mb: 1 }}>{analytics.campaign.name}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Chip icon={<Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: analytics.campaign.status === 'running' ? '#10B981' : '#F59E0B', ml: 1 }} />} label={analytics.campaign.status} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', textTransform: 'capitalize', fontWeight: 600 }} />
              <Typography sx={{ color: 'rgba(255,255,255,0.8)' }}>Created {new Date(analytics.campaign.created_at).toLocaleDateString()}</Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip 
              icon={isConnected ? <Wifi /> : <WifiOff />} 
              label={isConnected ? 'Live' : 'Offline'} 
              sx={{ 
                bgcolor: isConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                color: isConnected ? '#10B981' : '#EF4444', 
                fontWeight: 600,
                border: `1px solid ${isConnected ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}` 
              }} 
            />
            <Button variant="contained" startIcon={isDarkMode ? <LightMode /> : <DarkMode />} onClick={() => setIsDarkMode(!isDarkMode)} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600, px: 2, '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}>{isDarkMode ? 'Light' : 'Dark'}</Button>
            <Button variant="contained" startIcon={<People />} onClick={() => router.push(`/campaigns/${campaignId}/analytics/leads`)} sx={{ bgcolor: 'white', color: '#6366F1', fontWeight: 600, px: 3, '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' } }}>View Leads</Button>
            <Button variant="outlined" onClick={() => router.push(`/onboarding?campaignId=${campaignId}`)} sx={{ borderColor: 'white', color: 'white', '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' } }}>Edit Campaign</Button>
          </Box>
        </Box>
      </Box>
      {/* Quick Stats Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 3, p: 3, position: 'relative', overflow: 'hidden', boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)', transition: 'all 0.3s ease' }}>
            <Box sx={{ position: 'absolute', top: 10, right: 10 }}><Avatar sx={{ bgcolor: 'rgba(99, 102, 241, 0.1)', width: 40, height: 40 }}><People sx={{ color: '#6366F1' }} /></Avatar></Box>
            <Typography sx={{ color: theme.textSecondary, fontSize: 14, mb: 1 }}>Total Leads</Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, color: theme.textPrimary }}>{liveStats?.leads_count ?? analytics.overview.total_leads}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}><TrendingUp sx={{ color: '#10B981', fontSize: 16 }} /><Typography sx={{ color: '#10B981', fontSize: 12, fontWeight: 600 }}>Active Campaign</Typography></Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 3, p: 3, position: 'relative', overflow: 'hidden', boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)', transition: 'all 0.3s ease' }}>
            <Box sx={{ position: 'absolute', top: 10, right: 10 }}><Avatar sx={{ bgcolor: 'rgba(16, 185, 129, 0.1)', width: 40, height: 40 }}><Send sx={{ color: '#10B981' }} /></Avatar></Box>
            <Typography sx={{ color: theme.textSecondary, fontSize: 14, mb: 1 }}>Messages Sent</Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, color: theme.textPrimary }}>{liveStats?.sent_count ?? analytics.overview.sent}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}><Bolt sx={{ color: '#F59E0B', fontSize: 16 }} /><Typography sx={{ color: '#F59E0B', fontSize: 12, fontWeight: 600 }}>Outreach</Typography></Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 3, p: 3, position: 'relative', overflow: 'hidden', boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)', transition: 'all 0.3s ease' }}>
            <Box sx={{ position: 'absolute', top: 10, right: 10 }}><Avatar sx={{ bgcolor: 'rgba(59, 130, 246, 0.1)', width: 40, height: 40 }}><LinkedInIcon sx={{ color: '#3B82F6' }} /></Avatar></Box>
            <Typography sx={{ color: theme.textSecondary, fontSize: 14, mb: 1 }}>Connected</Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, color: theme.textPrimary }}>{liveStats?.connected_count ?? analytics.overview.connected}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}><CheckCircle sx={{ color: '#3B82F6', fontSize: 16 }} /><Typography sx={{ color: '#3B82F6', fontSize: 12, fontWeight: 600 }}>{analytics.metrics.connection_rate?.toFixed(1) ?? 0}% Rate</Typography></Box>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <Card sx={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 3, p: 3, position: 'relative', overflow: 'hidden', boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)', transition: 'all 0.3s ease' }}>
            <Box sx={{ position: 'absolute', top: 10, right: 10 }}><Avatar sx={{ bgcolor: 'rgba(245, 158, 11, 0.1)', width: 40, height: 40 }}><Reply sx={{ color: '#F59E0B' }} /></Avatar></Box>
            <Typography sx={{ color: theme.textSecondary, fontSize: 14, mb: 1 }}>Replied</Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, color: theme.textPrimary }}>{liveStats?.replied_count ?? analytics.overview.replied}</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 1 }}><EmojiEvents sx={{ color: '#F59E0B', fontSize: 16 }} /><Typography sx={{ color: '#F59E0B', fontSize: 12, fontWeight: 600 }}>{analytics.metrics.reply_rate?.toFixed(1) ?? 0}% Rate</Typography></Box>
          </Card>
        </Grid>
      </Grid>
      {/* Analytics Charts Section */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
          <Avatar sx={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', width: 44, height: 44 }}><BarChart sx={{ color: 'white' }} /></Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: theme.textPrimary }}>Visual Analytics</Typography>
            <Typography sx={{ color: theme.textSecondary, fontSize: 14 }}>Charts and graphs for deeper insights</Typography>
          </Box>
        </Box>
        <Box sx={{ 
          '& .MuiPaper-root': { 
            bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.8) !important' : 'white !important', 
            border: `1px solid ${theme.cardBorder}`,
            boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)',
            '& .MuiTypography-root': { color: `${theme.textPrimary} !important` }
          },
          '& .recharts-text': { fill: `${theme.textSecondary} !important` },
          '& .recharts-cartesian-grid-horizontal line, & .recharts-cartesian-grid-vertical line': { stroke: `${theme.cardBorder} !important` },
          '& .recharts-legend-item-text': { color: `${theme.textPrimary} !important` }
        }}>
          <AnalyticsCharts data={{ leadsOverTime, channelBreakdown, funnel }} />
        </Box>
      </Box>
      {/* Channel Performance Cards */}
      {platformAnalytics.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
            <Avatar sx={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', width: 44, height: 44 }}><Insights /></Avatar>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: theme.textPrimary }}>Channel Performance</Typography>
              <Typography sx={{ color: theme.textSecondary, fontSize: 14 }}>Real-time analytics for your active channels</Typography>
            </Box>
            <Chip icon={<AutoGraph sx={{ fontSize: 16, color: '#10B981 !important' }} />} label="Live" size="small" sx={{ ml: 'auto', bgcolor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', fontWeight: 600, animation: 'pulse 2s infinite', '@keyframes pulse': { '0%, 100%': { opacity: 1 }, '50%': { opacity: 0.7 } } }} />
          </Box>
          <Grid container spacing={3}>
            {platformAnalytics.map((item: any) => {
              const config = platformConfig[item.platform as keyof typeof platformConfig];
              const PlatformIcon = config.icon;
              return (
                <Grid size={{ xs: 12, sm: 6, md: 3 }} key={item.platform}>
                  <Card sx={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 3, overflow: 'hidden', transition: 'all 0.3s ease', boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)', '&:hover': { transform: 'translateY(-8px)', boxShadow: `0 20px 40px ${config.color}20`, border: `1px solid ${config.color}40` } }}>
                    <Box sx={{ background: config.gradient, p: 2.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48 }}><PlatformIcon sx={{ color: '#fff', fontSize: 24 }} /></Avatar>
                        <Box>
                          <Typography variant="h6" sx={{ fontWeight: 700, color: '#fff' }}>{config.name}</Typography>
                          <Typography sx={{ color: 'rgba(255,255,255,0.8)', fontSize: 12 }}>Channel Analytics</Typography>
                        </Box>
                      </Box>
                      <Chip label={item.actions > 0 ? 'Active' : 'Ready'} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', fontWeight: 600, fontSize: 11 }} />
                    </Box>
                    <Box sx={{ p: 2.5 }}>
                      <Grid container spacing={2}>
                        <Grid size={{ xs: 6 }}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: theme.statBg, borderRadius: 2, border: `1px solid ${theme.statBorder}` }}>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: config.color }}>{item.actions}</Typography>
                            <Typography sx={{ color: theme.textSecondary, fontSize: 12 }}>Actions</Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: theme.statBg, borderRadius: 2, border: `1px solid ${theme.statBorder}` }}>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: '#10B981' }}>{item.sent}</Typography>
                            <Typography sx={{ color: theme.textSecondary, fontSize: 12 }}>Sent</Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: theme.statBg, borderRadius: 2, border: `1px solid ${theme.statBorder}` }}>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: '#3B82F6' }}>{item.connected}</Typography>
                            <Typography sx={{ color: theme.textSecondary, fontSize: 12 }}>Connected</Typography>
                          </Box>
                        </Grid>
                        <Grid size={{ xs: 6 }}>
                          <Box sx={{ textAlign: 'center', p: 2, bgcolor: theme.statBg, borderRadius: 2, border: `1px solid ${theme.statBorder}` }}>
                            <Typography variant="h4" sx={{ fontWeight: 800, color: '#F59E0B' }}>{item.replied}</Typography>
                            <Typography sx={{ color: theme.textSecondary, fontSize: 12 }}>Replied</Typography>
                          </Box>
                        </Grid>
                      </Grid>
                      <Box sx={{ mt: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                          <Typography sx={{ color: theme.textSecondary, fontSize: 13 }}>Success Rate</Typography>
                          <Typography sx={{ color: config.color, fontWeight: 700 }}>{item.rate.toFixed(1)}%</Typography>
                        </Box>
                        <LinearProgress variant="determinate" value={Math.min(item.rate, 100)} sx={{ height: 8, borderRadius: 4, bgcolor: theme.progressBg, '& .MuiLinearProgress-bar': { background: config.gradient, borderRadius: 4 } }} />
                      </Box>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}
      {/* Performance Metrics Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 3, height: '100%', boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)', transition: 'all 0.3s ease' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)' }}><BarChart sx={{ color: '#3B82F6' }} /></Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700, color: theme.textPrimary }}>Outreach Metrics</Typography>
              </Box>
              <Stack spacing={2.5}>
                {[
                  { label: 'Sent', value: analytics.overview.sent, icon: Send, color: '#6366F1' },
                  { label: 'Delivered', value: analytics.overview.delivered, icon: CheckCircle, color: '#10B981' },
                  { label: 'Opened', value: analytics.overview.opened, icon: OpenInNew, color: '#8B5CF6' },
                  { label: 'Clicked', value: analytics.overview.clicked, icon: TouchApp, color: '#EC4899' },
                  { label: 'Connected', value: analytics.overview.connected, icon: LinkedInIcon, color: '#0A66C2' },
                  { label: 'Replied', value: analytics.overview.replied, icon: Reply, color: '#F59E0B' },
                ].map((metric) => (
                  <Box key={metric.label} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, bgcolor: theme.statBg, borderRadius: 2, border: `1px solid ${theme.statBorder}` }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: `${metric.color}20`, width: 36, height: 36 }}><metric.icon sx={{ color: metric.color, fontSize: 18 }} /></Avatar>
                      <Typography sx={{ color: theme.textSecondary }}>{metric.label}</Typography>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: theme.textPrimary }}>{metric.value}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card sx={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 3, height: '100%', boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)', transition: 'all 0.3s ease' }}>
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                <Avatar sx={{ bgcolor: 'rgba(139, 92, 246, 0.2)' }}><SpeedIcon sx={{ color: '#8B5CF6' }} /></Avatar>
                <Typography variant="h6" sx={{ fontWeight: 700, color: theme.textPrimary }}>Performance Rates</Typography>
              </Box>
              <Stack spacing={3}>
                {[
                  { label: 'Delivery Rate', value: analytics.metrics.delivery_rate ?? 0, color: '#10B981' },
                  { label: 'Open Rate', value: analytics.metrics.open_rate ?? 0, color: '#8B5CF6' },
                  { label: 'Click Rate', value: analytics.metrics.click_rate ?? 0, color: '#EC4899' },
                  { label: 'Connection Rate', value: analytics.metrics.connection_rate ?? 0, color: '#0A66C2' },
                  { label: 'Reply Rate', value: analytics.metrics.reply_rate ?? 0, color: '#F59E0B' },
                ].map((rate) => (
                  <Box key={rate.label}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography sx={{ color: theme.textSecondary }}>{rate.label}</Typography>
                      <Typography sx={{ color: rate.color, fontWeight: 700 }}>{rate.value.toFixed(1)}%</Typography>
                    </Box>
                    <LinearProgress variant="determinate" value={rate.value} sx={{ height: 10, borderRadius: 5, bgcolor: theme.progressBg, '& .MuiLinearProgress-bar': { bgcolor: rate.color, borderRadius: 5 } }} />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
      {/* No Steps Message */}
      {(!analytics.step_analytics || analytics.step_analytics.length === 0) && platformAnalytics.length === 0 && (
        <Card sx={{ background: theme.cardBg, border: `1px solid ${theme.cardBorder}`, borderRadius: 3, p: 6, textAlign: 'center', boxShadow: isDarkMode ? 'none' : '0 4px 20px rgba(0,0,0,0.05)', transition: 'all 0.3s ease' }}>
          <Avatar sx={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', width: 80, height: 80, mx: 'auto', mb: 3 }}><Campaign sx={{ fontSize: 40 }} /></Avatar>
          <Typography variant="h5" sx={{ color: theme.textPrimary, fontWeight: 700, mb: 1 }}>No Campaign Steps Yet</Typography>
          <Typography sx={{ color: theme.textSecondary, mb: 3 }}>Add steps to your campaign to start seeing analytics data here</Typography>
          <Button variant="contained" onClick={() => router.push(`/campaigns/${campaignId}`)} sx={{ background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)', fontWeight: 600 }}>Configure Campaign</Button>
        </Card>
      )}
    </Box>
  );
}