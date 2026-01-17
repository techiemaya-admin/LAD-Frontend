"use client";

export const dynamic = 'force-dynamic';


import { useEffect, useState, useRef, useMemo } from "react";
import { io } from "socket.io-client";
import { apiGet, apiPost } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { logger } from "@/lib/logger";

import { CallLogsHeader } from "@/components/CallLogsHeader";
import { CallLogsTable } from "@/components/CallLogsTable";
import { Pagination } from "@/components/Pagination";
import { CallLogModal } from "@/components/call-log-modal";
import { CallLogsTableSkeleton } from "@/components/CallLogsTableSkeleton";

interface CallLogResponse {
  call_log_id: string;
  id?: string;
  agent_name: string;
  lead_first_name?: string;
  lead_last_name?: string;
  lead_name?: string;
  direction: "inbound" | "outbound";
  call_type?: "inbound" | "outbound";
  status: string;
  started_at: string;
  duration_seconds: number;
  call_duration?: number;
  cost?: number;
  call_cost?: number;
  batch_status?: string;
  batch_id?: string;
}

interface CallLogsResponse {
  logs: CallLogResponse[];
}

interface BatchResultItem {
  to_number?: string | null;
  status?: string | null;
  index?: number;
  lead_name?: string | null;
  context?: string | null;
  call_log_id?: string | null;
  room_name?: string | null;
  dispatch_id?: string | null;
  error?: string | null;
  batch_status?: string | null;
}

interface BatchPayload {
  job_id: string;
  status: string;
  results: BatchResultItem[];
}

interface BatchApiResponse {
  success: boolean;
  batch?: BatchPayload;
  result?: BatchPayload; // fallback shape
}

type TimeFilter = "all" | "current" | "previous" | "batch";

