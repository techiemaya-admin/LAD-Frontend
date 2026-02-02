"use client";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { X } from "lucide-react";
export type Toast = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number; // ms
};
type ToastContextValue = {
  push: (t: Omit<Toast, "id">) => void;
};
const ToastContext = createContext<ToastContextValue | null>(null);
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <AppToasterProvider/>");
  return ctx;
}
export function AppToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const push = useCallback((t: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const toast: Toast = { id, duration: 3500, ...t };
    setToasts((prev) => [...prev, toast]);
    const ttl = toast.duration ?? 3500;
    if (ttl > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, ttl);
    }
  }, []);
  const value = useMemo(() => ({ push }), [push]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-0 z-[60] flex items-end justify-end p-4 sm:p-6">
        <div className="flex w-full max-w-sm flex-col gap-3">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={
                "pointer-events-auto rounded-lg border shadow-lg backdrop-blur-sm p-3 sm:p-4 bg-white/90 dark:bg-neutral-900/90 " +
                (t.variant === "success"
                  ? "border-emerald-200 dark:border-emerald-900"
                  : t.variant === "error"
                  ? "border-red-200 dark:border-red-900"
                  : t.variant === "warning"
                  ? "border-amber-200 dark:border-amber-900"
                  : "border-neutral-200 dark:border-neutral-800")
              }
            >
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  {t.title && <div className="text-sm font-semibold">{t.title}</div>}
                  {t.description && (
                    <div className="text-sm text-muted-foreground mt-0.5">{t.description}</div>
                  )}
                </div>
                <button
                  className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted/40"
                  onClick={() => setToasts((prev) => prev.filter((x) => x.id !== t.id))}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ToastContext.Provider>
  );
}