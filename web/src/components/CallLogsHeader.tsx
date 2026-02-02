"use client";
import { Phone, Search, Filter, Calendar } from "lucide-react";
type DateFilter = "today" | "month" | "custom" | "all";
interface CallLogsHeaderProps {
  search: string;
  onSearchChange: (value: string) => void;
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
  search,
  onSearchChange,
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
    <div className="glass-card rounded-2xl p-6 animate-fade-in-up">
      {/* Title Section */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-[#172560] gradient-primary p-3 rounded-xl shadow-lg">
            <Phone className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">
              Call Logs
            </h1>
            <p className="text-sm text-muted-foreground">
              View and manage your call history
            </p>
          </div>
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
        {/* Row 1: Search and Quick Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by ID, agent, or lead name..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-border bg-background/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all duration-300"
            />
          </div>
          {/* Type Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-muted-foreground" />
            <select
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
          </div>
          {/* Items Per Page */}
          <div className="flex items-center gap-2">
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
          </div>
        </div>
        {/* Row 2: Date Range and Call Type Filters */}
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
          {/* Date Filter Buttons */}
          <div className="flex bg-muted p-1 rounded-xl">
            {(["all", "today", "month", "custom"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => onDateFilterChange(filter)}
                className={`px-3 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  dateFilter === filter
                    ? "bg-[#172560] gradient-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                {filter === "all"
                  ? "All Time"
                  : filter === "today"
                  ? "Today"
                  : filter === "month"
                  ? "This Month"
                  : "Custom"}
              </button>
            ))}
          </div>
          {/* Call Type / Batch Filter */}
          <div className="flex bg-muted p-1 rounded-xl w-fit">
            {(["all", "current", "batch"] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => onCallFilterChange(filter)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  callFilter === filter
                    ? "bg-[#172560] gradient-primary text-primary-foreground shadow-md"
                    : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                }`}
              >
                {filter === "all"
                  ? "All Calls"
                  : filter === "current"
                  ? "Current Batch"
                  : "Batch View"}
              </button>
            ))}
          </div>
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