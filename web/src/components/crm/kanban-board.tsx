'use client';
// Kanban view shown when CRM view = "board". Five stages, navy-themed cards
// matching the existing PipelineStageColumn pattern. Card click opens the
// prospect detail below.

import * as React from 'react';
import { Plus, Sparkles, Route, Inbox } from 'lucide-react';
import { CH, T, fmtCurrency, rel } from './shared';
import type { KanbanLead, LifecycleStage } from './data';

export interface KanbanBoardProps {
  stages: { key: LifecycleStage; label: string }[];
  leads: KanbanLead[];
  selectedLeadId: string | null;
  onSelectLead: (id: string) => void;
  onAddDeal?: (stageKey: LifecycleStage) => void;
  /**
   * The stage's real tenant-wide count. `leads` only ever holds the current
   * 50-row page, so counting it gave a column header that looked authoritative
   * but capped at the page size — a tenant with 550 "new" prospects read
   * "New 38" directly beneath an "All Contacts 571" card. When a total is
   * supplied the header shows it, and the subheader says how many of them are
   * actually on this page.
   */
  stageTotals?: Partial<Record<LifecycleStage, number>>;
  /**
   * We could not load the pipeline at all. Without this the board falls back to
   * counting `leads` — which during an outage is an empty array — and every
   * column confidently reads 0, on the DEFAULT view, while the summary cards
   * directly above correctly read "—".
   */
  unavailable?: boolean;
}

