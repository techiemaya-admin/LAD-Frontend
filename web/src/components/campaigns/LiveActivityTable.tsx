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
import { Download, Filter, Loader2, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ExternalLink, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { useCampaignActivityFeed } from '@lad/frontend-features/campaigns';
import { apiGet } from '@/lib/api';
import { MiniStepper } from './MiniStepper';
import { StatusStepper, type WorkflowStep } from './StatusStepper';
import { LeadStepperRow } from './LeadStepperRow';
import { LiveActivityStatusBadge } from './LiveActivityStatusBadge';
import { LiveBadge } from '@/components/LiveBadge';
import { exportCampaignLeads } from '../../../../sdk/features/campaigns/api';
import { formatDateTimeUnified } from '@/utils/dateTime';

/** Mapping from backend step_type to a short display label */
const STEP_TYPE_LABEL: Record<string, string> = {
  lead_generation: 'Lead Gen',
  linkedin_visit: 'Visit',
  linkedin_connect: 'Connect',
  linkedin_message: 'Message',
  linkedin_follow: 'Follow',
  wait_for_condition: 'Accepted',
  delay: 'Delay',
  voice_agent_call: 'Voice Call',
  voice_call: 'Voice Call',
  call: 'Call',
  email_send: 'Email',
  email: 'Email',
  whatsapp_send: 'WhatsApp',
  whatsapp: 'WhatsApp',
  sms: 'SMS',
};

/**
 * Step types that we skip when building the visible progress stepper.
 * Only pure flow-control / source nodes are hidden; real milestones
 * (including wait_for_condition = "connection accepted") are shown.
 */
const SKIP_STEP_TYPES = new Set(['delay', 'lead_generation', 'start', 'end']);

/**
 * Convert step_analytics (or campaign.steps) from the backend into
 * the WorkflowStep[] format consumed by <StatusStepper>.
 */
function buildWorkflowSteps(
  rawSteps: Array<{ type: string; title?: string; order?: number; config?: any }>
): WorkflowStep[] {
  return rawSteps
    .filter((s) => {
      if (!s.type || SKIP_STEP_TYPES.has(s.type.toLowerCase())) return false;
      // Skip wait_for_condition whose action_type is PROFILE_VISITED —
      // it's an internal gate that fires immediately after linkedin_visit
      // and creates a confusing duplicate step in the UI stepper.
      if (s.type.toLowerCase() === 'wait_for_condition') {
        const cfg = typeof s.config === 'string'
          ? JSON.parse(s.config || '{}')
          : (s.config || {});
        if (cfg.action_type === 'PROFILE_VISITED') return false;
      }
      return true;
    })
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s, idx) => {
      const cfg = typeof s.config === 'string'
        ? JSON.parse(s.config || '{}')
        : (s.config || {});
      return {
        id: idx + 1,
        type: s.type.toLowerCase(),
        // Carry config so calculateCurrentStep can resolve the right done-condition
        config: cfg,
        label:
          s.title ||
          STEP_TYPE_LABEL[s.type.toLowerCase()] ||
          s.type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      };
    });
}

