'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Button } from '@mui/material';
import { Add } from '@mui/icons-material';
import { useToast } from '@/components/ui/app-toaster';
import { useRouter } from 'next/navigation';
import { useCampaigns, useCampaignStats, type Campaign } from '@/features/campaigns';
import CampaignStatsCards from './CampaignStatsCards';
import CampaignFilters from './CampaignFilters';
import CampaignsTable from './CampaignsTable';
import CampaignActionsMenu from './CampaignActionsMenu';
import CreateCampaignDialog from './CreateCampaignDialog';

export default function CampaignsList() {
  const router = useRouter();
  const { push } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');

  // SDK Hooks
  const {
    campaigns,
    loading,
    error: campaignsError,
    refetch: refetchCampaigns,
    start,
    pause,
    stop,
    remove,
  } = useCampaigns(
    useMemo(
      () => ({
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? (statusFilter as any) : undefined,
      }),
      [searchQuery, statusFilter]
    )
  );

  const { stats, error: statsError } = useCampaignStats();

  // Handle errors from SDK hooks
  useEffect(() => {
    if (campaignsError) {
      push({ variant: 'error', title: 'Error', description: campaignsError });
    }
  }, [campaignsError, push]);

  useEffect(() => {
    if (statsError) {
      console.error('[campaigns] Stats error:', statsError);
    }
  }, [statsError]);

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
      await start(campaignId);
      push({ variant: 'success', title: 'Success', description: 'Campaign started successfully' });
      refetchCampaigns();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to start campaign' });
    }
    handleMenuClose();
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await pause(campaignId);
      push({ variant: 'success', title: 'Success', description: 'Campaign paused successfully' });
      refetchCampaigns();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to pause campaign' });
    }
    handleMenuClose();
  };

  const handleStopCampaign = async (campaignId: string) => {
    try {
      await stop(campaignId);
      push({ variant: 'success', title: 'Success', description: 'Campaign stopped successfully' });
      refetchCampaigns();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to stop campaign' });
    }
    handleMenuClose();
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;

    try {
      await remove(campaignId);
      push({ variant: 'success', title: 'Success', description: 'Campaign deleted successfully' });
      refetchCampaigns();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to delete campaign' });
    }
    handleMenuClose();
  };

  const filteredCampaigns = useMemo(
    () =>
      campaigns.filter((campaign: Campaign) =>
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [campaigns, searchQuery]
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
      {stats && <CampaignStatsCards stats={stats} />}

      {/* Filters */}
      <CampaignFilters
        searchQuery={searchQuery}
        statusFilter={statusFilter}
        onSearchChange={setSearchQuery}
        onStatusChange={setStatusFilter}
      />

      {/* Campaigns Table */}
      <CampaignsTable
        campaigns={filteredCampaigns}
        loading={loading}
        onMenuOpen={handleMenuOpen}
      />

      {/* Actions Menu */}
      <CampaignActionsMenu
        anchorEl={anchorEl}
        selectedCampaign={selectedCampaign}
        onClose={handleMenuClose}
        onStart={handleStartCampaign}
        onPause={handlePauseCampaign}
        onStop={handleStopCampaign}
        onDelete={handleDeleteCampaign}
      />

      {/* Create Campaign Dialog */}
      <CreateCampaignDialog
        open={createDialogOpen}
        campaignName={newCampaignName}
        onClose={() => {
          setCreateDialogOpen(false);
          setNewCampaignName('');
        }}
        onNameChange={setNewCampaignName}
      />
    </Box>
  );
}
