"use client";
import React, { useState, useEffect, useMemo } from "react";
import { Plus, RadioTower, Gauge, Zap, Trophy, Activity, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/app-toaster";
import { useRouter, useSearchParams } from "next/navigation";
import {
  deleteCampaign,
  pauseCampaign,
  stopCampaign,
  resumeCampaign,
  restartCampaign,
  useCampaigns,
  useCampaignStats,
  type Campaign,
} from "@lad/frontend-features/campaigns";
import CampaignStatsCards from "@/components/campaigns/CampaignStatsCards";
import CampaignsTable from "@/components/campaigns/CampaignsTable";
import CampaignActionsMenu from "@/components/campaigns/CampaignActionsMenu";
import CreateCampaignDialog from "@/components/campaigns/CreateCampaignDialog";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { startCampaign } from "@lad/frontend-features/campaigns";
import { Goal } from "lucide-react";

export default function CampaignsListPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { push } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  // Read ?status= from URL — synced every time URL changes
  const [statusFilter, setStatusFilter] = useState<string>(
    searchParams.get("status") || "all",
  );

  // Sync statusFilter whenever URL searchParams change
  // This ensures clicking stat cards (which push new URL) updates the filter
  useEffect(() => {
    const urlStatus = searchParams.get("status") || "all";
    setStatusFilter(urlStatus);
  }, [searchParams]);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(
    null,
  );
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState("");
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
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
      }),
      [searchQuery, statusFilter],
    ),
  );

  const { stats, error: statsError, refetch: refetchStats } = useCampaignStats();
  const [syncing, setSyncing] = useState(false);

  const handleRefreshConnections = async () => {
    setSyncing(true);
    try {
      const res = await fetch("/api/campaigns/linkedin/sync-contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Sync failed");

      const upserted  = data.upserted  ?? 0;
      const triggered = data.triggered ?? 0;
      let description = data.mode === "incremental"
        ? `${upserted} new connection${upserted !== 1 ? "s" : ""} synced`
        : `${upserted} connection${upserted !== 1 ? "s" : ""} synced`;
      if (triggered > 0) {
        description += ` · ${triggered} follow-up${triggered !== 1 ? "s" : ""} sent`;
      }
      push({
        variant: "success",
        title: "Connections Refreshed",
        description,
      });
      refetchStats();
    } catch (err: any) {
      push({
        variant: "error",
        title: "Refresh Failed",
        description: err?.message || "Could not sync LinkedIn connections",
      });
    } finally {
      setSyncing(false);
    }
  };
  // Handle errors from SDK hooks
  useEffect(() => {
    if (campaignsError) {
      push({
        variant: "error",
        title: "Error",
        description: campaignsError?.toString(),
      });
    }
  }, [campaignsError, push]);

  const handleMenuOpen = (
    event: React.MouseEvent<HTMLElement>,
    campaign: Campaign,
  ) => {
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
      push({
        variant: "success",
        title: "Success",
        description: "Campaign started successfully",
      });
      refetchCampaigns();
    } catch (error: any) {
      push({
        variant: "error",
        title: "Error",
        description: error.message || "Failed to start campaign",
      });
    }
    handleMenuClose();
  };
  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await pauseCampaign(campaignId);
      push({
        variant: "success",
        title: "Success",
        description: "Campaign paused successfully",
      });
      refetchCampaigns();
    } catch (error: any) {
      push({
        variant: "error",
        title: "Error",
        description: error.message || "Failed to pause campaign",
      });
    }
    handleMenuClose();
  };
  const handleStopCampaign = async (campaignId: string) => {
    try {
      await stopCampaign(campaignId);
      push({
        variant: "success",
        title: "Success",
        description: "Campaign stopped successfully",
      });
      refetchCampaigns();
    } catch (error: any) {
      push({
        variant: "error",
        title: "Error",
        description: error.message || "Failed to stop campaign",
      });
    }
    handleMenuClose();
  };
  const handleResumeCampaign = async (campaignId: string) => {
    try {
      await resumeCampaign(campaignId);
      push({
        variant: "success",
        title: "Success",
        description: "Campaign resumed from last step",
      });
      refetchCampaigns();
    } catch (error: any) {
      push({
        variant: "error",
        title: "Error",
        description: error.message || "Failed to resume campaign",
      });
    }
    handleMenuClose();
  };
  const handleRestartCampaign = async (campaignId: string) => {
    if (
      !window.confirm(
        "Restart this campaign? All execution history will be cleared and every lead will be re-processed from step 1.",
      )
    )
      return;
    try {
      await restartCampaign(campaignId);
      push({
        variant: "success",
        title: "Success",
        description: "Campaign restarted successfully",
      });
      refetchCampaigns();
    } catch (error: any) {
      push({
        variant: "error",
        title: "Error",
        description: error.message || "Failed to restart campaign",
      });
    }
    handleMenuClose();
  };
  const handleDeleteCampaign = async (campaignId: string) => {
    if (!window.confirm("Are you sure you want to delete this campaign?"))
      return;
    try {
      await deleteCampaign(campaignId);
      push({
        variant: "success",
        title: "Success",
        description: "Campaign deleted successfully",
      });
      refetchCampaigns();
    } catch (error: any) {
      push({
        variant: "error",
        title: "Error",
        description: error.message || "Failed to delete campaign",
      });
    }
    handleMenuClose();
  };
  const filteredCampaigns = useMemo(
    () =>
      campaigns?.filter((campaign: Campaign) =>
        campaign.name.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [campaigns, searchQuery],
  );
  return (
    <div className="p-3 bg-[#F8F9FE] h-full overflow-auto">
      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row justify-between mt-10 items-stretch sm:items-center gap-2 sm:gap-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Goal className="w-8 h-8 text-[#1E293B]" />
            <h1 className="text-2xl sm:text-4xl font-bold text-[#1E293B]">
              Campaigns
            </h1>
          </div>
          <p className="text-sm text-[#64748B] ml-2">
            Manage your multi-channel outreach campaigns
          </p>
        </div>
        <div className="flex gap-3 flex-col sm:flex-row">
          {/* Refresh LinkedIn accepted connections */}
          <Button
            onClick={handleRefreshConnections}
            disabled={syncing}
            variant="outline"
            className="rounded-xl font-semibold px-3 py-1.5 w-full sm:w-auto border-[#0A66C2] text-[#0A66C2] hover:bg-[#0A66C2]/10 hover:cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? "Syncing..." : "Refresh Connections"}
          </Button>

          <Button
            onClick={() => router.push("/campaigns/templates/create")}
            className="bg-[#0b1957] text-white rounded-xl font-semibold px-3 py-1.5 shadow-[0_4px_20px_rgba(11,25,87,0.3)] w-full sm:w-auto hover:bg-[#0a1540] hover:shadow-[0_8px_30px_rgba(11,25,87,0.5)] hover:cursor-pointer"
          >
            <Plus />
             Template
          </Button>

          <Button
            onClick={() => router.push("/onboarding/advanced-search-ai")}
            className="bg-[#0b1957] text-white rounded-xl font-semibold px-3 py-1.5 shadow-[0_4px_20px_rgba(11,25,87,0.3)] w-full sm:w-auto hover:bg-[#0a1540] hover:shadow-[0_8px_30px_rgba(11,25,87,0.5)]"
          >
            <Plus />
             Campaign
          </Button>
        </div>
      </div>
      {/* Stats Cards */}
      {stats && <CampaignStatsCards stats={stats} />}

      {/* LinkedIn Rate Limits Section */}
      {(stats as any)?.linkedin_rate_limits && (() => {
        const linkedinStats = (stats as any).linkedin_rate_limits;
        return (
        <div className="mb-8 mt-8 pt-8 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-4 mb-6">
            <Avatar className="w-11 h-11 bg-[#0A66C2]/10 border border-[#0A66C2]/30 shadow-sm">
              <AvatarFallback>
                <Gauge className="w-5 h-5 text-[#0A66C2]" />
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h6 className="text-lg font-bold text-[#1E293B]">
                LinkedIn Rate Limits
              </h6>
              <p className="text-sm text-[#64748B]">
                Weekly connection limits and usage tracking
              </p>
            </div>
            <Badge className="font-semibold bg-[#0A66C2]/10 text-[#0A66C2] text-xs">
              {linkedinStats.usage.weekly_percentage}% Used
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
                      <p className="text-sm font-semibold text-[#1E293B]">
                        Daily Limit
                      </p>
                      <p className="text-xs text-[#64748B]">
                        Per account maximum
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-3xl font-bold text-[#0b1957]">
                    {linkedinStats.daily.max}
                  </p>
                  <p className="text-sm text-[#64748B]">connections/day</p>
                </div>
                <div className="pt-4 border-t border-[#E2E8F0]">
                  <p className="text-xs text-[#64748B] mb-1">
                    Total accounts:{" "}
                    {linkedinStats.daily.account_count}
                  </p>
                  <p className="text-xs font-medium text-[#0b1957]">
                    Total daily capacity:{" "}
                    {linkedinStats.daily.total}
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
                      <p className="text-sm font-semibold text-[#1E293B]">
                        Weekly Limit
                      </p>
                      <p className="text-xs text-[#64748B]">
                        7-day rolling window
                      </p>
                    </div>
                  </div>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-3xl font-bold text-[#0b1957]">
                    {linkedinStats.weekly.max}
                  </p>
                  <p className="text-sm text-[#64748B]">connections/week</p>
                </div>
                <div className="pt-4 border-t border-[#E2E8F0]">
                  <p className="text-xs text-[#64748B] mb-1">
                    Total capacity: {linkedinStats.weekly.total}
                  </p>
                  <p className="text-xs font-medium text-[#0b1957]">
                    Used this week:{" "}
                    {linkedinStats.usage.sent_last_7_days}
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
                    <p className="text-sm font-semibold text-[#1E293B]">
                      7-Day Connection Activity
                    </p>
                    <p className="text-xs text-[#64748B]">
                      Daily breakdown of sent connections
                    </p>
                  </div>
                </div>

                {/* Simple Bar Chart for 7-Day Activity */}
                <div className="space-y-3">
                  {linkedinStats?.usage?.daily_breakdown?.length >
                  0 ? (
                    (() => {
                      const maxInBreakdown = Math.max(
                        ...(linkedinStats?.usage?.daily_breakdown?.map(
                          (d: any) => parseInt(d.sent),
                        ) || [1]),
                      );
                      const maxCapacity = Math.max(
                        linkedinStats?.daily?.total || 1,
                        maxInBreakdown,
                      );

                      return linkedinStats?.usage?.daily_breakdown?.map(
                        (day: any, idx: number) => {
                          const percentage =
                            (parseInt(day.sent) / maxCapacity) * 100;
                          const date = new Date(day.date);
                          const dayName = date.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          });

                          return (
                            <div key={idx} className="space-y-1">
                              <div className="flex justify-between items-center text-xs">
                                <span className="text-[#64748B]">
                                  {dayName}
                                </span>
                                <span className="font-semibold text-[#0b1957]">
                                  {day.sent} sent
                                </span>
                              </div>
                              <div className="relative h-2 rounded-full bg-[#E2E8F0] overflow-hidden">
                                <div
                                  className="absolute h-2 rounded-full bg-gradient-to-r from-[#0A66C2] to-[#004182] transition-all duration-300"
                                  style={{
                                    width: `${Math.min(percentage, 100)}%`,
                                  }}
                                ></div>
                              </div>
                            </div>
                          );
                        },
                      );
                    })()
                  ) : (
                    <p className="text-sm text-[#64748B] py-4 text-center">
                      No activity in the last 7 days
                    </p>
                  )}
                </div>

                {/* Weekly Usage Summary */}
                <div className="mt-6 pt-6 border-t border-[#E2E8F0] grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <p className="text-xs text-[#64748B] mb-1">Total Sent</p>
                    <p className="text-2xl font-bold text-green-600">
                      {linkedinStats?.usage?.sent_last_7_days ??
                        0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#64748B] mb-1">Weekly Limit</p>
                    <p className="text-2xl font-bold text-[#0b1957]">
                      {linkedinStats?.weekly?.total ?? 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-[#64748B] mb-1">Capacity Used</p>
                    <p
                      className={`text-2xl font-bold ${
                        parseInt(
                          String(
                            linkedinStats?.usage
                              ?.weekly_percentage ?? 0,
                          ),
                        ) > 90
                          ? "text-red-600"
                          : parseInt(
                                String(
                                  linkedinStats?.usage
                                    ?.weekly_percentage ?? 0,
                                ),
                              ) > 70
                            ? "text-amber-600"
                            : "text-green-600"
                      }`}
                    >
                      {linkedinStats?.usage?.weekly_percentage ??
                        0}
                      %
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        );
      })()}

      {/* Active Filter Banner */}
      {statusFilter !== "all" && (
        <div className="mb-4 flex items-center gap-3 px-4 py-2.5 bg-[#0b1957]/8 border border-[#0b1957]/20 rounded-xl">
          <span className="text-sm font-semibold text-[#0b1957]">
            Filtered: <span className="capitalize">{statusFilter}</span>{" "}
            campaigns
          </span>
          <button
            onClick={() => {
              setStatusFilter("all");
              router.push("/campaigns");
            }}
            className="ml-auto text-xs text-slate-500 hover:text-red-500 underline"
          >
            Clear filter
          </button>
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
        onResume={handleResumeCampaign}
        onRestart={handleRestartCampaign}
        onDelete={handleDeleteCampaign}
      />
      {/* Create Campaign Dialog 080426 */}
      <CreateCampaignDialog
        open={createDialogOpen}
        campaignName={newCampaignName}
        onClose={() => {
          setCreateDialogOpen(false);
          setNewCampaignName("");
        }}
        onNameChange={setNewCampaignName}
      />
    </div>
  );
}
