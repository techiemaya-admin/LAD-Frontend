'use client';
// R8 Phase 3 redesign — split-layout ICP discovery used by the wizard.
//
// Left column: a guided question/answer chat with a terse voice. The chat is
// client-side controlled; questions come from icpQuestions.ts, no backend
// playground involved. Pills/chips/ranges produce structured values directly.
//
// Right column: IcpLivePreview reads the in-progress IcpStructured and renders
// each filled section so the tenant sees the ICP take shape as they answer.
//
// On the last answer, fires saveBusinessProfile + createIcpDefinition +
// PATCH /api/onboarding/state. The wizard's useActiveIcpDefinition observer
// then auto-advances to Review.
//
// The profile write is NOT optional: answers land in two stores. IcpStructured
// (via createIcpDefinition) feeds the search dispatcher; BusinessProfile (via
// useBusinessProfile) feeds Settings, lead scoring, and message generation.
// Writing only the first is what left Settings → Business Profile blank.

import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Check, AlertCircle, Loader2, ArrowLeft } from 'lucide-react';
import {
  createIcpDefinition,
  useBusinessProfile,
  type BusinessProfile,
  type IcpStructured,
} from '@lad/frontend-features/ai-icp-assistant';

import {
  ICP_QUESTIONS,
  emptyIcp,
  parseChips,
  type AnswerValue,
  type IcpQuestion,
} from './icpQuestions';
import IcpLivePreview from './IcpLivePreview';

interface ChatTurn {
  id: number;
  role: 'assistant' | 'user';
  content: React.ReactNode;
}

interface IcpDiscoveryChatProps {
  onBack: () => void;
  onSkip: () => void;
  /** Fired after the ICP is persisted so the wizard can advance to Review. */
  onComplete?: () => void;
}

