'use client';
import React from 'react';
import { Plus, Play, Pause, Square, CheckCircle, MoreVertical } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import type { Campaign, CampaignStatus } from '@lad/frontend-features/campaigns';
import { getStatusColor, renderChannelIcons, renderActionChips, getChannelsUsed, PLATFORM_CONFIG, renderPlatformMetrics } from './campaignUtils';
interface CampaignsTableProps {
  campaigns: Campaign[];
  loading: boolean;
  onMenuOpen: (event: React.MouseEvent<HTMLElement>, campaign: Campaign) => void;
}
export default function CampaignsTable({ campaigns, loading, onMenuOpen }: CampaignsTableProps) {
  const router = useRouter();
  // 🔍 DEBUG: Log campaigns data
  React.useEffect(() => {
    if (campaigns && campaigns.length > 0) {
      } else {
      }
  }, [campaigns]);
  const getStatusIconComponent = (status: CampaignStatus) => {
    switch (status) {
      case 'running': return <Play className="h-3 w-3" />;
      case 'paused': return <Pause className="h-3 w-3" />;
      case 'stopped': return <Square className="h-3 w-3" />;
      case 'completed': return <CheckCircle className="h-3 w-3" />;
      default: return null;
    }
  };
  const filteredCampaigns = campaigns;
  return (
    <Card className="rounded-[20px] border border-[#E2E8F0] shadow-sm overflow-hidden">
      <CardContent className="p-0">
        {loading ? (
          <div className="p-3">
            <Progress value={66} />
          </div>
        ) : filteredCampaigns.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-[#64748B] mb-2">
              No campaigns found
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/onboarding')}
              className="max-w-[280px] w-full"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Your First Campaign
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8FAFC]">
                <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">Campaign Name</TableHead>
                <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">Status</TableHead>
                <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">Channels</TableHead>
                <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">Actions</TableHead>
                <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">Leads</TableHead>
                <TableHead className="font-semibold text-[#1E293B]">Sent</TableHead>
                <TableHead className="font-semibold text-[#1E293B]">Connected</TableHead>
                <TableHead className="font-semibold text-[#1E293B]">Replied</TableHead>
                <TableHead className="font-semibold text-[#1E293B]">Created</TableHead>
                <TableHead className="font-semibold text-[#1E293B] text-right"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCampaigns.map((campaign: Campaign) => (
                <TableRow key={campaign.id} className="hover:bg-gray-50">
                  <TableCell>
                    <span
                      className="text-sm font-semibold text-[#6366F1] cursor-pointer hover:underline"
                      onClick={() => router.push(`/campaigns/${campaign.id}/analytics`)}
                    >
                      {campaign.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs capitalize ${getStatusColor(campaign.status) === 'success' ? 'bg-green-100 text-green-700' : getStatusColor(campaign.status) === 'warning' ? 'bg-yellow-100 text-yellow-700' : getStatusColor(campaign.status) === 'error' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                      {getStatusIconComponent(campaign.status)}
                      {campaign.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    {renderChannelIcons(campaign)}
                  </TableCell>
                  <TableCell>
                    {renderActionChips(campaign)}
                  </TableCell>
                  <TableCell>{campaign.leads_count}</TableCell>
                  <TableCell>{campaign.sent_count}</TableCell>
                  <TableCell>
                    {renderPlatformMetrics(campaign, 'connected')}
                  </TableCell>
                  <TableCell>
                    {renderPlatformMetrics(campaign, 'replied')}
                  </TableCell>
                  <TableCell>
                    {new Date(campaign.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right">
                    <button
                      className="p-1 hover:bg-gray-100 rounded"
                      onClick={(e) => onMenuOpen(e, campaign)}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
