'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Clock, Copy, Check, Loader2, AlertTriangle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useSaveCall } from '@lad/frontend-features/sales-playbook';
import {
  ALL_QUESTIONS, Answers, COST_GROUPS, COLUMNS, CostSelection, CLOSE_FIELDS,
  PHASES, SOURCE_OPTIONS, TOTAL_BUDGET_SECONDS,
  costSummaryText, costTotals, leadHint, mmss, toNumber, toneOf,
} from './script';

const DRAFT_KEY = 'mrlad.playbook.draft.v1';
const RATE_KEY = 'mrlad.playbook.rate.v1';

const TONE_CHIP: Record<number, string> = {
  0: 'bg-muted text-muted-foreground border-transparent',
  1: 'bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600',
  2: 'bg-amber-50 text-amber-700 border-amber-300 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-700',
  3: 'bg-emerald-50 text-emerald-700 border-emerald-300 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-700',
};

interface DraftShape { answers: Answers; costing: CostSelection; phaseIx: number; elapsed: number }

function readDraft(): DraftShape {
  const empty: DraftShape = { answers: {}, costing: {}, phaseIx: 0, elapsed: 0 };
  if (typeof window === 'undefined') return empty;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return empty;
    const d = JSON.parse(raw) as Partial<DraftShape>;
    return {
      answers: d.answers ?? {}, costing: d.costing ?? {},
      phaseIx: d.phaseIx ?? 0, elapsed: d.elapsed ?? 0,
    };
  } catch { return empty; }
}

