'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Save, Play, Eye, Pause, Loader2 } from 'lucide-react';
import { useCampaignStore } from '@/store/campaignStore';
import { useCampaign, updateCampaign, createCampaign, pauseCampaign } from '@lad/frontend-features/campaigns';
import { useToast } from '@/components/ui/app-toaster';
import { StepLibrary, FlowCanvas, StepSettings } from '@/components/campaigns';
export default function CampaignDetailPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const {
    name,
    nodes,
    setName,
    loadCampaign,
    serialize,
  } = useCampaignStore();
  // Campaign loading is handled by useCampaign hook above
  // Use React Query hook for campaign data
  const { data: campaign, isLoading: campaignLoading, error: campaignError, refetch } = useCampaign(
    campaignId && campaignId !== 'new' ? campaignId : null
  );
  useEffect(() => {
    if (campaignError) {
      push({
        variant: 'error',
        title: 'Error',
        description: campaignError instanceof Error ? campaignError.message : 'Failed to load campaign',
      });
      router.push('/campaigns');
    }
  }, [campaignError, push, router]);
  useEffect(() => {
    if (campaign) {
      // Load campaign into store - this will convert steps to nodes
      loadCampaign({
        name: campaign.name,
        steps: campaign.steps || [],
      });
      setLoading(false);
    } else if (campaignId === 'new') {
      setLoading(false);
    } else if (campaignLoading) {
      setLoading(true);
    } else {
      setLoading(false);
    }
  }, [campaign, campaignId, campaignLoading, loadCampaign]);
  const handleSave = async (startCampaign = false) => {
    if (!name.trim()) {
      push({ variant: 'error', title: 'Error', description: 'Campaign name is required' });
      return;
    }
    if (nodes.filter((n) => n.type !== 'start' && n.type !== 'end').length === 0) {
      push({ variant: 'error', title: 'Error', description: 'Please add at least one step to your campaign' });
      return;
    }
    try {
      setSaving(true);
      const campaignData = serialize();
      if (campaignId === 'new') {
        // Create new campaign
        const response = await createCampaign({
          name: campaignData.name,
          status: startCampaign ? 'running' : 'draft',
          steps: campaignData.steps,
        });
        // Redirect to the newly created campaign
        router.push(`/campaigns/${response.data.id}`);
      } else {
        // Update existing campaign
        await updateCampaign(campaignId, {
          name: campaignData.name,
          status: startCampaign ? 'running' : 'draft',
          steps: campaignData.steps,
        });
      }
      push({
        variant: 'success',
        title: 'Success',
        description: startCampaign ? 'Campaign started!' : 'Campaign saved successfully',
      });
    } catch (error: any) {
      console.error('Failed to save campaign:', error);
      push({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to save campaign',
      });
    } finally {
      setSaving(false);
    }
  };
  const handleStartCampaign = async () => {
    if (campaignId === 'new') {
      // For new campaigns, save and start in one action
      await handleSave(true);
      return;
    }
    try {
      setSaving(true);
      // First save the campaign with current changes
      const campaignData = serialize();
      await updateCampaign(campaignId, {
        name: campaignData.name,
        status: 'running',
        steps: campaignData.steps,
      });
      push({
        variant: 'success',
        title: 'Success',
        description: 'Campaign started successfully',
      });
      // Redirect to campaigns list page
      router.push('/campaigns');
    } catch (error: any) {
      console.error('Failed to start campaign:', error);
      push({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to start campaign',
      });
    } finally {
      setSaving(false);
    }
  };
  const handlePauseCampaign = async () => {
    try {
      setSaving(true);
      await pauseCampaign(campaignId);
      push({
        variant: 'success',
        title: 'Success',
        description: 'Campaign paused successfully',
      });
      refetch(); // Reload to get updated status
    } catch (error: any) {
      console.error('Failed to pause campaign:', error);
      push({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to pause campaign',
      });
    } finally {
      setSaving(false);
    }
  };
  const handlePreview = () => {
    const campaignData = serialize();
    push({
      variant: 'success',
      title: 'Preview',
      description: 'Campaign preview generated',
    });
  };
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
        <div className="flex flex-col items-center gap-4 p-8 bg-white rounded-2xl shadow-lg">
          <Loader2 className="w-8 h-8 text-[#6366F1] animate-spin" />
          <p className="text-base font-semibold">Loading campaign...</p>
        </div>
      </div>
    );
  }
  return (
    <div className="h-screen flex flex-col bg-[#F8F9FE]">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] bg-white px-6 py-4 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/campaigns')}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Input
              placeholder="Campaign Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="min-w-[300px] bg-[#F8FAFC]"
            />
          </div>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={handlePreview}
            >
              <Eye className="w-4 h-4 mr-2" />
              Preview
            </Button>
            <Button
              variant="default"
              onClick={() => router.push(`/campaigns/${campaignId}/edit`)}
              disabled={saving}
            >
              Edit Workflow
            </Button>
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              variant="outline"
              onClick={handlePauseCampaign}
              disabled={saving}
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
            <Button
              variant="default"
              onClick={handleStartCampaign}
              disabled={saving}
              className="bg-gradient-to-r from-[#00eaff] to-[#7c3aed] text-white hover:from-[#7c3aed] hover:to-[#ff00e0]"
            >
              <Play className="w-4 h-4 mr-2" />
              Start Campaign
            </Button>
          </div>
        </div>
      </div>
      {/* Main Content - 3 Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Step Library */}
        <StepLibrary />
        {/* Center - Flow Canvas */}
        <div className="flex-1 relative">
          <FlowCanvas />
        </div>
        {/* Right Sidebar - Step Settings */}
        <StepSettings />
      </div>
    </div>
  );
}
