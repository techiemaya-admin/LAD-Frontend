import { cn } from "@/lib/utils";
interface StatusBadgeProps {
  status: string;
}
export function StatusBadge({ status }: StatusBadgeProps) {
  const value = status?.toLowerCase() || "";
  /* QUEUE */
  if (value.includes("queue") || value.includes("pending")) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full 
      text-xs font-medium bg-[#efe9ff] text-[#5b2dbd] border border-purple-300">
        <span className="w-2 h-2 rounded-full bg-[#7c3aed] animate-pulse opacity-70" />
        <span className="animate-typewriter">Queue...</span>
      </span>
    );
  }
  /* CALLING / RINGING */
  if (value.includes("calling") || value.includes("ringing") || value.includes("running")) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-warning/20 text-warning border border-warning/30">
        <span className="w-2 h-2 rounded-full bg-warning animate-pulse" />
        <span className="animate-typewriter">Calling...</span>
      </span>
    );
  }
  /* ONGOING */
  if (value.includes("ongoing") || value.includes("active") || value.includes("in_progress")) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#e1eee2] text-green-700 border border-green-300">
        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        <span className="animate-typewriter">Ongoing...</span>
      </span>
    );
  }
/* COMPLETED */
if (value.includes("ended") || value.includes("completed")) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold 
      bg-green-100 text-green-700 border border-green-300">
      <span className="w-2 h-2 rounded-full bg-green-600" />
      Completed
    </span>
  );
}
/* FAILED */
if (
  value.includes("failed") ||
  value.includes("error") ||
  value.includes("unreachable")
) {
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold 
      bg-red-100/70 text-red-700 border border-red-300">
      <span className="w-2 h-2 rounded-full bg-red-600" />
      Failed
    </span>
  );
}
  /* FALLBACK */
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
      {status || "Unknown"}
    </span>
  );
}
