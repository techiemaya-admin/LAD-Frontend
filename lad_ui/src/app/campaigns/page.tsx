'use client';

import React, { useState, useEffect } from 'react';
import {
  Box, Card, CardContent, Typography, Chip, Button, TextField, InputAdornment,
  Table, TableHead, TableRow, TableCell, TableBody, IconButton, Menu, MenuItem,
  Dialog, DialogTitle, DialogContent, DialogActions, Stack, Tooltip, Avatar,
  Select, FormControl, InputLabel, Grid, Paper, LinearProgress
} from '@mui/material';
import {
  Add, Search, FilterList, MoreVert, PlayArrow, Pause, Stop, Edit, Delete,
  Visibility, TrendingUp, People, Email, LinkedIn as LinkedInIcon,
  Schedule, CheckCircle, Cancel, Send, BarChart, Phone, Videocam
} from '@mui/icons-material';
import { apiGet, apiPost, apiPut, apiDelete } from '@/lib/api';
import { useToast } from '@/components/ui/app-toaster';
import { useRouter } from 'next/navigation';

type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed' | 'stopped';

interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  leads_count: number;
  sent_count: number;
  delivered_count: number;
  connected_count: number;
  replied_count: number;
  opened_count: number;
  clicked_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  steps?: Array<{ type: string; [key: string]: any }>;
}

interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  total_leads: number;
  total_sent: number;
  total_delivered: number;
  total_connected: number;
  total_replied: number;
  avg_connection_rate: number;
  avg_reply_rate: number;
  instagram_connection_rate?: number;
  whatsapp_connection_rate?: number;
  voice_agent_connection_rate?: number;
}

