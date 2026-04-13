/**
 * Community ROI Feature - Relationship Heatmap Matrix
 *
 * Displays an N×N member matrix showing relationship strength:
 * - Red   (#EF4444) = Meeting Only
 * - Yellow (#EAB308) = Referral Only
 * - Green  (#10B981) = Both Meetings & Referrals
 * - Empty            = No interaction
 *
 * ENHANCED: Click any member name to select them and see their relationship breakdown
 * (counts by type: no interaction, meetings only, referrals only, both)
 *
 * Auto-updates whenever new data is appended.
 */
'use client';

import React, { useMemo, useState } from 'react';
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

interface RelationshipBreakdownType {
  combination_type: number;
  color_code: string;
  count: number;
  label: string;
  total_meetings: number;
  total_referrals: number;
}

interface RelationshipBreakdownData {
  memberId: string;
  totalRelationships: number;
  breakdown: RelationshipBreakdownType[];
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

// ─── Legend with Selection ───────────────────────────────────────────────────

interface LegendProps {
  selectedMember?: MatrixMember;
  breakdownData?: RelationshipBreakdownData;
  onClearSelection: () => void;
}

const Legend: React.FC<LegendProps> = ({ selectedMember, breakdownData, onClearSelection }) => {
  if (selectedMember && breakdownData) {
    return (
      <div className="flex flex-col gap-4">
        {/* Selected Member Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">Selected:</span>
            <span className="text-sm font-bold text-slate-900">{selectedMember.name}</span>
            <span className="text-xs text-slate-500">({breakdownData.totalRelationships} total)</span>
          </div>
          <button
            onClick={onClearSelection}
            className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors"
          >
            Clear
          </button>
        </div>

        {/* Breakdown by Type */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {breakdownData.breakdown.map((type) => {
            const percentage =
              breakdownData.totalRelationships > 0
                ? Math.round((type.count / breakdownData.totalRelationships) * 100)
                : 0;

            return (
              <div key={type.combination_type} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: type.color_code }}
                  />
                  <span className="text-[10px] font-semibold text-slate-600 truncate">
                    {type.label}
                  </span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-bold text-slate-900">{type.count}</span>
                  <span className="text-xs text-slate-500">({percentage}%)</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Default legend
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-slate-400 italic">👆 Click a member name to see their relationship breakdown</p>
      <div className="flex items-center gap-5 text-[11px] font-semibold text-slate-500 flex-wrap">
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
    </div>
  );
};

// ─── Name helpers ────────────────────────────────────────────────────────────

/** Return a clean display name; strip any remaining DB placeholders. */
function displayName(name: string): string {
  if (!name || name.startsWith('__EMPTY') || name === 'Unknown') return '(No name)';
  return name;
}

function initials(name: string): string {
  const clean = displayName(name);
  if (clean === '(No name)') return '?';
  if (clean.includes('@')) return clean.split('@')[0].slice(0, 2).toUpperCase();
  if (clean.startsWith('Member-')) return clean.slice(7, 9).toUpperCase();
  return clean.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
}

// ─── Main Component ─────────────────────────────────────────────────────────

export const RelationshipHeatmap: React.FC = () => {
  const { heatmapData, isLoading, isError, error } = useRelationshipHeatmap();
  const [selectedMember, setSelectedMember] = useState<MatrixMember | null>(null);
  const [breakdownData, setBreakdownData] = useState<RelationshipBreakdownData | null>(null);
  const [loadingBreakdown, setLoadingBreakdown] = useState(false);

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

    const cellMap = new Map<string, CellData>();
    heatmapData.forEach((row) => {
      const meetingCount  = Number(row.meeting_count)  || 0;
      const referralCount = Number(row.referral_count) || 0;
      const bothCount     = Number(row.both_count)     || 0;

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

      if (!combinationType) return;

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

  // Handle member selection
  const handleSelectMember = async (member: MatrixMember) => {
    setSelectedMember(member);
    setLoadingBreakdown(true);
    try {
      const response = await fetch(
        `/api/community-roi/members/${member.id}/relationship-breakdown`,
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
      if (response.ok) {
        const result = await response.json();
        if (result.success && result.data) {
          setBreakdownData(result.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch member breakdown:', err);
    } finally {
      setLoadingBreakdown(false);
    }
  };

  const handleClearSelection = () => {
    setSelectedMember(null);
    setBreakdownData(null);
  };

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
      <div className="px-6 pt-6 pb-4 flex flex-col gap-4 border-b border-slate-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Relationship Matrix</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {members.length} members · {heatmapData?.length ?? 0} active pairs
            </p>
          </div>
        </div>
        <Legend
          selectedMember={selectedMember || undefined}
          breakdownData={breakdownData || undefined}
          onClearSelection={handleClearSelection}
        />
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
                  className="sticky top-0 z-20 bg-slate-50 border border-slate-100 p-0 hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => handleSelectMember(col)}
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
                <th
                  className="sticky left-0 z-10 bg-white border border-slate-100 p-0 text-left hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => handleSelectMember(row)}
                >
                  <div className="min-w-[120px] px-3 py-2 flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
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
