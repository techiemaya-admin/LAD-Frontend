"use client";
import React from "react";
import { LoadingContext } from "@/components/providers/loading-provider";
import { Skeleton } from "@/components/ui/skeleton";
export default function SkeletonOverlay() {
  const { activeCount, nextHideAt } = React.useContext(LoadingContext);
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => {
    let raf: number | null = null;
    const tick = () => {
      const now = Date.now();
      const shouldShow = activeCount > 0 || (nextHideAt !== null && now < nextHideAt);
      setVisible(shouldShow);
      if (shouldShow) raf = requestAnimationFrame(tick);
      else if (raf) cancelAnimationFrame(raf);
    };
    tick();
    return () => {
      if (raf) cancelAnimationFrame(raf);
    };
  }, [activeCount, nextHideAt]);
  if (!visible) return null;
  return (
    <div className="fixed inset-0 z-50 bg-background/60 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-3 gap-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    </div>
  );
}