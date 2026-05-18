"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

// Determinate completion-bar loader. On internal navigation we jump to ~30%,
// then creep asymptotically toward 90% while the route compiles. When the
// pathname commits we snap to 100% and fade out. Mirrors the nprogress UX so
// the user always sees forward motion during long dev-time compiles.
const CREEP_INTERVAL_MS = 200;
const COMPLETE_FADE_MS = 300;
const SAFETY_TIMEOUT_MS = 8000;
const POST_COMMIT_DELAY_MS = 150;

export function HeaderLoader() {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const prevPathRef = useRef(pathname);
  const creepRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (creepRef.current) {
      clearInterval(creepRef.current);
      creepRef.current = null;
    }
    if (fadeRef.current) {
      clearTimeout(fadeRef.current);
      fadeRef.current = null;
    }
    if (safetyRef.current) {
      clearTimeout(safetyRef.current);
      safetyRef.current = null;
    }
  }, []);

  const completeProgress = useCallback(() => {
    if (creepRef.current) {
      clearInterval(creepRef.current);
      creepRef.current = null;
    }
    setProgress(100);
    if (fadeRef.current) clearTimeout(fadeRef.current);
    fadeRef.current = setTimeout(() => {
      setIsLoading(false);
      setProgress(0);
    }, COMPLETE_FADE_MS);
  }, []);

  const startProgress = useCallback(() => {
    clearTimers();
    setIsLoading(true);
    setProgress(8);
    // Next frame: jump up to a visible starting position
    requestAnimationFrame(() => setProgress(30));
    creepRef.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        // Asymptotic creep — moves faster early, slower near 90%
        const remaining = 90 - p;
        return Math.min(90, p + Math.max(0.5, remaining * 0.08));
      });
    }, CREEP_INTERVAL_MS);
    safetyRef.current = setTimeout(() => completeProgress(), SAFETY_TIMEOUT_MS);
  }, [clearTimers, completeProgress]);

  // Pathname commit → finish the bar.
  useEffect(() => {
    if (prevPathRef.current === pathname) return;
    prevPathRef.current = pathname;
    if (!isLoading) return;
    const t = setTimeout(completeProgress, POST_COMMIT_DELAY_MS);
    return () => clearTimeout(t);
  }, [pathname, isLoading, completeProgress]);

  // Internal link click → start the bar.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.getAttribute("target") === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let nextPath: string;
      try {
        nextPath = new URL(href, window.location.origin).pathname;
      } catch {
        return;
      }
      if (nextPath === window.location.pathname) return;
      startProgress();
    };
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [startProgress]);

  useEffect(() => () => clearTimers(), [clearTimers]);

  if (!isLoading) return null;

  return (
    <div
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress)}
      role="progressbar"
      className="fixed top-0 left-0 right-0 z-[60] h-[3px] overflow-hidden bg-primary/10 dark:bg-primary/20 pointer-events-none"
    >
      <div
        className="h-full bg-primary dark:bg-[#2B7CFF] shadow-[0_0_8px_rgba(43,124,255,0.45)] dark:shadow-[0_0_12px_rgba(43,124,255,0.75)] transition-[width,opacity] duration-300 ease-out"
        style={{
          width: `${progress}%`,
          opacity: progress >= 100 ? 0 : 1,
        }}
      />
    </div>
  );
}

export default HeaderLoader;
