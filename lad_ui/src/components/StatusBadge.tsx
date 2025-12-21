import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const value = status?.toLowerCase() || "—";

  if (value.includes("running")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-warning/15 text-warning border border-warning/30">
        <span className="w-2 h-2 rounded-full bg-warning status-pulse" />
        <span className="animate-typewriter">Calling...</span>
      </span>
    );
  }

    if (value.includes("pending")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-warning/15 text-warning border border-warning/30">
        <span className="w-2 h-2 rounded-full bg-warning status-pulse" />
        <span className="animate-typewriter">Queue...</span>
      </span>
    );
  }

  if (value.includes("ongoing")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-success/15 text-success border border-success/30">
        <span className="w-2 h-2 rounded-full bg-success status-pulse" />
        <span className="animate-typewriter">Ongoing...</span>
      </span>
    );
  }

  if (value.includes("ended")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-primary/15 text-primary border border-primary/30">
        <span className="w-2 h-2 rounded-full bg-primary" />
        Ended
      </span>
    );
  }

  if (value.includes("declined")) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-destructive/15 text-destructive border border-destructive/30">
        <span className="w-2 h-2 rounded-full bg-destructive" />
        Declined
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground border border-border">
      <span className="w-2 h-2 rounded-full bg-muted-foreground/50" />
      Unknown
    </span>
  );
}
