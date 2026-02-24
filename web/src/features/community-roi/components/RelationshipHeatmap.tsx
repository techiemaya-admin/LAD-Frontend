/**
 * Community ROI Feature - Relationship Heatmap Matrix
 *
 * Displays an N×N member matrix showing relationship strength:
 * - Red   (#EF4444) = Meeting Only
 * - Yellow (#EAB308) = Referral Only
 * - Green  (#10B981) = Both Meetings & Referrals
 * - Empty            = No interaction
 *
 * Auto-updates whenever new data is appended.
 */
'use client';

import React, { useMemo } from 'react';
import { useRelationshipHeatmap } from '@lad/frontend-features/community-roi';

const COLORS = {
  M:  { bg: '#EF444420', border: '#EF4444', badge: '#EF4444', label: 'Meeting Only' },
  R:  { bg: '#EAB30820', border: '#EAB308', badge: '#EAB308', label: 'Referral Only' },
  MR: { bg: '#10B98120', border: '#10B981', badge: '#10B981', label: 'Both' },
} as const;

type CombinationType = 'M' | 'R' | 'MR';

interface CellData {
  combinationType: CombinationType;
  meetingCount: number;
  referralCount: number;
  bothCount: number;
  colorCode: string;
}

interface MatrixMember {
  id: string;
  name: string;
}

// ─── Matrix Cell ────────────────────────────────────────────────────────────

