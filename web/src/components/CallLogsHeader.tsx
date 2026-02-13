"use client";
import { Phone, Filter, Calendar, ScrollText } from "lucide-react";
type DateFilter = "today" | "month" | "custom" | "all";
interface CallLogsHeaderProps {
  filterProvider: string;
  onFilterProviderChange: (value: string) => void;
  callFilter: "all" | "current" | "previous" | "batch";
  onCallFilterChange: (value: "all" | "current" | "previous" |"batch") => void;
  uniqueProviders: string[];
  selectedCount: number;
  onEndSelected: () => void;
  // ✅ NEW: Retry props
  onRetrySelected?: () => void;
  hasFailedCalls?: boolean;
  failedCount?: number;
  // Date filtering props
  dateFilter: DateFilter;
  onDateFilterChange: (value: DateFilter) => void;
  fromDate: string | null;
  toDate: string | null;
  onFromDateChange: (value: string) => void;
  onToDateChange: (value: string) => void;
  // Per-page limit props
  perPage: number;
  onPerPageChange: (value: number) => void;
}
export function CallLogsHeader({
  filterProvider,
  onFilterProviderChange,
  callFilter,
  onCallFilterChange,
  uniqueProviders,
  selectedCount,
  onEndSelected,
  onRetrySelected,
  hasFailedCalls,
  failedCount = 0,
  dateFilter,
  onDateFilterChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  perPage,
  onPerPageChange,
}: CallLogsHeaderProps) {
  return (
    <div className="p-3 bg-[#F8F9FE] h-full overflow-auto">
      {/* Title Section */}
      <div className="mb-5 flex flex-col sm:flex-row justify-between mt-10 items-stretch sm:items-center gap-2 sm:gap-0">
        
          
          <div>
            <ScrollText className="w-6 h-6 text-[#1E293B] mb-1" />
            <h1 className="text-2xl sm:text-4xl font-bold text-[#1E293B] mb-1">
              Call Logs
            </h1>
            <p className="text-sm text-[#64748B] ml-2">
              View and manage your call history
            </p>
          
        </div>
        {selectedCount > 0 && (
          <div className="flex gap-2">
            {hasFailedCalls && (
              <button
                onClick={onRetrySelected}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105"
              >
                Retry Failed ({failedCount})
              </button>
            )}
            <button
              onClick={onEndSelected}
              className="px-5 py-2.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-xl transition-all duration-300 font-medium shadow-lg hover:shadow-xl hover:scale-105"
            >
              End Selected ({selectedCount})
            </button>
          </div>
        )}
      </div>
      {/* Filters Section */}
      <div className="flex flex-col gap-4">
        {/* Row 1: Quick Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Type Filter */}
          {/* <div className="flex items-center gap-2"> */}
            {/* <Filter className="w-5 h-5 text-muted-foreground" /> */}
            {/* <select
              value={filterProvider}
              onChange={(e) => onFilterProviderChange(e.target.value)}
              className="px-4 py-3 rounded-xl border border-border bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 cursor-pointer"
            >
              <option value="All">All Types</option>
              {uniqueProviders.map((provider) => (
                <option key={provider} value={provider}>
                  {provider}
                </option>
              ))}
            </select>
          </div> */}
          {/* Items Per Page */}
          {/* <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Show:</span>
            <select
              value={perPage}
              onChange={(e) => onPerPageChange(Number(e.target.value))}
              className="px-4 py-3 rounded-xl border border-border bg-background/50 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300 cursor-pointer min-w-[100px]"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-muted-foreground">per page</span>
          </div> */}
        </div>
        {/* Row 2: Call Type / Batch Filter */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
        </div>
        {/* Custom Date Inputs (only show when custom is selected) */}
        {dateFilter === "custom" && (
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium text-muted-foreground">From:</label>
              <input
                type="date"
                value={fromDate || ""}
                onChange={(e) => onFromDateChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
              />
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <label className="text-sm font-medium text-muted-foreground">To:</label>
              <input
                type="date"
                value={toDate || ""}
                onChange={(e) => onToDateChange(e.target.value)}
                className="px-3 py-2 rounded-lg border border-border bg-background/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
