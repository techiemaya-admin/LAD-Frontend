'use client';

import React from 'react';

type LiveActivityStatusBadgeProps = {
  status: string;
  currentStep?: number;
};

const DARK_RESET = "dark:!bg-transparent dark:!border-transparent dark:!px-0 dark:!py-0 dark:!rounded-none dark:!shadow-none dark:!font-extrabold dark:tracking-wide";

export function LiveActivityStatusBadge({ status, currentStep }: LiveActivityStatusBadgeProps) {
  if (currentStep === 6) {
    return (
      <span className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold w-[100px] bg-green-100 text-green-700 border border-green-300 ${DARK_RESET} dark:!text-emerald-400 dark:!w-auto`}>
        <span className="w-2 h-2 rounded-full bg-green-600 dark:!bg-emerald-400" />
        Success
      </span>
    );
  }

  const value = status?.toLowerCase() || '';

  if (value.includes('success') || value.includes('completed') || value.includes('ended')) {
    return (
      <span className={`inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold w-[100px] bg-green-100 text-green-700 border border-green-300 ${DARK_RESET} dark:!text-emerald-400 dark:!w-auto`}>
        <span className="w-2 h-2 rounded-full bg-green-600 dark:!bg-emerald-400" />
        Success
      </span>
    );
  }

  if (value.includes('failed') || value.includes('error') || value.includes('unreachable')) {
    return (
      <span className={`inline-flex items-center justify-left gap-2 px-3 py-1.5 rounded-full text-xs font-semibold w-[100px] bg-red-100/70 text-red-700 border border-red-300 ${DARK_RESET} dark:!text-rose-400 dark:!w-auto`}>
        <span className="w-2 h-2 rounded-full bg-red-600 dark:!bg-rose-400" />
        Failed
      </span>
    );
  }

  if (value.includes('skipped')) {
    return (
      <span className={`inline-flex items-center justify-left gap-2 px-3 py-1.5 rounded-full text-xs font-semibold w-[100px] bg-[#fffbed] text-[#b45309] border border-amber-300 ${DARK_RESET} dark:!text-amber-300 dark:!w-auto`}>
        <span className="w-2 h-2 rounded-full bg-[#f59e0b] dark:!bg-amber-300" />
        Waiting
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground ${DARK_RESET} dark:!text-slate-300`}>
      {status || 'Unknown'}
    </span>
  );
}
