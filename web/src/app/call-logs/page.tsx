"use client";

export const dynamic = 'force-dynamic';


import { useEffect, useState, useRef, useMemo } from "react";
import { io } from "socket.io-client";
import { apiGet } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { useRouter, useSearchParams } from "next/navigation";

import { CallLogsHeader } from "@/components/CallLogsHeader";
import { CallLogsTable } from "@/components/CallLogsTable";
import { Pagination } from "@/components/Pagination";
import { CallLogModal } from "@/components/call-log-modal";

interface CallLogResponse {
  id: string;
  agent_name: string;
  lead_name: string;
  call_type: "inbound" | "outbound";
  status: string;
  started_at: string;
  call_duration: number;
  call_cost?: number;
  cost?: number;
  batch_status?: string;
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
    }>
  >([]);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openId, setOpenId] = useState<string | undefined>();

  // Filters
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("All");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [batchJobId, setBatchJobId] = useState<string | null>(null);

  const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3004";
  const socket = useRef(io(socketUrl, { transports: ["websocket"] })).current;

  // Pagination
  const [page, setPage] = useState(1);
  const perPage = 10;

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
    const jobId = searchParams.get("jobId");
    const mode = searchParams.get("mode");

    if (jobId) {
      setBatchJobId(jobId);
      if (mode === "current-batch") {
        setTimeFilter("batch");
      }
    }
  }, [searchParams]);

  // ----------------------
  // LOAD CALLS (ORG handled in backend using JWT)
  // ----------------------
  const load = async () => {
    try {
      // Batch View
      if (timeFilter === "batch" && batchJobId) {
        const res = await apiGet<BatchApiResponse>(`/api/voice-agent/batch/batch-status/${batchJobId}`);
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
        }));

        setItems(logs);
        return;
      }

      // Normal mode — backend auto-filters by org based on JWT
      const res = await apiGet<CallLogsResponse>(`/api/voice-agent/calls?limit=100`);

      const logs = (res.logs || []).map((r) => ({
        id: String(r.id || ''),
        assistant: r.agent_name || '',
        lead_name: r.lead_name || '',
        type: r.call_type === "inbound" ? "Inbound" : "Outbound",
        status: r.status || '',
        startedAt: r.started_at,
        duration: r.call_duration || 0,
        cost: r.call_cost ?? r.cost ?? 0,
        batch_status: r.batch_status,
      }));

      setItems(logs);
    } catch (error) {
      console.error("Failed to load call logs:", error);
      setItems([]);
    }
  };

  useEffect(() => {
    load(); // initial + whenever filter/batch changes

    socket.on("calllogs:update", () => {
      console.log("📢 Received calllogs:update");
      load();
    });

    return () => {
      socket.off("calllogs:update");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeFilter, batchJobId]);

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
        if (i.batch_status) {
          // For batch calls: running = current
          matchTime = i.batch_status.toLowerCase() === "running";
        } else if (i.startedAt) {
          // Non-batch: last 24 hours
          const dt = new Date(i.startedAt).getTime();
          matchTime = now - dt < 24 * 60 * 60 * 1000;
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
        // Batch mode: backend already limited to that job_id; show all
        matchTime = true;
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
      setSelected(new Set(filtered.map((i) => i.id)));
    } else {
      setSelected(new Set());
    }
  };

  // Stubbed end-call actions (wire to your API if needed)
  async function endSingleCall(id: string) {
    alert("Ending call " + id);
    await load();
  }

  async function endSelectedCalls() {
    alert("Ending " + selected.size + " calls");
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
      <div className="min-h-[40vh] flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!authed) return <></>;

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
      />

      {/* Table */}
      <CallLogsTable
        items={paginated}
        selectedCalls={selected}
        onSelectCall={handleSelectCall}
        onSelectAll={handleSelectAll}
        onRowClick={(id) => setOpenId(id)}
        onEndCall={endSingleCall}
      />

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