export default function CallSheet({ onSaved }: { onSaved?: () => void }) {
  const [hydrated, setHydrated] = useState(false);
  const [answers, setAnswers] = useState<Answers>({});
  const [costing, setCosting] = useState<CostSelection>({});
  const [phaseIx, setPhaseIx] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [ticking, setTicking] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const startedRef = useRef(false);

  const saveCall = useSaveCall();
  const phase = PHASES[phaseIx];
  const isLast = phaseIx === PHASES.length - 1;

  // Restore the draft after mount so SSR and the first client render match.
  useEffect(() => {
    const d = readDraft();
    let rate: { currency?: string; dayRate?: string } = {};
    try { rate = JSON.parse(window.localStorage.getItem(RATE_KEY) || '{}'); } catch { rate = {}; }
    setAnswers({
      date: new Date().toISOString().slice(0, 10),
      costCurrency: rate.currency || 'AED',
      costDayRate: rate.dayRate || '',
      ...d.answers,
    });
    setCosting(d.costing);
    setPhaseIx(d.phaseIx);
    setElapsed(d.elapsed);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify({ answers, costing, phaseIx, elapsed }));
    } catch { /* private mode — the call still runs, the draft just isn't kept */ }
  }, [hydrated, answers, costing, phaseIx, elapsed]);

  useEffect(() => {
    if (!ticking) return;
    const id = window.setInterval(() => setElapsed(e => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [ticking]);

  const totals = useMemo(() => costTotals(answers, costing), [answers, costing]);

  const setField = useCallback((key: string, value: string) => {
    setAnswers(a => ({ ...a, [key]: value }));
    if (!startedRef.current) { startedRef.current = true; setTicking(true); }
  }, []);

  const setRateField = useCallback((key: 'costCurrency' | 'costDayRate', value: string) => {
    setAnswers(a => {
      const next = { ...a, [key]: value };
      try {
        window.localStorage.setItem(RATE_KEY, JSON.stringify({
          currency: next.costCurrency, dayRate: next.costDayRate,
        }));
      } catch { /* the rate just won't carry to the next call */ }
      return next;
    });
  }, []);

  const money = useCallback((n: number) => {
    const cur = (answers.costCurrency || 'AED').toUpperCase();
    return `${cur} ${Math.round(n).toLocaleString('en-US')}`;
  }, [answers.costCurrency]);

  /** The record: every column, in the fixed order, plus the costing selection. */
  const buildRecord = useCallback((): Record<string, string> => {
    const rec: Record<string, string> = {};
    const t = costTotals(answers, costing);
    const theirs = toNumber(answers.costTheirMonthly);
    const derived: Answers = {
      ...answers,
      callLength: answers.callLength || mmss(elapsed),
      costSetupDays: t.days ? String(t.days) : '',
      costSetupTotal: t.setup ? String(Math.round(t.setup)) : '',
      costMonthlyTotal: t.monthly ? String(Math.round(t.monthly)) : '',
      costGap: theirs && t.monthly ? String(Math.round(t.monthly - theirs)) : '',
      costLines: costSummaryText(costing),
    };
    COLUMNS.forEach(([k]) => { rec[k] = (derived[k] || '').trim(); });
    return { ...rec, costingJson: JSON.stringify(costing) };
  }, [answers, costing, elapsed]);

  const copyRow = useCallback(async () => {
    const rec = buildRecord();
    const tsv = COLUMNS.map(([k]) => String(rec[k] || '').replace(/\t/g, ' ').replace(/\r?\n/g, '  ')).join('\t');
    try {
      await navigator.clipboard.writeText(tsv);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch { setSaveError('Could not reach the clipboard.'); }
  }, [buildRecord]);

  const handleSave = useCallback(async () => {
    const rec = buildRecord();
    if (!rec.prospectName && !rec.company) {
      setSaveError('Add a prospect name or company before saving.');
      return;
    }
    setSaveError(null);
    try {
      await saveCall.mutateAsync(rec);
      setTicking(false);
      const keepCurrency = answers.costCurrency;
      const keepRate = answers.costDayRate;
      setAnswers({
        date: new Date().toISOString().slice(0, 10),
        costCurrency: keepCurrency, costDayRate: keepRate,
      });
      setCosting({}); setPhaseIx(0); setElapsed(0);
      startedRef.current = false;
      try { window.localStorage.removeItem(DRAFT_KEY); } catch { /* nothing to clear */ }
      onSaved?.();
    } catch {
      setSaveError('Could not save to the records service. Use Copy row so nothing is lost.');
    }
  }, [buildRecord, saveCall, answers.costCurrency, answers.costDayRate, onSaved]);

  const answeredCount = ALL_QUESTIONS.filter(q => (answers[q.id] || '').trim()).length;
  const overBudget = elapsed > TOTAL_BUDGET_SECONDS;

  if (!hydrated) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Prospect header */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          {([
            ['prospectName', 'Prospect name', 'Ahmed Al Marzouqi'],
            ['company', 'Company', 'Company name'],
            ['industry', 'Industry', 'Retail, real estate…'],
            ['othersOnCall', 'Others on the call', 'Sales manager'],
          ] as const).map(([key, label, ph]) => (
            <div key={key} className="space-y-1">
              <label htmlFor={`f-${key}`} className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
              <input
                id={`f-${key}`} value={answers[key] || ''} placeholder={ph} autoComplete="off"
                onChange={e => setField(key, e.target.value)}
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
              />
            </div>
          ))}
          <div className="space-y-1">
            <label htmlFor="f-source" className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Source</label>
            <select
              id="f-source" value={answers.source || ''}
              onChange={e => setField('source', e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
            >
              <option value="">—</option>
              {SOURCE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label htmlFor="f-date" className="block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Date</label>
            <input
              id="f-date" type="date" value={answers.date || ''}
              onChange={e => setField('date', e.target.value)}
              className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        {/* Phase rail */}
        <nav aria-label="Call phases" className="lg:sticky lg:top-4 lg:self-start">
          <div className="mb-2 flex items-baseline justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">The call</span>
            <span className="text-[10px] font-semibold tabular-nums text-muted-foreground">{answeredCount} / {ALL_QUESTIONS.length}</span>
          </div>
          <ol className="space-y-0.5">
            {PHASES.map((p, i) => {
              const answered = p.qs.filter(q => (answers[q.id] || '').trim()).length;
              const value = answers[p.score.id];
              const done = answered === p.qs.length && !!value;
              return (
                <li key={p.key}>
                  <button
                    type="button" onClick={() => setPhaseIx(i)}
                    aria-current={i === phaseIx ? 'true' : undefined}
                    className={`flex w-full items-start gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted ${i === phaseIx ? 'bg-muted' : ''}`}
                  >
                    <span className={`mt-0.5 grid h-5 w-5 flex-none place-items-center rounded text-[11px] font-semibold ${
                      i === phaseIx ? 'bg-primary text-primary-foreground'
                        : done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                        : 'bg-muted text-muted-foreground'}`}>{i + 1}</span>
                    <span className="min-w-0">
                      <span className={`block text-sm font-semibold leading-tight ${i === phaseIx ? 'text-primary' : ''}`}>{p.name}</span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        {value
                          ? <span className={`rounded-full border px-1.5 py-px text-[10px] font-semibold ${TONE_CHIP[toneOf(p.score.id, value)]}`}>{value}</span>
                          : <span>{answered}/{p.qs.length} answered</span>}
                        <span>{p.mins} min</span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-3 border-t border-border pt-3">
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${Math.round((answeredCount / ALL_QUESTIONS.length) * 100)}%` }} />
            </div>
          </div>
        </nav>

        {/* Phase body */}
        <div>
          <div className="mb-5 flex flex-wrap items-end gap-4">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-widest text-primary">Phase {phaseIx + 1} of {PHASES.length}</div>
              <h2 className="mt-0.5 text-2xl font-bold tracking-tight">{phase.name}</h2>
            </div>
            <p className="ml-auto max-w-[34ch] text-sm text-muted-foreground sm:text-right">{phase.why}</p>
          </div>

          {phase.qs.map(q => {
            const n = ALL_QUESTIONS.findIndex(x => x.id === q.id) + 1;
            return (
              <div key={q.id} className="border-t border-border py-4">
                <div className="flex gap-3">
                  <span className="mt-0.5 flex-none text-xs font-semibold text-muted-foreground">Q{n}</span>
                  <p className="max-w-[60ch] text-[17px] font-medium leading-snug">{q.text}</p>
                </div>
                <div className="mt-2.5 sm:pl-9">
                  <label htmlFor={`a-${q.id}`} className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Response</label>
                  <textarea
                    id={`a-${q.id}`} rows={2} value={answers[q.id] || ''}
                    onChange={e => setField(q.id, e.target.value)}
                    className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm leading-relaxed focus:border-primary focus:outline-none"
                  />
                </div>
              </div>
            );
          })}

          {phase.worksheet && (
            <CostingWorksheet
              answers={answers} costing={costing} totals={totals} money={money}
              onToggle={(id, on) => setCosting(c => ({ ...c, [id]: { on, v: c[id]?.v ?? '' } }))}
              onValue={(id, v) => setCosting(c => ({ ...c, [id]: { on: c[id]?.on ?? true, v } }))}
              onRate={setRateField} onTheirs={v => setField('costTheirMonthly', v)}
            />
          )}

          {/* Per-phase score */}
          <div className="mt-5 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-card p-4">
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{phase.score.label}</div>
              {phase.score.note && <div className="mt-0.5 text-xs text-muted-foreground">{phase.score.note}</div>}
            </div>
            <div className="ml-auto flex flex-wrap gap-1.5">
              {phase.score.opts.map(([opt, tone]) => {
                const active = answers[phase.score.id] === opt;
                return (
                  <button
                    key={opt} type="button" aria-pressed={active}
                    onClick={() => setField(phase.score.id, active ? '' : opt)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      active ? `${TONE_CHIP[tone]} font-semibold` : 'border-border text-muted-foreground hover:border-muted-foreground'}`}
                  >{opt}</button>
                );
              })}
            </div>
          </div>

          {isLast && (
            <div className="mt-6 border-t-2 border-border pt-5">
              <h3 className="text-base font-bold">Close out</h3>
              <p className="mb-4 text-sm text-muted-foreground">Fill this while they are still on the line. This is the part your team reads.</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {CLOSE_FIELDS.map(([key, label]) => (
                  <div key={key}>
                    <label htmlFor={`c-${key}`} className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
                    <input
                      id={`c-${key}`} value={answers[key] || ''} autoComplete="off"
                      onChange={e => setField(key, e.target.value)}
                      className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-3 flex flex-wrap items-baseline gap-2 text-sm text-muted-foreground">
                <span className="text-[10px] font-bold uppercase tracking-wider">Suggested</span>
                <span>{leadHint(answers)}</span>
              </p>
              <div className="mt-4">
                <label htmlFor="c-followUpNotes" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Notes for follow up message</label>
                <textarea
                  id="c-followUpNotes" rows={3} value={answers.followUpNotes || ''}
                  onChange={e => setField('followUpNotes', e.target.value)}
                  placeholder="What to reference, and what to show first."
                  className="w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dock */}
      <div className="sticky bottom-0 z-20 -mx-4 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-b-lg">
        {saveError && (
          <p className="mb-2 flex items-center gap-2 text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 flex-none" />{saveError}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <div className="mr-auto flex flex-wrap items-center gap-1.5">
            <button
              type="button" onClick={() => setTicking(t => !t)}
              className={`flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs font-semibold tabular-nums ${
                overBudget ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}
            >
              <Clock className="h-3.5 w-3.5" />{mmss(elapsed)} / {mmss(TOTAL_BUDGET_SECONDS)}
            </button>
            {([['painScore', 'Pain'], ['budgetFit', 'Budget'], ['buildEffort', 'Build'], ['urgency', 'Urgency'], ['leadScore', 'Lead']] as const).map(([id, label]) => (
              <span key={id} className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TONE_CHIP[toneOf(id, answers[id])]}`}>
                {label} {answers[id] || '–'}
              </span>
            ))}
          </div>
          <button type="button" onClick={copyRow}
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Copied' : 'Copy row'}
          </button>
          <button type="button" disabled={phaseIx === 0} onClick={() => setPhaseIx(i => Math.max(0, i - 1))}
            className="flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm font-semibold disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />Back
          </button>
          {isLast ? (
            <button type="button" onClick={handleSave} disabled={saveCall.isPending}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-60">
              {saveCall.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {saveCall.isPending ? 'Saving…' : 'Save call record'}
            </button>
          ) : (
            <button type="button" onClick={() => setPhaseIx(i => Math.min(PHASES.length - 1, i + 1))}
              className="flex items-center gap-1 rounded-md bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Next<ChevronRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- costing worksheet ---------------- */

interface WorksheetProps {
  answers: Answers;
  costing: CostSelection;
  totals: ReturnType<typeof costTotals>;
  money: (n: number) => string;
  onToggle: (id: string, on: boolean) => void;
  onValue: (id: string, v: string) => void;
  onRate: (key: 'costCurrency' | 'costDayRate', v: string) => void;
  onTheirs: (v: string) => void;
}

function CostingWorksheet({ answers, costing, totals, money, onToggle, onValue, onRate, onTheirs }: WorksheetProps) {
  const theirs = toNumber(answers.costTheirMonthly);
  const gap = (() => {
    if (!totals.monthly) return { tone: 0 as const, msg: 'Tick the monthly lines to compare against what they named.' };
    if (!theirs) return { tone: 0 as const, msg: 'Enter the monthly figure they gave you in Q13 to see the gap.' };
    const d = totals.monthly - theirs;
    if (d <= 0) return { tone: 3 as const, msg: `Inside their range — ${money(-d)} of headroom on ${money(theirs)}.` };
    if (d <= theirs * 0.25) return { tone: 2 as const, msg: `Just over by ${money(d)}. Close enough to argue on value.` };
    return { tone: 1 as const, msg: `Over by ${money(d)} against the ${money(theirs)} they named. Rescope, or phase the build.` };
  })();

  return (
    <div className="mt-6 overflow-hidden rounded-lg border border-border bg-card">
      <div className="flex flex-wrap items-center gap-4 border-b border-border p-4">
        <div>
          <h3 className="text-base font-bold">What it takes to fit their setup</h3>
          <p className="text-xs text-muted-foreground">Tick what this prospect actually needs. Days &times; your rate, plus what recurs.</p>
        </div>
        <div className="ml-auto flex flex-wrap items-end gap-2">
          <div>
            <label htmlFor="ws-cur" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Currency</label>
            <input id="ws-cur" value={answers.costCurrency || ''} maxLength={4} autoComplete="off"
              onChange={e => onRate('costCurrency', e.target.value.toUpperCase())}
              className="w-16 rounded-md border border-border bg-background px-2 py-1 text-sm uppercase focus:border-primary focus:outline-none" />
          </div>
          <div>
            <label htmlFor="ws-rate" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Day rate</label>
            <input id="ws-rate" inputMode="decimal" placeholder="0" value={answers.costDayRate || ''} autoComplete="off"
              onChange={e => onRate('costDayRate', e.target.value)}
              className="w-24 rounded-md border border-border bg-background px-2 py-1 text-right text-sm tabular-nums focus:border-primary focus:outline-none" />
          </div>
        </div>
      </div>

      {COST_GROUPS.map(group => {
        const subtotal = group.lines.reduce((sum, l) => {
          const c = costing[l.id];
          if (!c?.on) return sum;
          return sum + (group.unit === 'days' ? toNumber(c.v) * totals.rate : toNumber(c.v));
        }, 0);
        return (
          <div key={group.key} className="border-t border-border first:border-t-0">
            <div className="flex items-baseline gap-3 bg-muted/50 px-4 py-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.name}</span>
              <span className="ml-auto text-xs font-semibold tabular-nums text-muted-foreground">
                {subtotal ? `${money(subtotal)}${group.unit === 'monthly' ? ' / mo' : ''}` : '—'}
              </span>
            </div>
            {group.lines.map(l => {
              const c = costing[l.id] ?? { on: false, v: '' };
              const amount = c.on ? (group.unit === 'days' ? toNumber(c.v) * totals.rate : toNumber(c.v)) : 0;
              return (
                <div key={l.id} className="flex items-center gap-3 border-t border-border px-4 py-2 hover:bg-muted/40">
                  <input id={`cb-${l.id}`} type="checkbox" checked={c.on}
                    onChange={e => onToggle(l.id, e.target.checked)}
                    className="h-4 w-4 flex-none accent-primary" />
                  <label htmlFor={`cb-${l.id}`} className="min-w-0 flex-1 cursor-pointer">
                    <span className={`block text-sm font-medium leading-tight ${c.on ? '' : 'text-muted-foreground'}`}>{l.name}</span>
                    <span className="block text-xs text-muted-foreground">{l.hint}</span>
                  </label>
                  <input
                    inputMode="decimal" value={c.v} disabled={!c.on}
                    placeholder={group.unit === 'days' ? 'days' : '/mo'}
                    aria-label={`${l.name} ${group.unit === 'days' ? 'days' : 'monthly amount'}`}
                    onChange={e => onValue(l.id, e.target.value)}
                    className="w-20 flex-none rounded-md border border-border bg-background px-2 py-1 text-right text-sm tabular-nums focus:border-primary focus:outline-none disabled:opacity-40" />
                  <span className="w-28 flex-none text-right text-sm font-semibold tabular-nums text-muted-foreground">
                    {amount ? money(amount) : '—'}
                  </span>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="grid grid-cols-1 gap-px border-t border-border bg-border sm:grid-cols-3">
        {([
          ['Build effort', String(totals.days || 0), 'days'],
          ['One-off setup', totals.setup ? money(totals.setup) : '—', totals.rate ? `at ${money(totals.rate)} a day` : 'set a day rate'],
          ['Every month', totals.monthly ? money(totals.monthly) : '—', 'recurring'],
        ] as const).map(([label, value, unit]) => (
          <div key={label} className="bg-card px-4 py-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
            <div className="mt-0.5 text-xl font-bold tabular-nums tracking-tight">{value}</div>
            <div className="text-xs text-muted-foreground">{unit}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border bg-muted/50 px-4 py-3">
        <div>
          <label htmlFor="ws-theirs" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Monthly they named</label>
          <input id="ws-theirs" inputMode="decimal" placeholder="0" value={answers.costTheirMonthly || ''} autoComplete="off"
            onChange={e => onTheirs(e.target.value)}
            className="w-28 rounded-md border border-border bg-background px-2 py-1 text-right text-sm tabular-nums focus:border-primary focus:outline-none" />
        </div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${TONE_CHIP[gap.tone]}`}>
          {gap.tone === 3 ? 'Fits' : gap.tone === 2 ? 'Tight' : gap.tone === 1 ? 'Over' : '—'}
        </span>
        <p className="min-w-[200px] flex-1 text-sm text-muted-foreground">{gap.msg}</p>
      </div>
    </div>
  );
}
