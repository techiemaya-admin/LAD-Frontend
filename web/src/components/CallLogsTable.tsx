import React, { useMemo, useCallback } from "react";
import { PhoneIncoming, PhoneOutgoing, StopCircle, ChevronDown, ChevronRight, Download, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { logger } from "@/lib/logger";
import { useRef, useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { categorizeLead, getTagConfig, normalizeLeadCategory, type LeadTag } from "@/utils/leadCategorization";
import { sortCallLogs, toggleSortDirection, type SortConfig } from "@/utils/sortingUtils";
import { generateRecordingFilename, downloadRecording } from "@/utils/recordingDownload";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table';

interface CallLog {
  id: string;
  assistant?: string;
  lead_name?: string;
  type: string;
  status: string;
  startedAt?: string;
  duration?: number;
  cost?: number;
  call_cost?: number;
  batch_id?: string;
  lead_category?: string;
  signed_recording_url?: string;
  recording_url?: string;
  call_recording_url?: string;
  tag?: LeadTag;
}

interface CallLogsTableProps {
  items: CallLog[];
  selectedCalls: Set<string>;
  onSelectCall: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onRowClick: (id: string) => void;
  onEndCall: (id: string) => void;
  batchGroups?: { groups: Record<string, CallLog[]>; noBatchCalls: CallLog[] };
  expandedBatches?: Set<string>;
  onToggleBatch?: (batchId: string) => void;
  totalFilteredCount?: number;
  onSortChange?: (sortConfig: SortConfig | null) => void;
}

const columnHelper = createColumnHelper<CallLog>();

export function CallLogsTable({
  items,
  selectedCalls,
  onSelectCall,
  onSelectAll,
  onRowClick,
  onEndCall,
  batchGroups,
  expandedBatches = new Set(),
  onToggleBatch,
  totalFilteredCount = 0,
  onSortChange,
}: CallLogsTableProps) {
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [downloadErrors, setDownloadErrors] = useState<Map<string, string>>(new Map());

  // Get lead tag for categorization
  const getLeadTag = useCallback((item: CallLog): LeadTag => {
    // Prioritize API-provided lead_category and normalize it
    if (item.lead_category) {
      const normalized = normalizeLeadCategory(item.lead_category);
      if (normalized) {
        return normalized;
      }
    }
    // Return unknown if no lead_category found in API
    return "unknown";
  }, []);
  // Handle recording download with error handling
  const handleDownloadRecording = useCallback(
    async (callId: string, leadName?: string, startedAt?: string) => {
      const item = items.find(i => i.id === callId);
      if (!item) return;

      const recordingUrl = item.signed_recording_url || item.recording_url || item.call_recording_url;
      if (!recordingUrl) {
        setDownloadErrors(prev => new Map(prev).set(callId, "No recording available"));
        return;
      }

      setDownloadingIds(prev => new Set(prev).add(callId));
      setDownloadErrors(prev => {
        const next = new Map(prev);
        next.delete(callId);
        return next;
      });

      try {
        const filename = generateRecordingFilename(leadName, startedAt);
        await downloadRecording(recordingUrl, filename, (error) => {
          setDownloadErrors(prev => new Map(prev).set(callId, error.message));
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Download failed";
        setDownloadErrors(prev => new Map(prev).set(callId, message));
      } finally {
        setDownloadingIds(prev => {
          const next = new Set(prev);
          next.delete(callId);
          return next;
        });
      }
    },
    [items]
  );

  // Helper function to clean lead names from placeholder text
  const cleanLeadName = (leadName?: string): string => {
    if (!leadName || !leadName.trim()) return "—";
    
    const cleaned = leadName.trim();
    const placeholders = [
      'optional name',
      'optional',
      '(optional)',
      'lead name (optional)',
      'enter name',
      'name here',
    ];
    
    const lowerName = cleaned.toLowerCase();
    // Check if the entire name is a placeholder
    if (placeholders.some(p => lowerName === p || lowerName.includes(`(${p}`) || lowerName.includes(`${p})`))) {
      return "—";
    }
    
    return cleaned;
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleString();
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  // Add computed tag to items
  const itemsWithTags = useMemo(() => items.map(item => ({
    ...item,
    tag: getLeadTag(item),
  })), [items, getLeadTag]);

  // Define table columns
  const columns = React.useMemo<ColumnDef<CallLog, any>[]>(() => [
    columnHelper.display({
      id: 'select',
      header: ({ table }) => (
        <input
          ref={headerCheckboxRef}
          type="checkbox"
          checked={table.getIsAllRowsSelected()}
          onChange={(e) => {
            e.stopPropagation();
            onSelectAll(!table.getIsAllRowsSelected());
          }}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50 cursor-pointer"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={selectedCalls.has(row.original.id)}
          onChange={(e) => {
            e.stopPropagation();
            onSelectCall(row.original.id);
          }}
          className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50 cursor-pointer"
        />
      ),
    }),
    columnHelper.accessor('id', {
      id: 'id',
      header: 'Call ID',
      cell: ({ getValue }) => (
        <span className="font-mono text-sm text-muted-foreground truncate max-w-[120px]">
          {getValue().slice(0, 8)}...
        </span>
      ),
    }),
    columnHelper.accessor('assistant', {
      id: 'assistant',
      header: 'Agent',
      cell: ({ getValue }) => <span className="font-medium">{getValue() || "—"}</span>,
    }),
    columnHelper.accessor('lead_name', {
      id: 'lead_name',
      header: 'Lead',
      cell: ({ getValue }) => <span className="text-muted-foreground">{cleanLeadName(getValue())}</span>,
    }),
    columnHelper.accessor('type', {
      id: 'type',
      header: 'Type',
      cell: ({ getValue }) => {
        const type = getValue();
        return (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              type === "Outbound"
                ? "bg-warning/15 text-warning border border-warning/30"
                : "bg-primary/15 text-primary border border-primary/30"
            }`}
          >
            {type === "Outbound" ? (
              <PhoneOutgoing className="w-3.5 h-3.5" />
            ) : (
              <PhoneIncoming className="w-3.5 h-3.5" />
            )}
            {type}
          </span>
        );
      },
    }),
    columnHelper.accessor('status', {
      id: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    }),
    columnHelper.accessor('startedAt', {
      id: 'startedAt',
      header: 'Started',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{formatDateTime(getValue())}</span>
      ),
    }),
    columnHelper.accessor('duration', {
      id: 'duration',
      header: 'Duration',
      cell: ({ getValue }) => <span className="font-mono text-sm">{formatDuration(getValue())}</span>,
    }),
    columnHelper.accessor('tag', {
      id: 'tag',
      header: 'Tags',
      cell: ({ row }) => {
        const tag = getLeadTag(row.original);
        const tagConfig = getTagConfig(tag);
        return (
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${tagConfig.bgColor} ${tagConfig.textColor} border ${tagConfig.borderColor}`}
            title={`${tagConfig.label} priority lead`}
          >
            {tagConfig.label}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'cost',
      header: 'Cost',
      cell: ({ row }) => {
        const cost = row.original.cost || row.original.call_cost;
        return (
          <span className="font-mono text-sm">
            {cost ? `$${Number(cost).toFixed(2)}` : "—"}
          </span>
        );
      },
    }),
    columnHelper.display({
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div onClick={(e) => e.stopPropagation()} className="flex gap-2 items-center">
            {item.status?.toLowerCase().includes("ongoing") && (
              <button
                onClick={() => onEndCall(item.id)}
                className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
                title="End Call"
              >
                <StopCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        );
      },
    }),
  ], [selectedCalls, onSelectCall, onSelectAll, onEndCall, getLeadTag]);

  // Setup table instance
  const table = useReactTable({
    data: itemsWithTags,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onPaginationChange: setPagination,
    state: {
      sorting,
      columnFilters,
      pagination,
    },                                           
  });
                                                                                                                                                                                                                                                                                                                                                                                        
  // Render batch header row                                                                                                                                                                                                                                                                                      
  const renderBatchHeader = (batchId: string, calls: CallLog[]) => {
    const isExpanded = expandedBatches.has(batchId);                                                                          
    const totalCalls = calls.length;
    const completedCalls = calls.filter(c => c.status?.toLowerCase() === 'completed' || c.status?.toLowerCase() === 'ended').length;
    const totalCost = calls.reduce((sum, call) => {
      const cost = Number(call.cost || call.call_cost || 0);
      return sum + (isNaN(cost) ? 0 : cost);
    }, 0);

    return (
      <TableRow
        key={`batch-${batchId}`}
        onClick={() => onToggleBatch?.(batchId)}
        className="bg-[#F8FAFC] hover:bg-[#F1F5F9] cursor-pointer border-b-2 border-[#E2E8F0] transition-colors"
      >
        <TableCell colSpan={columns.length} className="py-4">
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="w-5 h-5 text-primary" />
            ) : (
              <ChevronRight className="w-5 h-5 text-primary" />
            )}
            <div className="flex-1 flex items-center gap-6">
              <div>
                <span className="font-semibold text-foreground">Batch:</span>
                <span className="ml-2 font-mono text-sm text-muted-foreground">
                  {batchId.slice(0, 8)}...
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{totalCalls}</span> calls
                </span>
                <span className="text-muted-foreground">
                  <span className="font-semibold text-foreground">{completedCalls}</span> completed
                </span>
                <span className="text-muted-foreground">
                  Total: <span className="font-semibold text-foreground">${totalCost.toFixed(2)}</span>
                </span>
              </div>
            </div>
          </div>
        </TableCell>
      </TableRow>
    );
  };

  // Render individual call row with optional indent for batch calls
  const renderCallRow = (callLog: CallLog, indent = false) => {
    // Find the row in the table data
    const rowIndex = itemsWithTags.findIndex(item => item.id === callLog.id);
    if (rowIndex === -1) return null;

    const tableRow = table.getRowModel().rows[rowIndex];
    if (!tableRow) return null;

    return (
      <TableRow
        key={callLog.id}
        onClick={() => onRowClick(callLog.id)}
        className={`cursor-pointer hover:bg-gray-50 border-b border-[#E2E8F0] ${
          selectedCalls.has(callLog.id) ? "bg-primary/5" : ""
        } ${indent ? "bg-[#F8FAFC]" : ""}`}
      >
        {tableRow.getVisibleCells().map((cell, cellIndex) => (
          <TableCell 
            key={cell.id}
            onClick={(e) => {
              // Prevent row click for checkbox and actions columns
              if (cell.column.id === 'select' || cell.column.id === 'actions') {
                e.stopPropagation();
              }
            }}
            className={cellIndex === 0 && indent ? "pl-8" : ""}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-sm overflow-hidden">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              {headerGroup.headers.map((header) => (
                <TableHead
                  key={header.id}
                  className={`font-semibold text-[#1E293B] whitespace-nowrap ${
                    header.column.getCanSort() ? 'cursor-pointer select-none' : ''
                  }`}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {header.isPlaceholder ? null : (
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span>
                          {{
                            asc: <ArrowUp className="w-4 h-4 text-primary" />,
                            desc: <ArrowDown className="w-4 h-4 text-primary" />,
                          }[header.column.getIsSorted() as string] ?? (
                            <ArrowUpDown className="w-4 h-4 text-muted-foreground opacity-50" />
                          )}
                        </span>
                      )}
                    </div>
                  )}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {batchGroups ? (
            <>
              {/* Render batch groups */}
              {Object.entries(batchGroups.groups).map(([batchId, calls]) => (
                <React.Fragment key={`batch-group-${batchId}`}>
                  {renderBatchHeader(batchId, calls)}
                  {expandedBatches.has(batchId) &&
                    calls.map((call) => renderCallRow(call, true))}
                </React.Fragment>
              ))}
              
              {/* Render non-batch calls */}
              {batchGroups.noBatchCalls.length > 0 && (
                <>
                  {Object.keys(batchGroups.groups).length > 0 && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={columns.length} className="py-3 text-sm font-semibold text-muted-foreground">
                        Individual Calls
                      </TableCell>
                    </TableRow>
                  )}
                  {batchGroups.noBatchCalls.map((call) => renderCallRow(call, false))}
                </>
              )}
            </>
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
  <TableCell
    colSpan={columns.length}
    className="text-center py-8 text-[#64748B]"
  >
    No call logs found
  </TableCell>
</TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick(row.original.id)}
                className={`cursor-pointer hover:bg-gray-50 border-b border-[#E2E8F0] ${
                  selectedCalls.has(row.original.id) ? "bg-primary/5" : ""
                }`}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell 
                    key={cell.id}
                    onClick={(e) => {
                      // Prevent row click for checkbox and actions columns
                      if (cell.column.id === 'select' || cell.column.id === 'actions') {
                        e.stopPropagation();
                      }
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {/* Pagination Controls – same as CampaignsTable */}
{table.getRowModel().rows.length > 0 && (
  <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
    <div className="flex items-center gap-2 text-sm text-[#64748B]">
      <span>Show</span>
      <select
        value={table.getState().pagination?.pageSize ?? 10}
        onChange={(e) => table.setPageSize(Number(e.target.value))}
        className="border border-[#E2E8F0] rounded px-2 py-1 text-sm"
      >
        {[5, 10, 20, 50].map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <span>
        of {totalFilteredCount || table.getFilteredRowModel().rows.length} calls
      </span>
    </div>

    <div className="flex items-center gap-2">
      <div className="text-sm text-[#64748B]">
        Page {table.getState().pagination?.pageIndex + 1 || 1} of{" "}
        {table.getPageCount()}
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={() => table.setPageIndex(0)}
          disabled={!table.getCanPreviousPage()}
          className="h-8 w-8 border rounded disabled:opacity-50"
        >
          «
        </button>
        <button
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          className="h-8 w-8 border rounded disabled:opacity-50"
        >
          ‹
        </button>
        <button
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          className="h-8 w-8 border rounded disabled:opacity-50"
        >
          ›
        </button>
        <button
          onClick={() => table.setPageIndex(table.getPageCount() - 1)}
          disabled={!table.getCanNextPage()}
          className="h-8 w-8 border rounded disabled:opacity-50"
        >
          »
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
