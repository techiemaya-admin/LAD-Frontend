import { PhoneIncoming, PhoneOutgoing, StopCircle } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
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
}

interface CallLogsTableProps {
  items: CallLog[];
  selectedCalls: Set<string>;
  onSelectCall: (id: string) => void;
  onSelectAll: (checked: boolean) => void;
  onRowClick: (id: string) => void;
  onEndCall: (id: string) => void;
}

export function CallLogsTable({
  items,
  selectedCalls,
  onSelectCall,
  onSelectAll,
  onRowClick,
  onEndCall,
}: CallLogsTableProps) {
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

  return (
    <div className="glass-card rounded-2xl overflow-hidden animate-fade-in-up" style={{ animationDelay: "0.1s" }}>
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border/50 bg-muted/30">
            <TableHead className="w-12">
              <input
                type="checkbox"
                checked={selectedCalls.size > 0 && selectedCalls.size === items.length}
                onChange={(e) => onSelectAll(e.target.checked)}
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
          {items.length > 0 ? (
            items.map((item, index) => (
              <TableRow
                key={item.id || `call-${index}`}
                onClick={() => onRowClick(item.id)}
                className={`table-row-hover cursor-pointer border-b border-border/30 ${
                  selectedCalls.has(item.id) ? "bg-primary/5" : ""
                }`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={selectedCalls.has(item.id)}
                    onChange={() => onSelectCall(item.id)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary/50 cursor-pointer"
                  />
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground truncate max-w-[120px]">
                  {item.id.slice(0, 8)}...
                </TableCell>
                <TableCell className="font-medium">{item.assistant || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{item.lead_name || "—"}</TableCell>
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
            ))
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
