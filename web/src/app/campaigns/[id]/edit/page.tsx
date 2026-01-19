'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Box, Button, TextField, Stack, Paper, Typography, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { ArrowBack, Save, PlayArrow } from '@mui/icons-material';
import { useCampaign, updateCampaign } from '@/features/campaigns';
import { useToast } from '@/components/ui/app-toaster';
import Screen3ManualEditor from '@/app/onboarding/Screen3ManualEditor';
import { useOnboardingStore } from '@/store/onboardingStore';
import { logger } from '@/lib/logger';
import type { StepType, FlowNode, FlowEdge, StepData } from '@/types/campaign';

export default function CampaignEditPage() {
  const params = useParams();
  const router = useRouter();
  const campaignId = params.id as string;
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [campaignName, setCampaignName] = useState('');
  const [showStartDialog, setShowStartDialog] = useState(false);
  
  // Get workflow data from onboarding store
  const {
    manualFlow,
    setManualFlow,
    setIsEditMode,
    workflowPreview,
  } = useOnboardingStore();

  // Use SDK hook for campaign data
  const { data: campaign, isPending: campaignLoading, error: campaignError } = useCampaign(
    campaignId && campaignId !== 'new' ? campaignId : null
  );

  // Load campaign into workflow editor when it loads
  useEffect(() => {
    if (campaign) {
      setCampaignName(campaign.name || '');
      
      // Convert campaign steps to workflow format for the editor
      if (campaign.steps && Array.isArray(campaign.steps)) {
        const nodes: FlowNode[] = [
          {
            id: 'start',
            type: 'start',
            data: { title: 'Start' },
            position: { x: 250, y: 50 },
          },
        ];

        const edges: FlowEdge[] = [];
        let lastNodeId = 'start';

        // Add step nodes
        campaign.steps.forEach((step: any, index: number) => {
          const nodeId = `step_${step.id || index}`;
          nodes.push({
            id: nodeId,
            type: (step.type || 'lead_generation') as StepType,
            data: {
              title: step.title || step.type,
              message: step.message,
              subject: step.subject,
              ...step.config,
            } as StepData,
            position: { x: 250, y: 150 + index * 100 },
          });

          // Create edge from previous node
          edges.push({
            id: `edge_${lastNodeId}_${nodeId}`,
            source: lastNodeId,
            target: nodeId,
          });

          lastNodeId = nodeId;
        });

        // Add end node
        nodes.push({
          id: 'end',
          type: 'end',
          data: { title: 'End' },
          position: { x: 250, y: 150 + campaign.steps.length * 100 },
        });

        edges.push({
          id: `edge_${lastNodeId}_end`,
          source: lastNodeId,
          target: 'end',
        });

        // Set manual flow in store
        setManualFlow({
          nodes,
          edges,
        });
      }

      setLoading(false);
    } else if (campaignError) {
      push({
        variant: 'error',
        title: 'Error',
        description: campaignError?.message || 'Failed to load campaign',
      });
      router.push('/campaigns');
    } else if (!campaignLoading) {
      setLoading(false);
    }
  }, [campaign, campaignLoading, campaignError, setManualFlow, push, router]);

  // Set edit mode on mount
  useEffect(() => {
    setIsEditMode(true);
    return () => {
      setIsEditMode(false);
    };
  }, [setIsEditMode]);

  const handleSave = async (startAfterSave = false) => {
    if (!campaignName.trim()) {
      push({
        variant: 'error',
        title: 'Error',
        description: 'Campaign name is required',
      });
      return;
    }

    if (!manualFlow || manualFlow.nodes.length === 0) {
      push({
        variant: 'error',
        title: 'Error',
        description: 'Please add at least one step to your campaign',
      });
      return;
    }

    try {
      setSaving(true);

      // Convert workflow nodes/edges back to campaign steps format
      const stepNodes = manualFlow.nodes.filter(
        (n: any) => n.type !== 'start' && n.type !== 'end'
      );

      const steps = stepNodes.map((node: any, index: number) => ({
        id: node.id,
        type: node.data.stepType || node.type,
        title: node.data.title || node.data.label,
        description: node.data.description || '',
        order: index,
        config: node.data.stepData || {},
      }));

      // Update campaign with new name and steps
      await updateCampaign(campaignId, {
        name: campaignName,
        status: startAfterSave ? 'running' : 'draft',
        steps,
      });

      push({
        variant: 'success',
        title: 'Success',
        description: startAfterSave ? 'Campaign saved and started!' : 'Campaign saved successfully',
      });

      if (startAfterSave) {
        // Redirect to campaigns list
        router.push('/campaigns');
      } else {
        // Stay on edit page or redirect to campaign detail
        router.push(`/campaigns/${campaignId}`);
      }
    } catch (error: any) {
      logger.error('Failed to save campaign:', error);
      push({
        variant: 'error',
        title: 'Error',
        description: error.message || 'Failed to save campaign',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <CircularProgress />
      </div>
    );
  }

  return (
    <Box className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <Paper className="border-b p-4 sticky top-0 z-10" elevation={1}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            startIcon={<ArrowBack />}
            onClick={() => router.push(`/campaigns/${campaignId}`)}
          >
            Back
          </Button>
          
          <TextField
            size="small"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Campaign name"
            variant="outlined"
            sx={{ flex: 1, maxWidth: 400 }}
          />

          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<Save />}
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
            
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<PlayArrow />}
              onClick={() => {
                setShowStartDialog(true);
              }}
              disabled={saving}
            >
              Save & Start
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Workflow Editor - using AI Assistant workflow editor */}
      <Box className="flex-1 overflow-auto">
        <Screen3ManualEditor />
      </Box>

      {/* Start Confirmation Dialog */}
      <Dialog open={showStartDialog} onClose={() => setShowStartDialog(false)}>
        <DialogTitle>Start Campaign</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to save and start this campaign? It will begin executing immediately.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowStartDialog(false)}>Cancel</Button>
          <Button
            onClick={() => {
              setShowStartDialog(false);
              handleSave(true);
            }}
            variant="contained"
            color="success"
          >
            Start Campaign
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
