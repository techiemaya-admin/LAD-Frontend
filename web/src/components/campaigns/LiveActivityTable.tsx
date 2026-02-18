'use client';
import React, { useEffect, useState, useMemo, useCallback } from 'react';
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
import { 
  RefreshCw, 
  Filter, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  Wifi, 
  WifiOff,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  Linkedin,
  Mail,
  MessageCircle,
  Phone,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { useCampaignActivityFeed } from '@lad/frontend-features/campaigns';
import { useToast } from '@/components/ui/app-toaster';
import { LiveBadge } from '@/components/LiveBadge';
import { LiveActivityStatusBadge } from './LiveActivityStatusBadge';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';

interface LiveActivityTableProps {
  campaignId: string;
  maxHeight?: number;
  pageSize?: number;
}

interface ActivityItem {
  id: string;
  created_at: string;
  lead_name?: string;
  lead_linkedin?: string;
  lead_phone?: string;
  action_type: string;
  platform: string;
  status: string;
  message_content?: string;
  error_message?: string;
}

export const LiveActivityTable: React.FC<LiveActivityTableProps> = ({
  campaignId,
  maxHeight = 500,
  pageSize = 50,
}) => {
  const { push: toast } = useToast();
  const [globalFilter, setGlobalFilter] = useState('');
  const [platformFilter, setPlatformFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const {
    activities,
    loading,
    error,
    isConnected,
    refresh,
    total = 0,
  } = useCampaignActivityFeed(campaignId, {
    limit: pageSize,
    offset: (currentPage - 1) * pageSize,
    platform: platformFilter !== 'all' ? platformFilter : undefined,
    actionType: actionFilter !== 'all' ? actionFilter : undefined,
  });

  const totalPages = Math.ceil(total / pageSize);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;
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
  const formatActionType = (actionType: string) => {
    return actionType
      ?.split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ') || '';
  };

  const filteredActivities = useMemo(() => {
    const list = activities || [];
    if (!globalFilter) return list;

    const q = globalFilter.toLowerCase();
    return list.filter((a) => {
      const haystack = [
        a.lead_name,
        a.lead_phone,
        a.platform,
        a.status,
        a.action_type,
        a.message_content,
        a.error_message,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [activities, globalFilter]);
  if (error) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">Failed to load activity data</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden">
      {/* Header with filters */}
      <div className="p-4 border-b border-[#E2E8F0] bg-white">
        <div className="flex gap-3 flex-col sm:flex-row justify-between items-center">
          <div className="flex items-center gap-2">
            <h6 className="text-lg font-semibold">
              Live Activity Feed
            </h6>
            <LiveBadge
              isConnected={isConnected}
              showOffline
              className={`font-semibold ${isConnected ? 'animate-pulse' : ''}`}
            />
          </div>
          <div className="flex gap-3 flex-col sm:flex-row items-center">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search Activity..."
                value={globalFilter ?? ''}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive pl-10 h-10"
              />
            </div>
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
                <SelectItem value="CONNECTION_SENT">Connection Sent</SelectItem>
                <SelectItem value="PROFILE_VISITED">Profile Visited</SelectItem>
                <SelectItem value="CONNECTION_ACCEPTED">Connection Accepted</SelectItem>
                <SelectItem value="CONTACTED">Contacted</SelectItem>
                <SelectItem value="REPLY_RECEIVED">Reply</SelectItem>
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
            <div className="relative max-w-md">
              
            </div>
          </div>
        </div>
      </div>
      {/* Activity Table */}
      <div className="overflow-auto" style={{ maxHeight: `${maxHeight}px` }}>
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">
                Timestamp
              </TableHead>
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">
                Lead
              </TableHead>
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">
                Action
              </TableHead>
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">
                Platform
              </TableHead>
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">
                Status
              </TableHead>
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap">
                Details
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (activities || []).length === 0 ? (
              // Skeleton rows (match CallLogsTable style)
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={`skeleton-${i}`} className="animate-pulse">
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={`skeleton-cell-${i}-${j}`} className="py-4">
                      <div className="h-4 bg-gray-200 rounded w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filteredActivities.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  <p className="text-muted-foreground">
                    No activity data available
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              filteredActivities.map((activity, index) => (
                <TableRow 
                  key={activity.id || index}
                  className="cursor-pointer hover:bg-gray-50 border-b border-[#E2E8F0] transition-colors"
                >
                  <TableCell>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(activity.created_at), 'MMM dd, HH:mm:ss')}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{activity.lead_name || 'Unknown'}</span>
                      {activity.lead_linkedin && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(activity.lead_linkedin || '');
                            toast({
                              title: "Copied!",
                              description: `LinkedIn URL copied to clipboard`,
                            });
                          }}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                          title="Copy LinkedIn URL"
                        >
                          <Copy className="w-3.5 h-3.5 text-muted-foreground hover:text-primary" />
                        </button>
                      )}
                    </div>
                    {activity.lead_phone && (
                      <p className="text-xs text-muted-foreground">
                        {activity.lead_phone}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-sm">
                      {formatActionType(activity.action_type)}
                    </p>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center gap-1">
                        {activity.platform === 'linkedin' && <Linkedin className="w-4 h-4 text-[#0A66C2]" />}
                        {activity.platform === 'email' && <Mail className="w-4 h-4 text-[#F59E0B]" />}
                        {activity.platform === 'whatsapp' && <MessageCircle className="w-4 h-4 text-[#25D366]" />}
                        {activity.platform === 'call' && <Phone className="w-4 h-4 text-[#8B5CF6]" />}
                        {activity.platform === 'sms' && <Send className="w-4 h-4 text-[#6366F1]" />}
                      </div>
                      <p className="text-sm capitalize">
                        {activity.platform}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <LiveActivityStatusBadge status={activity.status || 'Unknown'} />
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
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-2">
          <p className="text-sm text-muted-foreground">
            Showing {offset + 1} to {Math.min(offset + pageSize, total)} of {total} results
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={!hasPrevPage}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Show first page, last page, current page, and pages around current
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <Button
                      key={page}
                      variant={currentPage === page ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setCurrentPage(page)}
                      className="w-8 h-8 p-0"
                    >
                      {page}
                    </Button>
                  );
                }
                // Show ellipsis
                if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <span key={`ellipsis-${page}`} className="text-muted-foreground px-1">
                      ...
                    </span>
                  );
                }
                return null;
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={!hasNextPage}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
