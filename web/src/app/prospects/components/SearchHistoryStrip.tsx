/**
 * SearchHistoryStrip - compact recent-runs list on /prospects.
 *
 * Renders the 5 most recent SearchDispatcher runs as a horizontal chip strip
 * below the run panel. Click a chip to see its detail (status, cost, dedup).
 * Refetches when the parent passes a new `refreshKey` (typically bumped after
 * a successful RunSearchPanel run).
 */
'use client';

import { useEffect } from 'react';

import { useDispatchedSearches } from '@lad/frontend-features/ai-icp-assistant';
import type { IcpSearch } from '@lad/frontend-features/ai-icp-assistant';

function statusColor(status: IcpSearch['status']): string {
  switch (status) {
    case 'completed':  return 'bg-emerald-100 text-emerald-700';
    case 'running':    return 'bg-blue-100 text-blue-700';
    case 'failed':     return 'bg-rose-100 text-rose-700';
    case 'cost_capped': return 'bg-amber-100 text-amber-700';
    case 'cancelled':  return 'bg-gray-200 text-gray-700';
    default:           return 'bg-gray-100 text-gray-600';
  }
}

function formatTimeAgo(iso: string): string {
  const diffMin = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export interface SearchHistoryStripProps {
  /** Bump this number to force a refetch (e.g., after a new run). */
  refreshKey?: number;
}

export function SearchHistoryStrip({ refreshKey = 0 }: SearchHistoryStripProps) {
  const { searches, loading, refetch } = useDispatchedSearches({ limit: 5 });

  useEffect(() => {
    if (refreshKey > 0) void refetch();
  }, [refreshKey, refetch]);

  if (loading) {
    return <div className="mb-4 text-xs text-gray-500">Loading recent searches…</div>;
  }
  if (searches.length === 0) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2">
      <span className="text-xs uppercase tracking-wider text-gray-500">
        Recent runs
      </span>
      {searches.map((s) => (
        <span
          key={s.id}
          title={`Search ${s.id}`}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${statusColor(s.status)}`}
        >
          <strong>{s.status}</strong>
          <span>
            {s.total_matches != null ? `· ${s.total_matches} matches ` : ''}
            {formatTimeAgo(s.started_at)}
          </span>
        </span>
      ))}
    </div>
  );
}
