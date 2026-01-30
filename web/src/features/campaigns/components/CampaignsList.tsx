'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/app-toaster';
import { useRouter } from 'next/navigation';
import { useCampaigns, useCampaignStats, useCampaignLiveUpdates, type Campaign } from '@/features/campaigns';
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
  // Enable live updates via SSE
  useCampaignLiveUpdates();
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
    <div className="p-3 bg-[#F8F9FE] h-full overflow-auto">
      {/* Header */}
      <div className="mb-3 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-2 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-[#1E293B] mb-1">
            Campaigns
          </h1>
          <p className="text-sm text-[#64748B]">
            Manage your multi-channel outreach campaigns
          </p>
        </div>
        <Button
          onClick={() => router.push('/onboarding')}
          className="bg-gradient-to-br from-[#00eaff] to-[#7c3aed] text-white rounded-xl font-semibold px-3 py-1.5 shadow-[0_4px_20px_rgba(0,234,255,0.3)] w-full sm:w-auto hover:from-[#7c3aed] hover:to-[#ff00e0] hover:shadow-[0_8px_30px_rgba(124,58,237,0.5)]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Create Campaign
        </Button>
      </div>
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
    </div>
  );
}
