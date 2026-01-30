"use client";

import { useEffect, useState, useRef, useMemo } from "react";
import { io } from "socket.io-client";
import { apiGet, apiPost } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { logger } from "@/lib/logger";
import type { SortConfig } from "@/utils/sortingUtils";

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
    lead_category?: string;
    signed_recording_url?: string;
    recording_url?: string;
    call_recording_url?: string;
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

export default function CallLogsContent() {
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
            lead_category?: string;
            signed_recording_url?: string;
            recording_url?: string;
            call_recording_url?: string;
        }>
    >([]);

    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [openId, setOpenId] = useState<string | undefined>();
    const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set());
    const [initialLoading, setInitialLoading] = useState(true);
    const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

    // Filters
    const [search, setSearch] = useState("");
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

    // Initialize batchJobId + mode from query params
    useEffect(() => {
        if (!searchParams) return;

        const jobId = searchParams.get("jobId");
        const mode = searchParams.get("mode");

        if (jobId) {
            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobId);
            const isBatchFormat = /^batch-[0-9a-f]{32}$/i.test(jobId);

            if (isUUID || isBatchFormat) {
                setBatchJobId(jobId);
                if (mode === "current-batch") {
                    setTimeFilter("batch");
                }
            } else {
                router.replace('/call-logs');
            }
        }
    }, [searchParams, router]);

    // ----------------------
    // LOAD CALLS
    // ----------------------

    const load = async () => {
        try {
            if (timeFilter === "batch" && batchJobId) {
                try {
                    const url = `/api/voice-agent/batch/batch-status/${batchJobId}`;
                    const res = await apiGet<BatchApiResponse>(url);
                    const batch = res.batch || res.result;

                    if (!batch) {
                        setItems([]);
                        return;
                    }

                    const batchStatus = batch.status || "";
                    const results = batch.results || [];

                    const logs = results.map((r, idx) => ({
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

                    setItems(logs);
                    return;
                } catch (error) {
                    logger.error('[Call Logs] Failed to load batch status', error);
                    setBatchJobId(null);
                    setTimeFilter("all");
                    router.replace('/call-logs');
                }
            }

            const { from, to } = resolveDateRange();
            const query = new URLSearchParams({
                ...(from && { from_date: from }),
                ...(to && { to_date: to }),
            });

            const res = await apiGet<CallLogsResponse>(`/api/voice-agent/calls?${query.toString()}`);

            const logs = (res.logs || []).map((r) => {
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
                    lead_category: r.lead_category,
                    signed_recording_url: r.signed_recording_url,
                    recording_url: r.recording_url,
                    call_recording_url: r.call_recording_url,
                };
            });

            setItems(logs);
        } catch (error) {
            logger.error('Failed to load call logs', error);
            setItems([]);
        } finally {
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        load();

        socket.on("connect_error", () => { });
        socket.on("calllogs:update", () => {
            load();
        });

        return () => {
            socket.off("calllogs:update");
            socket.off("connect_error");
        };
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
                if (i.batch_id) {
                    const status = i.status?.toLowerCase() || '';
                    matchTime = ['running', 'pending', 'queued', 'ongoing', 'calling', 'in_progress'].includes(status);
                } else {
                    matchTime = false;
                }
            } else if (timeFilter === "previous") {
                if (i.batch_status) {
                    matchTime = i.batch_status.toLowerCase() !== "running";
                } else if (i.startedAt) {
                    const dt = new Date(i.startedAt).getTime();
                    matchTime = now - dt > 24 * 60 * 60 * 1000;
                }
            } else if (timeFilter === "batch") {
                if (batchJobId) {
                    matchTime = !!i.batch_id && i.batch_id === batchJobId;
                } else {
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

    const sortedFiltered = useMemo(() => {
        if (!sortConfig) return filtered;
        const { sortCallLogs } = require("@/utils/sortingUtils");
        return sortCallLogs(filtered, sortConfig);
    }, [filtered, sortConfig]);

    const totalPages = Math.ceil(sortedFiltered.length / perPage) || 1;
    const paginated = sortedFiltered.slice((page - 1) * perPage, page * perPage);

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

        return { groups, noBatchCalls };
    }, [paginated]);

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

    const handleSelectCall = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const allCallIds = filtered.map((i) => i.id);
            setSelected(new Set(allCallIds));
        } else {
            setSelected(new Set());
        }
    };

    const handleRowClick = (id: string) => {
        const call = items.find(i => i.id === id);
        const status = call?.status.toLowerCase() || '';
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

    async function endSingleCall(callId: string) {
        try {
            await apiPost(`/api/voice-agent/calls/${callId}/end`, {});
            await load();
        } catch (error) {
            logger.error('Error ending call', error);
            alert("Failed to end call. Please try again.");
        }
    }

    async function retrySelectedCalls() {
        const failedCallIds = Array.from(selected);
        alert("Retrying " + failedCallIds.length + " failed calls");
        await load();
        setSelected(new Set());
    }

    if (authed === null) {
        return (
            <div className="max-w-7xl mx-auto space-y-8 p-6">
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

    const failedCallIds = Array.from(selected).filter(id => {
        const call = items.find(i => i.id === id);
        return call && call.status.toLowerCase() === "failed";
    });
    const hasFailedCalls = failedCallIds.length > 0;

    return (
        <div className="max-w-7xl mx-auto space-y-8 p-6">
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
                    totalFilteredCount={sortedFiltered.length}
                    onSortChange={(newSort) => {
                        setSortConfig(newSort);
                        setPage(1);
                    }}
                />
            )}

            <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
            />

            <CallLogModal
                id={openId}
                open={!!openId}
                onOpenChange={(open) => !open && setOpenId(undefined)}
            />
        </div>
    );
}
