'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box, Card, CardContent, Typography, Button, Grid, Stack, Divider,
  CircularProgress, LinearProgress, Avatar, Chip, Paper
} from '@mui/material';
import {
  ArrowBack, TrendingUp, People, Send, CheckCircle, Email, OpenInNew,
  Launch, Error as ErrorIcon, LinkedIn as LinkedInIcon, Schedule
} from '@mui/icons-material';
import { apiGet } from '@/lib/api';
import { useToast } from '@/components/ui/app-toaster';

interface CampaignAnalytics {
  campaign: {
    id: string;
    name: string;
    status: string;
    created_at: string;
  };
  overview: {
    total_leads: number;
    active_leads: number;
    completed_leads: number;
    stopped_leads: number;
  };
  metrics: {
    sent: number;
    delivered: number;
    connected: number;
    replied: number;
    opened: number;
    clicked: number;
    errors: number;
    // Step-specific metrics
    leads_generated?: number;
    connection_requests_sent?: number;
    connection_requests_accepted?: number;
    linkedin_messages_sent?: number;
    linkedin_messages_replied?: number;
    voice_calls_made?: number;
    voice_calls_answered?: number;
  };
  rates: {
    delivery_rate: number;
    connection_rate: number;
    reply_rate: number;
    open_rate: number;
    click_rate: number;
  };
  step_analytics: Array<{
    id: string;
    type: string;
    title: string;
    order: number;
    total_executions: number;
    sent: number;
    delivered: number;
    connected: number;
    replied: number;
    errors: number;
  }>;
}

