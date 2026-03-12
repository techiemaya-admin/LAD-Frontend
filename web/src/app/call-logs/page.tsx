"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { getCurrentUser } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { logger } from "@/lib/logger";
import type { SortConfig } from "@/utils/sortingUtils";

// SDK Imports
import {
  useCallLogs,
  useBatchStatus,
  useBatchView,
  useBatchCallLogsByBatchId,
  useEndCall,
  useRetryFailedCalls,
  useCallLogsStats,
  useBatchStats,
  type CallLog,
  type BatchPayload,
  type VoiceAgentBatch,
  type BatchStats,
} from "@lad/frontend-features/call-logs";

import { CallLogsTable } from "@/components/CallLogsTable";
import { Pagination } from "@/components/Pagination";
import { CallLogModal } from "@/components/call-log-modal";
import { CallLogsTableSkeleton } from "@/components/CallLogsTableSkeleton";
import CallLogsStatsCards from "@/components/call-logs/CallLogsStatsCards";
import { ScrollText } from "lucide-react";

type TimeFilter = "all" | "current" | "previous" | "batch";

export default function CallLogsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [tenantId, setTenantId] = useState<string>("");

  const [items, setItems] = useState<CallLog[]>([]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | undefined>();
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(
    new Set(),
  );
  const [initialLoading, setInitialLoading] = useState(true);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // Filters
  const [providerFilter, setProviderFilter] = useState("All");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);

  const sseAbortRef = useRef<AbortController | null>(null);

  // Pagination
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  // Date filter
  type DateFilter = "today" | "month" | "custom" | "all";
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [fromDate, setFromDate] = useState<string | null>(null);
  const [toDate, setToDate] = useState<string | null>(null);

  const [leadTagFilter, setLeadTagFilter] = useState<
    "hot" | "warm" | "cold" | null
  >(null);

  // Status filter state
  const [statusFilter, setStatusFilter] = useState<
    "ended" | "failed" | "ongoing" | "queue" | null
  >(null);

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
      page: page,
      limit: perPage,
      status: statusFilter === "queue" ? "in_queue" : statusFilter || undefined,
      lead_tag: leadTagFilter || undefined,
    },
    timeFilter !== "batch" || !!batchJobId
  );

  const callLogsStatsQuery = useCallLogsStats(tenantId, !!tenantId);
  logger.debug("[Call Logs Page] Call logs stats query data", callLogsStatsQuery.data);
  const batchStatusQuery = useBatchStatus(batchJobId);
  const batchViewQuery = useBatchView(
    { page, limit: perPage },
    timeFilter === "batch" && !batchJobId
  );
  const batchStatsQuery = useBatchStats(timeFilter === "batch" && !batchJobId);
  const batchCallLogsQuery = useBatchCallLogsByBatchId(
    selectedBatchId,
    timeFilter === "batch" && !!selectedBatchId && !batchJobId,
  );
  const endCallMutation = useEndCall();
  const retryCallsMutation = useRetryFailedCalls();

  // Get tenant_id from current user
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user: any = await getCurrentUser();
        const userTenantId = user?.user?.tenantId
        if (userTenantId) {
          setTenantId(userTenantId);
        }
      } catch (error) {
        logger.error("[Call Logs] Failed to get user tenant_id", error);
      }
    };
    fetchUser();
  }, []);

  // Debug logging for query states
  // useEffect(() => {

  // }, [callLogsQuery.isLoading, callLogsQuery.isFetching, callLogsQuery.isError, callLogsQuery.isSuccess, callLogsQuery.data, authed, dateRange]);

  // Initialize batchJobId + mode from query params
  useEffect(() => {
    if (!searchParams) return;

    const jobId = searchParams.get("jobId");
    const mode = searchParams.get("mode");

    logger.debug("[Call Logs] Query params detected", { jobId, mode });

    if (jobId) {
      const isUUID =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          jobId,
        );
      const isBatchFormat = /^batch-[0-9a-f]{32}$/i.test(jobId);

      logger.debug("[Call Logs] Batch ID validation", {
        isUUID,
        isBatchFormat,
      });

      if (isUUID || isBatchFormat) {
        logger.debug("[Call Logs] Setting batchJobId", { jobId });
        setBatchJobId(jobId);
        setSelectedBatchId(null);
        if (mode === "current-batch") {
          logger.debug("[Call Logs] Setting timeFilter to batch");
          setTimeFilter("batch");
        }
      } else {
        logger.warn("[Call Logs] Invalid batch ID format", { jobId });
        router.replace("/call-logs");
      }
    }
  }, [searchParams, router]);

  // ----------------------
  // PROCESS SDK DATA
  // ----------------------
  useEffect(() => {
    // Handle batch view
    if (timeFilter === "batch" && batchJobId && batchStatusQuery.data) {
      logger.debug("[Call Logs] Processing batch data", { batchJobId });

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

      logger.debug("[Call Logs] Setting batch items", { count: logs.length });
      setItems(logs);
      setInitialLoading(false);
      return;
    }

    // Handle call logs for selected batch (new endpoint) - MUST RUN BEFORE batchViewQuery block
    if (
      timeFilter === "batch" &&
      !batchJobId &&
      selectedBatchId &&
      batchCallLogsQuery.data
    ) {
      const payload =
        (batchCallLogsQuery.data as any)?.data ||
        (batchCallLogsQuery.data as any)?.result ||
        batchCallLogsQuery.data;

      const rawLogs = Array.isArray(payload)
        ? payload
        : (payload as any)?.call_logs ||
        (payload as any)?.logs ||
        (batchCallLogsQuery.data as any)?.call_logs ||
        (batchCallLogsQuery.data as any)?.logs ||
        [];

      const logs: CallLog[] = (rawLogs || []).map((r: any) => {
        const leadName =
          [r.lead_first_name, r.lead_last_name].filter(Boolean).join(" ") ||
          r.lead_name ||
          "";

        const leadCategory =
          r.lead_category ||
          r.analysis?.raw_analysis?.lead_score_full?.lead_category;

        return {
          id: String(r.call_log_id || r.id || ""),
          assistant: r.agent_name || "",
          lead_id: r.lead_id,
          lead_name: leadName,
          type: r.direction === "inbound" ? "Inbound" : "Outbound",
          status: r.status || "",
          metadata: r.metadata ?? r.meta_data ?? r.meta,
          startedAt: r.started_at,
          duration: r.duration_seconds || r.call_duration || 0,
          cost: r.cost ?? r.call_cost ?? 0,
          batch_status: r.batch_status,
          batch_id: r.batch_id || selectedBatchId,
          lead_category: leadCategory,
          lead_tags: r.lead_tags,
          signed_recording_url: r.signed_recording_url,
          recording_url: r.recording_url,
          call_recording_url: r.call_recording_url,
        };
      });

      setItems((prev) => {
        const existing = prev || [];
        const kept = existing.filter((i) => {
          if (i.batch_id !== selectedBatchId) return true;
          return (i as any)?.is_batch_header;
        });
        return [...kept, ...logs];
      });
      logger.debug("[Call Logs] Merged batch call logs into items", {
        selectedBatchId,
        fetchedCount: logs.length,
      });
      setExpandedBatches(new Set([selectedBatchId]));
      setInitialLoading(false);
      // We don't return here so batchViewQuery block can also run if needed
    }

    // Handle batch list view (no jobId deep-link)
    if (timeFilter === "batch" && !batchJobId && batchViewQuery.data) {
      const payload =
        (batchViewQuery.data as any)?.data ||
        (batchViewQuery.data as any)?.result ||
        (batchViewQuery.data as any)?.batches ||
        batchViewQuery.data;

      const batches: VoiceAgentBatch[] = Array.isArray(payload) ? payload : [];

      const batchHeaders: CallLog[] = batches.map((b) => ({
        id: b.id,
        assistant: "",
        lead_name: `Batch (${b.total_calls || 0} calls)`,
        type: "Outbound",
        status: b.status || "",
        startedAt: b.started_at || b.created_at || "",
        duration: 0,
        cost: 0,
        batch_id: b.id,
        batch_status: b.status,
        is_batch_header: true,
        batch_total_calls: b.total_calls || 0,
        batch_completed_calls: b.completed_calls || 0,
        batch_failed_calls: b.failed_calls || 0,
        attachments: b.attachments,
        attachment_file_name: b.attachment_file_name,
        attachment_signed_url: b.attachment_signed_url,
      }));

      setItems((prev) => {
        const existingDetailCalls = (prev || []).filter((i) => !(i as any)?.is_batch_header);
        return [...batchHeaders, ...existingDetailCalls];
      });
      setInitialLoading(false);
      return;
    }

    // Handle normal call logs (including status / lead_tag filtering via /calls)
    if (timeFilter !== "batch" && !batchJobId && callLogsQuery.isSuccess && callLogsQuery.data) {
      logger.debug("[Call Logs] Processing normal call logs", {
        rawData: callLogsQuery.data,
        logsCount: callLogsQuery.data.logs?.length,
      });

      const logs: CallLog[] = (callLogsQuery.data.logs || []).map((r) => {
        const leadName =
          [r.lead_first_name, r.lead_last_name].filter(Boolean).join(" ") || "";

        const leadCategory =
          r.lead_category ||
          r.analysis?.raw_analysis?.lead_score_full?.lead_category;

        return {
          id: String(r.call_log_id || r.id || ""),
          assistant: r.agent_name || "",
          lead_id: r.lead_id,
          lead_name: leadName,
          type: r.direction === "inbound" ? "Inbound" : "Outbound",
          status: r.status || "",
          metadata: (r as any).metadata ?? (r as any).meta_data ?? (r as any).meta,
          startedAt: r.started_at,
          duration: r.duration_seconds || r.call_duration || 0,
          cost: r.cost ?? r.call_cost ?? 0,
          batch_status: r.batch_status,
          batch_id: r.batch_id,
          lead_category: leadCategory,
          lead_tags: r.lead_tags,
          signed_recording_url: r.signed_recording_url,
          recording_url: r.recording_url,
          call_recording_url: r.call_recording_url,
        };
      });

      logger.debug("[Call Logs] Loaded call logs with count:", {
        total: logs.length,
        withBatchId: logs.filter((l) => l.batch_id).length,
        sample: logs.slice(0, 3),
      });

      setItems(logs);
      setInitialLoading(false);
    }

    // Handle errors
    if (batchStatusQuery.isError && timeFilter === "batch" && batchJobId) {
      logger.error(
        "[Call Logs] Failed to load batch status",
        batchStatusQuery.error,
      );
      setBatchJobId(null);
      setTimeFilter("all");
      router.replace("/call-logs");
    }

    if (batchViewQuery.isError && timeFilter === "batch" && !batchJobId) {
      logger.error("[Call Logs] Failed to load batch view", batchViewQuery.error);
      setItems([]);
      setInitialLoading(false);
    }

    if (
      batchCallLogsQuery.isError &&
      timeFilter === "batch" &&
      !batchJobId &&
      selectedBatchId
    ) {
      logger.error(
        "[Call Logs] Failed to load call logs for batch",
        batchCallLogsQuery.error,
      );
      setSelectedBatchId(null);
    }
  }, [
    callLogsQuery.data,
    callLogsQuery.isSuccess,
    batchStatusQuery.data,
    batchStatusQuery.isError,
    batchStatusQuery.error,
    batchViewQuery.data,
    batchViewQuery.isError,
    batchViewQuery.error,
    batchCallLogsQuery.data,
    batchCallLogsQuery.isError,
    batchCallLogsQuery.error,
    timeFilter,
    batchJobId,
    selectedBatchId,
    router,
  ]);

  // ----------------------
  // SSE STREAM UPDATES
  // ----------------------
  const patchCallLogById = useCallback((event: any) => {
    const id = event.call_log_id as string | undefined;
    if (!id) return;

    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
            ...item,
            status: event.status ?? item.status,
            duration: event.duration_seconds ?? item.duration,
            cost: event.cost ?? item.cost,
            recording_url: event.recording_url ?? item.recording_url,
          }
          : item,
      ),
    );
  }, []);

  useEffect(() => {
    const startSSE = async () => {
      // Cancel any prior SSE connection
      sseAbortRef.current?.abort();
      const controller = new AbortController();
      sseAbortRef.current = controller;

      try {
        // Use the same-origin Next.js proxy so the browser automatically
        // attaches the httpOnly 'token' cookie. The proxy forwards it as
        // Authorization: Bearer to the backend.
        const response = await fetch("/api/voice-agent/calls/stream", {
          headers: {
            Accept: "text/event-stream",
            "Cache-Control": "no-cache",
          },
          credentials: "include",
          signal: controller.signal,
        });

        if (!response.ok || !response.body) return;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split("\n\n");
          buffer = parts.pop() ?? "";

          for (const part of parts) {
            const dataLine = part
              .split("\n")
              .find((l) => l.startsWith("data:"));
            if (!dataLine) continue;
            const raw = dataLine.slice(5).trim();
            if (!raw || raw === "[DONE]") continue;
            try {
              const event = JSON.parse(raw);
              patchCallLogById(event);
            } catch {
              // ignore malformed JSON
            }
          }
        }
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          logger.error("[Call Logs SSE] Stream error", err);
        }
      }
    };

    startSSE();

    return () => {
      sseAbortRef.current?.abort();
    };
  }, [patchCallLogById]);

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
          const status = i.status?.toLowerCase() || "";
          matchTime = [
            "running",
            "pending",
            "queued",
            "ongoing",
            "calling",
            "in_progress",
          ].includes(status);
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
    [items],
  );

  // Apply sorting to filtered results for consistent ordering across pages
  const sortedFiltered = useMemo(() => {
    if (!sortConfig) return filtered;
    const { sortCallLogs } = require("@/utils/sortingUtils");
    return sortCallLogs(filtered, sortConfig);
  }, [filtered, sortConfig]);

  // Server-side pagination - use backend data directly
  const paginated = sortedFiltered;

  // Use backend pagination metadata from the appropriate query
  const paginationData =
    timeFilter === "batch" && !batchJobId
      ? (batchViewQuery.data as any)
      : (callLogsQuery.data as any);

  const paginationMeta = paginationData?.pagination || {
    page: 1,
    limit: perPage,
    total: 0,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  };

  const totalPages = paginationMeta.totalPages || 1;
  const totalRecords = paginationMeta.total || 0;

  // Group calls by batch (from paginated items)
  const batchGroups = useMemo(() => {
    const groups: Record<string, typeof paginated> = {};
    const noBatchCalls: typeof paginated = [];

    paginated.forEach((call: (typeof paginated)[0]) => {
      if (call.batch_id) {
        if (!groups[call.batch_id]) {
          groups[call.batch_id] = [];
        }
        groups[call.batch_id].push(call);
      } else {
        noBatchCalls.push(call);
      }
    });

    logger.debug("[Call Logs] Batch grouping prepared", {
      totalCalls: paginated.length,
      batchGroups: Object.keys(groups).length,
      noBatchCalls: noBatchCalls.length,
      groups,
    });

    return { groups, noBatchCalls };
  }, [paginated]);

  const batchGroupsProp = useMemo(() => {
    if (timeFilter !== "batch" || batchJobId) return undefined;
    if (items.length === 0) return undefined;
    return batchGroups;
  }, [timeFilter, batchJobId, items.length, batchGroups]);

  // Toggle batch expansion
  const toggleBatch = (batchId: string) => {
    if (timeFilter === "batch" && !batchJobId) {
      setSelectedBatchId(batchId);
      setExpandedBatches((prev) => {
        const next = new Set(prev);
        if (next.has(batchId)) {
          next.delete(batchId);
        } else {
          next.add(batchId);
        }
        return next;
      });
      return;
    }

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
  const [selectAllMode, setSelectAllMode] = useState<'none' | 'page' | 'all'>('none');

  const handleSelectCall = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      // If selecting individual items, we're no longer in "select all" mode
      setSelectAllMode('none');
      return next;
    });
  };

  const handleSelectAll = (checked: boolean, visibleIds?: string[]) => {
    if (checked) {
      if (selectAllMode === 'page') {
        // Switch to selecting ALL calls across all pages
        const allIds = items.map((i: CallLog) => i.id);
        setSelected(new Set(allIds));
        setSelectAllMode('all');
      } else {
        // First click - select current page only
        const idsToSelect = visibleIds || paginated.map((i: CallLog) => i.id);
        setSelected(new Set(idsToSelect));
        setSelectAllMode('page');
      }
    } else {
      setSelected(new Set());
      setSelectAllMode('none');
    }
  };

  // ✅ Handle row click - prevent modal for active calls and failed calls
  const handleRowClick = (id: string) => {
    if (timeFilter === "batch" && !batchJobId) {
      // When in Batch View (new API), clicking a batch row loads its call logs.
      // If already viewing a batch's call logs, keep existing modal behavior.
      if (!selectedBatchId) {
        setSelectedBatchId(id);
        return;
      }
    }

    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        id,
      );
    if (!isUUID) return;

    const call = items.find((i) => i.id === id);
    const status = call?.status.toLowerCase() || "";

    // Don't open modal for calling, queue, ongoing, or failed calls
    if (
      ["calling", "queue", "queued", "ongoing", "in_queue", "failed"].includes(
        status,
      )
    ) {
      return;
    }

    setOpenId(id);
  };

  // End selected calls
  async function endSelectedCalls() {
    alert("Ending " + selected.size + " calls");
    // TODO: Implement bulk end API
    // await callLogsQuery.refetch();
    setSelected(new Set());
  }

  // End a single call using SDK
  async function endSingleCall(callId: string) {
    try {
      await endCallMutation.mutateAsync({ callId });
    } catch (error) {
      logger.error("Error ending call", error);
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
      logger.error("Error retrying calls", error);
      alert("Failed to retry calls. Please try again.");
    }
  }


  // Check if any selected calls have "failed" status and count them
  const failedCallIds = Array.from(selected).filter((id) => {
    const call = items.find((i) => i.id === id);
    return call && call.status.toLowerCase() === "failed";
  });
  const hasFailedCalls = failedCallIds.length > 0;

  // Show loading state in table body during fetch
  const isTableLoading =
    callLogsQuery.isLoading ||
    callLogsQuery.isFetching ||
    batchStatusQuery.isLoading ||
    batchStatusQuery.isFetching ||
    batchViewQuery.isLoading ||
    batchViewQuery.isFetching ||
    batchCallLogsQuery.isLoading ||
    batchCallLogsQuery.isFetching ||
    initialLoading;
  const { stats } = (callLogsStatsQuery?.data as any) || {};
  return (
    <div className="p-3 bg-[#F8F9FE] h-full overflow-auto">
      {/* Header */}
      <div className="mb-5 flex flex-col sm:flex-row justify-between mt-10 items-stretch sm:items-center gap-2 sm:gap-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ScrollText className="w-6 h-6 text-[#1E293B]" />
            <h1 className="text-2xl sm:text-4xl font-bold text-[#1E293B]">
              Call Logs
            </h1>
          </div>
          <p className="text-sm text-[#64748B] ml-2">
            View and manage your call history
          </p>
        </div>
        {selected.size > 0 && (
          <div className="flex gap-2 items-center">
            {selectAllMode === 'all' && (
              <span className="text-sm text-primary font-medium mr-2">
                All {totalRecords} calls selected
              </span>
            )}
            {hasFailedCalls && (
              <button
                onClick={retrySelectedCalls}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105"
              >
                Retry Failed ({failedCallIds.length})
              </button>
            )}
            <button
              onClick={endSelectedCalls}
              className="px-5 py-2.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105"
            >
              End Selected ({selected.size})
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <CallLogsStatsCards
        stats={
          stats || {
            total_calls: 0,
            completed_calls: 0,
            failed_calls: 0,
            ongoing: 0,
            queue: 0,
            hot_leads: 0,
            warm_leads: 0,
            cold_leads: 0,
          }
        }
        loading={callLogsStatsQuery.isLoading}
        selectedLeadTag={leadTagFilter}
        onLeadTagChange={(tag) => {
          setLeadTagFilter(tag);
          setPage(1);
        }}
        selectedStatus={statusFilter}
        onStatusChange={(status) => {
          setStatusFilter(status);
          setPage(1);
        }}
      />

      {/* Table */}
      <CallLogsTable
        items={paginated}
        selectedCalls={selected}
        onSelectCall={handleSelectCall}
        onSelectAll={handleSelectAll}
        selectAllMode={selectAllMode}
        onRowClick={handleRowClick}
        onEndCall={endSingleCall}
        leadTagFilter={leadTagFilter}
        batchGroups={batchGroupsProp}
        expandedBatches={expandedBatches}
        onToggleBatch={toggleBatch}
        totalFilteredCount={sortedFiltered.length}
        onSortChange={(newSort: SortConfig | null) => {
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
        isLoading={isTableLoading}
        batchStats={batchStatsQuery.data}
        // Backend pagination props
        currentPage={page}
        perPage={perPage}
        totalPages={totalPages}
        totalRecords={totalRecords}
        onPageChange={(newPage) => {
          logger.debug('[Pagination] Page change requested', { from: page, to: newPage });
          setPage(newPage);
        }}
        hasNextPage={paginationMeta.hasNextPage}
        hasPreviousPage={paginationMeta.hasPreviousPage}
        onPageSizeChange={(newSize) => {
          logger.debug('[Pagination] Page size change requested', { from: perPage, to: newSize });
          setPerPage(newSize);
        }}
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
