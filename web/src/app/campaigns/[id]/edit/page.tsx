'use client';
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ArrowLeft, Save, Play, Loader2 } from 'lucide-react';
import { useCampaign, updateCampaign } from '@/features/campaigns';
import { useToast } from '@/components/ui/app-toaster';
import Screen3ManualEditor from '@/app/onboarding/components/Screen3ManualEditor';
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
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="border-b p-4 sticky top-0 z-10 bg-white shadow-sm">
        <div className="flex gap-4 items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/campaigns/${campaignId}`)}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Input
            size="default"
            value={campaignName}
            onChange={(e) => setCampaignName(e.target.value)}
            placeholder="Campaign name"
            className="flex-1 max-w-md"
          />
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={saving}
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                setShowStartDialog(true);
              }}
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Save & Start
            </Button>
          </div>
        </div>
      </div>
      {/* Workflow Editor - using AI Assistant workflow editor */}
      <div className="flex-1 overflow-auto">
        <Screen3ManualEditor />
      </div>
      {/* Start Confirmation Dialog */}
      <Dialog open={showStartDialog} onOpenChange={setShowStartDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start Campaign</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground py-4">
            Are you sure you want to save and start this campaign? It will begin executing immediately.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStartDialog(false)}>Cancel</Button>
            <Button
              onClick={() => {
                setShowStartDialog(false);
                handleSave(true);
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Start Campaign
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
