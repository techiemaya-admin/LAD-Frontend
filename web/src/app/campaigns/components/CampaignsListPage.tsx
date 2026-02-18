'use client';
import React, { useState, useEffect, useMemo } from 'react';
import { Plus, RadioTower, Gauge, Zap, Trophy, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/app-toaster';
import { useRouter } from 'next/navigation';
import { deleteCampaign, pauseCampaign, stopCampaign, useCampaigns, useCampaignStats, type Campaign } from '@lad/frontend-features/campaigns';
import CampaignStatsCards from '@/components/campaigns/CampaignStatsCards';
import CampaignsTable from '@/components/campaigns/CampaignsTable';
import CampaignActionsMenu from '@/components/campaigns/CampaignActionsMenu';
import CreateCampaignDialog from '@/components/campaigns/CreateCampaignDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  startCampaign
} from '@lad/frontend-features/campaigns';
import { Goal } from 'lucide-react';

export default function CampaignsListPage() {
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
  const filteredCampaigns = useMemo(
    () =>
      campaigns?.filter((campaign: Campaign) =>
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
      ),
    [campaigns, searchQuery]
  );
  return (
    <div className="p-3 bg-[#F8F9FE] h-full overflow-auto">
      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row justify-between mt-10 items-stretch sm:items-center gap-2 sm:gap-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
           
            <Goal className="w-8 h-8 text-[#1E293B]"/>
            <h1 className="text-2xl sm:text-4xl font-bold text-[#1E293B]">
              Campaigns
            </h1>
          </div>
          <p className="text-sm text-[#64748B] ml-2">
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

      {/* LinkedIn Rate Limits Section */}
      {stats?.linkedin_rate_limits && (
        <div className="mb-8 mt-8 pt-8 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-11 h-11 bg-[#0A66C2]/10 border border-[#0A66C2]/30 shadow-sm">
              <AvatarFallback><Gauge className="w-5 h-5 text-[#0A66C2]" /></AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h6 className="text-lg font-bold text-[#1E293B]">LinkedIn Rate Limits</h6>
              <p className="text-sm text-[#64748B]">Weekly connection limits and usage tracking</p>
            </div>
            <Badge className="font-semibold bg-[#0A66C2]/10 text-[#0A66C2] text-xs">
              {stats.linkedin_rate_limits.usage.weekly_percentage}% Used
            </Badge>
          </div>

          {/* Rate Limits Grid - 2x2 Layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Daily Limit Card */}
            <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 bg-blue-100">
                      <AvatarFallback className="bg-blue-100">
                        <Zap className="w-5 h-5 text-blue-600" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-[#1E293B]">Daily Limit</p>
                      <p className="text-xs text-[#64748B]">Per account maximum</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-3xl font-bold text-[#0b1957]">
                    {stats.linkedin_rate_limits.daily.max}
                  </p>
                  <p className="text-sm text-[#64748B]">connections/day</p>
                </div>
                <div className="pt-4 border-t border-[#E2E8F0]">
                  <p className="text-xs text-[#64748B] mb-1">Total accounts: {stats.linkedin_rate_limits.daily.account_count}</p>
                  <p className="text-xs font-medium text-[#0b1957]">
                    Total daily capacity: {stats.linkedin_rate_limits.daily.total}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Limit Card */}
            <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 bg-amber-100">
                      <AvatarFallback className="bg-amber-100">
                        <Trophy className="w-5 h-5 text-amber-600" />
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold text-[#1E293B]">Weekly Limit</p>
                      <p className="text-xs text-[#64748B]">7-day rolling window</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-3xl font-bold text-[#0b1957]">
                    {stats.linkedin_rate_limits.weekly.max}
                  </p>
                  <p className="text-sm text-[#64748B]">connections/week</p>
                </div>
                <div className="pt-4 border-t border-[#E2E8F0]">
                  <p className="text-xs text-[#64748B] mb-1">Total capacity: {stats.linkedin_rate_limits.weekly.total}</p>
                  <p className="text-xs font-medium text-[#0b1957]">
                    Used this week: {stats.linkedin_rate_limits.usage.sent_last_7_days}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Usage Chart */}
            <Card className="bg-white border border-[#E2E8F0] shadow-sm rounded-xl md:col-span-2 overflow-hidden">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Avatar className="w-10 h-10 bg-green-100">
                    <AvatarFallback className="bg-green-100">
                      <Activity className="w-5 h-5 text-green-600" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-[#1E293B]">7-Day Connection Activity</p>
                    <p className="text-xs text-[#64748B]">Daily breakdown of sent connections</p>
                  </div>
                </div>

                {/* Simple Bar Chart for 7-Day Activity */}
                <div className="space-y-3">
                  {stats?.linkedin_rate_limits?.usage?.daily_breakdown?.length > 0 ? (
                    <>
                      {stats?.linkedin_rate_limits?.usage?.daily_breakdown?.map((day: any, idx: number) => {
                        const maxDaily = stats?.linkedin_rate_limits?.daily?.max || 1;
                        const percentage = (parseInt(day.sent) / maxDaily) * 100;
                        const date = new Date(day.date);
                        const dayName = date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                        
                        return (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="text-[#64748B]">{dayName}</span>
                              <span className="font-semibold text-[#0b1957]">{day.sent} sent</span>
                            </div>
                            <div className="relative h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                              <div
                                className="absolute h-2 rounded-full bg-gradient-to-r from-[#0A66C2] to-[#004182] transition-all duration-300"
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <p className="text-sm text-[#64748B] py-4 text-center">No activity in the last 7 days</p>
                  )}
                </div>

                {/* Weekly Usage Summary */}
                <div className="mt-6 pt-6 border-t border-[#E2E8F0] grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-[#64748B] mb-1">Total Sent</p>
                    <p className="text-2xl font-bold text-green-600">{stats?.linkedin_rate_limits?.usage?.sent_last_7_days ?? 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#64748B] mb-1">Weekly Limit</p>
                    <p className="text-2xl font-bold text-[#0b1957]">{stats?.linkedin_rate_limits?.weekly?.total ?? 0}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#64748B] mb-1">Capacity Used</p>
                    <p className={`text-2xl font-bold ${
                      parseInt(String(stats?.linkedin_rate_limits?.usage?.weekly_percentage ?? 0)) > 90 ? 'text-red-600' :
                      parseInt(String(stats?.linkedin_rate_limits?.usage?.weekly_percentage ?? 0)) > 70 ? 'text-amber-600' :
                      'text-green-600'
                    }`}>
                      {stats?.linkedin_rate_limits?.usage?.weekly_percentage ?? 0}%
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

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