interface LiveActivityTableProps {
  campaignId: string;
  maxHeight?: number;
  pageSize?: number;
  /** step_analytics from useCampaignAnalytics or campaign.steps from useCampaign */
  campaignSteps?: Array<{ type: string; title?: string; order?: number }>;
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
  pageSize = 20,
  campaignSteps,
}) => {
  // Build the dynamic workflow steps once (memoised below)

  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [currentPageSize, setCurrentPageSize] = useState<number>(pageSize);

  /** Resolved dynamic workflow steps for the stepper */
  const workflowSteps = useMemo<WorkflowStep[]>(
    () => (campaignSteps && campaignSteps.length > 0 ? buildWorkflowSteps(campaignSteps) : []),
    [campaignSteps]
  );

  const handleExportLeads = async (filter: string) => {
    try {
      const leads = await exportCampaignLeads(campaignId, filter);

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
          callMade: false,          // tracks VOICE_CALL_MADE / VOICE_CALL_INITIATED
          whatsappSent: false,      // tracks WHATSAPP_SENT / WHATSAPP_DELIVERED
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

      // Detect voice / call activity (VOICE_CALL_MADE, VOICE_CALL_INITIATED, CALL_*)
      if (
        actionType.includes('VOICE_CALL') ||
        actionType.includes('CALL_MADE') ||
        actionType.includes('CALL_INITIATED') ||
        actionType === 'CALL'
      ) {
        if (status === 'success' || status === 'sent' || status === 'delivered') {
          lead.callMade = true;
        }
      }

      // WhatsApp tracking
      if (actionType.includes('WHATSAPP') || actionType === 'WHATSAPP_SENT' || actionType === 'WHATSAPP_DELIVERED' || actionType === 'WHATSAPP_SEND') {
        if (status === 'success' || status === 'sent' || status === 'delivered' || status === 'completed') lead.whatsappSent = true;
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

  /**
   * Returns the 1-based index of the ACTIVE step for a given lead.
   * When dynamic workflowSteps are available, the step list is driven by
   * the campaign configuration.  Falls back to the original 5-step logic
   * when no steps are passed.
   */
  const calculateCurrentStep = (lead: any): number => {
    // ── Dynamic mode ──────────────────────────────────────────────────────
    if (workflowSteps.length > 0) {
      // Walk backwards through the steps; the first one whose "done"
      // condition is satisfied tells us the NEXT step is the active one.
      const STEP_DONE: Record<string, (l: any) => boolean> = {
        linkedin_visit: (l) => l.profileVisited,
        linkedin_connect: (l) => l.connectionStatus === 'SENT',
        linkedin_message: (l) => l.contacted,
        voice_agent_call: (l) => l.callMade,
        voice_call: (l) => l.callMade,
        call: (l) => l.callMade,
        email_send: (l) => l.contacted,
        email: (l) => l.contacted,
        whatsapp_send: (l) => l.whatsappSent,
        whatsapp: (l) => l.whatsappSent,
        sms: (l) => l.contacted,
        reply: (l) => l.leadReplied,
      };

      let lastDoneIdx = -1; // index (0-based) of the last completed step
      workflowSteps.forEach((step, idx) => {
        let isDone: boolean;
        if (step.type === 'wait_for_condition') {
          // Resolve done-condition based on what we're waiting for
          const actionType: string = (step as any).config?.action_type || 'CONNECTION_ACCEPTED';
          if (actionType === 'PROFILE_VISITED') isDone = lead.profileVisited;
          else if (actionType === 'CONNECTION_ACCEPTED') isDone = lead.connectionAccepted;
          else if (actionType === 'REPLY_RECEIVED') isDone = lead.leadReplied;
          else isDone = lead.connectionAccepted;
        } else {
          isDone = STEP_DONE[step.type]?.(lead) ?? false;
        }
        if (isDone) lastDoneIdx = idx;
      });

      // If all steps are done, return one beyond the last (all completed)
      const activeIdx = lastDoneIdx + 1;
      if (activeIdx >= workflowSteps.length) return workflowSteps.length + 1;

      // 1-based: step ids start at 1
      return workflowSteps[activeIdx].id;
    }

    // ── Static fallback (original 5-step LinkedIn logic) ──────────────────
    if (lead.leadReplied) return 6;
    if (lead.contacted) return 5;
    if (lead.connectionAccepted) return 4;
    if (lead.connectionStatus === 'SENT') return 3;
    if (lead.profileVisited) return 2;
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

      {/* Campaign Workflow Stepper - Display if steps are configured */}
      {workflowSteps.length > 0 && (
        <div className="px-4 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
          <p className="text-xs font-semibold text-[#64748B] mb-3 uppercase tracking-wide">Campaign Workflow</p>
          <div className="bg-white rounded-lg p-4 border border-[#E2E8F0]">
            <StatusStepper
              currentStep={
                groupedLeads.length > 0
                  ? Math.max(...groupedLeads.map((lead) => calculateCurrentStep(lead)))
                  : 1
              }
              steps={workflowSteps}
            />
          </div>
        </div>
      )}

      {/* Activity Table */}
      <div className="w-full overflow-auto scrollbar-hide max-h-[calc(100vh-320px)] border-b border-[#E2E8F0] relative">
        <Table containerClassName="overflow-visible" className="border-separate border-spacing-0">
          <TableHeader className="sticky top-0 z-40 bg-[#F8FAFC] shadow-sm">
            <TableRow className="bg-[#F8FAFC] hover:bg-transparent">
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap w-[110px] sticky top-0 z-40 bg-[#F8FAFC]">
                <div className="flex items-center gap-1 cursor-pointer select-none">
                  Timestamp
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap w-[140px] sticky top-0 z-40 bg-[#F8FAFC]">
                <div className="flex items-center gap-1 cursor-pointer select-none">
                  Lead
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap w-[80px] sticky top-0 z-40 bg-[#F8FAFC]">
                <div className="flex items-center gap-1 cursor-pointer select-none">
                  State
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap w-[150px] sticky top-0 z-40 bg-[#F8FAFC]">
                <div className="flex items-center gap-1 cursor-pointer select-none">
                  Details
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                </div>
              </TableHead>
              <TableHead className="font-semibold text-[#1E293B] whitespace-nowrap w-[240px] sticky top-0 z-40 bg-[#F8FAFC]">
                <div className="flex items-center gap-1 cursor-pointer select-none">
                  Status
                  <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground opacity-50" />
                </div>
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
                      {formatDateTimeUnified(lead.latestTimestamp)}
                    </p>
                  </TableCell>
                  <TableCell className="w-[140px]">
                    <div>
                      <div className="flex items-center gap-1">
                        <Link
                          href={`/campaigns/${campaignId}/analytics/leads`}
                          className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline transition-colors"
                          title={`View ${lead.leadName}'s profile`}
                        >
                          {lead.leadName || 'Unknown'}
                        </Link>
                        {/* LinkedIn external link as a small icon — only shown when URL is a valid absolute URL */}
                        {lead.leadLinkedin && /^https?:\/\//i.test(lead.leadLinkedin) && (
                          <a
                            href={lead.leadLinkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open LinkedIn profile"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[#0A66C2] hover:text-[#004182] flex-shrink-0"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                      {lead.leadPhone && (
                        <p className="text-xs text-[#64748B]">
                          {lead.leadPhone}
                        </p>
                      )}
                    </div>
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
                    {workflowSteps.length > 0 ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {workflowSteps.map((step, stepIdx) => {
                          // Determine state for this step
                          const STEP_DONE: Record<string, (l: any) => boolean> = {
                            linkedin_visit: (l) => l.profileVisited,
                            linkedin_connect: (l) => l.connectionStatus === 'SENT',
                            wait_for_condition: (l) => l.connectionAccepted,
                            linkedin_message: (l) => l.contacted,
                            voice_agent_call: (l) => l.callMade,
                            voice_call: (l) => l.callMade,
                            call: (l) => l.callMade,
                            email_send: (l) => l.contacted,
                            email: (l) => l.contacted,
                            whatsapp_send: (l) => l.whatsappSent,
                            whatsapp: (l) => l.whatsappSent,
                            sms: (l) => l.contacted,
                            reply: (l) => l.leadReplied,
                          };

                          const isDone = STEP_DONE[step.type]?.(lead) ?? false;
                          const isActive = calculateCurrentStep(lead) === step.id;

                          return (
                            <TooltipProvider key={step.id}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold transition-all ${isDone
                                      ? 'bg-green-100 text-green-700 border border-green-300'
                                      : isActive
                                        ? 'bg-blue-100 text-blue-700 border-2 border-blue-400'
                                        : 'bg-gray-100 text-gray-500 border border-gray-300'
                                    }`}>
                                    {isDone ? '✓' : step.id}
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="text-xs max-w-[220px]">
                                  <p className="font-medium mb-0.5">{step.label}</p>
                                  {step.type === 'linkedin_connect' ? (
                                    isDone ? (
                                      lead.connectionSentWithMessage
                                        ? <p className="text-green-500">✓ Sent with message</p>
                                        : <p className="text-amber-500">✓ Sent without message — LinkedIn daily connection limit reached</p>
                                    ) : lead.connectionStatus === 'PAUSED' ? (
                                      <p className="text-amber-500">
                                        ⏸ Paused —{' '}
                                        {lead.pauseReason === 'DAILY_LIMIT'
                                          ? 'Daily limit reached'
                                          : lead.pauseReason === 'WEEKLY_LIMIT'
                                            ? 'Weekly limit reached'
                                            : 'Rate limit reached'}
                                      </p>
                                    ) : lead.connectionStatus === 'FAILED' ? (
                                      <p className="text-red-400">
                                        ✗ Failed{lead.errorMessage ? ` — ${lead.errorMessage.slice(0, 80)}` : ''}
                                      </p>
                                    ) : isActive ? (
                                      <p className="text-blue-400">◆ Sending connection request…</p>
                                    ) : (
                                      <p className="text-gray-400">Pending</p>
                                    )
                                  ) : (
                                    <p className="text-gray-400">{isDone ? '✓ Completed' : isActive ? '◆ In Progress' : 'Pending'}</p>
                                  )}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          );
                        })}
                      </div>
                    ) : (
                      <StatusStepper
                        currentStep={calculateCurrentStep(lead)}
                        steps={undefined}
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls */}
      {totalLeads > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0] bg-[#F8FAFC]">
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
              {[10, 20, 50, 100].map((size) => (
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
