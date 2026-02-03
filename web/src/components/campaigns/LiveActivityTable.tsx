'use client';
import React, { useEffect, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { RefreshCw, Filter, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { useCampaignActivityFeed } from '@lad/frontend-features/campaigns';
interface LiveActivityTableProps {
  campaignId: string;
  maxHeight?: number;
  pageSize?: number;
}
export const LiveActivityTable: React.FC<LiveActivityTableProps> = ({
  campaignId,
  maxHeight = 500,
  pageSize = 50
}) => {
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const { activities, isLoading, isConnected, error, refresh } = useCampaignActivityFeed(
    campaignId,
    {
      limit: pageSize,
      platform: platformFilter !== 'all' ? platformFilter : undefined,
      actionType: actionFilter !== 'all' ? actionFilter : undefined
    }
  );
  const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status?.toLowerCase()) {
      case 'success':
        return 'default';
      case 'pending':
        return 'outline';
      case 'failed':
      case 'error':
        return 'destructive';
      default:
        return 'secondary';
    }
  };
  const getPlatformIcon = (platform: string) => {
    const icons: Record<string, string> = {
      linkedin: '🔗',
      email: '📧',
      whatsapp: '💬',
      call: '📞',
      sms: '💬'
    };
    return icons[platform?.toLowerCase()] || '📊';
  };
  const formatActionType = (actionType: string) => {
    return actionType
      ?.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || '';
  };
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Failed to load activity data</p>
      </div>
    );
  }
  return (
    <div>
      {/* Header with filters */}
      <div className="flex justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-2">
          <h6 className="text-lg font-semibold">
            Live Activity Feed
          </h6>
          <Badge
            variant={isConnected ? 'default' : 'secondary'}
            className={`font-semibold ${isConnected ? 'animate-pulse' : ''}`}
          >
            {isConnected ? 'Live' : 'Offline'}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Select value={platformFilter} onValueChange={setPlatformFilter}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="linkedin">LinkedIn</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="whatsapp">WhatsApp</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="sms">SMS</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="connection_request">Connection Request</SelectItem>
              <SelectItem value="message">Message</SelectItem>
              <SelectItem value="call">Call</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="reply">Reply</SelectItem>
            </SelectContent>
          </Select>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={refresh}
                  disabled={isLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      {/* Activity Table */}
      <div className="rounded-lg border shadow-sm overflow-auto" style={{ maxHeight: `${maxHeight}px` }}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold bg-[#F8F9FE]">
                Timestamp
              </TableHead>
              <TableHead className="font-semibold bg-[#F8F9FE]">
                Lead
              </TableHead>
              <TableHead className="font-semibold bg-[#F8F9FE]">
                Action
              </TableHead>
              <TableHead className="font-semibold bg-[#F8F9FE]">
                Platform
              </TableHead>
              <TableHead className="font-semibold bg-[#F8F9FE]">
                Status
              </TableHead>
              <TableHead className="font-semibold bg-[#F8F9FE]">
                Details
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : activities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">
                    No activity data available
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              activities.map((activity, index) => (
                <TableRow 
                  key={activity.id || index}
                  className="hover:bg-[#F8F9FE] transition-colors"
                >
                  <TableCell>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(activity.created_at), 'MMM dd, HH:mm:ss')}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">
                        {activity.lead_name || 'Unknown'}
                      </p>
                      {activity.lead_phone && (
                        <p className="text-xs text-muted-foreground">
                          {activity.lead_phone}
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {formatActionType(activity.action_type)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span>{getPlatformIcon(activity.platform)}</span>
                      <p className="text-sm capitalize">
                        {activity.platform}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={getStatusColor(activity.status)}
                      className="font-medium capitalize"
                    >
                      {activity.status || 'Unknown'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p 
                            className="text-sm text-muted-foreground max-w-[200px] overflow-hidden text-ellipsis whitespace-nowrap"
                          >
                            {activity.message_content || activity.error_message || '-'}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent>
                          {activity.message_content || activity.error_message || ''}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
