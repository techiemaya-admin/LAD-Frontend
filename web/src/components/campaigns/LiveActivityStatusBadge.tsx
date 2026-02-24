'use client';

import React from 'react';

type LiveActivityStatusBadgeProps = {
  status: string;
};

export function LiveActivityStatusBadge({ status }: LiveActivityStatusBadgeProps) {
  const value = status?.toLowerCase() || '';

  if (value.includes('success') || value.includes('completed') || value.includes('ended')) {
    return (
      <span className="inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold w-[100px] bg-green-100 text-green-700 border border-green-300">
        <span className="w-2 h-2 rounded-full bg-green-600" />
        Success
      </span>
    );
  }

  if (value.includes('failed') || value.includes('error') || value.includes('unreachable')) {
    return (
      <span className="inline-flex items-center justify-left gap-2 px-3 py-1.5 rounded-full text-xs font-semibold w-[100px] bg-red-100/70 text-red-700 border border-red-300">
        <span className="w-2 h-2 rounded-full bg-red-600" />
        Failed
      </span>
    );
  }

  if (value.includes('skipped')) {
    return (
      <span className="inline-flex items-center justify-left gap-2 px-3 py-1.5 rounded-full text-xs font-semibold w-[100px] bg-[#efe9ff] text-[#5b2dbd] border border-purple-300">
        <span className="w-2 h-2 rounded-full bg-[#7c3aed]" />
        Skipped
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-muted text-muted-foreground">
      {status || 'Unknown'}
    </span>
  );
}
