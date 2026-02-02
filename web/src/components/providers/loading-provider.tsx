"use client";
import React from "react";
import { loadingBus, type LoadingState } from "@/lib/loading-bus";
export const LoadingContext = React.createContext<LoadingState>({
  activeCount: 0,
  nextHideAt: null,
});
export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<LoadingState>({ activeCount: 0, nextHideAt: null });
  React.useEffect(() => {
    const unsub = loadingBus.subscribe(setState);
    const interval = setInterval(() => loadingBus.sweepElapsed(), 250);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);
  return <LoadingContext.Provider value={state}>{children}</LoadingContext.Provider>;
}