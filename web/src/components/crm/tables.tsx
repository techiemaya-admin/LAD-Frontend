'use client';
// The four CRM-grade table views: All Contacts, Prospects, Leads, Clients.
// Each is a CrmTable instance with view-specific columns + filters.

import * as React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, Download, Plus, MoreVertical, ChevronsUpDown,
  ChevronDown, Inbox, Radio, Route, BadgeCheck, Trash2,
} from 'lucide-react';
import {
  CrmAvatar, ChannelChips, LadCard, T, fmtCurrency, fmtDate, rel,
  VerifiedTag, Pager, type CrmPagination,
} from './shared';
import { CRM_OWNERS, type CrmContact } from './data';
import { csvCell } from '@/lib/csv';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// ── Building blocks ──────────────────────────────────────────────────────
function TypePill({ type }: { type: CrmContact['type'] }) {
  const map: Record<CrmContact['type'], { label: string; color: string; bg: string }> = {
    prospect: { label: 'Prospect', color: '#0B1957', bg: '#e8ebf7' },
    lead:     { label: 'Lead',     color: '#0ea5e9', bg: '#e0f2fe' },
    client:   { label: 'Client',   color: '#16a34a', bg: '#dcfce7' },
    imported: { label: 'Imported', color: '#64748b', bg: '#f1f5f9' },
    inbound:  { label: 'Inbound',  color: '#a16207', bg: '#fef3c7' },
  };
  const m = map[type] ?? map.imported;

  if (type === 'prospect') {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full text-[#0B1957] bg-[#0B1957]/10 border border-[#0B1957]/30 dark:bg-[#2563eb]/20 dark:text-[#60a5fa] dark:border-[#3b82f6]/40">
        {m.label}
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
      style={{ color: m.color, background: m.bg }}
    >
      {m.label}
    </span>
  );
}

function StagePill({ stage }: { stage?: string }) {
  if (!stage) return <span className="text-[11.5px] text-slate-400">-</span>;
  const m = ({
    new:       { label: 'New',         color: '#64748b', bg: '#f1f5f9' },
    contacted: { label: 'Contacted',   color: '#0ea5e9', bg: '#e0f2fe' },
    engaged:   { label: 'Engaged',     color: '#3b82f6', bg: '#dbeafe' },
    qualified: { label: 'Qualified',   color: '#0B1957', bg: '#e8ebf7' },
    sah:       { label: 'Handed off',  color: '#16a34a', bg: '#dcfce7' },
    won:       { label: 'Won',         color: '#15803d', bg: '#bbf7d0' },
    lost:      { label: 'Lost',        color: '#dc2626', bg: '#fee2e2' },
  } as Record<string, { label: string; color: string; bg: string }>)[stage] ?? {
    label: stage,
    color: '#64748b',
    bg: '#f1f5f9',
  };
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ color: m.color, background: m.bg }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }}></span>
      {m.label}
    </span>
  );
}

function ScoreBar({ value, color = T.primary }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-1.5 min-w-[64px]">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: T.badgeBg }}>
        <div className="h-full" style={{ width: `${value * 100}%`, background: color }}></div>
      </div>
      <span className="text-[11px] tabular-nums font-semibold text-[#172560] dark:text-white w-7 text-right">
        {Math.round(value * 100)}
      </span>
    </div>
  );
}

function EmailCell({ email, verified }: { email?: string | null; verified?: boolean }) {
  if (!email) return <span className="text-[11.5px] text-slate-400">-</span>;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[12px] text-[#172560] dark:text-white truncate">{email}</span>
      <VerifiedTag verified={verified} />
    </div>
  );
}

function PhoneCell({ phone, verified }: { phone?: string | null; verified?: boolean }) {
  if (!phone) return <span className="text-[11.5px] text-slate-400">-</span>;
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="text-[12px] tabular-nums text-[#172560] dark:text-white truncate">{phone}</span>
      <VerifiedTag verified={verified} />
    </div>
  );
}

function OwnerCell({ ownerId }: { ownerId?: string }) {
  if (!ownerId) return <span className="text-[11.5px] text-slate-400">-</span>;
  const o = CRM_OWNERS[ownerId];
  if (!o) return <span className="text-[11.5px] text-slate-400">-</span>;
  return (
    <div className="flex items-center gap-2">
      <CrmAvatar name={o.name} initials={o.initials} tone={o.tone} size={22} />
      <span className="text-[12px] text-[#172560] dark:text-white">{o.name}</span>
    </div>
  );
}