export default function KanbanBoard({ stages = [], leads = [], selectedLeadId, onSelectLead, onAddDeal, stageTotals, unavailable = false }: KanbanBoardProps) {
  return (
    <div className="overflow-x-auto -mx-4 sm:-mx-6 px-4 sm:px-6 pb-1">
      <div className="flex gap-3 min-w-max">
        {stages.map((s) => {
          const stageKey = s.key || (s as any).id;
          const stageLeads = (leads || []).filter((l) => {
            const lStage = l.stageKey || (l as any).stage || (l as any).stage_key;
            return lStage === stageKey;
          });
          const pipelineValue = stageLeads.reduce((a, l) => a + (l.value || 0), 0);
          // Deal value isn't tracked in prospect_state at all today, so every
          // lead's `value` is undefined — summing undefineds trivially gives
          // 0, which read as "these deals are worth nothing" rather than the
          // true "we don't know yet".
          const anyValueTracked = stageLeads.some((l) => l.value != null);
          // `stageLeads` is this page's slice; `stageTotal` is the whole tenant.
          const loaded = stageLeads.length;
          const stageTotal = stageTotals?.[stageKey as LifecycleStage];
          const headerCount = stageTotal ?? loaded;
          const truncated = stageTotal != null && stageTotal > loaded;

          return (
            <div
              key={stageKey}
              /* Column container */
              className="w-[260px] sm:w-[280px] shrink-0 rounded-xl p-3 bg-[#f9fafb] dark:bg-[#071131] flex flex-col"
              style={{ boxShadow: '0 4px 6px -1px rgba(0,0,0,0.06)' }}
            >
              <div className="flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2 min-w-0">
                  <h3
                    className="text-[15px] font-semibold text-[#172560] dark:text-white truncate"
                    style={{ fontFamily: '"Space Grotesk", system-ui' }}
                  >
                    {s.label}
                  </h3>
                  <span
                    className="inline-flex dark:bg-[#2563eb] dark:text-white items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium tabular-nums"
                  >
                    {unavailable ? '—' : headerCount}
                  </span>
                </div>
                {onAddDeal && (
                  <button
                    onClick={() => onAddDeal(stageKey)}
                    className="w-6 h-6 grid place-items-center rounded-md text-slate-400 hover:bg-white dark:hover:bg-[#121c3b] hover:text-[#172560] dark:hover:text-white transition-colors"
                    aria-label={`Add deal to ${s.label}`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Subheader */}
              <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1 mb-2">
                {unavailable
                  ? 'could not be loaded'
                  : headerCount === 0
                  ? 'AED 0 pipeline'
                  : anyValueTracked
                    ? `${fmtCurrency(pipelineValue)} pipeline`
                    : truncated
                      ? `${loaded} of ${headerCount} on this page · value not tracked`
                      : `${headerCount} deal${headerCount === 1 ? '' : 's'} · value not tracked`}
              </p>

              {stageLeads.length > 0 ? (
                <div className="space-y-2">
                  {stageLeads.map((l) => (
                    <LeadCard
                      key={l.id}
                      lead={l}
                      selected={selectedLeadId === l.id}
                      onClick={() => onSelectLead(l.id)}
                    />
                  ))}
                </div>
              ) : (
                /* Empty State matching target design rendered at the top right below subheader */
                <div className="mt-2 flex flex-col items-center justify-center py-8 px-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700/80 text-center bg-white/40 dark:bg-slate-900/40">
                  <div className="w-10 h-10 rounded-full border border-slate-300 dark:border-slate-700 grid place-items-center mb-3 text-slate-400 dark:text-slate-400">
                    <Inbox className="w-5 h-5 text-slate-400 dark:text-slate-400" />
                  </div>
                  <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200 mb-1">
                    {unavailable ? 'Not loaded' : truncated ? 'None on this page' : 'No deals here'}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[180px] leading-tight mb-6">
                    {unavailable
                      ? "We couldn't load this pipeline — this isn't an empty stage."
                      : truncated
                        ? `All ${headerCount} are on other pages — open this stage from the list view to see them.`
                        : 'Add deals to move them to the next stage.'}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LeadCard({
  lead, selected, onClick,
}: { lead: KanbanLead; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left bg-white dark:bg-[#000724] rounded-xl px-3 py-3 border transition-all ${
        selected
          ? 'border-[#0B1957] ring-2 ring-[#0B1957]/30 shadow-md'
          : 'border-slate-200 dark:border-[#262831] hover:border-[#0B1957]/40 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start gap-2.5">
        <div
          className="w-8 h-8 rounded-full grid place-items-center text-white text-[11px] font-semibold shrink-0"
          style={{ background: `linear-gradient(135deg, ${lead.tone || '#0B1957'}, ${T.primary})` }}
        >
          {lead.initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[13px] font-semibold text-[#172560] dark:text-white truncate">{lead.name}</p>
            {lead.value != null && (
              <span className="text-[11px] font-medium text-[#0B1957] dark:text-[#a5b4fc] tabular-nums">
                {fmtCurrency(lead.value)}
              </span>
            )}
          </div>
          <p className="text-[11.5px] text-slate-500 dark:text-slate-300 truncate">{lead.company}</p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {(lead.channels || []).map((ch) => {
            const m = CH[ch];
            if (!m) return null;
            const Icon = m.Icon;
            return (
              <span
                key={ch}
                className="w-5 h-5 rounded-full grid place-items-center"
                style={{ background: `${m.color}1a` }}
                title={m.label}
              >
                <Icon className="w-3 h-3" style={{ color: m.color }} />
              </span>
            );
          })}
        </div>
        <div className="flex items-center gap-1.5">
          {lead.fit != null && (
            <span
              className="inline-flex dark:bg-[#2563eb] dark:text-white items-center gap-0.5 text-[10.5px] font-medium tabular-nums px-1.5 py-0.5 rounded-md"
            >
              <Sparkles className="w-2.5 h-2.5" /> {Math.round(lead.fit * 100)}
            </span>
          )}
          <span className="text-[10.5px] text-slate-400 tabular-nums">{rel(lead.lastAt)}</span>
        </div>
      </div>
      {lead.warmPath && (
        <p
          className="mt-2 text-[10.5px] font-medium flex items-center gap-1"
          style={{ color: T.primary }}
        >
          <Route className="w-3 h-3" /> Warm via {lead.warmPath}
        </p>
      )}
    </button>
  );
}