export default function IcpDiscoveryChat({ onBack, onSkip, onComplete }: IcpDiscoveryChatProps) {
  const { save: saveProfile } = useBusinessProfile();
  const [icp, setIcp] = useState<IcpStructured>(emptyIcp);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [turns, setTurns] = useState<ChatTurn[]>([]);
  const [pillSelection, setPillSelection] = useState<string[]>([]);
  const [textInput, setTextInput] = useState('');
  const [rangeMin, setRangeMin] = useState('');
  const [rangeMax, setRangeMax] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [finished, setFinished] = useState(false);

  const turnIdRef = useRef(0);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // finalize() is invoked from a setTimeout scheduled inside the same handler
  // that records the final answer, so it closes over a pre-update render. Refs
  // give it the post-update values — without them the LAST question's answer
  // was silently dropped from everything we persist.
  const icpRef = useRef<IcpStructured>(icp);
  const profilePatchRef = useRef<Partial<BusinessProfile>>({});

  // Keep icpRef pointed at the committed state. advance() waits 250 ms before
  // calling finalize(), so this has always run by then.
  useEffect(() => {
    icpRef.current = icp;
  }, [icp]);

  /** Record one answer into both destinations. */
  function recordAnswer(q: IcpQuestion, value: AnswerValue) {
    if (q.apply) setIcp((prev) => q.apply!(value, prev));
    if (q.applyProfile) {
      profilePatchRef.current = { ...profilePatchRef.current, ...q.applyProfile(value) };
    }
  }

  const totalCount = ICP_QUESTIONS.length;
  const answeredCount = currentIdx;
  const progressPct = Math.round((answeredCount / totalCount) * 100);

  const currentQuestion: IcpQuestion | null =
    currentIdx < totalCount ? ICP_QUESTIONS[currentIdx] : null;

  // Push the first question on mount
  useEffect(() => {
    if (turns.length === 0 && currentQuestion) {
      pushAssistantTurn(currentQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll on new turn
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns]);

  // Reset per-question input state on advance
  useEffect(() => {
    setPillSelection([]);
    setTextInput('');
    setRangeMin('');
    setRangeMax('');
  }, [currentIdx]);

  function pushTurn(role: ChatTurn['role'], content: React.ReactNode) {
    turnIdRef.current += 1;
    setTurns((prev) => [...prev, { id: turnIdRef.current, role, content }]);
  }

  function pushAssistantTurn(q: IcpQuestion) {
    pushTurn(
      'assistant',
      <div>
        <p className="text-[13.5px] text-[#172560] dark:text-white font-medium">
          {q.prompt}
          {q.optional && (
            <span className="ml-1.5 text-[10px] uppercase tracking-wide font-medium text-slate-400 dark:text-[#7a8ba3]">
              optional
            </span>
          )}
        </p>
        {q.helper && (
          <p className="text-[11.5px] text-slate-500 dark:text-[#7a8ba3] mt-0.5">{q.helper}</p>
        )}
      </div>,
    );
  }

  function pushUserAnswer(display: React.ReactNode) {
    pushTurn('user', display);
  }

  // ── Answer handlers ─────────────────────────────────────────────────────
  function handleSubmitChips() {
    if (!currentQuestion) return;
    const parsed = parseChips(textInput);
    if (parsed.length === 0) return;
    recordAnswer(currentQuestion, parsed);
    pushUserAnswer(
      <div className="flex flex-wrap gap-1.5 justify-end">
        {parsed.map((p) => (
          <span
            key={p}
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-medium text-white"
            style={{ background: '#0B1957' }}
          >
            {p}
          </span>
        ))}
      </div>,
    );
    advance();
  }

  function handleSubmitPills() {
    if (!currentQuestion || pillSelection.length === 0) return;
    recordAnswer(currentQuestion, pillSelection);
    const labels = (currentQuestion.options ?? [])
      .filter((o) => pillSelection.includes(o.value))
      .map((o) => o.label);
    pushUserAnswer(
      <div className="flex flex-wrap gap-1.5 justify-end">
        {labels.map((l) => (
          <span
            key={l}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11.5px] font-medium text-white"
            style={{ background: '#0B1957' }}
          >
            <Check className="w-3 h-3" /> {l}
          </span>
        ))}
      </div>,
    );
    advance();
  }

  function handleSubmitRange() {
    if (!currentQuestion) return;
    const min = rangeMin ? Number(rangeMin) : undefined;
    const max = rangeMax ? Number(rangeMax) : undefined;
    if (min == null && max == null) return;
    const value = { min, max };
    recordAnswer(currentQuestion, value);
    const label =
      min != null && max != null ? `${min}–${max}` : min != null ? `${min}+` : `up to ${max}`;
    pushUserAnswer(
      <span
        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-medium text-white tabular-nums"
        style={{ background: '#0B1957' }}
      >
        {label} employees
      </span>,
    );
    advance();
  }

  function handleSubmitText() {
    if (!currentQuestion) return;
    const value = textInput.trim();
    if (!value) return;
    recordAnswer(currentQuestion, value);
    pushUserAnswer(
      <p className="text-[12.5px] text-[#172560] whitespace-pre-wrap break-words">{value}</p>,
    );
    advance();
  }

  function handleSkipQuestion() {
    if (!currentQuestion) return;
    pushUserAnswer(
      <span className="text-[12px] italic text-slate-400 dark:text-[#7a8ba3]/70">skipped</span>,
    );
    advance();
  }

  function advance() {
    const next = currentIdx + 1;
    if (next < totalCount) {
      setCurrentIdx(next);
      // Show the next question after a short beat so the user sees their answer first
      setTimeout(() => pushAssistantTurn(ICP_QUESTIONS[next]), 250);
    } else {
      setCurrentIdx(next);
      setTimeout(finalize, 250);
    }
  }

  async function finalize() {
    pushTurn(
      'assistant',
      <p className="text-[13.5px] text-[#172560] dark:text-white font-medium">
        Saving your ICP…
      </p>,
    );
    setSubmitting(true);
    setSubmitError(null);
    try {
      // 1. Business profile FIRST. The save is a merge on both ends (the hook
      //    merges onto the latest profile, the backend jsonb-merges), so it is
      //    idempotent and safe to repeat if step 2 fails and the user retries.
      //    Skipped entirely when every profile-bearing question was skipped.
      const patch = profilePatchRef.current;
      const meaningful = Object.fromEntries(
        Object.entries(patch).filter(([, v]) => typeof v === 'string' && v.trim().length > 0),
      ) as Partial<BusinessProfile>;
      if (Object.keys(meaningful).length > 0) {
        await saveProfile(meaningful);
      }

      // 2. ICP definition — read from the ref so the final answer is included.
      const finalIcp = icpRef.current;
      const definition = await createIcpDefinition({
        icp_definition: { ...finalIcp, metadata: { ...finalIcp.metadata, captured_at: new Date().toISOString() } },
        captured_via: 'signup_wizard',
      });
      fetch('/api/onboarding/state', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          icp_captured_at: new Date().toISOString(),
          icp_definition_id: definition.id,
        }),
      }).catch(() => { /* fire-and-forget */ });
      pushTurn(
        'assistant',
        <p className="text-[13.5px] text-[#172560] dark:text-white font-medium inline-flex items-center gap-1.5">
          <Check className="w-4 h-4" style={{ color: '#22c55e' }} /> ICP and business profile saved. Taking you to Review…
        </p>,
      );
      setFinished(true);
      // Tell the wizard to advance — useActiveIcpDefinition doesn't auto-refetch
      // after a mutation, so we can't rely on the observer alone.
      if (onComplete) setTimeout(onComplete, 700);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save ICP';
      setSubmitError(msg);
      pushTurn(
        'assistant',
        <p className="text-[13px] text-rose-700 inline-flex items-center gap-1.5">
          <AlertCircle className="w-4 h-4" /> {msg}. Try again?
        </p>,
      );
      // Allow retry by stepping back one
      setCurrentIdx(totalCount - 1);
    } finally {
      setSubmitting(false);
    }
  }

  function togglePill(v: string) {
    setPillSelection((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]));
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="w-full h-full min-h-[600px] flex flex-col lg:flex-row bg-[#F8F9FE] dark:bg-[#000724]">
      {/* LEFT — chat column */}
      <section className="flex-1 lg:max-w-[680px] flex flex-col min-h-0 border-r border-slate-200 dark:border-[#262831]">
        {/* Top bar */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] flex items-center justify-between">
          <button
            onClick={onBack}
            className="h-8 px-2.5 rounded-lg text-[12.5px] font-medium text-slate-600 dark:text-[#7a8ba3] hover:bg-slate-100 dark:hover:bg-[#1a2a43] inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Company
          </button>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: '#0B1957' }} />
            <span
              className="text-[13px] font-semibold text-[#172560] dark:text-white"
              style={{ fontFamily: '"Space Grotesk", system-ui' }}
            >
              ICP Discovery
            </span>
          </div>
          <button
            onClick={onSkip}
            disabled={!finished}
            className="h-8 px-2.5 rounded-lg text-[12.5px] font-medium text-slate-400 dark:text-[#7a8ba3] hover:bg-slate-100 dark:hover:bg-[#1a2a43] disabled:cursor-not-allowed"
            title={finished ? 'Continue to review' : 'Finish all questions first'}
          >
            {finished ? 'Continue →' : 'Skip'}
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
          {turns.map((t) => (
            <ChatBubble key={t.id} role={t.role}>{t.content}</ChatBubble>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        {currentQuestion && !submitting && (
          <div className="border-t border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] p-4">
            {currentQuestion.type === 'chips' && (
              <ChipInput
                value={textInput}
                onChange={setTextInput}
                onSubmit={handleSubmitChips}
                placeholder={currentQuestion.placeholder}
                onSkip={handleSkipQuestion}
              />
            )}
            {currentQuestion.type === 'pills' && (
              <PillInput
                options={currentQuestion.options ?? []}
                selected={pillSelection}
                onToggle={togglePill}
                onSubmit={handleSubmitPills}
                onSkip={handleSkipQuestion}
              />
            )}
            {currentQuestion.type === 'range' && (
              <RangeInput
                min={rangeMin}
                max={rangeMax}
                onMinChange={setRangeMin}
                onMaxChange={setRangeMax}
                onSubmit={handleSubmitRange}
                onSkip={handleSkipQuestion}
              />
            )}
            {currentQuestion.type === 'text' && (
              <TextInput
                value={textInput}
                onChange={setTextInput}
                onSubmit={handleSubmitText}
                onSkip={handleSkipQuestion}
                placeholder={currentQuestion.placeholder}
                multiline={currentQuestion.multiline}
              />
            )}
          </div>
        )}

        {submitting && (
          <div className="border-t border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] p-4 flex items-center gap-2 text-[12.5px] text-slate-600 dark:text-[#7a8ba3]">
            <Loader2 className="w-4 h-4 animate-spin" />
            Saving your ICP…
          </div>
        )}

        {submitError && !submitting && (
          <div className="border-t border-rose-200 bg-rose-50 dark:bg-rose-950/40 p-4 flex items-center gap-2 text-[12.5px] text-rose-700">
            <AlertCircle className="w-4 h-4" /> {submitError}
            <button
              onClick={finalize}
              className="ml-auto h-8 px-3 rounded-lg text-[12px] font-semibold text-white"
              style={{ background: '#0B1957' }}
            >
              Retry
            </button>
          </div>
        )}
      </section>

      {/* RIGHT — live ICP preview */}
      <section className="hidden lg:flex flex-1 min-w-0">
        <IcpLivePreview
          icp={icp}
          progressPct={progressPct}
          answeredCount={answeredCount}
          totalCount={totalCount}
        />
      </section>
    </div>
  );
}

// ─── Chat bubble ─────────────────────────────────────────────────────────
function ChatBubble({ role, children }: { role: 'assistant' | 'user'; children: React.ReactNode }) {
  if (role === 'assistant') {
    return (
      <div className="flex items-start gap-2.5 max-w-[88%]">
        <div
          className="w-7 h-7 rounded-full grid place-items-center shrink-0"
          style={{ background: 'linear-gradient(135deg, #0B1957, #1a3a8f)' }}
        >
          <Sparkles className="w-3.5 h-3.5 text-white" />
        </div>
        <div className="rounded-2xl rounded-tl-md px-3.5 py-2 bg-white dark:bg-[#0e1a3a] border border-slate-200 dark:border-[#262831]">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-end">
      <div
        className="max-w-[80%] rounded-2xl rounded-tr-md px-3.5 py-2"
        style={{ background: '#f1f3fb' }}
      >
        {children}
      </div>
    </div>
  );
}

// ─── Input variants ──────────────────────────────────────────────────────
function ChipInput({
  value, onChange, onSubmit, onSkip, placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={placeholder ?? 'Type your answer, comma-separated…'}
        className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
      />
      <button
        onClick={onSkip}
        className="h-10 px-3 rounded-xl text-[12.5px] font-medium text-slate-500 dark:text-[#7a8ba3] hover:bg-slate-100 dark:hover:bg-[#1a2a43]"
      >
        Skip
      </button>
      <button
        onClick={onSubmit}
        disabled={!value.trim()}
        className="h-10 px-3.5 rounded-xl text-[13px] font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: '#0B1957' }}
      >
        Send <Send className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function TextInput({
  value, onChange, onSubmit, onSkip, placeholder, multiline,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
  placeholder?: string;
  multiline?: boolean;
}) {
  // Multi-line boxes take Enter as a newline (Cmd/Ctrl+Enter sends); single-line
  // ones send on Enter, matching ChipInput.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    if (multiline && !(e.metaKey || e.ctrlKey)) return;
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className={multiline ? 'space-y-2' : 'flex items-center gap-2'}>
      {multiline ? (
        <textarea
          rows={3}
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? 'Type your answer…'}
          className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30 resize-none"
        />
      ) : (
        <input
          type="text"
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? 'Type your answer…'}
          className="flex-1 h-10 px-3.5 rounded-xl border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] text-[#172560] dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
        />
      )}
      <div className={multiline ? 'flex items-center gap-2 justify-end' : 'flex items-center gap-2'}>
        <button
          onClick={onSkip}
          className="h-10 px-3 rounded-xl text-[12.5px] font-medium text-slate-500 dark:text-[#7a8ba3] hover:bg-slate-100 dark:hover:bg-[#1a2a43]"
        >
          Skip
        </button>
        <button
          onClick={onSubmit}
          disabled={!value.trim()}
          className="h-10 px-3.5 rounded-xl text-[13px] font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#0B1957' }}
        >
          Send <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function PillInput({
  options, selected, onToggle, onSubmit, onSkip,
}: {
  options: Array<{ value: string; label: string }>;
  selected: string[];
  onToggle: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <div>
      <div className="flex flex-wrap gap-1.5 mb-3">
        {options.map((o) => {
          const on = selected.includes(o.value);
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onToggle(o.value)}
              className={`inline-flex items-center gap-1 h-8 px-3 rounded-full text-[12px] font-medium border transition ${
                on
                  ? 'text-white border-transparent'
                  : 'text-slate-600 dark:text-[#7a8ba3] border-slate-200 dark:border-[#262831] hover:bg-slate-50 dark:hover:bg-[#1a2a43]'
              }`}
              style={on ? { background: '#0B1957' } : undefined}
              aria-pressed={on}
            >
              {on && <Check className="w-3 h-3" />}
              {o.label}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={onSkip}
          className="h-9 px-3 rounded-xl text-[12.5px] font-medium text-slate-500 dark:text-[#7a8ba3] hover:bg-slate-100 dark:hover:bg-[#1a2a43]"
        >
          Skip
        </button>
        <button
          onClick={onSubmit}
          disabled={selected.length === 0}
          className="h-9 px-3.5 rounded-xl text-[12.5px] font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: '#0B1957' }}
        >
          Continue <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

function RangeInput({
  min, max, onMinChange, onMaxChange, onSubmit, onSkip,
}: {
  min: string;
  max: string;
  onMinChange: (v: string) => void;
  onMaxChange: (v: string) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 flex-1 text-[12.5px] text-slate-600 dark:text-[#7a8ba3]">
        <span>From</span>
        <input
          type="number"
          min={0}
          value={min}
          autoFocus
          onChange={(e) => onMinChange(e.target.value)}
          placeholder="50"
          className="w-24 h-10 px-2 rounded-xl border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
        />
        <span>to</span>
        <input
          type="number"
          min={0}
          value={max}
          onChange={(e) => onMaxChange(e.target.value)}
          placeholder="500"
          className="w-24 h-10 px-2 rounded-xl border border-slate-200 dark:border-[#262831] bg-white dark:bg-[#000724] text-[13px] tabular-nums focus:outline-none focus:ring-2 focus:ring-[#0B1957]/30"
        />
        <span>employees</span>
      </div>
      <button
        onClick={onSkip}
        className="h-10 px-3 rounded-xl text-[12.5px] font-medium text-slate-500 dark:text-[#7a8ba3] hover:bg-slate-100 dark:hover:bg-[#1a2a43]"
      >
        Skip
      </button>
      <button
        onClick={onSubmit}
        disabled={!min && !max}
        className="h-10 px-3.5 rounded-xl text-[13px] font-semibold text-white inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: '#0B1957' }}
      >
        Send <Send className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