export default function CallLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authed, setAuthed] = useState<boolean | null>(null);

  const [items, setItems] = useState<
    Array<{
      id: string;
      assistant: string;
      lead_name: string;
      type: string;
      status: string;
      startedAt: string;
      duration: number;
      cost: number;
      batch_status?: string;
      batch_id?: string;
    }>
  >([]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | undefined>();
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
  const [initialLoading, setInitialLoading] = useState(true);

  


  // Filters
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("All");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [batchJobId, setBatchJobId] = useState<string | null>(null);

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "https://lad-backend-develop-741719885039.us-central1.run.app";
  const socket = useRef(io(socketUrl, { 
    transports: ["websocket"],
    reconnection: false, // Disable reconnection to avoid console spam
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

const resolveDateRange = () => {
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
    // Parse dates and set to full day range
    const from = new Date(fromDate);
    from.setHours(0, 0, 0, 0);
    
    const to = new Date(toDate);
    to.setHours(23, 59, 59, 999);
    
    return { from: from.toISOString(), to: to.toISOString() };
  }

  return {};
};


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

  // Initialize batchJobId + mode from query params (when redirected from batch start)
  useEffect(() => {
    // Wait for client-side hydration
    if (!searchParams) return;
    
    const jobId = searchParams.get("jobId");
    const mode = searchParams.get("mode");

    logger.debug('[Call Logs] Query params detected', { jobId, mode });

    if (jobId) {
      // Accept both UUID format and "batch-" prefixed format
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
        // Clear invalid batch ID from URL
        router.replace('/call-logs');
      }
    }
  }, [searchParams, router]);

  // ----------------------
  // LOAD CALLS (ORG handled in backend using JWT)
  // ----------------------
  
  const load = async () => {
    try {
      // Batch View
      if (timeFilter === "batch" && batchJobId) {
        logger.debug('[Call Logs] Loading batch view', { batchJobId });
        try {
          const url = `/api/voice-agent/batch/batch-status/${batchJobId}`;
          logger.debug('[Call Logs] Calling batch API', { url });
          const res = await apiGet<BatchApiResponse>(url);
          logger.debug('[Call Logs] Batch API response received');
          const batch = res.batch || res.result;

          if (!batch) {
            setItems([]);
            return;
          }

          const batchStatus = batch.status || "";
          const results = batch.results || [];

          const logs = results.map((r, idx) => ({
            id: r.call_log_id || `batch-${batchJobId}-idx-${idx}`,
            assistant: "", // not provided by this endpoint
            lead_name: r.lead_name || "",
            type: "Outbound",
            status: r.status || "pending",
            startedAt: "", // not exposed from this endpoint
            duration: 0,
            cost: 0,
            batch_status: r.batch_status || batchStatus,
            batch_id: batchJobId, // Set the batch_id so filtering works
          }));

          setItems(logs);
          return;
        } 
        
        catch (error) {
          logger.error('[Call Logs] Failed to load batch status', error);
          // Reset to normal mode when batch loading fails
          setBatchJobId(null);
          setTimeFilter("all");
          // Clear URL parameters to prevent reload loop
          router.replace('/call-logs');
          // Fall through to load normal call logs
        }
      }


      const { from, to } = resolveDateRange();

      // Build query with ONLY date range (no limit param)
      // API fetches all records for the date range
      // Frontend handles pagination via perPage
      const query = new URLSearchParams({
        ...(from && { from_date: from }),
        ...(to && { to_date: to }),
      });

      // Normal mode — backend auto-filters by org based on JWT
      // API returns ALL calls matching the date range (no pagination)
      const res = await apiGet<CallLogsResponse>(`/api/voice-agent/calls?${query.toString()}`);

      const logs = (res.logs || []).map((r) => {
        // Construct lead name from first and last name
        const leadName = [r.lead_first_name, r.lead_last_name]
          .filter(Boolean)
          .join(' ') || '';

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
        };
      });

      logger.debug('[Call Logs] Loaded call logs with count:', {
        total: logs.length,
        withBatchId: logs.filter(l => l.batch_id).length,
        sample: logs.slice(0, 3),
      });

      setItems(logs);
    } catch (error) {
      logger.error('Failed to load call logs', error);
      setItems([]);
    }
    finally {
      setInitialLoading(false); // 👈 IMPORTANT
    }
  };

  useEffect(() => {
    logger.debug('[Call Logs] Load effect triggered', { timeFilter, batchJobId });
    load(); // initial + whenever filter/batch changes

    // Suppress socket connection errors
    socket.on("connect_error", () => {
      // Silently ignore connection errors since socket.io is optional for real-time updates
    });

    socket.on("calllogs:update", () => {
      load();
    });
    

    return () => {
      socket.off("calllogs:update");
      socket.off("connect_error");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    
  }, [timeFilter, batchJobId, perPage, dateFilter, fromDate, toDate]);

  // ----------------------
  // FILTERS
  // ----------------------
  const filtered = useMemo(() => {
    const now = Date.now();

    return items.filter((i) => {
      const s = search.toLowerCase();

      const matchSearch =
        (i.id || "").toLowerCase().includes(s) ||
        (i.assistant || "").toLowerCase().includes(s) ||
        (i.lead_name || "").toLowerCase().includes(s);

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

      return matchSearch && matchProvider && matchTime;
    });
  }, [items, search, providerFilter, timeFilter]);

  const uniqueProviders = useMemo(
    () => [...new Set(items.map((i) => i.type))],
    [items]
  );

  const totalPages = Math.ceil(filtered.length / perPage) || 1;
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // Group calls by batch (from paginated items)
  const batchGroups = useMemo(() => {
    const groups: Record<string, typeof paginated> = {};
    const noBatchCalls: typeof paginated = [];

    paginated.forEach((call) => {
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

  // ✅ Handle row click - prevent modal for active calls
  const handleRowClick = (id: string) => {
    const call = items.find(i => i.id === id);
    const status = call?.status.toLowerCase() || '';
    
    // Don't open modal for calling, queue, or ongoing calls
    if (['calling', 'queue', 'queued', 'ongoing', 'in_queue'].includes(status)) {
      return;
    }
    
    setOpenId(id);
  };

  async function endSelectedCalls() {
    alert("Ending " + selected.size + " calls");
    await load();
    setSelected(new Set());
  }

  // ✅ NEW: End a single call
  async function endSingleCall(callId: string) {
    try {
      await apiPost(`/api/voice-agent/calls/${callId}/end`, {});
      // Reload the call logs to reflect the updated status
      await load();
    } catch (error) {
      logger.error('Error ending call', error);
      alert("Failed to end call. Please try again.");
    }
  }

  // ✅ NEW: Retry failed calls
  async function retrySelectedCalls() {
    const failedCallIds = Array.from(selected);
    alert("Retrying " + failedCallIds.length + " failed calls");
    // TODO: Call retry API endpoint
    // await apiPost('/api/voice-agent/calls/retry', { call_ids: failedCallIds });
    await load();
    setSelected(new Set());
  }

  // ----------------------
  // BULK BATCH START HANDLER (if you emit socket event with job_id)
  // ----------------------
  async function onBulkStart(data: any) {
    const jobId = data.result.job_id;
    setBatchJobId(jobId);
    setTimeFilter("batch");
    router.push(`/call-logs?jobId=${jobId}&mode=current-batch`);
    await load();
  }

  if (authed === null) {
    return (
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Header */}
        <CallLogsHeader
          search={search}
          onSearchChange={setSearch}
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
          hasFailedCalls={false}
          failedCount={0}
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
        <CallLogsTableSkeleton />
      </div>
    );
  }

  if (!authed) return <></>;

  // Check if any selected calls have "failed" status and count them
  const failedCallIds = Array.from(selected).filter(id => {
    const call = items.find(i => i.id === id);
    return call && call.status.toLowerCase() === "failed";
  });
  const hasFailedCalls = failedCallIds.length > 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 p-6">
      {/* Header */}
      <CallLogsHeader
        search={search}
        onSearchChange={setSearch}
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
{initialLoading ? (
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
        totalFilteredCount={filtered.length}
      />
)}


      {/* Pagination */}
      <Pagination
        currentPage={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />

      {/* Modal */}
      <CallLogModal
        id={openId}
        open={!!openId}
        onOpenChange={(open) => !open && setOpenId(undefined)}
      />
    </div>
  );
}
