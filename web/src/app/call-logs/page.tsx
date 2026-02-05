"use client";

export const dynamic = 'force-dynamic';

import { useEffect, useState, useRef, useMemo } from "react";
import { io } from "socket.io-client";
import { getCurrentUser } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { logger } from "@/lib/logger";
import type { SortConfig } from "@/utils/sortingUtils";

// SDK Imports
import { 
  useCallLogs, 
  useBatchStatus, 
  useEndCall, 
  useRetryFailedCalls,
  type CallLog,
  type BatchPayload,
} from "@lad/frontend-features/call-logs";

import { CallLogsHeader } from "@/components/CallLogsHeader";
import { CallLogsTable } from "@/components/CallLogsTable";
import { Pagination } from "@/components/Pagination";
import { CallLogModal } from "@/components/call-log-modal";
import { CallLogsTableSkeleton } from "@/components/CallLogsTableSkeleton";

type TimeFilter = "all" | "current" | "previous" | "batch";

export default function CallLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authed, setAuthed] = useState<boolean | null>(null);

  const [items, setItems] = useState<CallLog[]>([]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | undefined>();
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [initialLoading, setInitialLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Filters
  const [providerFilter, setProviderFilter] = useState("All");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [batchJobId, setBatchJobId] = useState<string | null>(null);

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "https://lad-backend-develop-741719885039.us-central1.run.app";
  const socket = useRef(io(socketUrl, { 
    transports: ["websocket"],
    reconnection: false,
    forceNew: true,
    autoConnect: true,
    timeout: 20000,
    secure: true,
    rejectUnauthorized: false,
    upgrade: false,
    rememberUpgrade: false
  })).current;

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Date filter
  type DateFilter = "today" | "month" | "custom" | "all";
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  // Memoize date range to prevent unnecessary re-renders and API calls
  const dateRange = useMemo(() => {
    const now = new Date();

    if (dateFilter === "today") {
      const start = new Date();
      start.setHours(0, 0, 0, 0);

      const end = new Date();
      end.setHours(23, 59, 59, 999);

      return { from: start.toISOString(), to: end.toISOString() };
    }

    if (dateFilter === "month") {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: start.toISOString(), to: now.toISOString() };
    }

    if (dateFilter === "custom" && fromDate && toDate) {
      const from = new Date(fromDate);
      from.setHours(0, 0, 0, 0);
      
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      
      return { from: from.toISOString(), to: to.toISOString() };
    }

    return { from: undefined, to: undefined };
  }, [dateFilter, fromDate, toDate]);

  // SDK Hooks
  const callLogsQuery = useCallLogs(
    {
      from_date: dateRange.from,
      to_date: dateRange.to,
    },
    authed === true // Only fetch when authenticated
  );
  
  const batchStatusQuery = useBatchStatus(batchJobId);
  const endCallMutation = useEndCall();
  const retryCallsMutation = useRetryFailedCalls();

  // Debug logging for query states
  useEffect(() => {
    logger.debug('[Call Logs Query State]', {
      isLoading: callLogsQuery.isLoading,
      isFetching: callLogsQuery.isFetching,
      isError: callLogsQuery.isError,
      isSuccess: callLogsQuery.isSuccess,
      error: callLogsQuery.error,
      dataExists: !!callLogsQuery.data,
      authed,
      dateRange,
    });
  }, [callLogsQuery.isLoading, callLogsQuery.isFetching, callLogsQuery.isError, callLogsQuery.isSuccess, callLogsQuery.data, authed, dateRange]);


  // ----------------------
  // AUTH
  // ----------------------
  useEffect(() => {
    (async () => {
      try {
        await getCurrentUser();
        setAuthed(true);
      } catch {
        setAuthed(false);
        router.replace("/login?redirect_url=/call-logs");
      }
    })();
  }, [router]);

  // Initialize batchJobId + mode from query params
  useEffect(() => {
    if (!searchParams) return;
    
    const jobId = searchParams.get("jobId");
    const mode = searchParams.get("mode");

    logger.debug('[Call Logs] Query params detected', { jobId, mode });

    if (jobId) {
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId);
      const isBatchFormat = /^batch-[0-9a-f]{32}$/i.test(jobId);
      
      logger.debug('[Call Logs] Batch ID validation', { isUUID, isBatchFormat });
      
      if (isUUID || isBatchFormat) {
        logger.debug('[Call Logs] Setting batchJobId', { jobId });
        setBatchJobId(jobId);
        if (mode === "current-batch") {
          logger.debug('[Call Logs] Setting timeFilter to batch');
          setTimeFilter("batch");
        }
      } else {
        logger.warn('[Call Logs] Invalid batch ID format', { jobId });
        router.replace('/call-logs');
      }
    }
  }, [searchParams, router]);

  // ----------------------
  // PROCESS SDK DATA
  // ----------------------
  useEffect(() => {
    logger.debug('[Call Logs] Processing data effect triggered', {
      timeFilter,
      batchJobId,
      hasBatchData: !!batchStatusQuery.data,
      hasCallLogsData: !!callLogsQuery.data,
      callLogsQueryState: {
        isLoading: callLogsQuery.isLoading,
        isSuccess: callLogsQuery.isSuccess,
        isError: callLogsQuery.isError,
      }
    });

    // Handle batch view
    if (timeFilter === "batch" && batchJobId && batchStatusQuery.data) {
      logger.debug('[Call Logs] Processing batch data', { batchJobId });
      
      const batch = batchStatusQuery.data.batch || batchStatusQuery.data.result;
      
      if (!batch) {
        setItems([]);
        setInitialLoading(false);
        return;
      }

      const batchStatus = batch.status || "";
      const results = batch.results || [];

      const logs: CallLog[] = results.map((r, idx) => ({
        id: r.call_log_id || `batch-${batchJobId}-idx-${idx}`,
        assistant: "",
        lead_name: r.lead_name || "",
        type: "Outbound",
        status: r.status || "pending",
        startedAt: "",
        duration: 0,
        cost: 0,
        batch_status: r.batch_status || batchStatus,
        batch_id: batchJobId,
      }));

      logger.debug('[Call Logs] Setting batch items', { count: logs.length });
      setItems(logs);
      setInitialLoading(false);
      return;
    }

    // Handle normal call logs
    if (callLogsQuery.isSuccess && callLogsQuery.data) {
      logger.debug('[Call Logs] Processing normal call logs', { 
        rawData: callLogsQuery.data,
        logsCount: callLogsQuery.data.logs?.length 
      });

      const logs: CallLog[] = (callLogsQuery.data.logs || []).map((r) => {
        const leadName = [r.lead_first_name, r.lead_last_name]
          .filter(Boolean)
          .join(' ') || '';

        const leadCategory = r.lead_category || 
                            r.analysis?.raw_analysis?.lead_score_full?.lead_category;

        return {
          id: String(r.call_log_id || r.id || ''),
          assistant: r.agent_name || '',
          lead_name: leadName,
          type: r.direction === "inbound" ? "Inbound" : "Outbound",
          status: r.status || '',
          startedAt: r.started_at,
          duration: r.duration_seconds || r.call_duration || 0,
          cost: r.cost ?? r.call_cost ?? 0,
          batch_status: r.batch_status,
          batch_id: r.batch_id,
          lead_category: leadCategory,
          signed_recording_url: r.signed_recording_url,
          recording_url: r.recording_url,
          call_recording_url: r.call_recording_url,
        };
      });

      logger.debug('[Call Logs] Loaded call logs with count:', {
        total: logs.length,
        withBatchId: logs.filter(l => l.batch_id).length,
        sample: logs.slice(0, 3),
      });

      setItems(logs);
      setInitialLoading(false);
    }

    // Handle errors
    if (batchStatusQuery.isError && timeFilter === "batch" && batchJobId) {
      logger.error('[Call Logs] Failed to load batch status', batchStatusQuery.error);
      setBatchJobId(null);
      setTimeFilter("all");
      router.replace('/call-logs');
    }
  }, [
    callLogsQuery.data, 
    batchStatusQuery.data, 
    batchStatusQuery.isError, 
    batchStatusQuery.error,
    timeFilter, 
    batchJobId, 
    router
  ]);

  // ----------------------
  // SOCKET UPDATES
  // ----------------------
  useEffect(() => {
    socket.on("connect_error", () => {
      // Silently ignore connection errors
    });

    socket.on("calllogs:update", () => {
      callLogsQuery.refetch();
      if (batchJobId) {
        batchStatusQuery.refetch();
      }
    });

    return () => {
      socket.off("calllogs:update");
      socket.off("connect_error");
    };
  }, [batchJobId, callLogsQuery, batchStatusQuery, socket]);

  // ----------------------
  // FILTERS
  // ----------------------
  const filtered = useMemo(() => {
    const now = Date.now();

    return items.filter((i) => {
      const matchProvider =
        providerFilter === "All" || i.type === providerFilter;

      let matchTime = true;

      if (timeFilter === "current") {
        // Current Batch: only show batch calls with running/pending/queued status
        if (i.batch_id) {
          const status = i.status?.toLowerCase() || '';
          matchTime = ['running', 'pending', 'queued', 'ongoing', 'calling', 'in_progress'].includes(status);
        } else {
          matchTime = false; // Hide individual calls in Current Batch view
        }
      } else if (timeFilter === "previous") {
        if (i.batch_status) {
          // For batch calls: anything not running = previous
          matchTime = i.batch_status.toLowerCase() !== "running";
        } else if (i.startedAt) {
          const dt = new Date(i.startedAt).getTime();
          matchTime = now - dt > 24 * 60 * 60 * 1000;
        }
      } else if (timeFilter === "batch") {
        // Batch view: show ALL calls that have a batch_id (unless specific batchJobId is set)
        if (batchJobId) {
          // Specific batch view - only show this batch
          matchTime = !!i.batch_id && i.batch_id === batchJobId;
        } else {
          // General batch view - show all batch calls
          matchTime = !!i.batch_id;
        }
      }

      return matchProvider && matchTime;
    });
  }, [items, providerFilter, timeFilter, batchJobId]);

  const uniqueProviders = useMemo(
    () => [...new Set(items.map((i) => i.type))],
    [items]
  );

  // Apply sorting to filtered results for consistent ordering across pages
  const sortedFiltered = useMemo(() => {
    if (!sortConfig) return filtered;
    const { sortCallLogs } = require("@/utils/sortingUtils");
    return sortCallLogs(filtered, sortConfig);
  }, [filtered, sortConfig]);

  const totalPages = Math.ceil(sortedFiltered.length / perPage) || 1;
  const paginated = sortedFiltered.slice((page - 1) * perPage, page * perPage);

  // Group calls by batch (from paginated items)
  const batchGroups = useMemo(() => {
    const groups: Record<string, typeof paginated> = {};
    const noBatchCalls: typeof paginated = [];

    paginated.forEach((call: typeof paginated[0]) => {
      if (call.batch_id) {
        if (!groups[call.batch_id]) {
          groups[call.batch_id] = [];
        }
        groups[call.batch_id].push(call);
      } else {
        noBatchCalls.push(call);
      }
    });

    logger.debug('[Call Logs] Batch grouping prepared', {
      totalCalls: paginated.length,
      batchGroups: Object.keys(groups).length,
      noBatchCalls: noBatchCalls.length,
      groups,
    });

    return { groups, noBatchCalls };
  }, [paginated]);

  // Toggle batch expansion
  const toggleBatch = (batchId: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  // ----------------------
  // SELECTION
  // ----------------------
  const handleSelectCall = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      // ✅ NEW: Collect ALL call IDs from FILTERED results (all pages, not just current page)
      const allCallIds = filtered.map((i) => i.id);
      setSelected(new Set(allCallIds));
    } else {
      setSelected(new Set());
    }
  };

  // ✅ Handle row click - prevent modal for active calls and failed calls
  const handleRowClick = (id: string) => {
    const call = items.find(i => i.id === id);
    const status = call?.status.toLowerCase() || '';
    
    // Don't open modal for calling, queue, ongoing, or failed calls
    if (['calling', 'queue', 'queued', 'ongoing', 'in_queue', 'failed'].includes(status)) {
      return;
    }
    
    setOpenId(id);
  };

  // End selected calls
  async function endSelectedCalls() {
    alert("Ending " + selected.size + " calls");
    // TODO: Implement bulk end API
    await callLogsQuery.refetch();
    setSelected(new Set());
  }

  // End a single call using SDK
  async function endSingleCall(callId: string) {
    try {
      await endCallMutation.mutateAsync({ callId });
    } catch (error) {
      logger.error('Error ending call', error);
      alert("Failed to end call. Please try again.");
    }
  }

  // Retry failed calls using SDK
  async function retrySelectedCalls() {
    const failedCallIds = Array.from(selected);
    try {
      await retryCallsMutation.mutateAsync({ call_ids: failedCallIds });
      alert(`Retrying ${failedCallIds.length} failed calls`);
      setSelected(new Set());
    } catch (error) {
      logger.error('Error retrying calls', error);
      alert("Failed to retry calls. Please try again.");
    }
  }

  // ----------------------
  // BULK BATCH START HANDLER
  // ----------------------
  async function onBulkStart(data: any) {
    const jobId = data.result.job_id;
    setBatchJobId(jobId);
    setTimeFilter("batch");
    router.push(`/call-logs?jobId=${jobId}&mode=current-batch`);
    await callLogsQuery.refetch();
  }

  if (authed === null) {
    return null;
  }

  if (!authed) return <></>;

  // Check if any selected calls have "failed" status and count them
  const failedCallIds = Array.from(selected).filter(id => {
    const call = items.find(i => i.id === id);
    return call && call.status.toLowerCase() === "failed";
  });
  const hasFailedCalls = failedCallIds.length > 0;

  // Check if filters are in default state (no skeleton needed for initial load)
  const isDefaultFilters = dateFilter === 'all' && timeFilter === 'all';
  const shouldShowSkeleton = (callLogsQuery.isLoading || batchStatusQuery.isLoading) && !isDefaultFilters;

  return (
    <div className="max-w-full mx-auto space-y-2 px-6 py-6">
      {/* Header */}
      <CallLogsHeader
        filterProvider={providerFilter}
        onFilterProviderChange={setProviderFilter}
        callFilter={timeFilter}
        onCallFilterChange={(f) => {
          setTimeFilter(f);
          setPage(1);
        }}
        uniqueProviders={uniqueProviders}
        selectedCount={selected.size}
        onEndSelected={endSelectedCalls}
        onRetrySelected={retrySelectedCalls}
        hasFailedCalls={hasFailedCalls}
        failedCount={failedCallIds.length}
        dateFilter={dateFilter}
        onDateFilterChange={(f) => {
          setDateFilter(f);
          setPage(1);
        }}
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        perPage={perPage}
        onPerPageChange={(value) => {
          setPerPage(value);
          setPage(1);
        }}
      />

     {/* Table */}
{shouldShowSkeleton ? (
  <CallLogsTableSkeleton />
) : (
      <CallLogsTable
        items={paginated}
        selectedCalls={selected}
        onSelectCall={handleSelectCall}
        onSelectAll={handleSelectAll}
        onRowClick={handleRowClick}
        onEndCall={endSingleCall}
        batchGroups={batchGroups}
        expandedBatches={expandedBatches}
        onToggleBatch={toggleBatch}
        totalFilteredCount={sortedFiltered.length}
        onSortChange={(newSort) => {
          setSortConfig(newSort);
          setPage(1); // Reset to first page when sorting changes
        }}
        dateFilter={dateFilter}
        onDateFilterChange={(f) => {
          setDateFilter(f as DateFilter);
          setPage(1);
        }}
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        callFilter={timeFilter}
        onCallFilterChange={(f) => {
          setTimeFilter(f as TimeFilter);
          setPage(1);
        }}
      />
)}


      {/* Pagination */}
      {/* <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      /> */}

      {/* Modal */}
      <CallLogModal
        id={openId}
        open={!!openId}
        onOpenChange={(open) => !open && setOpenId(undefined)}
      />
    </div>
  );
}
