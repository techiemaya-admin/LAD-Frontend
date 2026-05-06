'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/app-toaster';
import { useRouter } from 'next/navigation';
import { deleteCampaign, pauseCampaign, stopCampaign, resumeCampaign, restartCampaign, useCampaigns, useCampaignStats, type Campaign } from '@lad/frontend-features/campaigns';
import CampaignStatsCards from './CampaignStatsCards';
import CampaignFilters from './CampaignFilters';
import CampaignsTable from './CampaignsTable';
import CampaignActionsMenu from './CampaignActionsMenu';
import CreateCampaignDialog from './CreateCampaignDialog';
import { 
  getCampaign, 
  createCampaign, 
  updateCampaign, 
  startCampaign
} from '@lad/frontend-features/campaigns';
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
      push({ variant: 'error', title: 'Error', description: campaignsError?.toString() });
    }
  }, [campaignsError, push]);

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
      await startCampaign(campaignId);
      push({ variant: 'success', title: 'Success', description: 'Campaign started successfully' });
      refetchCampaigns();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to start campaign' });
    }
    handleMenuClose();
  };
  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await pauseCampaign(campaignId);
      push({ variant: 'success', title: 'Success', description: 'Campaign paused successfully' });
      refetchCampaigns();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to pause campaign' });
    }
    handleMenuClose();
  };
  const handleStopCampaign = async (campaignId: string) => {
    try {
      await stopCampaign(campaignId);
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
      await deleteCampaign(campaignId);
      push({ variant: 'success', title: 'Success', description: 'Campaign deleted successfully' });
      refetchCampaigns();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to delete campaign' });
    }
    handleMenuClose();
  };
  const handleResumeCampaign = async (campaignId: string) => {
    try {
      await resumeCampaign(campaignId);
      push({ variant: 'success', title: 'Success', description: 'Campaign resumed from last step' });
      refetchCampaigns();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to resume campaign' });
    }
    handleMenuClose();
  };
  const handleRestartCampaign = async (campaignId: string) => {
    if (!window.confirm('Restart this campaign? All execution history will be cleared and every lead will be re-processed from step 1.')) return;
    try {
      await restartCampaign(campaignId);
      push({ variant: 'success', title: 'Success', description: 'Campaign restarted successfully' });
      refetchCampaigns();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to restart campaign' });
    }
    handleMenuClose();
  };
  const filteredCampaigns = useMemo(
    () =>
      campaigns?.filter((campaign: Campaign) =>
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [campaigns, searchQuery]
  );
  return (
    <div className="p-3 bg-[#F8F9FE] dark:bg-[#000724] h-full overflow-auto">
      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row justify-between mt-10 items-stretch sm:items-center gap-2 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold text-[#1E293B] dark:text-white mb-1">
            Campaigns
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#7a8ba3] ml-2">
            Manage your multi-channel outreach campaigns
          </p>
        </div>
        <Button
          onClick={() => router.push('/onboarding')}
          className="bg-[#0b1957] text-white rounded-xl font-semibold px-3 py-1.5 shadow-[0_4px_20px_rgba(11,25,87,0.3)] w-full sm:w-auto hover:bg-[#0a1540] hover:shadow-[0_8px_30px_rgba(11,25,87,0.5)]"
        >
          <Plus />
          Create Campaign
        </Button>
      </div>
      {/* Stats Cards */}
      {stats && <CampaignStatsCards stats={stats} />}
      {/* Campaigns Table */}
      <CampaignsTable
        campaigns={filteredCampaigns ?? []}
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
        onResume={handleResumeCampaign}
        onRestart={handleRestartCampaign}
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
