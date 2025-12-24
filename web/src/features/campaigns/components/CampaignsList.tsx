'use client';

import React, { useState, useEffect } from 'react';
import {
  Plus, Search, MoreVertical, Play, Pause, Square, Edit, Trash,
  Eye, Mail, Linkedin, BarChart3, Phone, Video
} from 'lucide-react';
import { apiGet, apiPost, apiDelete } from '@/lib/api';
import { useToast } from '@/components/ui/app-toaster';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogActions,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';

type CampaignStatus = 'draft' | 'running' | 'paused' | 'completed' | 'stopped';

interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  leads_count: number;
  sent_count: number;
  delivered_count: number;
  connected_count: number;
  replied_count: number;
  opened_count: number;
  clicked_count: number;
  created_at: string;
  updated_at: string;
  created_by: string;
  steps?: Array<{ type: string; [key: string]: any }>;
}

interface CampaignStats {
  total_campaigns: number;
  active_campaigns: number;
  total_leads: number;
  total_sent: number;
  total_delivered: number;
  total_connected: number;
  total_replied: number;
  avg_connection_rate: number;
  avg_reply_rate: number;
  instagram_connection_rate?: number;
  whatsapp_connection_rate?: number;
  voice_agent_connection_rate?: number;
}

export default function CampaignsList() {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newCampaignName, setNewCampaignName] = useState('');
  const { push } = useToast();

  useEffect(() => {
    loadCampaigns();
    loadStats();
  }, [statusFilter]);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      
      const response = await apiGet(`/api/campaigns?${params.toString()}`) as { data: Campaign[] };
      setCampaigns(response.data || []);
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to load campaigns' });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      const response = await apiGet('/api/campaigns/stats') as { data: CampaignStats };
      setStats(response.data || null);
    } catch (error: any) {
      console.error('Failed to load stats:', error);
      setStats({
        total_campaigns: 0,
        active_campaigns: 0,
        total_leads: 0,
        total_sent: 0,
        total_delivered: 0,
        total_connected: 0,
        total_replied: 0,
        avg_connection_rate: 0,
        avg_reply_rate: 0,
        instagram_connection_rate: 0,
        whatsapp_connection_rate: 0,
        voice_agent_connection_rate: 0
      });
    }
  };

  const handleStartCampaign = async (campaignId: string) => {
    try {
      await apiPost(`/api/campaigns/${campaignId}/start`, {});
      push({ variant: 'success', title: 'Success', description: 'Campaign started successfully' });
      loadCampaigns();
      loadStats();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to start campaign' });
    }
  };

  const handlePauseCampaign = async (campaignId: string) => {
    try {
      await apiPost(`/api/campaigns/${campaignId}/pause`, {});
      push({ variant: 'success', title: 'Success', description: 'Campaign paused successfully' });
      loadCampaigns();
      loadStats();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to pause campaign' });
    }
  };

  const handleStopCampaign = async (campaignId: string) => {
    try {
      await apiPost(`/api/campaigns/${campaignId}/stop`, {});
      push({ variant: 'success', title: 'Success', description: 'Campaign stopped successfully' });
      loadCampaigns();
      loadStats();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to stop campaign' });
    }
  };

  const handleDeleteCampaign = async (campaignId: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign?')) return;
    
    try {
      await apiDelete(`/api/campaigns/${campaignId}`);
      push({ variant: 'success', title: 'Success', description: 'Campaign deleted successfully' });
      loadCampaigns();
      loadStats();
    } catch (error: any) {
      push({ variant: 'error', title: 'Error', description: error.message || 'Failed to delete campaign' });
    }
  };

  const getStatusVariant = (status: CampaignStatus): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (status) {
      case 'running': return 'default';
      case 'paused': return 'secondary';
      case 'completed': return 'outline';
      case 'stopped': return 'destructive';
      default: return 'outline';
    }
  };

  const getChannelsUsed = (campaign: Campaign) => {
    const channels = {
      linkedin: false,
      email: false,
      whatsapp: false,
      instagram: false,
      voice: false,
    };

    if (campaign.steps && Array.isArray(campaign.steps) && campaign.steps.length > 0) {
      campaign.steps.forEach((step: any) => {
        const stepType = String(step.type || step.step_type || '').toLowerCase();
        if (stepType.includes('linkedin')) channels.linkedin = true;
        if (stepType.includes('email')) channels.email = true;
        if (stepType.includes('whatsapp')) channels.whatsapp = true;
        if (stepType.includes('instagram')) channels.instagram = true;
        if (stepType.includes('voice')) channels.voice = true;
      });
    }

    return channels;
  };

  const getConnectedIcon = (campaign: Campaign) => {
    const channels = getChannelsUsed(campaign);
    
    if (channels.linkedin) return <Linkedin className="h-4 w-4 text-[#0077B5]" />;
    if (channels.instagram) return <Video className="h-4 w-4 text-[#E4405F]" />;
    if (channels.whatsapp) return <Phone className="h-4 w-4 text-[#25D366]" />;
    if (channels.voice) return <Phone className="h-4 w-4 text-purple-600" />;
    if (channels.email) return <Mail className="h-4 w-4 text-amber-500" />;
    
    return <Linkedin className="h-4 w-4 text-[#0077B5]" />;
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Campaigns</h1>
          <p className="text-sm text-gray-600">Manage your multi-channel outreach campaigns</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Campaigns</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_campaigns || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
              <Play className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.active_campaigns || 0}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Connection Rate</CardTitle>
              <Linkedin className="h-4 w-4 text-[#0077B5]" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avg_connection_rate?.toFixed(1) || '0.0'}%</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Reply Rate</CardTitle>
              <Mail className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avg_reply_rate?.toFixed(1) || '0.0'}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search campaigns..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="running">Running</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="stopped">Stopped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Campaigns Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Loading campaigns...</div>
          ) : filteredCampaigns.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-gray-500 mb-4">No campaigns found</p>
              <Button variant="outline" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Campaign
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Campaign Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Connected</TableHead>
                  <TableHead>Replied</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCampaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    <TableCell>
                      <button
                        onClick={() => router.push(`/campaigns/${campaign.id}/analytics`)}
                        className="font-semibold text-indigo-600 hover:underline"
                      >
                        {campaign.name}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusVariant(campaign.status)} className="capitalize">
                        {campaign.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{campaign.leads_count}</TableCell>
                    <TableCell>{campaign.sent_count}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getConnectedIcon(campaign)}
                        <span>{campaign.connected_count}</span>
                      </div>
                    </TableCell>
                    <TableCell>{campaign.replied_count}</TableCell>
                    <TableCell>{new Date(campaign.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/campaigns/${campaign.id}`)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/campaigns/${campaign.id}/analytics`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Analytics
                          </DropdownMenuItem>
                          {campaign.status === 'draft' && (
                            <DropdownMenuItem onClick={() => handleStartCampaign(campaign.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Start
                            </DropdownMenuItem>
                          )}
                          {campaign.status === 'running' && (
                            <DropdownMenuItem onClick={() => handlePauseCampaign(campaign.id)}>
                              <Pause className="h-4 w-4 mr-2" />
                              Pause
                            </DropdownMenuItem>
                          )}
                          {campaign.status === 'paused' && (
                            <DropdownMenuItem onClick={() => handleStartCampaign(campaign.id)}>
                              <Play className="h-4 w-4 mr-2" />
                              Resume
                            </DropdownMenuItem>
                          )}
                          {(campaign.status === 'running' || campaign.status === 'paused') && (
                            <DropdownMenuItem onClick={() => handleStopCampaign(campaign.id)}>
                              <Square className="h-4 w-4 mr-2" />
                              Stop
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem 
                            onClick={() => handleDeleteCampaign(campaign.id)}
                            className="text-red-600"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Campaign Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Campaign</DialogTitle>
            <DialogDescription>
              Enter a name for your campaign to get started.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="campaign-name">Campaign Name</Label>
              <Input
                id="campaign-name"
                placeholder="e.g., Q1 Outreach Campaign"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newCampaignName.trim()) {
                    router.push(`/campaigns/new?name=${encodeURIComponent(newCampaignName)}`);
                    setCreateDialogOpen(false);
                  }
                }}
              />
            </div>
          </div>
          <DialogActions>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (newCampaignName.trim()) {
                  router.push(`/campaigns/new?name=${encodeURIComponent(newCampaignName)}`);
                  setCreateDialogOpen(false);
                } else {
                  push({ variant: 'error', title: 'Error', description: 'Campaign name is required' });
                }
              }}
            >
              Create & Build
            </Button>
          </DialogActions>
        </DialogContent>
      </Dialog>
    </div>
  );
}