export default function CampaignAnalyticsPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<CampaignAnalytics | null>(null);

  useEffect(() => {
    if (campaignId) {
      loadAnalytics();
    }
  }, [campaignId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/api/campaigns/${campaignId}/analytics`) as { data: CampaignAnalytics };
      setAnalytics(response.data);
    } catch (error: any) {
      console.error('Failed to load analytics:', error);
      push({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to load analytics',
      });
      router.push('/campaigns');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'info';
      case 'stopped': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8F9FE' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography>Loading analytics...</Typography>
        </Stack>
      </Box>
    );
  }

  if (!analytics) {
    return (
      <Box sx={{ p: 3, bgcolor: '#F8F9FE', minHeight: '100vh' }}>
        <Typography>No analytics data available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, bgcolor: '#F8F9FE', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => router.push('/campaigns')}
            sx={{ minWidth: 'auto' }}
          >
            Back
          </Button>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B', mb: 0.5 }}>
              {analytics.campaign.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chip
                label={analytics.campaign.status}
                color={getStatusColor(analytics.campaign.status) as any}
                size="small"
                sx={{ textTransform: 'capitalize' }}
              />
              <Typography variant="body2" sx={{ color: '#64748B' }}>
                Created {new Date(analytics.campaign.created_at).toLocaleDateString()}
              </Typography>
            </Box>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<People />}
            onClick={() => router.push(`/campaigns/${campaignId}/analytics/leads`)}
            sx={{ bgcolor: '#3B82F6', '&:hover': { bgcolor: '#2563EB' } }}
          >
            View Leads
          </Button>
          <Button
            variant="outlined"
            onClick={() => router.push(`/campaigns/${campaignId}`)}
          >
            Edit Campaign
          </Button>
        </Box>
      </Box>

      {/* Overview Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card 
            onClick={() => router.push(`/campaigns/${campaignId}/analytics/leads`)}
            sx={{ 
              borderRadius: '20px', 
              border: '1px solid #E2E8F0', 
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                transform: 'translateY(-2px)',
                borderColor: '#3B82F6'
              }
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748B', mb: 0.5 }}>
                    Total Leads
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    {analytics.overview.total_leads}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#3B82F6', width: 48, height: 48 }}>
                  <People sx={{ color: '#FFFFFF' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748B', mb: 0.5 }}>
                    Active Leads
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    {analytics.overview.active_leads}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#10B981', width: 48, height: 48 }}>
                  <TrendingUp sx={{ color: '#FFFFFF' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748B', mb: 0.5 }}>
                    Completed
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    {analytics.overview.completed_leads}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#8B5CF6', width: 48, height: 48 }}>
                  <CheckCircle sx={{ color: '#FFFFFF' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="body2" sx={{ color: '#64748B', mb: 0.5 }}>
                    Stopped
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    {analytics.overview.stopped_leads}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: '#EF4444', width: 48, height: 48 }}>
                  <ErrorIcon sx={{ color: '#FFFFFF' }} />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Step-Specific Metrics */}
      {((analytics.metrics.leads_generated && analytics.metrics.leads_generated > 0) || 
        (analytics.metrics.connection_requests_sent && analytics.metrics.connection_requests_sent > 0) || 
        (analytics.metrics.linkedin_messages_sent && analytics.metrics.linkedin_messages_sent > 0) || 
        (analytics.metrics.voice_calls_made && analytics.metrics.voice_calls_made > 0)) && (
        <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', mb: 3 }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1E293B' }}>
              Step-Specific Activity
            </Typography>
            <Grid container spacing={2}>
              {analytics.metrics.leads_generated && analytics.metrics.leads_generated > 0 && (
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F8FAFC', borderRadius: '12px' }}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1 }}>
                      Leads Scraped/Generated
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#3B82F6' }}>
                      {analytics.metrics.leads_generated}
                    </Typography>
                  </Box>
                </Grid>
              )}
              {analytics.metrics.connection_requests_sent && analytics.metrics.connection_requests_sent > 0 && (
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F8FAFC', borderRadius: '12px' }}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1 }}>
                      Connection Requests Sent
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#0077B5' }}>
                      {analytics.metrics.connection_requests_sent}
                    </Typography>
                    {analytics.metrics.connection_requests_accepted && analytics.metrics.connection_requests_accepted > 0 && (
                      <Typography variant="body2" sx={{ color: '#10B981', mt: 0.5 }}>
                        {analytics.metrics.connection_requests_accepted} accepted
                      </Typography>
                    )}
                  </Box>
                </Grid>
              )}
              {analytics.metrics.linkedin_messages_sent && analytics.metrics.linkedin_messages_sent > 0 && (
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F8FAFC', borderRadius: '12px' }}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1 }}>
                      LinkedIn Messages Sent
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#0077B5' }}>
                      {analytics.metrics.linkedin_messages_sent}
                    </Typography>
                    {analytics.metrics.linkedin_messages_replied && analytics.metrics.linkedin_messages_replied > 0 && (
                      <Typography variant="body2" sx={{ color: '#10B981', mt: 0.5 }}>
                        {analytics.metrics.linkedin_messages_replied} replied
                      </Typography>
                    )}
                  </Box>
                </Grid>
              )}
              {analytics.metrics.voice_calls_made && analytics.metrics.voice_calls_made > 0 && (
                <Grid item xs={12} sm={6} md={3}>
                  <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#F8FAFC', borderRadius: '12px' }}>
                    <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mb: 1 }}>
                      Voice Calls Made
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#8B5CF6' }}>
                      {analytics.metrics.voice_calls_made}
                    </Typography>
                    {analytics.metrics.voice_calls_answered && analytics.metrics.voice_calls_answered > 0 && (
                      <Typography variant="body2" sx={{ color: '#10B981', mt: 0.5 }}>
                        {analytics.metrics.voice_calls_answered} answered
                      </Typography>
                    )}
                  </Box>
                </Grid>
              )}
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Metrics Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1E293B' }}>
                Outreach Metrics
              </Typography>
              <Stack spacing={2}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Send sx={{ color: '#3B82F6', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Sent</Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    {analytics.metrics.sent}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CheckCircle sx={{ color: '#10B981', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Delivered</Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    {analytics.metrics.delivered}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LinkedInIcon sx={{ color: '#0077B5', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Connected</Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    {analytics.metrics.connected}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Email sx={{ color: '#F59E0B', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Replied</Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    {analytics.metrics.replied}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <OpenInNew sx={{ color: '#8B5CF6', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Opened</Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    {analytics.metrics.opened}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Launch sx={{ color: '#EC4899', fontSize: 20 }} />
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Clicked</Typography>
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: '#1E293B' }}>
                    {analytics.metrics.clicked}
                  </Typography>
                </Box>
                {analytics.metrics.errors > 0 && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ErrorIcon sx={{ color: '#EF4444', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ color: '#64748B' }}>Errors</Typography>
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: '#EF4444' }}>
                      {analytics.metrics.errors}
                    </Typography>
                  </Box>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1E293B' }}>
                Performance Rates
              </Typography>
              <Stack spacing={2}>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Delivery Rate</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1E293B' }}>
                      {analytics.rates.delivery_rate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={analytics.rates.delivery_rate}
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#E2E8F0' }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Connection Rate</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0077B5' }}>
                      {analytics.rates.connection_rate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={analytics.rates.connection_rate}
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#E2E8F0' }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Reply Rate</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#F59E0B' }}>
                      {analytics.rates.reply_rate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={analytics.rates.reply_rate}
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#E2E8F0' }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Open Rate</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#8B5CF6' }}>
                      {analytics.rates.open_rate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={analytics.rates.open_rate}
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#E2E8F0' }}
                  />
                </Box>
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>Click Rate</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#EC4899' }}>
                      {analytics.rates.click_rate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={analytics.rates.click_rate}
                    sx={{ height: 8, borderRadius: 4, bgcolor: '#E2E8F0' }}
                  />
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Step-by-Step Analytics */}
      {analytics.step_analytics && analytics.step_analytics.length > 0 && (
        <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: '#1E293B' }}>
              Step-by-Step Performance
            </Typography>
            <Stack spacing={2}>
              {analytics.step_analytics.map((step, index) => (
                <Paper
                  key={step.id}
                  sx={{
                    p: 2,
                    bgcolor: '#F8FAFC',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: '#7c3aed', width: 32, height: 32, fontSize: 14 }}>
                        {step.order + 1}
                      </Avatar>
                      <Typography variant="body1" sx={{ fontWeight: 600, color: '#1E293B' }}>
                        {step.title}
                      </Typography>
                      <Chip
                        label={step.type.replace('_', ' ')}
                        size="small"
                        sx={{ textTransform: 'capitalize', fontSize: '10px', height: 20 }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#64748B' }}>
                      {step.total_executions} executions
                    </Typography>
                  </Box>
                  <Grid container spacing={2} sx={{ mt: 1 }}>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>Sent</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#3B82F6' }}>
                          {step.sent}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>Delivered</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#10B981' }}>
                          {step.delivered}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>Connected</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#0077B5' }}>
                          {step.connected}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#64748B' }}>Replied</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 700, color: '#F59E0B' }}>
                          {step.replied}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                  {step.errors > 0 && (
                    <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #E2E8F0' }}>
                      <Typography variant="caption" sx={{ color: '#EF4444' }}>
                        <ErrorIcon sx={{ fontSize: 14, verticalAlign: 'middle', mr: 0.5 }} />
                        {step.errors} errors
                      </Typography>
                    </Box>
                  )}
                </Paper>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

