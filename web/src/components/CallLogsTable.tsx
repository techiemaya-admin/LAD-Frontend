import React from "react";
import { PhoneIncoming, PhoneOutgoing, StopCircle, ChevronDown, ChevronRight } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { useRef, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
}: CallLogsTableProps) {
  const headerCheckboxRef = useRef<HTMLInputElement>(null);
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
  // Calculate total calls when using batch groups
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
  const renderCallRow = (item: CallLog, index: number, indent = false) => (
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
      <TableCell className="font-mono text-sm">
        {item.cost || item.call_cost
          ? `$${Number(item.cost || item.call_cost || 0).toFixed(2)}`
          : "—"}
      </TableCell>
      <TableCell onClick={(e) => e.stopPropagation()}>
        {item.status?.toLowerCase().includes("ongoing") && (
          <button
            onClick={() => onEndCall(item.id)}
            className="p-2 rounded-lg text-destructive hover:bg-destructive/10 transition-colors"
            title="End Call"
          >
            <StopCircle className="w-5 h-5" />
          </button>
        )}
      </TableCell>
    </TableRow>
  );
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
        <TableCell colSpan={10} className="py-4">
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
                  // If we're in indeterminate state or unchecked, select all
                  // If all are already selected, deselect all
                  const shouldSelectAll = !allSelected;
                  onSelectAll(shouldSelectAll);
                }}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50 cursor-pointer"
              />
            </TableHead>
            <TableHead className="font-semibold text-foreground">Call ID</TableHead>
            <TableHead className="font-semibold text-foreground">Agent</TableHead>
            <TableHead className="font-semibold text-foreground">Lead</TableHead>
            <TableHead className="font-semibold text-foreground">Type</TableHead>
            <TableHead className="font-semibold text-foreground">Status</TableHead>
            <TableHead className="font-semibold text-foreground">Started</TableHead>
            <TableHead className="font-semibold text-foreground">Duration</TableHead>
            <TableHead className="font-semibold text-foreground">Cost</TableHead>
            <TableHead className="w-12"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {batchGroups ? (
            <>
              {/* Render batch groups */}
              {Object.entries(batchGroups.groups).map(([batchId, calls]) => (
                <React.Fragment key={`batch-group-${batchId}`}>
                  {renderBatchHeader(batchId, calls)}
                  {expandedBatches.has(batchId) &&
                    calls.map((call, idx) => renderCallRow(call, idx, true))}
                </React.Fragment>
              ))}
              {/* Render non-batch calls */}
              {batchGroups.noBatchCalls.length > 0 && (
                <>
                  {batchGroups.noBatchCalls.length > 0 && Object.keys(batchGroups.groups).length > 0 && (
                    <TableRow className="bg-muted/30">
                      <TableCell colSpan={10} className="py-3 text-sm font-semibold text-muted-foreground">
                        Individual Calls
                      </TableCell>
                    </TableRow>
                  )}
                  {batchGroups.noBatchCalls.map((call, idx) => renderCallRow(call, idx, false))}
                </>
              )}
            </>
          ) : items.length > 0 ? (
            items.map((item, index) => renderCallRow(item, index, false))
          ) : (
            <TableRow>
              <TableCell colSpan={10} className="text-center py-12">
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