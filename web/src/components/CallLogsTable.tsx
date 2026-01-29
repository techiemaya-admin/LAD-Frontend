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
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [downloadingIds, setDownloadingIds] = useState<Set<string>>(new Set());
  const [downloadErrors, setDownloadErrors] = useState<Map<string, string>>(new Map());

  // Handle sort column click
  const handleSortClick = useCallback((field: string) => {
    const newSort = toggleSortDirection(sortConfig, field);
    setSortConfig(newSort);
    onSortChange?.(newSort);
  }, [sortConfig, onSortChange]);

  // Get lead tag for categorization
  const getLeadTag = useCallback((item: CallLog): LeadTag => {
    // Prioritize API-provided lead_category and normalize it
    if (item.lead_category) {
      const normalized = normalizeLeadCategory(item.lead_category);
      if (normalized) {
        return normalized;
      }
    }
    // Fallback to calculated categorization
    return categorizeLead({
      status: item.status,
      duration: item.duration,
      type: item.type,
    });
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

  // Memoized sorted items to avoid unnecessary re-renders
  const sortedItems = useMemo(() => {
    // Add computed tag to items for sorting
    const itemsWithTags = items.map(item => ({
      ...item,
      tag: getLeadTag(item),
    }));
    
    logger.debug("itemsWithTags:", itemsWithTags.slice(0, 3)); // DEBUG
    logger.debug("sortConfig:", sortConfig); // DEBUG
    
    if (!sortConfig) return itemsWithTags;
    const sorted = sortCallLogs(itemsWithTags, sortConfig);
    logger.debug("After sortCallLogs:", sorted.slice(0, 3)); // DEBUG
    return sorted;
  }, [items, sortConfig, getLeadTag]);

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

  // Helper component for sortable column header
  const SortableHeader = ({ 
    field, 
    label, 
    sortable = true 
  }: { 
    field: string; 
    label: string; 
    sortable?: boolean; 
  }) => {
    const isActive = sortConfig?.field === field;
    const isAsc = isActive && sortConfig?.direction === "asc";
    const tagFilter = isActive && (sortConfig?.tagFilter as string);
    
    if (!sortable) {
      return <TableHead className="font-semibold text-foreground">{label}</TableHead>;
    }

    return (
      <TableHead 
        className="font-semibold text-foreground cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => handleSortClick(field)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleSortClick(field);
          }
        }}
      >
        <div className="flex items-center gap-2">
          {label}
          {isActive ? (
            // Special indicator for tag field showing which tag is prioritized
            field === "tag" || field === "tags" ? (
              <div className="flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 bg-primary/20 text-primary rounded">
                {tagFilter === "hot" && "HOT"}
                {tagFilter === "warm" && "WARM"}
                {tagFilter === "cold" && "COLD"}
              </div>
            ) : isAsc ? (
              <ArrowUp className="w-4 h-4 text-primary" />
            ) : (
              <ArrowDown className="w-4 h-4 text-primary" />
            )
          ) : (
            <ArrowUpDown className="w-4 h-4 text-muted-foreground opacity-50" />
          )}
        </div>
      </TableHead>
    );
  };
  const totalCalls = totalFilteredCount > 0 ? totalFilteredCount : (batchGroups 
    ? Object.values(batchGroups.groups).flat().length + batchGroups.noBatchCalls.length
    : items.length);
  
  const allSelected = totalCalls > 0 && selectedCalls.size === totalCalls;
  const someSelected = selectedCalls.size > 0 && selectedCalls.size < totalCalls;

  // Update header checkbox indeterminate state
  useEffect(() => {
    if (headerCheckboxRef.current) {
      headerCheckboxRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const renderCallRow = (item: CallLog, index: number, indent = false) => {
    const tag = getLeadTag(item);
    const tagConfig = getTagConfig(tag);
    const isDownloading = downloadingIds.has(item.id);
    const downloadError = downloadErrors.get(item.id);
    const hasRecording = !!(item.signed_recording_url || item.recording_url || item.call_recording_url);

    return (
      <TableRow
        key={item.id || `call-${index}`}
        onClick={() => onRowClick(item.id)}
        className={`table-row-hover cursor-pointer border-b border-border/30 ${
          selectedCalls.has(item.id) ? "bg-primary/5" : ""
        } ${indent ? "bg-muted/20" : ""}`}
        style={{ animationDelay: `${index * 0.05}s` }}
      >
        <TableCell onClick={(e) => e.stopPropagation()} className={indent ? "pl-8" : ""}>
          <input
            type="checkbox"
            checked={selectedCalls.has(item.id)}
            onChange={(e) => {
              e.stopPropagation();
              onSelectCall(item.id);
            }}
            className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50 cursor-pointer"
          />
        </TableCell>
        <TableCell className="font-mono text-sm text-muted-foreground truncate max-w-[120px]">
          {item.id.slice(0, 8)}...
        </TableCell>
        <TableCell className="font-medium">{item.assistant || "—"}</TableCell>
        <TableCell className="text-muted-foreground">{cleanLeadName(item.lead_name)}</TableCell>
        <TableCell>
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${
              item.type === "Outbound"
                ? "bg-warning/15 text-warning border border-warning/30"
                : "bg-primary/15 text-primary border border-primary/30"
            }`}
          >
            {item.type === "Outbound" ? (
              <PhoneOutgoing className="w-3.5 h-3.5" />
            ) : (
              <PhoneIncoming className="w-3.5 h-3.5" />
            )}
            {item.type}
          </span>
        </TableCell>
        <TableCell>
          <StatusBadge status={item.status} />
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {formatDateTime(item.startedAt)}
        </TableCell>
        <TableCell className="font-mono text-sm">
          {formatDuration(item.duration)}
        </TableCell>
        {/* Tags Column */}
        <TableCell>
          <span
            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${tagConfig.bgColor} ${tagConfig.textColor} border ${tagConfig.borderColor}`}
            title={`${tagConfig.label} priority lead`}
          >
            {tagConfig.label}
          </span>
        </TableCell>
        <TableCell className="font-mono text-sm">
          {item.cost || item.call_cost
            ? `$${Number(item.cost || item.call_cost || 0).toFixed(2)}`
            : "—"}
        </TableCell>
        <TableCell onClick={(e) => e.stopPropagation()} className="flex gap-2 items-center">
          {/* Download Recording Button */}
          {/* <button
            onClick={() => handleDownloadRecording(item.id, item.lead_name, item.startedAt)}
            disabled={!hasRecording || isDownloading}
            className={`p-2 rounded-lg transition-colors ${
              !hasRecording 
                ? "text-muted-foreground/50 cursor-not-allowed" 
                : isDownloading
                ? "text-primary/50 cursor-wait"
                : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
            }`}
            title={
              !hasRecording 
                ? "No recording available" 
                : isDownloading
                ? "Downloading..."
                : "Download recording"
            }
          >
            <Download className="w-5 h-5" />
          </button> */}

          {/* End Call Button */}
          {item.status?.toLowerCase().includes("ongoing") && (
            <button
              onClick={() => onEndCall(item.id)}
              className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
              title="End Call"
            >
              <StopCircle className="w-5 h-5" />
            </button>
          )}

          {/* Error Indicator */}
          {downloadError && (
            <div 
              className="text-xs text-destructive px-2 py-1 bg-destructive/10 rounded max-w-[150px] truncate"
              title={downloadError}
            >
              {downloadError}
            </div>
          )}
        </TableCell>
      </TableRow>
    );
  };

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
        className="bg-primary/5 hover:bg-primary/10 cursor-pointer border-b-2 border-primary/20 transition-colors"
      >
        <TableCell colSpan={12} className="py-4">
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

  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/50 bg-muted/30">
            <TableHead className="w-12">
              <input
                ref={headerCheckboxRef}
                type="checkbox"
                checked={allSelected}
                onChange={(e) => {
                  e.stopPropagation();
                  const shouldSelectAll = !allSelected;
                  onSelectAll(shouldSelectAll);
                }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50 cursor-pointer"
              />
            </TableHead>
            <SortableHeader field="id" label="Call ID" sortable={true} />
            <SortableHeader field="assistant" label="Agent" sortable={true} />
            <SortableHeader field="lead_name" label="Lead" sortable={true} />
            <SortableHeader field="type" label="Type" sortable={true} />
            <SortableHeader field="status" label="Status" sortable={true} />
            <SortableHeader field="startedAt" label="Started" sortable={true} />
            <SortableHeader field="duration" label="Duration" sortable={true} />
            <SortableHeader field="tag" label="Tags" sortable={true} />
            <SortableHeader field="cost" label="Cost" sortable={true} />
            {/* <TableHead className="w-16">Actions</TableHead> */}
          </TableRow>
        </TableHeader>
        <TableBody>
          {batchGroups ? (
            <>
              {/* Render batch groups */}
              {Object.entries(batchGroups.groups).map(([batchId, calls]) => {
                // Sort the calls within the batch if sortConfig is set
                const sortedCalls = sortConfig ? sortCallLogs(calls.map(call => ({ ...call, tag: getLeadTag(call) })), sortConfig) : calls;
                return (
                  <React.Fragment key={`batch-group-${batchId}`}>
                    {renderBatchHeader(batchId, sortedCalls)}
                    {expandedBatches.has(batchId) &&
                      sortedCalls.map((call, idx) => renderCallRow(call, idx, true))}
                  </React.Fragment>
                );
              })}
              
              {/* Render non-batch calls */}
              {batchGroups.noBatchCalls.length > 0 && (
                <>
                  {batchGroups.noBatchCalls.length > 0 && Object.keys(batchGroups.groups).length > 0 && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={12} className="py-3 text-sm font-semibold text-muted-foreground">
                        Individual Calls
                      </TableCell>
                    </TableRow>
                  )}
                  {(() => {
                    const sortedNoBatchCalls = sortConfig ? sortCallLogs(batchGroups.noBatchCalls.map(call => ({ ...call, tag: getLeadTag(call) })), sortConfig) : batchGroups.noBatchCalls;
                    return sortedNoBatchCalls.map((call, idx) => renderCallRow(call, idx, false));
                  })()}
                </>
              )}
            </>
          ) : sortedItems.length > 0 ? (
            sortedItems.map((item, index) => renderCallRow(item, index, false))
          ) : (
            <TableRow>
              <TableCell colSpan={12} className="text-center py-12">
                <div className="flex flex-col items-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                    <PhoneOutgoing className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground font-medium">No call logs found</p>
                  <p className="text-sm text-muted-foreground/70">
                    Try adjusting your search or filters
                  </p>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
