import React, { useMemo, useCallback } from "react";
import { 
  PhoneIncoming, 
  PhoneOutgoing, 
  StopCircle, 
  ChevronDown, 
  ChevronRight, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Search, 
  Phone, 
  ChevronsLeft, 
  ChevronLeft, 
  ChevronsRight, 
  Plus,
  ChevronRight as ChevronRightIcon
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getTagConfig, normalizeLeadCategory, type LeadTag } from "@/utils/leadCategorization";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
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
  dateFilter?: string;
  onDateFilterChange?: (value: string) => void;
  fromDate?: string | null;
  toDate?: string | null;
  onFromDateChange?: (value: string) => void;
  onToDateChange?: (value: string) => void;
  callFilter?: string;
  onCallFilterChange?: (value: string) => void;
  isLoading?: boolean;
  // Backend pagination props
  currentPage?: number;
  totalPages?: number;
  totalRecords?: number;
  onPageChange?: (page: number) => void;
  hasNextPage?: boolean;
  hasPreviousPage?: boolean;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  onSortChange?: (sorting: any) => void;
}

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
  dateFilter = 'all',
  onDateFilterChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  callFilter = 'all',
  onCallFilterChange,
  isLoading = false,
  // Backend pagination props
  currentPage = 1,
  totalPages = 1,
  totalRecords = 0,
  onPageChange,
  hasNextPage = false,
  hasPreviousPage = false,
  pageSize = 20,
  onPageSizeChange,
}: CallLogsTableProps) {
  const router = useRouter();
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sorting, setSorting] = useState<SortingState>([]);

  // Get lead tag for categorization
  const getLeadTag = useCallback((item: CallLog): LeadTag => {
    if (item.lead_category) {
      const normalized = normalizeLeadCategory(item.lead_category);
      if (normalized) return normalized;
    }
    return "unknown";
  }, []);

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

  // Apply status filter manually to items
  const filteredItems = useMemo(() => {
    if (statusFilter === 'all') return itemsWithTags;
    return itemsWithTags.filter(item => 
      item.status?.toLowerCase().includes(statusFilter.toLowerCase())
    );
  }, [itemsWithTags, statusFilter]);

  // Apply global search filter
  const searchFilteredItems = useMemo(() => {
    if (!globalFilter) return filteredItems;
    const lowerSearch = globalFilter.toLowerCase();
    return filteredItems.filter(item => 
      item.lead_name?.toLowerCase().includes(lowerSearch) ||
      item.assistant?.toLowerCase().includes(lowerSearch) ||
      item.id?.toLowerCase().includes(lowerSearch) ||
      item.status?.toLowerCase().includes(lowerSearch)
    );
  }, [filteredItems, globalFilter]);

  // Filter batch groups by status filter
  const filteredBatchGroups = useMemo(() => {
    if (!batchGroups) return null;
    if (statusFilter === 'all') return batchGroups;
    
    const filteredGroups: Record<string, CallLog[]> = {};
    Object.entries(batchGroups.groups).forEach(([batchId, calls]) => {
      const filteredCalls = calls.filter(call => 
        call.status?.toLowerCase().includes(statusFilter.toLowerCase())
      );
      if (filteredCalls.length > 0) {
        filteredGroups[batchId] = filteredCalls;
      }
    });
    
    const filteredNoBatchCalls = batchGroups.noBatchCalls.filter(call =>
      call.status?.toLowerCase().includes(statusFilter.toLowerCase())
    );
    
    return { groups: filteredGroups, noBatchCalls: filteredNoBatchCalls };
  }, [batchGroups, statusFilter]);

  // Define table columns
  const columns = React.useMemo<ColumnDef<CallLog, any>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => (
        <input
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
    },
    {
      id: 'assistant',
      accessorKey: 'assistant',
      header: 'Agent',
      cell: ({ getValue }) => <span className="font-medium">{(getValue() as string) || "—"}</span>,
    },
    {
      id: 'lead_name',
      accessorKey: 'lead_name',
      header: 'Lead',
      cell: ({ getValue }) => <span className="text-muted-foreground">{cleanLeadName(getValue() as string)}</span>,
    },
    {
      id: 'type',
      accessorKey: 'type',
      header: 'Type',
      cell: ({ getValue }) => {
        const type = getValue() as string;
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
    },
    {
      id: 'status',
      accessorKey: 'status',
      header: 'Status',
      cell: ({ getValue }) => <StatusBadge status={getValue() as string} />,
      filterFn: (row, columnId, filterValue) => {
        const status = row.getValue(columnId) as string;
        return status.toLowerCase().includes(filterValue.toLowerCase());
      },
    },
    {
      id: 'startedAt',
      accessorKey: 'startedAt',
      header: 'Started',
      cell: ({ getValue }) => (
        <span className="text-sm text-muted-foreground">{formatDateTime(getValue() as string)}</span>
      ),
    },
    {
      id: 'duration',
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ getValue }) => <span className="font-mono text-sm">{formatDuration(getValue() as number)}</span>,
    },
    {
      id: 'tag',
      accessorKey: 'tag',
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
    },
    {
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
    },
  ], [selectedCalls, onSelectCall, onSelectAll, onEndCall, getLeadTag]);

  // Setup table instance with filtered data
  const table = useReactTable({
    data: searchFilteredItems,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      globalFilter,
      sorting,
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: (newSorting) => {
      const sortingState = typeof newSorting === 'function' ? newSorting(sorting) : newSorting;
      setSorting(sortingState);
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
    // Find the row in the table data (searchFilteredItems)
    const rowIndex = searchFilteredItems.findIndex(item => item.id === callLog.id);
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
      {/* Search Bar */}
      <div className="p-4 border-b border-[#E2E8F0] bg-[#F8FAFC]">
        <div className="flex gap-3 flex-col sm:flex-row justify-end items-center">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground " />
          <input
            type="text"
            placeholder="Search Call Logs..."
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive pl-10 h-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="min-w-[150px] h-10">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="ended">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="calling">Calling</SelectItem>
              <SelectItem value="ongoing">Ongoing</SelectItem>
              <SelectItem value="queue">Queue</SelectItem>
            </SelectContent>
          </Select>
          <Select value={dateFilter} onValueChange={onDateFilterChange}>
            <SelectTrigger className="min-w-[150px] h-10">
              <SelectValue placeholder="Date Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="custom">Custom</SelectItem>
            </SelectContent>
          </Select>
          <Select value={callFilter} onValueChange={onCallFilterChange}>
            <SelectTrigger className="min-w-[150px] h-10">
              <SelectValue placeholder="Call Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Calls</SelectItem>
              <SelectItem value="current">Current Batch</SelectItem>
              <SelectItem value="batch">Batch View</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Custom Date Inputs (only show when custom is selected) */}
        {dateFilter === 'custom' && (
          <div className="flex gap-3 px-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">From:</label>
              <input
                type="date"
                value={fromDate || ""}
                onChange={(e) => onFromDateChange?.(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">To:</label>
              <input
                type="date"
                value={toDate || ""}
                onChange={(e) => onToDateChange?.(e.target.value)}
                className="px-3 py-2 rounded-lg border border-[#E2E8F0] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>
        )}
      </div>
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
          {isLoading ? (
            // Skeleton rows
            Array.from({ length: 8 }).map((_, i) => (
              <TableRow key={`skeleton-${i}`} className="animate-pulse">
                {columns.map((col, j) => (
                  <TableCell key={`skeleton-cell-${i}-${j}`} className="py-4">
                    <div className="h-4 bg-gray-200 rounded w-full" />
                  </TableCell>
                ))}
              </TableRow>
            ))
          ) : batchGroups ? (
            (() => {
              // Create timeline items combining batches and individual calls
              const timelineItems: Array<{ type: 'batch' | 'call', data: any, timestamp: number }> = [];
              
              // Use filteredBatchGroups instead of batchGroups
              const groupsToRender = filteredBatchGroups || batchGroups;
              
              // Add batch groups with their earliest timestamp
              Object.entries(groupsToRender.groups).forEach(([batchId, calls]) => {
                const earliestTimestamp = Math.min(
                  ...calls.map(c => c.startedAt ? new Date(c.startedAt).getTime() : Date.now())
                );
                timelineItems.push({
                  type: 'batch',
                  data: { batchId, calls },
                  timestamp: earliestTimestamp
                });
              });
              
              // Add individual calls
              groupsToRender.noBatchCalls.forEach(call => {
                timelineItems.push({
                  type: 'call',
                  data: call,
                  timestamp: call.startedAt ? new Date(call.startedAt).getTime() : Date.now()
                });
              });
              
              // Check if there's any data
              if (timelineItems.length === 0) {
                return (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="text-center py-16"
                    >
                      {callFilter === 'current' ? (
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Phone className="w-8 h-8 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-[#1E293B] mb-2">
                              No calls in current batch
                            </h3>
                            <p className="text-sm text-[#64748B] mb-4">
                              Start making calls to see them appear here
                            </p>
                          </div>
                          <button
                            onClick={() => router.push('/make-call')}
                            className="px-6 py-2.5 bg-[#ffffff] rounded-lg transition-all duration-300 font-medium shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Go to Make Call
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                            <Phone className="w-8 h-8 text-primary" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-[#1E293B] mb-2">
                              Trigger a call
                            </h3>
                            <p className="text-sm text-[#64748B] mb-4">
                              Start making calls to see them appear here
                            </p>
                          </div>
                          <button
                            onClick={() => router.push('/make-call')}
                            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-all duration-300 font-medium shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-2"
                          >
                            <Phone className="w-4 h-4" />
                            Make Call
                          </button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              }
              
              // Sort by timestamp (newest first)
              timelineItems.sort((a, b) => b.timestamp - a.timestamp);
              
              return timelineItems.map((item, index) => {
                if (item.type === 'batch') {
                  const { batchId, calls } = item.data;
                  return (
                    <React.Fragment key={`batch-group-${batchId}`}>
                      {renderBatchHeader(batchId, calls)}
                      {expandedBatches.has(batchId) &&
                        calls.map((call: CallLog) => renderCallRow(call, true))}
                    </React.Fragment>
                  );
                } else {
                  return renderCallRow(item.data, false);
                }
              });
            })()
          ) : table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="text-center py-16"
              >
                {callFilter === 'current' ? (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#1E293B] mb-2">
                        No calls in current batch
                      </h3>
                      <p className="text-sm text-[#64748B] mb-4">
                        Start making calls to see them appear here
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/make-call')}
                      className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-all duration-300 font-medium shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      Go to Make Call
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-[#1E293B] mb-2">
                        Trigger a call
                      </h3>
                      <p className="text-sm text-[#64748B] mb-4">
                        Start making calls to see them appear here
                      </p>
                    </div>
                    <button
                      onClick={() => router.push('/make-call')}
                      className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white rounded-lg transition-all duration-300 font-medium shadow-md hover:shadow-lg hover:scale-105 flex items-center gap-2"
                    >
                      <Phone className="w-4 h-4" />
                      Make Call
                    </button>
                  </div>
                )}
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
      {/* Pagination Controls – Server-Side Pagination */}
{table.getRowModel().rows.length > 0 && onPageChange && (
  <div className="flex items-center justify-between px-4 py-3 border-t border-[#E2E8F0]">
    <div className="flex items-center gap-2 text-sm text-[#64748B]">
      <span>
        Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} calls
      </span>
    </div>

    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <span className="text-sm text-[#64748B]">Page size:</span>
        <Select value={pageSize.toString()} onValueChange={(value) => {
          const newSize = parseInt(value, 10);
          onPageSizeChange?.(newSize);
          // Reset to page 1 when page size changes
          onPageChange?.(1);
        }}>
          <SelectTrigger className="w-[80px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="20">20</SelectItem>
            <SelectItem value="50">50</SelectItem>
            <SelectItem value="100">100</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="text-sm text-[#64748B]">
        Page {currentPage} of {totalPages}
      </div>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(1)}
          disabled={!hasPreviousPage}
          className="h-8 w-8 p-0"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPreviousPage}
          className="h-8 w-8 p-0"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNextPage}
          className="h-8 w-8 p-0"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(totalPages)}
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
}
