'use client';

import React, { useMemo, useState } from 'react';
import { Download, Loader2, Search, ServerCrash, X } from 'lucide-react';
import { useCallRecords } from '@lad/frontend-features/sales-playbook';
import type { SavedCallRecord } from '@lad/frontend-features/sales-playbook';
import { buildCsv, downloadCsv } from '@/lib/csv';
import { CLOSE_FIELDS, COLUMNS, COST_FIELDS, HEAD_FIELDS, PHASES, toneOf } from './script';

const TONE_CHIP: Record<number, string> = {
  0: 'bg-muted text-muted-foreground border-transparent',
  1: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
  2: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700',
  3: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700',
};

function Chip({ id, value }: { id: string; value?: string }) {
  return (
    <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TONE_CHIP[toneOf(id, value)]}`}>
      {value || '–'}
    </span>
  );
}

function amount(record: SavedCallRecord, key: string): string {
  const raw = record[key];
  if (!raw) return '—';
  const n = Number(raw);
  if (!Number.isFinite(n)) return String(raw);
  return `${record.costCurrency || 'AED'} ${n.toLocaleString('en-US')}`;
}

export default function SavedCalls() {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState<SavedCallRecord | null>(null);
  const { data, isLoading, isError } = useCallRecords({ limit: 200 });

  const rows = useMemo(() => {
    const items = data?.items ?? [];
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(r =>
      `${r.prospectName || ''} ${r.company || ''} ${r.industry || ''}`.toLowerCase().includes(q));
  }, [data, search]);

  const exportCsv = () => {
    const header = COLUMNS.map(([, label]) => label);
    const body = rows.map(r => COLUMNS.map(([key]) => r[key] ?? ''));
    downloadCsv(`sales-playbook-${new Date().toISOString().slice(0, 10)}.csv`, buildCsv(header, body));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  // A failed fetch is not an empty list. Say which it is — a rep who reads
  // "no calls yet" when the service is down will re-enter a call they already
  // logged.
  if (isError) {
    return (
      <div className="rounded-lg border border-border bg-card p-10 text-center">
        <ServerCrash className="mx-auto mb-3 h-8 w-8 text-amber-600 dark:text-amber-400" />
        <h3 className="text-base font-bold">Saved calls could not be loaded</h3>
        <p className="mx-auto mt-1 max-w-[46ch] text-sm text-muted-foreground">
          The records service did not answer, so this list is unavailable — not empty.
          Running a call still works, and <strong>Copy row</strong> puts the record on your clipboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search prospect or company" aria-label="Search saved calls"
            className="w-64 rounded-md border border-border bg-background py-1.5 pl-8 pr-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <button type="button" onClick={exportCsv} disabled={!rows.length}
          className="ml-auto flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted disabled:opacity-40">
          <Download className="h-4 w-4" />Export CSV
        </button>
      </div>

      {!rows.length ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <h3 className="text-base font-bold">{search ? 'Nothing matched that search' : 'No calls saved yet'}</h3>
          <p className="mx-auto mt-1 max-w-[46ch] text-sm text-muted-foreground">
            {search
              ? 'Try the company name as it was typed on the call.'
              : 'Run a call on the first tab and press Save call record at the end of phase 8.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <table className="w-full min-w-[860px] border-collapse">
            <thead>
              <tr className="bg-muted/50">
                {['Prospect', 'Date', 'Pain', 'Budget', 'Build', 'Setup', 'Monthly', 'Urgency', 'Lead', 'Next action'].map(h => (
                  <th key={h} className="whitespace-nowrap border-b border-border px-3 py-2 text-left text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} className="border-b border-border last:border-b-0 hover:bg-muted/40">
                  <td className="px-3 py-2.5 align-top">
                    <button type="button" onClick={() => setOpen(r)} className="text-left text-sm font-semibold text-primary hover:underline">
                      {r.prospectName || 'Unnamed'}
                    </button>
                    <span className="block text-xs text-muted-foreground">
                      {r.company || '—'}{r.industry ? ` · ${r.industry}` : ''}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-top text-xs tabular-nums text-muted-foreground">{r.date || '—'}</td>
                  <td className="px-3 py-2.5 align-top"><Chip id="painScore" value={r.painScore} /></td>
                  <td className="px-3 py-2.5 align-top"><Chip id="budgetFit" value={r.budgetFit} /></td>
                  <td className="px-3 py-2.5 align-top"><Chip id="buildEffort" value={r.buildEffort} /></td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-top text-xs tabular-nums text-muted-foreground">{amount(r, 'costSetupTotal')}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 align-top text-xs tabular-nums text-muted-foreground">{amount(r, 'costMonthlyTotal')}</td>
                  <td className="px-3 py-2.5 align-top"><Chip id="urgency" value={r.urgency} /></td>
                  <td className="px-3 py-2.5 align-top"><Chip id="leadScore" value={r.leadScore} /></td>
                  <td className="px-3 py-2.5 align-top text-sm">
                    {r.agreedNextAction || '—'}
                    {r.nextActionDate && <span className="block text-xs text-muted-foreground">{r.nextActionDate}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {open && <RecordDetail record={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

function RecordDetail({ record, onClose }: { record: SavedCallRecord; onClose: () => void }) {
  const Row = ({ label, value }: { label: string; value?: string }) => (
    <div className="grid grid-cols-1 gap-1 border-t border-border py-2.5 sm:grid-cols-[190px_1fr] sm:gap-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`whitespace-pre-wrap text-sm ${value ? '' : 'italic text-muted-foreground'}`}>{value || 'not answered'}</dd>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Call record">
      <div className="w-full max-w-3xl rounded-lg border border-border bg-card shadow-xl">
        <div className="sticky top-0 flex items-start gap-4 rounded-t-lg border-b border-border bg-card px-5 py-4">
          <div>
            <h3 className="text-lg font-bold">{record.prospectName || 'Unnamed prospect'}</h3>
            <p className="text-xs text-muted-foreground">
              {[record.company, record.industry, record.date, record.callLength && `${record.callLength} on the call`].filter(Boolean).join('  ·  ')}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close"
            className="ml-auto rounded-md border border-border p-1.5 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-5 pb-5">
          <dl>
            {HEAD_FIELDS.map(([k, l]) => <Row key={k} label={l} value={record[k]} />)}
            {PHASES.map((p, i) => (
              <div key={p.key} className="mt-4 border-t-2 border-border pt-1">
                <div className="py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Phase {i + 1} · {p.name}
                </div>
                {p.qs.map(q => <Row key={q.id} label={q.col} value={record[q.id]} />)}
                {p.key !== 'next' && <Row label={p.score.col} value={record[p.score.id]} />}
              </div>
            ))}
            <div className="mt-4 border-t-2 border-border pt-1">
              <div className="py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Close out</div>
              {CLOSE_FIELDS.map(([k, l]) => <Row key={k} label={l} value={record[k]} />)}
              <Row label="Lead Score" value={record.leadScore} />
              <Row label="Follow Up Notes" value={record.followUpNotes} />
            </div>
            <div className="mt-4 border-t-2 border-border pt-1">
              <div className="py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Costing</div>
              {COST_FIELDS.map(([k, l]) => <Row key={k} label={l} value={record[k]} />)}
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
