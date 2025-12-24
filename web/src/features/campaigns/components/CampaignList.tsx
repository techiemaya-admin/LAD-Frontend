/**
 * Campaign List Component
 * Displays all campaigns with stats and actions
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import {
  Play,
  Pause,
  Square,
  Edit,
  Trash2,
  Plus,
  Search,
  Users,
  Send,
  CheckCircle2,
  MessageCircle,
  Eye,
  Loader2
} from 'lucide-react';
import { campaignService, type Campaign, type CampaignStatus } from '@/services/campaignService';
import { cn } from '@/lib/utils';

export default function CampaignList() {
  const router = useRouter();
  const { toast } = useToast();
  
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<CampaignStatus | 'all'>('all');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    loadCampaigns();
  }, [statusFilter]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const data = await campaignService.listCampaigns({
        search: searchTerm,
        status: statusFilter
      });
      setCampaigns(data);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to load campaigns',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async (id: string) => {
    try {
      setActionLoading(id);
      await campaignService.startCampaign(id);
      toast({
        title: 'Success',
        description: 'Campaign started successfully'
      });
      loadCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to start campaign',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handlePause = async (id: string) => {
    try {
      setActionLoading(id);
      await campaignService.pauseCampaign(id);
      toast({
        title: 'Success',
        description: 'Campaign paused successfully'
      });
      loadCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to pause campaign',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStop = async (id: string) => {
    try {
      setActionLoading(id);
      await campaignService.stopCampaign(id);
      toast({
        title: 'Success',
        description: 'Campaign stopped successfully'
      });
      loadCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to stop campaign',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this campaign?')) return;

    try {
      setActionLoading(id);
      await campaignService.deleteCampaign(id);
      toast({
        title: 'Success',
        description: 'Campaign deleted successfully'
      });
      loadCampaigns();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete campaign',
        variant: 'destructive'
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: CampaignStatus) => {
    const variants: Record<CampaignStatus, { variant: any; label: string }> = {
      draft: { variant: 'secondary', label: 'Draft' },
      running: { variant: 'default', label: 'Running' },
      paused: { variant: 'outline', label: 'Paused' },
      completed: { variant: 'default', label: 'Completed' },
      stopped: { variant: 'destructive', label: 'Stopped' }
    };

    const { variant, label } = variants[status];
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Campaigns</h1>
          <p className="text-muted-foreground">
            Manage your multichannel outreach campaigns
          </p>
        </div>
        <Button onClick={() => router.push('/campaigns/new')}>
          <Plus className="h-4 w-4 mr-2" />
          New Campaign
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search campaigns..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && loadCampaigns()}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={loadCampaigns} variant="outline">
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campaign List */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : campaigns.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No campaigns found</p>
            <p className="text-sm text-muted-foreground mt-2">
              Create your first campaign to get started
            </p>
            <Button onClick={() => router.push('/campaigns/new')} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Create Campaign
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {campaigns.map((campaign) => (
            <CampaignCard
              key={campaign.id}
              campaign={campaign}
              onStart={handleStart}
              onPause={handlePause}
              onStop={handleStop}
              onDelete={handleDelete}
              onEdit={() => router.push(`/campaigns/${campaign.id}`)}
              loading={actionLoading === campaign.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CampaignCardProps {
  campaign: Campaign;
  onStart: (id: string) => void;
  onPause: (id: string) => void;
  onStop: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: () => void;
  loading: boolean;
}

function CampaignCard({
  campaign,
  onStart,
  onPause,
  onStop,
  onDelete,
  onEdit,
  loading
}: CampaignCardProps) {
  const getStatusBadge = (status: CampaignStatus) => {
    const variants: Record<CampaignStatus, { className: string; label: string }> = {
      draft: { className: 'bg-gray-100 text-gray-700', label: 'Draft' },
      running: { className: 'bg-green-100 text-green-700', label: 'Running' },
      paused: { className: 'bg-yellow-100 text-yellow-700', label: 'Paused' },
      completed: { className: 'bg-blue-100 text-blue-700', label: 'Completed' },
      stopped: { className: 'bg-red-100 text-red-700', label: 'Stopped' }
    };

    const { className, label } = variants[status];
    return <Badge className={className}>{label}</Badge>;
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-lg line-clamp-1">{campaign.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {campaign.steps?.length || 0} steps
            </p>
          </div>
          {getStatusBadge(campaign.status)}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex items-center text-xs text-muted-foreground">
              <Users className="h-3 w-3 mr-1" />
              Leads
            </div>
            <div className="text-2xl font-bold">{campaign.leads_count || 0}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-xs text-muted-foreground">
              <Send className="h-3 w-3 mr-1" />
              Sent
            </div>
            <div className="text-2xl font-bold">{campaign.sent_count || 0}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-xs text-muted-foreground">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Connected
            </div>
            <div className="text-2xl font-bold">{campaign.connected_count || 0}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-xs text-muted-foreground">
              <MessageCircle className="h-3 w-3 mr-1" />
              Replied
            </div>
            <div className="text-2xl font-bold">{campaign.replied_count || 0}</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-2 border-t">
          {campaign.status === 'draft' || campaign.status === 'paused' ? (
            <Button
              size="sm"
              onClick={() => onStart(campaign.id)}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start
                </>
              )}
            </Button>
          ) : campaign.status === 'running' ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onPause(campaign.id)}
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Pause className="h-4 w-4 mr-2" />
                  Pause
                </>
              )}
            </Button>
          ) : null}

          {(campaign.status === 'running' || campaign.status === 'paused') && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onStop(campaign.id)}
              disabled={loading}
            >
              <Square className="h-4 w-4" />
            </Button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={onEdit}
          >
            <Eye className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(campaign.id)}
            disabled={loading}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
