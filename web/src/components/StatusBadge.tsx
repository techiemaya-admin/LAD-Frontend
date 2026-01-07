import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const value = status?.toLowerCase() || "—";

  // in_queue: Call created, waiting to be dialed
  if (value.includes("in_queue") || value.includes("pending")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-blue-100/50 text-blue-700 border border-blue-300/50">
        <span className="w-2 h-2 rounded-full bg-blue-500" />
        Queue
      </span>
    );
  }

  // ringing: Call is dialing/ringing recipient
  if (value.includes("ringing") || value.includes("calling") || value.includes("running")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-warning/15 text-warning border border-warning/30">
        <span className="w-2 h-2 rounded-full bg-warning status-pulse" />
        <span className="animate-typewriter">Ringing...</span>
      </span>
    );
  }

  // ongoing: Call picked up, conversation happening
  if (value.includes("ongoing") || value.includes("in_progress") || value.includes("active")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/30">
        <span className="w-2 h-2 rounded-full bg-success status-pulse" />
        <span className="animate-typewriter">Ongoing...</span>
      </span>
    );
  }

  // ended: Call completed normally
  if (value.includes("ended") || value.includes("completed")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/30">
        <span className="w-2 h-2 rounded-full bg-success" />
        Ended
      </span>
    );
  }

  // declined: Call rejected (no_answer, busy, rejected)
  if (value.includes("declined") || value.includes("no_answer") || value.includes("busy") || value.includes("rejected")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/30">
        <span className="w-2 h-2 rounded-full bg-destructive" />
        Declined
      </span>
    );
  }

  // cancelled: Call cancelled via cancel endpoint
  if (value.includes("cancelled") || value.includes("canceled")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-muted/15 text-muted-foreground border border-muted/30">
        <span className="w-2 h-2 rounded-full bg-muted-foreground" />
        Cancelled
      </span>
    );
  }

  // failed: Technical failure or unreachable
  if (value.includes("failed") || value.includes("error") || value.includes("unreachable")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/30">
        <span className="w-2 h-2 rounded-full bg-destructive" />
        Failed
      </span>
    );
  }

  // Default fallback for unknown status
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
      <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
      {status || "Unknown"}
    </span>
  );
}