const MatrixCell: React.FC<{ cell: CellData | null; rowName: string; colName: string }> = ({
  cell,
  rowName,
  colName,
}) => {
  if (!cell) {
    return (
      <td className="border border-slate-100 p-0">
        <div className="min-w-[72px] min-h-[48px] bg-slate-100 flex items-center justify-center">
          <span className="text-[11px] font-semibold text-slate-400">0</span>
        </div>
      </td>
    );
  }

  const palette = COLORS[cell.combinationType];

  const tooltip = [
    `${rowName} ↔ ${colName}`,
    cell.meetingCount > 0 ? `Meetings: ${cell.meetingCount}` : '',
    cell.referralCount > 0 ? `Referrals: ${cell.referralCount}` : '',
    cell.bothCount > 0 ? `Both: ${cell.bothCount}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  return (
    <td className="border border-slate-100 p-0">
      <div
        className="min-w-[72px] min-h-[48px] flex flex-col items-center justify-center gap-1 px-2 py-1.5 cursor-default transition-all hover:brightness-95"
        style={{ backgroundColor: palette.bg, borderLeft: `3px solid ${palette.border}` }}
        title={tooltip}
      >
        {/* Type badge */}
        <span
          className="text-[10px] font-bold text-white px-1.5 py-0.5 rounded leading-none"
          style={{ backgroundColor: palette.badge }}
        >
          {cell.combinationType}
        </span>

        {/* Counts */}
        <div className="flex gap-1 text-[9px] font-semibold leading-none" style={{ color: palette.badge }}>
          {cell.meetingCount > 0 && <span>M:{cell.meetingCount}</span>}
          {cell.referralCount > 0 && <span>R:{cell.referralCount}</span>}
          {cell.bothCount > 0 && <span>B:{cell.bothCount}</span>}
        </div>
      </div>
    </td>
  );
};

// ─── Diagonal Cell ──────────────────────────────────────────────────────────

const DiagonalCell: React.FC = () => (
  <td className="border border-slate-100 p-0">
    <div className="min-w-[72px] min-h-[48px] bg-slate-100 flex items-center justify-center">
      <span className="text-slate-300 text-xs font-bold select-none">—</span>
    </div>
  </td>
);

// ─── Legend ─────────────────────────────────────────────────────────────────

const Legend: React.FC = () => (
  <div className="flex items-center gap-5 text-[11px] font-semibold text-slate-500">
    {(Object.entries(COLORS) as [CombinationType, (typeof COLORS)[CombinationType]][]).map(
      ([key, val]) => (
        <div key={key} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 rounded-sm"
            style={{ backgroundColor: val.badge }}
          />
          <span className="uppercase tracking-wide">{val.label}</span>
        </div>
      )
    )}
    <div className="flex items-center gap-1.5">
      <span className="inline-block w-3 h-3 rounded-sm bg-slate-100 border border-slate-200" />
      <span className="uppercase tracking-wide">No interaction</span>
    </div>
  </div>
);

// ─── Name helpers ────────────────────────────────────────────────────────────

/** Return a clean display name; strip any remaining DB placeholders. */
function displayName(name: string): string {
  if (!name || name.startsWith('__EMPTY') || name === 'Unknown') return '(No name)';
  return name;
}

function initials(name: string): string {
  const clean = displayName(name);
  if (clean === '(No name)') return '?';
  // For email addresses use the part before @
  if (clean.includes('@')) return clean.split('@')[0].slice(0, 2).toUpperCase();
  // For Member-xxxxxxxx fallback IDs
  if (clean.startsWith('Member-')) return clean.slice(7, 9).toUpperCase();
  return clean.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Main Component ─────────────────────────────────────────────────────────

export const RelationshipHeatmap: React.FC = () => {
  const { heatmapData, isLoading, isError, error } = useRelationshipHeatmap();

  // Derive sorted unique member list and cell lookup map from the flat pair array
  const { members, cellMap } = useMemo(() => {
    if (!heatmapData || heatmapData.length === 0) {
      return { members: [] as MatrixMember[], cellMap: new Map<string, CellData>() };
    }

    const memberMap = new Map<string, string>(); // id → name
    heatmapData.forEach((row) => {
      if (row.member_a_id) memberMap.set(String(row.member_a_id), row.member_a_name || '');
      if (row.member_b_id) memberMap.set(String(row.member_b_id), row.member_b_name || '');
    });

    const members: MatrixMember[] = Array.from(memberMap.entries())
      .map(([id, name]) => ({ id, name: name || 'Unknown' }))
      .sort((a, b) => a.name.localeCompare(b.name));

    // Build bidirectional cell lookup: "aId|bId" → CellData
    // Compute combination type from raw counts (defensive — works even if backend
    // hasn't run the update script and combination_type is null in the DB).
    const cellMap = new Map<string, CellData>();
    heatmapData.forEach((row) => {
      const meetingCount  = Number(row.meeting_count)  || 0;
      const referralCount = Number(row.referral_count) || 0;
      const bothCount     = Number(row.both_count)     || 0;

      // Derive combination type from counts first; fall back to backend value
      let combinationType: CombinationType | null = null;
      if (bothCount > 0 || (meetingCount > 0 && referralCount > 0)) {
        combinationType = 'MR';
      } else if (meetingCount > 0) {
        combinationType = 'M';
      } else if (referralCount > 0) {
        combinationType = 'R';
      } else if (row.combination_type) {
        combinationType = row.combination_type as CombinationType;
      }

      if (!combinationType) return; // No interaction data at all

      const cell: CellData = {
        combinationType,
        meetingCount,
        referralCount,
        bothCount,
        colorCode: row.color_code || COLORS[combinationType].badge,
      };

      const aId = String(row.member_a_id);
      const bId = String(row.member_b_id);
      cellMap.set(`${aId}|${bId}`, cell);
      if (!cellMap.has(`${bId}|${aId}`)) {
        cellMap.set(`${bId}|${aId}`, cell);
      }
    });

    return { members, cellMap };
  }, [heatmapData]);

  // ── Loading / Error / Empty states ────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h2 className="text-lg font-bold text-slate-800 mb-6">Relationship Matrix</h2>
        <div className="flex items-center justify-center h-48 gap-3">
          <div className="w-5 h-5 border-2 border-slate-300 border-t-blue-600 rounded-full animate-spin" />
          <span className="text-sm text-slate-500 font-medium">Building matrix…</span>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Relationship Matrix</h2>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-600">{error?.message ?? 'Failed to load heatmap data.'}</p>
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8">
        <h2 className="text-lg font-bold text-slate-800 mb-4">Relationship Matrix</h2>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-600">No relationship data yet. Log some meetings or referrals to populate the matrix.</p>
        </div>
      </div>
    );
  }

  // ── Matrix render ─────────────────────────────────────────────────────────

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 pt-6 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Relationship Matrix</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {members.length} members · {heatmapData?.length ?? 0} active pairs
          </p>
        </div>
        <Legend />
      </div>

      {/* Scrollable matrix */}
      <div className="overflow-auto max-h-[520px]">
        <table className="border-collapse text-xs" style={{ minWidth: 'max-content' }}>
          <thead>
            <tr>
              {/* Corner cell */}
              <th className="sticky top-0 left-0 z-30 bg-slate-50 border border-slate-200 p-0">
                <div className="min-w-[120px] min-h-[40px] flex items-end justify-end p-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">→ To</span>
                </div>
              </th>

              {/* Column headers */}
              {members.map((col) => (
                <th
                  key={col.id}
                  className="sticky top-0 z-20 bg-slate-50 border border-slate-100 p-0"
                >
                  <div className="min-w-[72px] px-2 py-2 text-center">
                    <span
                      className="block font-semibold text-slate-700 truncate max-w-[68px] mx-auto"
                      title={displayName(col.name)}
                    >
                      {displayName(col.name).split(' ')[0]}
                    </span>
                    {displayName(col.name).split(' ')[1] && (
                      <span className="block text-[9px] text-slate-400 truncate max-w-[68px] mx-auto">
                        {displayName(col.name).split(' ').slice(1).join(' ')}
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {members.map((row) => (
              <tr key={row.id}>
                {/* Row header */}
                <th className="sticky left-0 z-10 bg-white border border-slate-100 p-0 text-left">
                  <div className="min-w-[120px] px-3 py-2 flex items-center">
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white mr-2"
                      style={{ backgroundColor: '#6366F1' }}
                    >
                      {initials(row.name)}
                    </div>
                    <span className="font-semibold text-slate-700 truncate max-w-[80px]" title={displayName(row.name)}>
                      {displayName(row.name)}
                    </span>
                  </div>
                </th>

                {/* Data cells */}
                {members.map((col) => {
                  if (row.id === col.id) {
                    return <DiagonalCell key={col.id} />;
                  }
                  const cell = cellMap.get(`${row.id}|${col.id}`) ?? null;
                  return (
                    <MatrixCell
                      key={col.id}
                      cell={cell}
                      rowName={row.name}
                      colName={col.name}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RelationshipHeatmap;
