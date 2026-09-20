"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Statuses for which a call is still on the line and the clock should run. */
export const LIVE_CALL_STATUSES = ["ongoing", "ringing", "in_progress", "calling", "in_queue", "queued"] as const;

export function isLiveCallStatus(status?: string | null): boolean {
  return (LIVE_CALL_STATUSES as readonly string[]).includes((status ?? "").toLowerCase());
}

/** m:ss, or h:mm:ss once a call passes the hour. */
export function formatElapsed(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`
    : `${m}:${String(sec).padStart(2, "0")}`;
}

interface LiveDurationProps {
  /** ISO timestamp the call began (started_at, or created_at while it is still ringing). */
  since: string;
  className?: string;
}

/**
 * A ticking elapsed-time readout for a call that is still on the line.
 *
 * The table only refetches every few seconds and an ongoing call has no
 * `duration` yet, so the column showed "-" for the whole call. This counts up
 * from `since` on the client, once a second, and stops being rendered when the
 * row's status leaves the live set (the parent switches back to the stored
 * duration).
 */
export function LiveDuration({ since, className }: LiveDurationProps) {
  const startMs = React.useMemo(() => {
    const t = new Date(since).getTime();
    return Number.isFinite(t) ? t : Date.now();
  }, [since]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const elapsed = formatElapsed((now - startMs) / 1000);

  return (
    <span
      className={cn("inline-flex items-center gap-1.5 font-mono text-sm tabular-nums text-emerald-700 dark:text-emerald-400", className)}
      title={`On the line since ${new Date(startMs).toLocaleTimeString()}`}
      aria-live="off"
    >
      <span className="relative flex h-2 w-2" aria-hidden="true">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      {elapsed}
    </span>
  );
}
