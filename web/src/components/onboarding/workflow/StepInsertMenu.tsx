'use client';
// Floating step picker opened by a node's hover "+" buttons.
//
// CustomWorkflowNode only knows WHERE a step should go - it dispatches
// 'addWorkflowStepAt' with the anchor node id and the side that was clicked.
// The host canvas owns WHAT can be added (its own palette, plus any per-node
// launch config it has to seed), so it supplies the items and renders this.
//
// Positioned fixed at the clicked button and clamped to the viewport: the
// builder is hosted in a z-index:10000 overlay, hence the high default z.

import React, { useEffect, useRef, useState } from 'react';
import { ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

export interface InsertMenuItem {
  key: string;
  label: string;
  sub?: string;
  icon?: React.ReactNode;
  /** Tailwind classes for the icon chip background. */
  chip?: string;
  /** Section heading this item sits under. */
  group?: string;
  /** Already on the canvas - shown greyed with `hint` instead of being added. */
  disabled?: boolean;
  hint?: string;
  onSelect: () => void;
}

const PANEL_W = 268;
const PANEL_MAX_H = 340;

export function StepInsertMenu({
  x, y, position, items, onClose, zIndex = 10060,
}: {
  /** Viewport coords of the "+" that was clicked. */
  x: number;
  y: number;
  position: 'before' | 'after';
  items: InsertMenuItem[];
  onClose: () => void;
  zIndex?: number;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [height, setHeight] = useState(PANEL_MAX_H);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    if (panelRef.current) setHeight(panelRef.current.offsetHeight || PANEL_MAX_H);
  }, [items.length]);

  const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
  const left = Math.min(Math.max(8, x - PANEL_W / 2), Math.max(8, vw - PANEL_W - 8));
  // Prefer opening downward; flip up when there is no room below.
  const top = y + 12 + height > vh - 8 ? Math.max(8, y - 12 - height) : y + 12;

  // Group items in first-seen order, keeping ungrouped ones at the top.
  const groups: { name: string; items: InsertMenuItem[] }[] = [];
  for (const it of items) {
    const name = it.group || '';
    const bucket = groups.find((g) => g.name === name);
    if (bucket) bucket.items.push(it);
    else groups.push({ name, items: [it] });
  }

  return (
    <>
      {/* Click-away catcher */}
      <div className="fixed inset-0" style={{ zIndex: zIndex - 1 }} onClick={onClose} onContextMenu={(e) => { e.preventDefault(); onClose(); }} />
      <div
        ref={panelRef}
        className="fixed rounded-xl border border-border dark:border-blue-950/40 bg-popover dark:bg-[#071131] shadow-2xl overflow-hidden"
        style={{ left, top, width: PANEL_W, zIndex }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border dark:border-blue-950/40 bg-muted/40 dark:bg-[#0b1739]">
          {position === 'before'
            ? <ArrowUpFromLine className="h-3.5 w-3.5 text-muted-foreground dark:text-slate-400" />
            : <ArrowDownToLine className="h-3.5 w-3.5 text-muted-foreground dark:text-slate-400" />}
          <span className="text-[12px] font-semibold text-foreground dark:text-white">
            {position === 'before' ? 'Add input step' : 'Add output step'}
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground dark:text-slate-400">
            {position === 'before' ? 'runs before' : 'runs after'}
          </span>
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: PANEL_MAX_H - 38 }}>
          {groups.map((g) => (
            <div key={g.name || '_'}>
              {g.name && (
                <div className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground dark:text-slate-400">
                  {g.name}
                </div>
              )}
              {g.items.map((it) => (
                <button
                  key={it.key}
                  type="button"
                  disabled={it.disabled}
                  onClick={() => { if (!it.disabled) { it.onSelect(); onClose(); } }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    it.disabled ? 'opacity-45 cursor-not-allowed' : 'hover:bg-muted/60 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {it.icon && (
                    <span className={`h-7 w-7 rounded-lg flex items-center justify-center flex-shrink-0 ${it.chip || 'bg-muted dark:bg-slate-800'}`}>
                      {it.icon}
                    </span>
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium text-foreground dark:text-slate-100 truncate">{it.label}</span>
                    {(it.disabled && it.hint ? it.hint : it.sub) && (
                      <span className="block text-[11px] text-muted-foreground dark:text-slate-400 truncate">
                        {it.disabled && it.hint ? it.hint : it.sub}
                      </span>
                    )}
                  </span>
                </button>
              ))}
            </div>
          ))}
          {items.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted-foreground dark:text-slate-400">Nothing to add here.</div>
          )}
        </div>
      </div>
    </>
  );
}

export default StepInsertMenu;
