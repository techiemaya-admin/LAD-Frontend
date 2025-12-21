'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Button, TextField, Stack, Paper, Typography, CircularProgress } from '@mui/material';
import { ArrowBack, Save, PlayArrow, Visibility, Pause } from '@mui/icons-material';
import { useCampaignStore } from '@/store/campaignStore';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import { useToast } from '@/components/ui/app-toaster';
import StepLibrary from '@/components/campaigns/StepLibrary';
import FlowCanvas from '@/components/campaigns/FlowCanvas';
import StepSettings from '@/components/campaigns/StepSettings';

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

  useEffect(() => {
    if (campaignId && campaignId !== 'new') {
      loadCampaignData();
    } else if (campaignId === 'new') {
      setLoading(false);
    }
  }, [campaignId]);

  const loadCampaignData = async () => {
    try {
      setLoading(true);
      const response = await apiGet(`/api/campaigns/${campaignId}`) as { data: any };
      const campaign = response.data;
      
      console.log('Loading campaign:', {
        id: campaign.id,
        name: campaign.name,
        stepsCount: campaign.steps?.length || 0,
        stepTypes: campaign.steps?.map((s: any) => s.type) || []
      });
      
      // Load campaign into store - this will convert steps to nodes
      loadCampaign({
        name: campaign.name,
        steps: campaign.steps || [],
      });
    } catch (error: any) {
      console.error('Failed to load campaign:', error);
      push({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to load campaign',
      });
      router.push('/campaigns');
    } finally {
      setLoading(false);
    }
  };

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
      
      console.log('Saving campaign:', {
        id: campaignId,
        name: campaignData.name,
        stepsCount: campaignData.steps.length,
        stepTypes: campaignData.steps.map((s: any) => s.type)
      });
      
      if (campaignId === 'new') {
        // Create new campaign
        const response = await apiPost('/api/campaigns', {
          name: campaignData.name,
          status: startCampaign ? 'running' : 'draft',
          steps: campaignData.steps,
        }) as { data: any };
        
        // Redirect to the newly created campaign
        router.push(`/campaigns/${response.data.id}`);
      } else {
        // Update existing campaign
        await apiPut(`/api/campaigns/${campaignId}`, {
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
      await apiPut(`/api/campaigns/${campaignId}`, {
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
      await apiPost(`/api/campaigns/${campaignId}/pause`, {});
      push({
        variant: 'success',
        title: 'Success',
        description: 'Campaign paused successfully',
      });
      loadCampaignData(); // Reload to get updated status
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
    console.log('Campaign Preview:', campaignData);
    push({
      variant: 'info',
      title: 'Preview',
      description: 'Check console for campaign data',
    });
  };

  if (loading) {
    return (
      <Box sx={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#F8F9FE' }}>
        <Stack spacing={2} alignItems="center">
          <CircularProgress />
          <Typography>Loading campaign...</Typography>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#F8F9FE' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          borderBottom: '1px solid #E2E8F0',
          bgcolor: '#FFFFFF',
          px: 3,
          py: 2,
          zIndex: 10,
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Stack direction="row" alignItems="center" spacing={2}>
            <Button
              startIcon={<ArrowBack />}
              onClick={() => router.push('/campaigns')}
              sx={{ minWidth: 'auto' }}
            >
              Back
            </Button>
            <TextField
              placeholder="Campaign Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              variant="outlined"
              size="small"
              sx={{
                minWidth: 300,
                '& .MuiOutlinedInput-root': {
                  bgcolor: '#F8FAFC',
                },
              }}
            />
          </Stack>

          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Visibility />}
              onClick={handlePreview}
            >
              Preview
            </Button>
            <Button
              variant="outlined"
              startIcon={<Save />}
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Draft'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<Pause />}
              onClick={handlePauseCampaign}
              disabled={saving}
            >
              Pause
            </Button>
            <Button
              variant="contained"
              startIcon={<PlayArrow />}
              onClick={handleStartCampaign}
              disabled={saving}
              sx={{
                background: 'linear-gradient(135deg, #00eaff, #7c3aed)',
                color: '#ffffff',
                '&:hover': {
                  background: 'linear-gradient(135deg, #7c3aed, #ff00e0)',
                },
              }}
            >
              Start Campaign
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Main Content - 3 Column Layout */}
      <Box sx={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar - Step Library */}
        <StepLibrary />

        {/* Center - Flow Canvas */}
        <Box sx={{ flex: 1, position: 'relative' }}>
          <FlowCanvas />
        </Box>

        {/* Right Sidebar - Step Settings */}
        <StepSettings />
      </Box>
    </Box>
  );
}

