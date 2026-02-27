import { useEffect, useState } from "react";

interface StatusBadgeProps {
  status: string;
}

/**
 * Realistic typing animation.
 * - Types characters one-by-one with randomised 80–130 ms delays.
 * - Pauses 1.2 s at full text, then fades out briefly before restarting.
 * - The outer badge keeps a fixed min-width so it never resizes / "jumps".
 */
function TypingText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    if (!fading) {
      if (displayed.length < text.length) {
        // Type next character
        const delay = 80 + Math.random() * 50;
        timeout = setTimeout(() => {
          setDisplayed(text.slice(0, displayed.length + 1));
        }, delay);
      } else {
        // Full text shown — pause then start fade-out
        timeout = setTimeout(() => setFading(true), 1200);
      }
    } else {
      // Fade-out period — clear text then start over
      timeout = setTimeout(() => {
        setDisplayed("");
        setFading(false);
      }, 350);
    }

    return () => clearTimeout(timeout);
  }, [displayed, fading, text]);

  return (
    <span
      style={{
        display: "inline-block",
        minWidth: `${text.length}ch`,
        transition: "opacity 0.3s ease",
        opacity: fading ? 0 : 1,
      }}
    >
      {displayed}
    </span>
  );
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const value = status?.toLowerCase() || "";

  /* QUEUE */
  if (value.includes("queue") || value.includes("pending")) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[#efe9ff] text-[#5b2dbd] border border-purple-300">
        <span className="w-2 h-2 rounded-full bg-[#7c3aed] opacity-70" />
        <TypingText text="Queue..." />
      </span>
    );
  }

  /* CALLING / RINGING */
  if (
    value.includes("calling") ||
    value.includes("ringing") ||
    value.includes("running")
  ) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-warning/20 text-warning border border-warning/30">
        <span className="w-2 h-2 rounded-full bg-warning" />
        <TypingText text="Calling..." />
      </span>
    );
  }

  /* ONGOING */
  if (
    value.includes("ongoing") ||
    value.includes("active") ||
    value.includes("in_progress")
  ) {
    return (
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#e1eee2] text-green-700 border border-green-300">
        <span className="w-2 h-2 rounded-full bg-green-500" />
        <TypingText text="Ongoing..." />
      </span>
    );
  }

  /* COMPLETED */
  if (value.includes("ended") || value.includes("completed")) {
    return (
      <span className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold w-[100px] bg-green-100 text-green-700 border border-green-300">
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
      <span className="inline-flex items-center justify-left gap-2 px-3 py-1.5 rounded-full text-xs font-semibold w-[100px] bg-red-100/70 text-red-700 border border-red-300">
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
