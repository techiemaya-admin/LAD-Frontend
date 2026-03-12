'use client';
import React, { useEffect, useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Download, Filter, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { format } from 'date-fns';
import { useCampaignActivityFeed } from '@lad/frontend-features/campaigns';
import { apiGet } from '@/lib/api';
import { MiniStepper } from './MiniStepper';
import { StatusStepper } from './StatusStepper';
import { LiveActivityStatusBadge } from './LiveActivityStatusBadge';
import { LiveBadge } from '@/components/LiveBadge';

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
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentPageSize, setCurrentPageSize] = useState<number>(pageSize);

  const handleExportLeads = async (filter: string) => {
    try {
      const token = typeof window !== 'undefined'
        ? (localStorage.getItem('token') || document.cookie.split('token=')[1]?.split(';')[0] || '')
        : '';
      const backendUrl = (process.env.NEXT_PUBLIC_BACKEND_URL || 'https://lad-backend-develop-160078175457.us-central1.run.app').replace(/\/+$/, '');

      const res = await fetch(`${backendUrl}/api/campaigns/${campaignId}/analytics/export?filter=${filter}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Export API error:', res.status, errorText);
        alert(`Export failed: ${res.status} ${errorText}`);
        return;
      }

      const response = await res.json();

      if (response.success && response.data) {
        const leads = response.data;
        if (leads.length === 0) {
          alert('No leads found for the selected category.');
          return;
        }

        try {
          const ExcelJS = await import('exceljs');
          const workbook = new ExcelJS.Workbook();
          const worksheet = workbook.addWorksheet('Leads');

          worksheet.columns = [
            { header: 'First Name', key: 'first_name', width: 18 },
            { header: 'Last Name', key: 'last_name', width: 18 },
            { header: 'Company', key: 'company_name', width: 25 },
            { header: 'Title / Headline', key: 'title', width: 25 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'Phone', key: 'phone', width: 18 },
            { header: 'LinkedIn URL', key: 'linkedin_url', width: 45 },
            { header: 'Location', key: 'location', width: 20 },
            { header: 'Industry', key: 'industry', width: 22 },
            { header: 'Added At', key: 'added_at', width: 25 },
          ];

          const headerRow = worksheet.getRow(1);
          headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
          headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0B1957' } };
          headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
          headerRow.height = 24;

          for (const lead of leads) {
            const raw = lead.raw_info || {};
            worksheet.addRow({
              first_name: lead.first_name || '',
              last_name: lead.last_name || '',
              company_name: lead.company_name || '',
              title: lead.title || '',
              email: lead.email || '',
              phone: lead.phone || '',
              linkedin_url: lead.linkedin_url || '',
              location: lead.location || raw.city || '',
              industry: lead.industry || raw.industry || '',
              added_at: lead.added_at || '',
            });
          }

          worksheet.autoFilter = { from: 'A1', to: `J${leads.length + 1}` };

          const buffer = await workbook.xlsx.writeBuffer();
          const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
          const { saveAs } = await import('file-saver');
          saveAs(blob, `leads_${filter}_${new Date().getTime()}.xlsx`);
        } catch (excelError) {
          console.warn('ExcelJS failed, falling back to CSV:', excelError);
          const headers = ['First Name', 'Last Name', 'Company', 'Title/Headline', 'Email', 'Phone', 'LinkedIn URL', 'Location', 'Industry', 'Added At'];
          const escape = (v: string) => `"${(v || '').replace(/"/g, '""')}"`;
          const csvRows = [headers.join(',')];
          for (const lead of leads) {
            const raw = lead.raw_info || {};
            csvRows.push([
              escape(lead.first_name), escape(lead.last_name), escape(lead.company_name),
              escape(lead.title), escape(lead.email), escape(lead.phone),
              escape(lead.linkedin_url), escape(lead.location || raw.city || ''),
              escape(lead.industry || raw.industry || ''), escape(lead.added_at),
            ].join(','));
          }
          const csvContent = '\uFEFF' + csvRows.join('\r\n');
          const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `leads_${filter}_${new Date().getTime()}.csv`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        }
      } else {
        alert('Failed to export leads.');
      }
    } catch (error) {
      console.error('Export failed:', error);
      alert('Error occurred while exporting: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  // Reset to page 1 when filters or page size change
  useEffect(() => {
    setCurrentPage(1);
  }, [platformFilter, actionFilter, currentPageSize]);

  const offset = (currentPage - 1) * currentPageSize;

  const { activities, isLoading, isConnected, error, refresh, total } = useCampaignActivityFeed(
    campaignId,
    {
      limit: 1000, // Fetch all activities to group by lead
      offset: 0,
      platform: platformFilter !== 'all' ? platformFilter : undefined,
      actionType: actionFilter !== 'all' ? actionFilter : undefined
    }
  );

  // Group activities by lead
  const groupedLeads = useMemo(() => {
    if (!activities || activities.length === 0) return [];

    const leadMap = new Map<string, any>();

    activities.forEach((activity: any) => {
      const leadId = activity.lead_id || activity.id;
      if (!leadId) return;

      if (!leadMap.has(leadId)) {
        leadMap.set(leadId, {
          leadId,
          leadName: activity.lead_name || 'Unknown Lead',
          leadLinkedin: activity.lead_linkedin,
          leadPhone: activity.lead_phone,
          platform: activity.platform || 'linkedin',
          latestTimestamp: activity.created_at,
          profileVisited: false,
          connectionStatus: 'NOT_SENT' as const,
          connectionSentWithMessage: false,
          connectionAccepted: false,
          contacted: false,
          contactedStatus: undefined,
          leadReplied: false,
          pauseReason: undefined,
          errorMessage: undefined,
          latestStatus: activity.status,
          latestMessage: activity.message_content || activity.error_message,
        });
      }

      const lead = leadMap.get(leadId);

      // Update platform if available
      if (activity.platform && !lead.platform) {
        lead.platform = activity.platform;
      }

      // Update latest timestamp
      if (new Date(activity.created_at) > new Date(lead.latestTimestamp)) {
        lead.latestTimestamp = activity.created_at;
        lead.latestStatus = activity.status;
        lead.latestMessage = activity.message_content || activity.error_message;
      }

      const actionType = activity.action_type?.toUpperCase() || '';
      const status = activity.status?.toLowerCase() || '';
      const errorMsg = activity.error_message || '';
      const messageContent = activity.message_content || '';

      // Map activity to stepper states
      if (actionType.includes('PROFILE') && actionType.includes('VISIT')) {
        if (status === 'success' || status === 'sent' || status === 'delivered') {
          lead.profileVisited = true;
        }
      }

      if (actionType.includes('CONNECTION')) {
        // Check for rate limit in error message
        const isRateLimit = errorMsg.toLowerCase().includes('limit') ||
          errorMsg.toLowerCase().includes('rate');
        const isDailyLimit = errorMsg.toLowerCase().includes('daily');
        const isWeeklyLimit = errorMsg.toLowerCase().includes('weekly');

        if (isRateLimit) {
          lead.connectionStatus = 'PAUSED';
          if (isDailyLimit) {
            lead.pauseReason = 'DAILY_LIMIT';
          } else if (isWeeklyLimit) {
            lead.pauseReason = 'WEEKLY_LIMIT';
          } else {
            lead.pauseReason = 'RATE_LIMIT';
          }
          lead.errorMessage = errorMsg;
        } else if (status === 'failed' || status === 'error') {
          lead.connectionStatus = 'FAILED';
          lead.errorMessage = errorMsg;
        } else if (status === 'success' || status === 'sent' || status === 'delivered') {
          lead.profileVisited = true;
          lead.connectionStatus = 'SENT';

          // Check if connection was sent with a message
          if (messageContent && messageContent.trim().length > 0) {
            lead.connectionSentWithMessage = true;
          }
        }

        if (actionType.includes('ACCEPT')) {
          lead.connectionAccepted = true;
        }
      }

      if (actionType.includes('CONTACT') || actionType.includes('MESSAGE_SENT')) {
        if (status === 'success' || status === 'sent' || status === 'delivered') {
          lead.contacted = true;
          lead.contactedStatus = 'SENT';
        } else if (status === 'failed' || status === 'error') {
          lead.contactedStatus = 'FAILED';
          lead.errorMessage = errorMsg;
        }
      }

      if (actionType.includes('REPLY')) {
        lead.leadReplied = true;
        lead.connectionAccepted = true;
        lead.contacted = true;
      }
    });

    return Array.from(leadMap.values());
  }, [activities]);

  // Paginate grouped leads
  const totalLeads = groupedLeads.length;
  const totalPages = Math.ceil(totalLeads / currentPageSize);
  const paginatedLeads = groupedLeads.slice(offset, offset + currentPageSize);
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

  const calculateCurrentStep = (lead: any): number => {
    // Determine which step the lead is currently at (1-5)
    // Returns the active step (steps before are completed, steps after are upcoming)
    // Steps: 1=Visit, 2=Connect, 3=Accept, 4=Contact, 5=Lead Contact Back

    // If lead replied, all steps completed - show on final step
    if (lead.leadReplied) return 6;

    // If contacted but no reply yet, on step 5 waiting for reply  
    if (lead.contacted) return 5;

    // If connection accepted but not contacted yet, on step 4
    if (lead.connectionAccepted) return 4;

    // If connection sent but not accepted yet, on step 3
    if (lead.connectionStatus === 'SENT') return 3;

    // If profile visited but connection not sent yet, on step 2
    if (lead.profileVisited) return 2;

    // Default: On step 1 (visiting profile)
    return 1;
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
    <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden">
      {/* Header with filters */}
      <div className="flex justify-between items-center p-4 border-b border-[#E2E8F0] bg-[#F8FAFC] gap-4">
        <div className="flex items-center gap-2">
          <h6 className="text-lg font-semibold text-[#1E293B]">
            Live Activity Feed
          </h6>
          <LiveBadge isConnected={isConnected} showOffline className="font-semibold animate-pulse text-xs" />
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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="icon" disabled={isLoading}>
                      <Download className={`h-4 w-4 ${isLoading ? 'opacity-50' : ''}`} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleExportLeads('all')}>
                      All Leads
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportLeads('connection_sent')}>
                      Connection Sent
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportLeads('connection_accept')}>
                      Connection Accepted
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportLeads('contacted')}>
                      Contacted
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExportLeads('reply_received')}>
                      Lead Reply Back
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent>Export Leads</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      {/* Activity Table */}
      <div>
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F8FAFC]">
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap w-[110px]">
                Timestamp
              </TableHead>
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap w-[140px]">
                Lead
              </TableHead>
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap w-[80px]">
                State
              </TableHead>
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap w-[150px]">
                Details
              </TableHead>
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap w-[240px]">
                Status
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && paginatedLeads?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                </TableCell>
              </TableRow>
            ) : paginatedLeads?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-[#64748B]">
                  <p>
                    No activity data available
                  </p>
                </TableCell>
              </TableRow>
            ) : (
              paginatedLeads?.map((lead, index) => (
                <TableRow
                  key={lead.leadId || index}
                  className="hover:bg-gray-50"
                >
                  <TableCell className="w-[110px]">
                    <p className="text-sm text-[#64748B]">
                      {format(new Date(lead.latestTimestamp), 'MMM dd, HH:mm:ss')}
                    </p>
                  </TableCell>
                  <TableCell className="w-[140px]">
                    <div>
                      {lead.leadLinkedin ? (
                        <a
                          href={lead.leadLinkedin}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          title={`View ${lead.leadName}'s LinkedIn profile`}
                        >
                          {lead.leadName || 'Unknown'}
                        </a>
                      ) : (
                        <p className="text-sm font-medium">
                          {lead.leadName || 'Unknown'}
                        </p>
                      )}
                      {lead.leadPhone && (
                        <p className="text-xs text-[#64748B]">
                          {lead.leadPhone}
                        </p>
                      )}
                    </div>
                    {lead.leadPhone && (
                      <p className="text-xs text-muted-foreground">
                        {lead.leadPhone}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="w-[80px]">
                    <LiveActivityStatusBadge status={lead.latestStatus} currentStep={calculateCurrentStep(lead)} />
                  </TableCell>
                  <TableCell className="w-[150px]">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <p
                            className="text-sm text-[#64748B] max-w-[170px] overflow-hidden text-ellipsis whitespace-nowrap"
                          >
                            {lead.latestMessage || '-'}
                          </p>
                        </TooltipTrigger>
                        <TooltipContent>
                          {lead.latestMessage || ''}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableCell>
                  <TableCell className="w-[240px]">
                    <StatusStepper currentStep={calculateCurrentStep(lead)} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalLeads > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
          <div className="flex items-center gap-2 text-sm text-[#64748B]">
            <span>Show</span>
            <select
              value={currentPageSize}
              onChange={(e) => {
                setCurrentPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-[#E2E8F0] rounded px-2 py-1 text-sm"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
            <span>
              of {totalLeads} leads
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-sm text-[#64748B]">
              Page {currentPage} of {totalPages}
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(1)}
                disabled={!hasPrevPage}
                className="h-8 w-8 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!hasPrevPage}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!hasNextPage}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(totalPages)}
                disabled={!hasNextPage}
                className="h-8 w-8 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