function RowActions({ onRemove }: { onRemove?: () => void }) {
  return (
    <div className="inline-flex items-center gap-1 justify-end">
      {onRemove && (
        <button
          className="w-7 h-7 grid place-items-center rounded-md text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-300"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          aria-label="Remove: not a fit"
          title="Remove: not a fit"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        disabled
        className="w-7 h-7 grid place-items-center rounded-md text-slate-400 opacity-50 cursor-not-allowed"
        onClick={(e) => e.stopPropagation()}
        aria-label="Row actions"
        title="Not available yet"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── CSV export helper ────────────────────────────────────────────────────
// Used by the Export button in every CrmTable view. Renders the CURRENTLY
// FILTERED rows (so the user gets what they're seeing, not the whole table)
// to a UTF-8 CSV with a BOM so Excel opens it cleanly. Stable, well-known
// CrmContact fields are exported regardless of which view is showing  - 
// users typically want all the underlying data, not just the visible cells.

// Stable column order for the exported CSV. Centralised so all four views
// (All / Prospects / Leads / Clients) emit consistent files.
const CSV_FIELDS: { key: keyof CrmContact; label: string }[] = [
  { key: 'name',           label: 'Name' },
  { key: 'type',           label: 'Type' },
  { key: 'source',         label: 'Source' },
  { key: 'title',          label: 'Title' },
  { key: 'company',        label: 'Company' },
  { key: 'industry',       label: 'Industry' },
  { key: 'geo',            label: 'Location' },
  { key: 'email',          label: 'Email' },
  { key: 'phone',          label: 'Phone' },
  { key: 'channels',       label: 'Channels' },
  { key: 'owner',          label: 'Owner' },
  { key: 'stage',          label: 'Stage' },
  { key: 'fit',            label: 'Fit score' },
  { key: 'intentSignals',  label: 'Intent signals' },
  { key: 'warmPath',       label: 'Warm path' },
  { key: 'value',          label: 'Value' },
  { key: 'probability',    label: 'Probability' },
  { key: 'nextStep',       label: 'Next step' },
  { key: 'expectedClose',  label: 'Expected close' },
  { key: 'plan',           label: 'Plan' },
  { key: 'mrr',            label: 'MRR' },
  { key: 'health',         label: 'Health' },
  { key: 'renewalDate',    label: 'Renewal date' },
  { key: 'nps',            label: 'NPS' },
  { key: 'csm',            label: 'CSM' },
  { key: 'lastActivityAt', label: 'Last activity' },
  { key: 'createdAt',      label: 'Created' },
];

// RFC-4180 CSV cell escape: wrap in double quotes if the value contains a
// comma, double-quote, or newline; double any embedded quotes.

function buildContactsCsv(rows: CrmContact[]): string {
  const header = CSV_FIELDS.map((f) => csvCell(f.label)).join(',');
  const body = rows
    .map((row) => CSV_FIELDS.map((f) => csvCell(row[f.key])).join(','))
    .join('\n');
  return rows.length ? `${header}\n${body}\n` : `${header}\n`;
}

function downloadCsv(filename: string, csv: string): void {
  // Guard for SSR-style invocation (shouldn't happen - this lives in a
  // 'use client' file - but fail safely if it ever does).
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  // Prepend BOM so Excel auto-detects UTF-8.
  const blob = new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'contacts';
}

// ── Generic table shell ──────────────────────────────────────────────────
interface Column<R> {
  label: string;
  align?: 'left' | 'right';
  nowrap?: boolean;
  sortable?: boolean;
  /** Raw value to sort by — required for sortable columns, since `render`
   *  produces JSX rather than a comparable value. */
  sortKey?: (row: R) => string | number | null | undefined;
  /** When set, sorting this column also asks the server to sort the WHOLE
   *  tenant by this field (not just the loaded page) — see onSortChange.
   *  Only last_event_at/fit_score/sah_at/created_at are real prospect_state
   *  columns the backend can order by; columns backed by data the schema
   *  doesn't track at all (Value, MRR, Health, ...) have no server
   *  equivalent and stay page-local — every row is "-" for those anyway,
   *  so page-local sorting is already a no-op, not a gap. */
  serverSortKey?: 'last_event_at' | 'fit_score' | 'sah_at' | 'created_at';
  render: (row: R) => React.ReactNode;
}

interface FilterDef<R extends CrmContact = CrmContact> {
  key: keyof R;
  label: string;
  options: { value: string; label: string }[];
}

interface CrmTableProps<R extends CrmContact> {
  title: string;
  subtitle?: React.ReactNode;
  count: number;
  columns: Column<R>[];
  rows: R[];
  filters?: FilterDef<R>[];
  onRowClick?: (row: R) => void;
  onRemove?: (row: R) => void;
  /** Server-side pagination. When present, the footer renders a live pager. */
  pagination?: CrmPagination;
  /** Debounced (400ms) copy of the search box's value, fired only when the
   *  typed text settles. The box itself still narrows `rows` instantly and
   *  locally on every keystroke (see `q`/`filtered` below) - this callback
   *  lets the parent additionally re-fetch a server-side match across the
   *  WHOLE tenant, not just whatever page happens to be loaded right now.
   *  Without it, searching for a real contact outside the current page
   *  silently read as "No matches". */
  onSearchChange?: (q: string) => void;
  /** Fired when the user clicks a column whose `serverSortKey` is set - see
   *  Column.serverSortKey. Same "current page isn't the whole story" gap as
   *  onSearchChange: without this, "sort oldest first" only reordered
   *  whatever 50 rows were already loaded, not the tenant's true oldest. */
  onSortChange?: (sortBy: NonNullable<Column<CrmContact>['serverSortKey']>, sortDir: 'asc' | 'desc') => void;
}

function CrmTable<R extends CrmContact>({
  title, subtitle, count, columns, rows, filters, onRowClick, onRemove, pagination, onSearchChange, onSortChange,
}: CrmTableProps<R>) {
  const [q, setQ] = useState('');

  useEffect(() => {
    if (!onSearchChange) return;
    const t = setTimeout(() => onSearchChange(q), 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);
  const [activeFilters, setActiveFilters] = useState<Record<string, string | null>>({});
  const [sort, setSort] = useState<{ index: number; dir: 'asc' | 'desc' } | null>(null);

  const filtered = useMemo(() => {
    let out = rows;
    if (q.trim()) {
      const term = q.toLowerCase();
      out = out.filter((r) =>
        Object.values(r).some((v) => typeof v === 'string' && v.toLowerCase().includes(term))
      );
    }
    for (const [k, v] of Object.entries(activeFilters)) {
      if (v != null) out = out.filter((r) => (r as Record<string, unknown>)[k] === v);
    }
    return out;
  }, [q, activeFilters, rows]);

  // Sorting is separate from filtering above: it reorders without changing
  // which/how-many rows are shown, so filtered.length (header count, Pager
  // visibleCount) stays correct regardless of sort state.
  const sorted = useMemo(() => {
    const col = sort ? columns[sort.index] : null;
    if (!sort || !col?.sortKey) return filtered;
    const dir = sort.dir === 'asc' ? 1 : -1;
    return [...filtered].sort((a, b) => {
      const av = col.sortKey!(a);
      const bv = col.sortKey!(b);
      if (av == null && bv == null) return 0;
      if (av == null) return 1; // nulls/missing values sort last regardless of direction
      if (bv == null) return -1;
      if (av < bv) return -dir;
      if (av > bv) return dir;
      return 0;
    });
  }, [filtered, sort, columns]);

  const toggleSort = (index: number) => {
    setSort((prev) => {
      const next: { index: number; dir: 'asc' | 'desc' } =
        prev?.index === index ? { index, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { index, dir: 'desc' };
      const serverKey = columns[index]?.serverSortKey;
      if (serverKey) onSortChange?.(serverKey, next.dir);
      return next;
    });
  };

  // Export the CURRENTLY FILTERED + SORTED rows to CSV. The button is
  // disabled when there is nothing to export, so this guard is defensive only.
  //
  // Pagination is SERVER-side, so `sorted` is one page — 50 of 571 on the live
  // tenant. The file was still called `all-contacts-<date>.csv`, and that name
  // outlives the screen it came from: whoever opens it later has no way to know
  // it holds a twelfth of the contacts. Say so in the name and in the tooltip.
  //
  // Two different partial cases, and calling both "page" would be a new (small)
  // lie of its own: with a local filter or search active the export is the
  // FILTERED view, which is not "page 1 of 12" either.
  const exportedIsPartial = !!pagination && pagination.total > sorted.length;
  const exportIsFiltered = sorted.length < rows.length;
  const handleExport = useCallback(() => {
    if (!sorted.length) return;
    const csv = buildContactsCsv(sorted as CrmContact[]);
    const ts = new Date().toISOString().slice(0, 10);
    const partial = !!pagination && pagination.total > sorted.length;
    const scope = !partial
      ? ''
      : sorted.length < rows.length
        ? '-filtered'
        : `-page-${pagination!.page}-of-${pagination!.pageCount}`;
    downloadCsv(`${slugify(title)}${scope}-${ts}.csv`, csv);
  }, [sorted, rows.length, title, pagination]);

  return (
    <section className="bg-white dark:bg-[#000724] rounded-[20px] border border-slate-200 dark:border-[#262831] overflow-hidden">
      <header className="px-5 py-4 border-b border-slate-100 dark:border-[#262831] flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h3
              className="text-[15px] font-semibold text-[#172560] dark:text-white"
              style={{ fontFamily: '"Space Grotesk", system-ui' }}
            >
              {title}
            </h3>
            <span
              className="inline-flex items-center px-2.5 py-0.5 text-[11px] font-semibold rounded-full text-[#0B1957] bg-[#e8ebf7] dark:bg-[#2563eb] dark:text-white dark:rounded-md tabular-nums"
            >
              {filtered.length}{filtered.length !== count ? ` / ${count}` : ''}
            </span>
          </div>
          {subtitle && (
            <p className="text-[12px] text-slate-500 dark:text-[#7a8ba3] mt-0.5">{subtitle}</p>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="h-9 pl-8 pr-3 rounded-lg text-[12.5px] border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30 w-48"
            />
          </div>
          {filters?.map((f) => (
            <FilterDropdown
              key={String(f.key)}
              label={f.label}
              value={activeFilters[String(f.key)] ?? null}
              options={f.options}
              onChange={(v) => setActiveFilters((prev) => ({ ...prev, [String(f.key)]: v }))}
            />
          ))}
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0}
            title={
              filtered.length === 0
                ? 'No rows to export'
                : exportedIsPartial
                  ? `Export the ${filtered.length} row${filtered.length === 1 ? '' : 's'} shown${exportIsFiltered ? ' by this filter' : ' on this page'} — not all ${pagination!.total}`
                  : `Export ${filtered.length} row${filtered.length === 1 ? '' : 's'} as CSV`
            }
            className="h-9 px-3 rounded-lg text-[12.5px] font-medium border border-slate-200 dark:border-[#262831] text-[#172560] dark:text-white hover:bg-slate-50 dark:hover:bg-[#1a2a43] inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {/* The count is on the button itself, not only in the tooltip: a
                hover hint does not exist on touch, and "Export" next to a
                header reading "All Contacts · 571" implies all 571. */}
            <Download className="w-3.5 h-3.5" />{' '}
            {exportedIsPartial
              ? `Export ${exportIsFiltered ? 'view' : 'page'} (${filtered.length})`
              : 'Export'}
          </button>
          <button
            disabled
            title="Not available yet"
            className="h-9 px-3.5 rounded-lg text-[12.5px] bg-primary/95 font-semibold text-white inline-flex items-center gap-1.5 opacity-50 cursor-not-allowed"
          >
            <Plus className="w-3.5 h-3.5" /> New
          </button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/70 dark:bg-[#071131] border-b border-slate-100 dark:border-[#262831]">
              <th className="w-9 px-3 py-2.5">
                <input
                  type="checkbox"
                  disabled
                  title="Not available yet"
                  className="rounded border-slate-300 opacity-50 cursor-not-allowed dark:appearance-none dark:w-4 dark:h-4 dark:shrink-0 dark:rounded-[5px] dark:border-2 dark:border-[#1c2c4e] dark:bg-transparent"
                  aria-label="Select all rows (not available yet)"
                />
              </th>
              {columns.map((c, i) => {
                const canSort = c.sortable && !!c.sortKey;
                const active = sort?.index === i;
                return (
                  <th
                    key={i}
                    onClick={canSort ? () => toggleSort(i) : undefined}
                    // Same gap as the rows below: a sortable header was
                    // clickable (cursor-pointer + onClick) but tabIndex -1 with
                    // nothing focusable inside, so sorting was mouse-only.
                    // aria-sort was missing too, so a screen-reader user could
                    // not tell which column was sorted or in which direction —
                    // the chevron conveys that visually and nowhere else.
                    tabIndex={canSort ? 0 : undefined}
                    onKeyDown={
                      canSort
                        ? (e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              toggleSort(i);
                            }
                          }
                        : undefined
                    }
                    aria-sort={
                      canSort
                        ? active
                          ? sort!.dir === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                        : undefined
                    }
                    className={`px-3 py-2.5 text-[10.5px] uppercase tracking-wider font-semibold text-slate-500 dark:text-[#7a8ba3] whitespace-nowrap ${
                      c.align === 'right' ? 'text-right' : 'text-left'
                    } ${canSort ? 'cursor-pointer select-none hover:text-[#172560] dark:hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563eb]' : ''}`}
                  >
                    <span className="inline-flex items-center gap-1">
                      {c.label}
                      {c.sortable && (
                        <ChevronsUpDown
                          className={`w-3 h-3 ${active ? 'text-[#172560] dark:text-white' : 'opacity-50'}`}
                          style={active ? { transform: sort!.dir === 'asc' ? 'scaleY(-1)' : undefined } : undefined}
                        />
                      )}
                    </span>
                  </th>
                );
              })}
              <th className="w-12 px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.id}
                onClick={() => onRowClick?.(r)}
                // Opening a contact was mouse-only. The row carried onClick and
                // cursor-pointer (and the page says "Click any row to open the
                // contact's profile"), but no tabIndex, no key handler and no
                // link — so a keyboard user could not open a contact at all,
                // while the ONE control they could reach in a row was the
                // destructive "Remove: not a fit" button.
                //
                // Deliberately NOT role="button": that would pull the row out of
                // the table's accessibility tree and cost every screen-reader
                // user their row/column context. tabIndex + Enter/Space makes it
                // operable while it stays a real table row. (The fully semantic
                // alternative — a real control inside the name cell — needs
                // onRowClick plumbed through the column definitions.)
                tabIndex={onRowClick ? 0 : undefined}
                onKeyDown={
                  onRowClick
                    ? (e) => {
                        if (e.target !== e.currentTarget) return; // let cell controls keep their keys
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          onRowClick(r);
                        }
                      }
                    : undefined
                }
                aria-label={onRowClick ? `Open ${r.name}` : undefined}
                className="border-b border-slate-100 dark:border-[#262831] hover:bg-[#f5f7fd] dark:hover:bg-[#0e1a3a] cursor-pointer transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563eb]"
              >
                <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    disabled
                    title="Not available yet"
                    className="rounded border-slate-300 opacity-50 cursor-not-allowed dark:appearance-none dark:w-4 dark:h-4 dark:shrink-0 dark:rounded-[5px] dark:border-2 dark:border-[#1c2c4e] dark:bg-transparent"
                    aria-label={`Select ${r.name} (not available yet)`}
                  />
                </td>
                {columns.map((c, j) => (
                  <td
                    key={j}
                    className={`px-3 py-3 align-middle ${c.align === 'right' ? 'text-right' : ''} ${
                      c.nowrap ? 'whitespace-nowrap' : ''
                    }`}
                  >
                    {c.render(r)}
                  </td>
                ))}
                <td className="px-3 py-3 text-right">
                  <RowActions onRemove={onRemove ? () => onRemove(r) : undefined} />
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + 2}
                  className="text-center py-14 text-[12.5px] text-slate-500 dark:text-[#7a8ba3]"
                >
                  <Inbox className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  No matches.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="px-5 py-3 border-t border-slate-100 dark:border-[#262831] text-[12px] text-slate-500 dark:text-[#7a8ba3]">
        {pagination ? (
          <Pager pagination={pagination} visibleCount={filtered.length} />
        ) : (
          <span>
            Showing <span className="font-semibold text-[#172560] dark:text-white">{filtered.length}</span> of {count}
          </span>
        )}
      </footer>
    </section>
  );
}

function FilterDropdown({
  label, value, options, onChange,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (v: string | null) => void;
}) {
  return (
    <Select
      value={value || "ALL"}
      onValueChange={(val) => onChange(val === "ALL" ? null : val)}
    >
      <SelectTrigger className="h-9 pl-3 pr-8 rounded-lg text-[12.5px] border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[#172560] dark:text-white focus:ring-2 focus:ring-[#0B1957]/30 shadow-none">
        <SelectValue placeholder={`${label}: All`} />
      </SelectTrigger>
      
      <SelectContent className="bg-white dark:bg-[#000724] border-slate-200 dark:border-[#262831]">
        <SelectItem
          value="ALL"
          className="text-[12.5px] cursor-pointer focus:bg-primary/95 focus:text-white data-[state=checked]:bg-primary/95 data-[state=checked]:text-white"
        >
          {label}: All
        </SelectItem>
        {options.map((o) => (
          <SelectItem
            key={o.value}
            value={o.value}
            className="text-[12.5px] cursor-pointer focus:bg-primary/95 focus:text-white data-[state=checked]:bg-primary/95 data-[state=checked]:text-white"
          >
            {label}: {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Reusable name+title row cell ────────────────────────────────────────
function NameCell({ row, withCompany = false }: { row: CrmContact; withCompany?: boolean }) {
  // Join only the parts that exist. Interpolating `${title} · ${company}`
  // unconditionally rendered the separator even when both were empty, so a
  // contact with neither showed a lone "·" under its name (and one with only
  // a company showed a leading " · Acme"). Same "decoration rendered for
  // absent data" shape as the "-" placeholder fixes in the columns below.
  const subtitle = (withCompany ? [row.title, row.company] : [row.title])
    .filter((v) => v && String(v).trim())
    .join(' · ');
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <CrmAvatar name={row.name} initials={row.initials} />
      <div className="min-w-0 max-w-[260px] sm:max-w-[320px]">
        <p className="text-[12.5px] font-semibold text-[#172560] dark:text-white truncate">{row.name}</p>
        {/* Kept rendered even when empty so row heights stay aligned. */}
        <p className="text-[11px] text-slate-500 dark:text-[#7a8ba3] truncate" title={subtitle}>
          {subtitle}
        </p>
      </div>
    </div>
  );
}

// ── ALL CONTACTS ────────────────────────────────────────────────────────
export function AllContactsTable({
  rows, onSelect, onRemove, pagination, onSearchChange, onSortChange,
}: { rows: CrmContact[]; onSelect: (c: CrmContact) => void; onRemove?: (c: CrmContact) => void; pagination?: CrmPagination; onSearchChange?: (q: string) => void; onSortChange?: CrmTableProps<CrmContact>['onSortChange'] }) {
  const columns: Column<CrmContact>[] = [
    { label: 'Contact', nowrap: true, render: (r) => <NameCell row={r} /> },
    { label: 'Type',    render: (r) => <TypePill type={r.type} /> },
    { label: 'Source',  render: (r) => <span className="text-[12px] text-slate-600 dark:text-[#7a8ba3]">{r.source}</span> },
    {
      label: 'Company',
      render: (r) => r.company
        ? <span className="text-[12px] text-[#172560] dark:text-white">{r.company}</span>
        : <span className="text-[11.5px] text-slate-400">-</span>,
    },
    { label: 'Email',   render: (r) => <EmailCell email={r.email} verified={r.emailVerified} /> },
    { label: 'Phone',   render: (r) => <PhoneCell phone={r.phone} verified={r.phoneVerified} /> },
    { label: 'Channels',render: (r) => <ChannelChips channels={r.channels} /> },
    { label: 'Owner',   nowrap: true, render: (r) => <OwnerCell ownerId={r.owner} /> },
    {
      label: 'Last activity', sortable: true, nowrap: true,
      sortKey: (r) => r.lastActivityAt, serverSortKey: 'last_event_at',
      render: (r) => (
        <span className="text-[12px] tabular-nums text-slate-600 dark:text-[#7a8ba3]" title={r.lastActivityAt ?? ''}>
          {r.lastActivityAt ? `${rel(r.lastActivityAt)} ago` : '-'}
        </span>
      ),
    },
    {
      label: 'Created', sortable: true, nowrap: true,
      sortKey: (r) => r.createdAt, serverSortKey: 'created_at',
      render: (r) => (
        <span className="text-[12px] text-slate-500 dark:text-[#7a8ba3] tabular-nums">
          {fmtDate(r.createdAt)}
        </span>
      ),
    },
  ];
  const filters: FilterDef[] = [
    {
      key: 'type', label: 'Type',
      // lifecycleToType (adapt.ts) — the only place that ever computes a
      // real contact's `type` — exclusively returns 'prospect' | 'lead' |
      // 'client'. 'imported'/'inbound' are still valid ContactType values
      // (used by data.ts's unused legacy fixture rows) but no live prospect
      // can ever have one, so those 2 options always produced
      // "No matches." — same dead-option shape as the Owner/CSM and Leads
      // Stage filter fixes above.
      options: [
        { value: 'prospect', label: 'Prospects' },
        { value: 'lead',     label: 'Leads' },
        { value: 'client',   label: 'Clients' },
      ],
    },
    {
      key: 'owner', label: 'Owner',
      // Derived from the actual rows, same as the Industry filter above —
      // was a hardcoded CRM_OWNERS list that offered 4 names no real
      // contact is ever assigned to (toCrmContact always sets owner: ''),
      // so every option silently produced "No matches." regardless of
      // which one you picked.
      options: [...new Set(rows.map((r) => r.owner).filter(Boolean))].map((id) => ({
        value: id as string,
        label: CRM_OWNERS[id as string]?.name || (id as string),
      })),
    },
  ];
  return (
    <CrmTable
      title="All Contacts"
      subtitle="Every contact in this tenant: imported, prospected, inbound, and customer."
      count={rows.length}
      columns={columns}
      rows={rows}
      filters={filters}
      onRowClick={onSelect}
      onRemove={onRemove}
      pagination={pagination}
      onSearchChange={onSearchChange}
      onSortChange={onSortChange}
    />
  );
}

// ── PROSPECTS ───────────────────────────────────────────────────────────
export function ProspectsTable({
  rows, onSelect, onRemove, pagination, onSearchChange, onSortChange,
}: { rows: CrmContact[]; onSelect: (c: CrmContact) => void; onRemove?: (c: CrmContact) => void; pagination?: CrmPagination; onSearchChange?: (q: string) => void; onSortChange?: CrmTableProps<CrmContact>['onSortChange'] }) {
  const columns: Column<CrmContact>[] = [
    { label: 'Prospect', nowrap: true, render: (r) => <NameCell row={r} withCompany /> },
    {
      label: 'Industry',
      render: (r) => r.industry
        ? <span className="text-[12px] text-[#172560] dark:text-white">{r.industry}</span>
        : <span className="text-[11.5px] text-slate-400">-</span>,
    },
    {
      label: 'Geo',
      render: (r) => r.geo
        ? <span className="text-[12px] text-slate-600 dark:text-[#7a8ba3]">{r.geo}</span>
        : <span className="text-[11.5px] text-slate-400">-</span>,
    },
    { label: 'Fit',      sortable: true, sortKey: (r) => r.fit, serverSortKey: 'fit_score', render: (r) => (r.fit != null ? <ScoreBar value={r.fit} /> : <span className="text-[11.5px] text-slate-400">-</span>) },
    {
      label: 'Intent',
      render: (r) => {
        // toCrmContact never sets intentSignals (adapt.ts) — there's no
        // Master Agent intent source wired up yet (see ProspectFixture's
        // own `intent_signals: []` comment) — so it's always undefined for
        // real data, not a genuine 0. `?? 0` was rendering every prospect
        // as "0 signals" in a colored badge indistinguishable from a real
        // "checked and found none" result.
        if (r.intentSignals == null) return <span className="text-[11.5px] text-slate-400">-</span>;
        const n = r.intentSignals;
        return (
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium"
            style={{
              background: n > 0 ? '#fef3c7' : '#f1f5f9',
              color: n > 0 ? '#a16207' : '#64748b',
            }}
          >
            <Radio className="w-3 h-3" /> {n} signal{n === 1 ? '' : 's'}
          </span>
        );
      },
    },
    {
      label: 'Warm path',
      render: (r) =>
        r.warmPath ? (
          <span
            className="inline-flex items-center gap-1 text-[12px] font-medium"
            style={{ color: T.primary }}
          >
            <Route className="w-3 h-3" />
            {r.warmPath}
          </span>
        ) : (
          <span className="text-[11.5px] text-slate-400">-</span>
        ),
    },
    { label: 'Channels', render: (r) => <ChannelChips channels={r.channels} /> },
    { label: 'Source',   render: (r) => <span className="text-[12px] text-slate-600 dark:text-[#7a8ba3]">{r.source}</span> },
    { label: 'Owner',    nowrap: true, render: (r) => <OwnerCell ownerId={r.owner} /> },
    {
      label: 'Last touch', sortable: true, nowrap: true,
      sortKey: (r) => r.lastActivityAt, serverSortKey: 'last_event_at',
      render: (r) => (
        <span className="text-[12px] tabular-nums text-slate-600 dark:text-[#7a8ba3]">
          {r.lastActivityAt ? `${rel(r.lastActivityAt)} ago` : '-'}
        </span>
      ),
    },
  ];
  const filters: FilterDef[] = [
    {
      key: 'industry', label: 'Industry',
      options: [...new Set(rows.map((r) => r.industry).filter(Boolean))].map((v) => ({
        value: v as string,
        label: v as string,
      })),
    },
    {
      key: 'owner', label: 'Owner',
      options: [...new Set(rows.map((r) => r.owner).filter(Boolean))].map((id) => ({
        value: id as string,
        label: CRM_OWNERS[id as string]?.name || (id as string),
      })),
    },
  ];
  return (
    <CrmTable
      title="Prospects"
      subtitle="Top-of-funnel. Sourced from Apollo, LinkedIn Sales Nav, imports, or referrals. Not yet qualified."
      count={rows.length}
      columns={columns}
      rows={rows}
      filters={filters}
      onRowClick={onSelect}
      onRemove={onRemove}
      pagination={pagination}
      onSearchChange={onSearchChange}
      onSortChange={onSortChange}
    />
  );
}

// ── LEADS ───────────────────────────────────────────────────────────────
export function LeadsTable({
  rows, onSelect, onRemove, pagination, onSearchChange, onSortChange,
}: { rows: CrmContact[]; onSelect: (c: CrmContact) => void; onRemove?: (c: CrmContact) => void; pagination?: CrmPagination; onSearchChange?: (q: string) => void; onSortChange?: CrmTableProps<CrmContact>['onSortChange'] }) {
  // A sum across many rows is correct either way (undefined contributes 0 to
  // the total regardless of what it "means"), but if not a single row has a
  // real value yet, summing to a literal AED 0 reads as "this pipeline was
  // assessed at zero" rather than "no deal values exist yet" — same
  // distinction the row-level Value/Weighted cells below now make.
  const anyValueSet = rows.some((r) => r.value != null);
  const totalPipeline = rows.reduce((a, r) => a + (r.value || 0), 0);
  const weighted = rows.reduce((a, r) => a + (r.value || 0) * (r.probability || 0), 0);
  const columns: Column<CrmContact>[] = [
    { label: 'Lead', nowrap: true, render: (r) => <NameCell row={r} withCompany /> },
    { label: 'Stage', render: (r) => <StagePill stage={r.stage} /> },
    {
      label: 'Value', align: 'right', sortable: true, nowrap: true,
      sortKey: (r) => r.value,
      // toCrmContact never sets value/probability for real leads (no deal
      // pipeline data exists in prospect_state yet) — `?? 0` was rendering
      // "AED 0" / a 0% ScoreBar on every real lead, indistinguishable from
      // a deal genuinely assessed at zero value/probability.
      render: (r) => (
        <span className="text-[12.5px] font-semibold tabular-nums text-[#172560] dark:text-white">
          {r.value != null ? fmtCurrency(r.value) : <span className="text-[11.5px] text-slate-400 font-normal">-</span>}
        </span>
      ),
    },
    {
      label: 'Probability', sortable: true, sortKey: (r) => r.probability,
      render: (r) => (r.probability != null ? <ScoreBar value={r.probability} color="#16a34a" /> : <span className="text-[11.5px] text-slate-400">-</span>),
    },
    {
      label: 'Weighted', align: 'right', nowrap: true,
      render: (r) => (
        <span className="text-[12px] tabular-nums text-slate-600 dark:text-[#7a8ba3]">
          {r.value != null && r.probability != null ? fmtCurrency(r.value * r.probability) : '-'}
        </span>
      ),
    },
    { label: 'Source',    render: (r) => <span className="text-[12px] text-slate-600 dark:text-[#7a8ba3]">{r.source}</span> },
    { label: 'Next step', render: (r) => <span className="text-[12px] text-[#172560] dark:text-white">{r.nextStep || '-'}</span> },
    {
      label: 'Expected close', sortable: true, nowrap: true,
      sortKey: (r) => r.expectedClose,
      render: (r) => (
        <span className="text-[12px] tabular-nums text-slate-600 dark:text-[#7a8ba3]">
          {fmtDate(r.expectedClose)}
        </span>
      ),
    },
    { label: 'Owner', nowrap: true, render: (r) => <OwnerCell ownerId={r.owner} /> },
    {
      label: 'Last activity', sortable: true, nowrap: true,
      sortKey: (r) => r.lastActivityAt, serverSortKey: 'last_event_at',
      render: (r) => (
        <span className="text-[12px] tabular-nums text-slate-600 dark:text-[#7a8ba3]">
          {r.lastActivityAt ? `${rel(r.lastActivityAt)} ago` : '-'}
        </span>
      ),
    },
  ];
  const filters: FilterDef[] = [
    {
      key: 'stage', label: 'Stage',
      // LeadsTable only ever receives type === 'lead' rows (page.tsx), and
      // lifecycleToType (adapt.ts) only maps 'qualified'/'sah' to 'lead' —
      // 'new'/'contacted'/'engaged' are always type 'prospect'. Listing them
      // here meant picking "Contacted" or "Engaged" always produced
      // "No matches.", the same dead-option shape as the Owner/CSM filter
      // fix above.
      options: [
        { value: 'qualified', label: 'Qualified' },
        { value: 'sah',       label: 'Handed off' },
      ],
    },
    {
      key: 'owner', label: 'Owner',
      options: [...new Set(rows.map((r) => r.owner).filter(Boolean))].map((id) => ({
        value: id as string,
        label: CRM_OWNERS[id as string]?.name || (id as string),
      })),
    },
  ];
  const subtitle = (
    <>
      Pipeline: <span className="font-semibold text-[#172560] dark:text-white">{anyValueSet ? fmtCurrency(totalPipeline) : '-'}</span>
      {' · '}
      Weighted: <span className="font-semibold text-[#172560] dark:text-white">{anyValueSet ? fmtCurrency(weighted) : '-'}</span>
    </>
  );
  return (
    <CrmTable
      title="Leads"
      subtitle={subtitle}
      count={rows.length}
      columns={columns}
      rows={rows}
      filters={filters}
      onRowClick={onSelect}
      onRemove={onRemove}
      pagination={pagination}
      onSearchChange={onSearchChange}
      onSortChange={onSortChange}
    />
  );
}

// ── CLIENTS ─────────────────────────────────────────────────────────────
export function ClientsTable({
  rows, onSelect, onRemove, pagination, onSearchChange, onSortChange,
}: { rows: CrmContact[]; onSelect: (c: CrmContact) => void; onRemove?: (c: CrmContact) => void; pagination?: CrmPagination; onSearchChange?: (q: string) => void; onSortChange?: CrmTableProps<CrmContact>['onSortChange'] }) {
  const anyMrrSet = rows.some((r) => r.mrr != null);
  const totalMrr = rows.reduce((a, r) => a + (r.mrr || 0), 0);
  const totalArr = totalMrr * 12;
  const columns: Column<CrmContact>[] = [
    { label: 'Client', nowrap: true, render: (r) => <NameCell row={r} withCompany /> },
    {
      label: 'Plan',
      // toCrmContact never sets plan for real clients — rendering undefined
      // produced a blank, colorless pill (background/color both fell to the
      // "else" branch, text empty) instead of the same "-" every other
      // unset field in this table already uses.
      render: (r) => {
        if (!r.plan) return <span className="text-[11.5px] text-slate-400">-</span>;
        return (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold"
            style={{
              background: r.plan === 'Enterprise' ? '#e8ebf7' : r.plan === 'Growth' ? '#dbeafe' : '#f1f5f9',
              color: r.plan === 'Enterprise' ? '#0B1957' : r.plan === 'Growth' ? '#1d4ed8' : '#475569',
            }}
          >
            {r.plan}
          </span>
        );
      },
    },
    {
      label: 'MRR', align: 'right', sortable: true, nowrap: true,
      sortKey: (r) => r.mrr,
      // Same distinguish-null-from-zero fix as Health/NPS above — no live
      // client data exists yet in prospect_state, so `?? 0` was rendering
      // every client's MRR as a real-looking "USD 0" (and ARR, derived from
      // it, the same).
      render: (r) => (
        <span className="text-[12.5px] font-semibold tabular-nums text-[#172560] dark:text-white">
          {r.mrr != null ? fmtCurrency(r.mrr, 'USD') : <span className="text-[11.5px] text-slate-400 font-normal">-</span>}
        </span>
      ),
    },
    {
      label: 'ARR', align: 'right', nowrap: true,
      render: (r) => (
        <span className="text-[12px] tabular-nums text-slate-600 dark:text-[#7a8ba3]">
          {r.mrr != null ? fmtCurrency(r.mrr * 12, 'USD') : '-'}
        </span>
      ),
    },
    {
      label: 'Health', sortable: true,
      sortKey: (r) => r.health,
      render: (r) => {
        // Distinguish "not yet scored" from a real 0: collapsing a missing
        // health score to 0 would paint every unscored client red/critical,
        // which is a worse-than-worst-case reading rather than an honest
        // "no data yet."
        if (r.health == null) return <span className="text-[11.5px] text-slate-400">-</span>;
        const h = r.health;
        return (
          <ScoreBar
            value={h / 100}
            color={h >= 75 ? '#16a34a' : h >= 50 ? '#eab308' : '#ef4444'}
          />
        );
      },
    },
    {
      label: 'NPS', align: 'right',
      render: (r) => {
        if (r.nps == null) return <span className="text-[11.5px] text-slate-400">-</span>;
        const n = r.nps;
        return (
          <span
            className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
            style={{
              color: n >= 9 ? '#16a34a' : n >= 7 ? '#0ea5e9' : '#dc2626',
              background: n >= 9 ? '#dcfce7' : n >= 7 ? '#e0f2fe' : '#fee2e2',
            }}
          >
            {n}
          </span>
        );
      },
    },
    { label: 'Channels', render: (r) => <ChannelChips channels={r.channels} /> },
    { label: 'CSM', nowrap: true, render: (r) => <OwnerCell ownerId={r.csm} /> },
    {
      label: 'Renewal', sortable: true, nowrap: true,
      sortKey: (r) => r.renewalDate,
      render: (r) => {
        if (!r.renewalDate) return <span className="text-[11.5px] text-slate-400">-</span>;
        // Real current time — NOT the frozen `NOW` (2026-05-27) that the mock
        // fixtures use. Days-until-renewal and the <60d "urgent" highlight must
        // be measured from today; against the frozen date every real renewal
        // would compute a wrong (and eventually negative) day count. Unreachable
        // today only because renewalDate isn't wired from prospect_state yet.
        const days = Math.round(
          (new Date(r.renewalDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
        );
        const isClose = days < 60;
        return (
          <div className="flex items-center gap-1.5">
            <span className="text-[12px] tabular-nums text-[#172560] dark:text-white">
              {fmtDate(r.renewalDate)}
            </span>
            <span
              className="text-[10.5px] font-medium"
              style={{ color: isClose ? '#dc2626' : '#64748b' }}
            >
              · {days}d
            </span>
          </div>
        );
      },
    },
    {
      label: 'Last contact', nowrap: true,
      render: (r) => (
        <span className="text-[12px] tabular-nums text-slate-600 dark:text-[#7a8ba3]">
          {r.lastActivityAt ? `${rel(r.lastActivityAt)} ago` : '-'}
        </span>
      ),
    },
  ];
  const filters: FilterDef[] = [
    {
      key: 'plan', label: 'Plan',
      options: [...new Set(rows.map((r) => r.plan).filter(Boolean))].map((v) => ({
        value: v as string,
        label: v as string,
      })),
    },
    {
      key: 'csm', label: 'CSM',
      options: [...new Set(rows.map((r) => r.csm).filter(Boolean))].map((id) => ({
        value: id as string,
        label: CRM_OWNERS[id as string]?.name || (id as string),
      })),
    },
  ];
  const subtitle = (
    <>
      MRR: <span className="font-semibold text-[#172560] dark:text-white">{anyMrrSet ? fmtCurrency(totalMrr, 'USD') : '-'}</span>
      {' · '}
      ARR: <span className="font-semibold text-[#172560] dark:text-white">{anyMrrSet ? fmtCurrency(totalArr, 'USD') : '-'}</span>
    </>
  );
  return (
    <CrmTable
      title="Clients"
      subtitle={subtitle}
      count={rows.length}
      columns={columns}
      rows={rows}
      filters={filters}
      onRowClick={onSelect}
      onRemove={onRemove}
      pagination={pagination}
      onSearchChange={onSearchChange}
      onSortChange={onSortChange}
    />
  );
}

// Re-export the empty-state icon if a parent wants to render their own table-less message.
export { LadCard, BadgeCheck };