export default function CampaignsPage() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const { push } = useToast();

  useEffect(() => {
    loadCampaigns();
    loadStats();
  }, [statusFilter]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await apiGet(`/api/campaigns?${params.toString()}`) as { data: Campaign[] };
      const campaignsData = response.data || [];
      
      // Debug: Log campaigns and their steps
      console.log('Campaigns loaded:', campaignsData.map((c: Campaign) => ({
        id: c.id,
        name: c.name,
        stepsCount: c.steps?.length || 0,
        stepTypes: c.steps?.map((s: any) => s.type) || []
      })));
      
      setCampaigns(campaignsData);
    } catch (error: any) {
      console.error('Failed to load campaigns:', error);
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to load campaigns' });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiGet('/api/campaigns/stats') as { data: CampaignStats };
      const statsData = response.data || null;
      console.log('Campaign stats loaded:', {
        hasStats: !!statsData,
        instagram_rate: statsData?.instagram_connection_rate,
        whatsapp_rate: statsData?.whatsapp_connection_rate,
        voice_rate: statsData?.voice_agent_connection_rate,
        allStats: statsData
      });
      setStats(statsData);
    } catch (error: any) {
      console.error('Failed to load stats:', {
        message: error?.message,
        error: error,
        // Try to get more details from the error
        details: error?.response || error?.data || error
      });
      // Set empty stats on error to prevent UI from breaking
      setStats({
        total_campaigns: 0,
        active_campaigns: 0,
        total_leads: 0,
        total_sent: 0,
        total_delivered: 0,
        total_connected: 0,
        total_replied: 0,
        avg_connection_rate: 0,
        avg_reply_rate: 0,
        instagram_connection_rate: 0,
        whatsapp_connection_rate: 0,
        voice_agent_connection_rate: 0
      });
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, campaign: Campaign) => {
    setAnchorEl(event.currentTarget);
    setSelectedCampaign(campaign);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedCampaign(null);
  };

  const handleStartCampaign = async (campaignId: string) => {
    try {
      await apiPost(`/api/campaigns/${campaignId}/start`, {});
      push({ variant: 'success', title: 'Success', description: 'Campaign started successfully' });
      loadCampaigns();
      loadStats();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to start campaign' });
    }
    handleMenuClose();
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await apiPost(`/api/campaigns/${campaignId}/pause`, {});
      push({ variant: 'success', title: 'Success', description: 'Campaign paused successfully' });
      loadCampaigns();
      loadStats();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to pause campaign' });
    }
    handleMenuClose();
  };

  const handleStopCampaign = async (campaignId: string) => {
    try {
      await apiPost(`/api/campaigns/${campaignId}/stop`, {});
      push({ variant: 'success', title: 'Success', description: 'Campaign stopped successfully' });
      loadCampaigns();
      loadStats();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to stop campaign' });
    }
    handleMenuClose();
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      await apiDelete(`/api/campaigns/${campaignId}`);
      push({ variant: 'success', title: 'Success', description: 'Campaign deleted successfully' });
      loadCampaigns();
      loadStats();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to delete campaign' });
    }
    handleMenuClose();
  };

  const handleCreateCampaign = async () => {
    if (!newCampaignName.trim()) {
      push({ variant: 'error', title: 'Error', description: 'Campaign name is required' });
      return;
    }

    try {
      await apiPost('/api/campaigns', { name: newCampaignName });
      push({ variant: 'success', title: 'Success', description: 'Campaign created successfully' });
      setCreateDialogOpen(false);
      setNewCampaignName('');
      loadCampaigns();
      loadStats();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to create campaign' });
    }
  };

  const getStatusColor = (status: CampaignStatus) => {
    switch (status) {
      case 'running': return 'success';
      case 'paused': return 'warning';
      case 'completed': return 'info';
      case 'stopped': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: CampaignStatus) => {
    switch (status) {
      case 'running': return <PlayArrow fontSize="small" />;
      case 'paused': return <Pause fontSize="small" />;
      case 'stopped': return <Stop fontSize="small" />;
      case 'completed': return <CheckCircle fontSize="small" />;
      default: return null;
    }
  };

  // Detect channels used in campaign based on steps
  const getChannelsUsed = (campaign: Campaign) => {
    const channels = {
      linkedin: false,
      email: false,
      whatsapp: false,
      instagram: false,
      voice: false,
    };

    if (campaign.steps && Array.isArray(campaign.steps) && campaign.steps.length > 0) {
      campaign.steps.forEach((step: any) => {
        const stepType = String(step.type || step.step_type || '').toLowerCase();
        if (stepType.startsWith('linkedin_') || stepType.includes('linkedin')) channels.linkedin = true;
        if (stepType.startsWith('email_') || stepType.includes('email')) channels.email = true;
        if (stepType.startsWith('whatsapp_') || stepType.includes('whatsapp')) channels.whatsapp = true;
        if (stepType.startsWith('instagram_') || stepType.includes('instagram')) channels.instagram = true;
        if (stepType.startsWith('voice_') || stepType === 'voice_agent_call' || stepType.includes('voice')) channels.voice = true;
      });
      
      // Debug log for this specific campaign
      console.log(`[${campaign.name}] Channels detected:`, channels, 'Steps:', campaign.steps.map((s: any) => s.type));
    } else {
      console.log(`[${campaign.name}] No steps found - steps:`, campaign.steps);
    }

    return channels;
  };

  // Get icon for Connected column - shows primary connection channel
  const getConnectedIcon = (campaign: Campaign) => {
    const channels = getChannelsUsed(campaign);
    
    // Priority: LinkedIn > Instagram > WhatsApp > Voice > Email
    if (channels.linkedin) {
      return <LinkedInIcon sx={{ fontSize: 18, color: '#0077B5' }} />;
    }
    if (channels.instagram) {
      return (
        <Box
          component="svg"
          sx={{ fontSize: 18, width: 18, height: 18, fill: '#E4405F' }}
          viewBox="0 0 24 24"
        >
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </Box>
      );
    }
    if (channels.whatsapp) {
      return (
        <Box
          component="svg"
          sx={{ fontSize: 18, width: 18, height: 18, fill: '#25D366' }}
          viewBox="0 0 24 24"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </Box>
      );
    }
    if (channels.voice) {
      return <Phone sx={{ fontSize: 18, color: '#8B5CF6' }} />;
    }
    if (channels.email) {
      return <Email sx={{ fontSize: 18, color: '#F59E0B' }} />;
    }
    
    // Default to LinkedIn if no channels detected
    return <LinkedInIcon sx={{ fontSize: 18, color: '#0077B5' }} />;
  };

  // Get icon for Replied column - shows primary reply channel
  const getRepliedIcon = (campaign: Campaign) => {
    const channels = getChannelsUsed(campaign);
    
    // Priority: WhatsApp > Instagram > Voice > Email > LinkedIn Message
    // Instagram should show when present (even with Email)
    if (channels.whatsapp) {
      return (
        <Box
          component="svg"
          sx={{ fontSize: 18, width: 18, height: 18, fill: '#25D366' }}
          viewBox="0 0 24 24"
        >
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
        </Box>
      );
    }
    if (channels.instagram) {
      return (
        <Box
          component="svg"
          sx={{ fontSize: 18, width: 18, height: 18, fill: '#E4405F' }}
          viewBox="0 0 24 24"
        >
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
        </Box>
      );
    }
    if (channels.voice) {
      return <Phone sx={{ fontSize: 18, color: '#8B5CF6' }} />;
    }
    if (channels.email) {
      return <Email sx={{ fontSize: 18, color: '#F59E0B' }} />;
    }
    // For LinkedIn-only campaigns, show LinkedIn icon for replies
    if (channels.linkedin) {
      return <LinkedInIcon sx={{ fontSize: 18, color: '#0077B5' }} />;
    }
    
    // Default to Email if no channels detected
    return <Email sx={{ fontSize: 18, color: '#F59E0B' }} />;
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Box sx={{ p: 3, bgcolor: '#F8F9FE', minHeight: '100vh' }}>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700, color: '#1E293B', mb: 1 }}>
            Campaigns
          </Typography>
          <Typography variant="body2" sx={{ color: '#64748B' }}>
            Manage your multi-channel outreach campaigns
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{
            background: 'linear-gradient(135deg, #00eaff, #7c3aed)',
            color: '#ffffff',
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            py: 1.5,
            boxShadow: '0 4px 20px rgba(0, 234, 255, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #7c3aed, #ff00e0)',
              boxShadow: '0 8px 30px rgba(124, 58, 237, 0.5)',
            },
          }}
        >
          Create Campaign
        </Button>
      </Box>

      {/* Stats Cards */}
      {stats && (
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: { xs: 'wrap', md: 'nowrap' }, alignItems: 'stretch' }}>
          <Box sx={{ flex: '1 1 0', minWidth: 0, width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'auto' }, display: 'flex' }}>
            <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ color: '#64748B', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Total Campaigns
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B' }}>
                      {stats.total_campaigns}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#3B82F6', width: 48, height: 48 }}>
                    <BarChart sx={{ color: '#FFFFFF' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 0', minWidth: 0, width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'auto' }, display: 'flex' }}>
            <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ color: '#64748B', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Active Campaigns
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B' }}>
                      {stats.active_campaigns}
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#10B981', width: 48, height: 48 }}>
                    <PlayArrow sx={{ color: '#FFFFFF' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 0', minWidth: 0, width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'auto' }, display: 'flex' }}>
            <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ color: '#64748B', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Connection Rate
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B' }}>
                      {stats.avg_connection_rate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#0077B5', width: 48, height: 48 }}>
                    <LinkedInIcon sx={{ color: '#FFFFFF' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 0', minWidth: 0, width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'auto' }, display: 'flex' }}>
            <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ color: '#64748B', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Reply Rate
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B' }}>
                      {stats.avg_reply_rate.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#F59E0B', width: 48, height: 48 }}>
                    <Email sx={{ color: '#FFFFFF' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 0', minWidth: 0, width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'auto' }, display: 'flex' }}>
            <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ color: '#64748B', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Instagram Connection Rate
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B' }}>
                      {(stats.instagram_connection_rate ?? 0).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#E4405F', width: 48, height: 48 }}>
                    <Box
                      component="svg"
                      sx={{
                        width: 24,
                        height: 24,
                        fill: '#FFFFFF',
                      }}
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </Box>
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 0', minWidth: 0, width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'auto' }, display: 'flex' }}>
            <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ color: '#64748B', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      WhatsApp Connection Rate
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B' }}>
                      {(stats.whatsapp_connection_rate ?? 0).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#25D366', width: 48, height: 48 }}>
                    <Box
                      component="svg"
                      sx={{
                        width: 24,
                        height: 24,
                        fill: '#FFFFFF',
                      }}
                      viewBox="0 0 24 24"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                    </Box>
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Box>
          <Box sx={{ flex: '1 1 0', minWidth: 0, width: { xs: '100%', sm: 'calc(50% - 8px)', md: 'auto' }, display: 'flex' }}>
            <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', width: '100%', display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flex: 1 }}>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" sx={{ color: '#64748B', mb: 0.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Voice Agent Connection Rate
                    </Typography>
                    <Typography variant="h5" sx={{ fontWeight: 700, color: '#1E293B' }}>
                      {(stats.voice_agent_connection_rate ?? 0).toFixed(1)}%
                    </Typography>
                  </Box>
                  <Avatar sx={{ bgcolor: '#8B5CF6', width: 48, height: 48 }}>
                    <Videocam sx={{ color: '#FFFFFF' }} />
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* Filters */}
      <Card sx={{ mb: 3, borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <TextField
              placeholder="Search campaigns..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search sx={{ color: '#64748B' }} />
                  </InputAdornment>
                ),
              }}
              sx={{ flex: 1, minWidth: 250 }}
            />
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="running">Running</MenuItem>
                <MenuItem value="paused">Paused</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="stopped">Stopped</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card sx={{ borderRadius: '20px', border: '1px solid #E2E8F0', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ p: 3 }}>
              <LinearProgress />
            </Box>
          ) : filteredCampaigns.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body1" sx={{ color: '#64748B', mb: 2 }}>
                No campaigns found
              </Typography>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={() => setCreateDialogOpen(true)}
              >
                Create Your First Campaign
              </Button>
            </Box>
          ) : (
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#F8FAFC' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>Campaign Name</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>Leads</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>Sent</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>Connected</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>Replied</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1E293B' }}>Created</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#1E293B' }} align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id} hover>
                    <TableCell>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: 600, 
                          color: '#6366F1',
                          cursor: 'pointer',
                          '&:hover': {
                            textDecoration: 'underline',
                          }
                        }}
                        onClick={() => router.push(`/campaigns/${campaign.id}/analytics`)}
                      >
                        {campaign.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(campaign.status) || undefined}
                        label={campaign.status}
                        color={getStatusColor(campaign.status)}
                        size="small"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>{campaign.leads_count}</TableCell>
                    <TableCell>{campaign.sent_count}</TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {getConnectedIcon(campaign)}
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {campaign.connected_count}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        {getRepliedIcon(campaign)}
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {campaign.replied_count}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      {new Date(campaign.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, campaign)}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Actions Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {selectedCampaign && (
          <>
            <MenuItem onClick={() => { router.push(`/campaigns/${selectedCampaign.id}`); handleMenuClose(); }}>
              <Edit sx={{ mr: 1 }} /> Edit
            </MenuItem>
            <MenuItem onClick={() => { router.push(`/campaigns/${selectedCampaign.id}/analytics`); handleMenuClose(); }}>
              <Visibility sx={{ mr: 1 }} /> View Analytics
            </MenuItem>
            {selectedCampaign.status === 'draft' && (
              <MenuItem onClick={() => handleStartCampaign(selectedCampaign.id)}>
                <PlayArrow sx={{ mr: 1 }} /> Start
              </MenuItem>
            )}
            {selectedCampaign.status === 'running' && (
              <MenuItem onClick={() => handlePauseCampaign(selectedCampaign.id)}>
                <Pause sx={{ mr: 1 }} /> Pause
              </MenuItem>
            )}
            {selectedCampaign.status === 'paused' && (
              <MenuItem onClick={() => handleStartCampaign(selectedCampaign.id)}>
                <PlayArrow sx={{ mr: 1 }} /> Resume
              </MenuItem>
            )}
            {(selectedCampaign.status === 'running' || selectedCampaign.status === 'paused') && (
              <MenuItem onClick={() => handleStopCampaign(selectedCampaign.id)}>
                <Stop sx={{ mr: 1 }} /> Stop
              </MenuItem>
            )}
            <MenuItem onClick={() => handleDeleteCampaign(selectedCampaign.id)} sx={{ color: 'error.main' }}>
              <Delete sx={{ mr: 1 }} /> Delete
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Create Campaign Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Campaign</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Campaign Name"
            value={newCampaignName}
            onChange={(e) => setNewCampaignName(e.target.value)}
            placeholder="e.g., Q1 Outreach Campaign"
            sx={{ mt: 2 }}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && newCampaignName.trim()) {
                handleCreateCampaign();
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={() => {
              if (newCampaignName.trim()) {
                // Redirect to new campaign builder
                router.push(`/campaigns/new?name=${encodeURIComponent(newCampaignName)}`);
                setCreateDialogOpen(false);
              } else {
                push({ variant: 'error', title: 'Error', description: 'Campaign name is required' });
              }
            }}
            variant="contained"
            sx={{
              background: 'linear-gradient(135deg, #00eaff, #7c3aed)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7c3aed, #ff00e0)',
              },
            }}
          >
            Create & Build
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

