'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  BackgroundVariant
} from 'reactflow';
import 'reactflow/dist/style.css';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import { Save, Play, ArrowLeft, Loader2 } from 'lucide-react';
import { campaignService, type Campaign, type CampaignStep, type StepType, type StepConfig } from '@/services/campaignService';
import StepLibrary from './StepLibrary';
import StepSettings from './StepSettings';

interface FlowNodeData {
  label: string;
  stepType: StepType;
  stepData: any;
  order: number;
  title?: string;
}

type FlowNode = Node<FlowNodeData>;

export default function CampaignBuilder() {
  const router = useRouter();
  const params = useParams();
  const { toast } = useToast();
  
  const campaignId = params?.id as string;
  const isNew = campaignId === 'new';

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [campaignName, setCampaignName] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<FlowNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    if (!isNew) {
      loadCampaign();
    }
  }, [campaignId, isNew]);

  const loadCampaign = async () => {
    if (isNew) return;

    try {
      setLoading(true);
      const data = await campaignService.getCampaignById(campaignId);
      setCampaign(data);
      setCampaignName(data.name);

      // Convert steps to nodes
      if (data.steps && data.steps.length > 0) {
        const flowNodes: FlowNode[] = data.steps.map((step, index) => ({
          id: step.id || `step-${index}`,
          type: 'default',
          position: { x: 250, y: index * 150 },
          data: {
            label: step.title || step.type,
            stepType: step.type,
            stepData: step.config || {},
            order: step.order
          }
        }));

        setNodes(flowNodes);

        // Create edges connecting sequential steps
        const flowEdges: Edge[] = [];
        for (let i = 0; i < flowNodes.length - 1; i++) {
          flowEdges.push({
            id: `edge-${i}`,
            source: flowNodes[i].id,
            target: flowNodes[i + 1].id,
            markerEnd: { type: MarkerType.ArrowClosed }
          });
        }
        setEdges(flowEdges);
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load campaign',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, markerEnd: { type: MarkerType.ArrowClosed } }, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    setSelectedNode(node as FlowNode);
  }, []);

  const onAddStep = useCallback((stepType: StepType) => {
    const newNode: FlowNode = {
      id: `step-${Date.now()}`,
      type: 'default',
      position: { x: 250, y: nodes.length * 150 },
      data: {
        label: stepType.replace(/_/g, ' ').toUpperCase(),
        stepType,
        stepData: {},
        order: nodes.length
      }
    };

    setNodes((nds) => [...nds, newNode]);

    // Auto-connect to previous node
    if (nodes.length > 0) {
      const lastNode = nodes[nodes.length - 1];
      setEdges((eds) => [
        ...eds,
        {
          id: `edge-${Date.now()}`,
          source: lastNode.id,
          target: newNode.id,
          markerEnd: { type: MarkerType.ArrowClosed }
        }
      ]);
    }

    toast({
      title: 'Step Added',
      description: `${stepType.replace(/_/g, ' ')} step added to workflow`
    });
  }, [nodes, setNodes, setEdges, toast]);

  const onUpdateStep = useCallback((nodeId: string, data: any) => {
    setNodes((nds) =>
      nds.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, stepData: data, label: data.title || node.data.label } }
          : node
      )
    );
  }, [setNodes]);

  const onDeleteStep = useCallback(() => {
    if (!selectedNode) return;

    setNodes((nds) => nds.filter((node) => node.id !== selectedNode.id));
    setEdges((eds) => eds.filter((edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id));
    setSelectedNode(null);

    toast({
      title: 'Step Deleted',
      description: 'Step removed from workflow'
    });
  }, [selectedNode, setNodes, setEdges, toast]);

  const handleSave = async () => {
    if (!campaignName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please enter a campaign name',
        variant: 'destructive'
      });
      return;
    }

    if (nodes.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please add at least one step to the workflow',
        variant: 'destructive'
      });
      return;
    }

    try {
      setSaving(true);

      // Convert nodes to steps
      const steps: Array<{
        type: StepType;
        order: number;
        title: string;
        description?: string;
        config?: StepConfig;
      }> = nodes.map((node, index) => ({
        type: node.data.stepType,
        order: index,
        title: node.data.stepData?.title || node.data.label,
        description: node.data.stepData?.description || '',
        config: node.data.stepData
      }));

      if (isNew) {
        // Create new campaign
        const newCampaign = await campaignService.createCampaign({
          name: campaignName,
          steps
        });

        toast({
          title: 'Success',
          description: 'Campaign created successfully'
        });

        router.push(`/campaigns/${newCampaign.id}`);
      } else {
        // Update existing campaign
        await campaignService.updateCampaign(campaignId, { name: campaignName });
        await campaignService.updateCampaignSteps(campaignId, steps);

        toast({
          title: 'Success',
          description: 'Campaign updated successfully'
        });

        loadCampaign();
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save campaign',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStart = async () => {
    if (isNew || !campaignId) {
      toast({
        title: 'Info',
        description: 'Please save the campaign first',
        variant: 'default'
      });
      return;
    }

    try {
      await campaignService.startCampaign(campaignId);
      toast({
        title: 'Success',
        description: 'Campaign started successfully'
      });
      router.push('/campaigns');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start campaign',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <div className="border-b bg-white p-4">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1">
            <Button variant="ghost" size="icon" onClick={() => router.push('/campaigns')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <Input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="Campaign Name"
              className="max-w-md"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </>
              )}
            </Button>
            {!isNew && campaign?.status === 'draft' && (
              <Button onClick={handleStart}>
                <Play className="h-4 w-4 mr-2" />
                Start Campaign
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Step Library */}
        <div className="w-64 border-r bg-gray-50 overflow-y-auto">
          <StepLibrary onAddStep={onAddStep} />
        </div>

        {/* Workflow Canvas */}
        <div className="flex-1 relative">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            fitView
          >
            <Controls />
            <Background variant={BackgroundVariant.Dots} gap={12} size={1} />
          </ReactFlow>
        </div>

        {/* Step Settings */}
        {selectedNode && (
          <div className="w-80 border-l bg-white overflow-y-auto">
            <StepSettings
              stepType={selectedNode.data.stepType}
              stepData={selectedNode.data.stepData}
              onUpdate={(data: any) => onUpdateStep(selectedNode.id, data)}
              onDelete={onDeleteStep}
            />
          </div>
        )}
      </div>
    </div>
  );
}
