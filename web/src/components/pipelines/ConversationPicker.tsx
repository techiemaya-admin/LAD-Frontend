'use client';

/**
 * Pick specific conversations to read settings from.
 *
 * WHY THIS EXISTS WHEN "SCAN MY HISTORY" ALREADY WORKS
 * The automatic scan reads the most RECENT conversations, which is a proxy for
 * "representative" and often a bad one. A studio knows which three chats went
 * the way they want - the one where the customer asked about prices and got the
 * right answer, the one that ended in a booking - and three of those teach the
 * extractor more than forty that trail off after "Hi".
 *
 * So this shows what each conversation actually is: how many messages it has,
 * where it got to, and how it ended. A one-message thread is visibly useless
 * without anyone having to open it.
 *
 * Short threads are NOT filtered out. "Too short to be useful" is a judgement
 * for the person picking - a two-message exchange containing the studio's
 * address is worth more than a twenty-message one that goes nowhere.
 */

import React, { useEffect, useState } from 'react';
import { Loader2, MessageSquare, X, CheckCircle2 } from 'lucide-react';
import { listSampleConversations } from '@lad/frontend-features/snapshots';
import type { SampleConversation } from '@lad/frontend-features/snapshots';

/** The server rejects more than this, so the UI must not let it be exceeded. */
const MAX_SAMPLES = 10;

/** Stages worth calling out - a completed booking is a good example to learn from. */
const NOTABLE_STAGE: Record<string, string> = {
  booking_completed: 'Booked',
  rescheduled: 'Rescheduled',
  cancelled: 'Cancelled',
};

function formatWhen(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ConversationPicker({
  onScan,
  onCancel,
  isScanning,
}: {
  onScan: (ids: string[]) => void;
  onCancel: () => void;
  isScanning: boolean;
}) {
  const [conversations, setConversations] = useState<SampleConversation[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    listSampleConversations()
      .then((rows) => { if (!cancelled) setConversations(rows); })
      .catch(() => { if (!cancelled) setLoadError('Could not load your conversations.'); });
    return () => { cancelled = true; };
  }, []);

  const atLimit = selected.size >= MAX_SAMPLES;

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_SAMPLES) next.add(id);
      return next;
    });
  };

  return (
    <div className="mt-2 rounded-lg border border-gray-200 dark:border-blue-950/40 bg-gray-50 dark:bg-[#000c3b] p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
            Pick chats to read
          </h4>
          <p className="mt-0.5 text-xs text-gray-600 dark:text-slate-300">
            Choose conversations that went the way you want. A few good ones work better
            than everything.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={isScanning}
          aria-label="Cancel picking chats"
          className="shrink-0 rounded p-1 text-gray-400 dark:text-slate-500 hover:text-gray-700 dark:hover:text-white disabled:opacity-50"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {conversations === null && !loadError && (
        <p className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          Loading your conversations…
        </p>
      )}

      {loadError && (
        <p role="alert" className="mt-3 text-xs text-amber-800 dark:text-amber-300">{loadError}</p>
      )}

      {conversations?.length === 0 && (
        <p className="mt-3 text-xs text-gray-600 dark:text-slate-300">
          There are no conversations to read yet.
        </p>
      )}

      {!!conversations?.length && (
        <>
          <ul className="mt-3 max-h-72 space-y-1.5 overflow-y-auto pr-1">
            {conversations.map((c) => {
              const checked = selected.has(c.id);
              const id = `sample-${c.id}`;
              const stage = c.stage ? NOTABLE_STAGE[c.stage] : null;
              return (
                <li key={c.id}>
                  <label
                    htmlFor={id}
                    className={`flex items-start gap-2.5 rounded-md border p-2 cursor-pointer transition-colors ${
                      checked
                        ? 'border-emerald-600 bg-emerald-50 dark:bg-emerald-500/10'
                        : 'border-gray-200 dark:border-blue-950/40 bg-white dark:bg-[#071131]'
                    } ${!checked && atLimit ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <input
                      id={id}
                      type="checkbox"
                      checked={checked}
                      disabled={isScanning || (!checked && atLimit)}
                      onChange={() => toggle(c.id)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 dark:border-blue-950/40 text-emerald-600 focus:ring-emerald-600 disabled:opacity-50"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {c.name}
                        </span>
                        {/* Length is the strongest signal of whether a thread is
                            worth reading, so it sits next to the name. */}
                        <span className="inline-flex items-center gap-1 text-[11px] text-gray-500 dark:text-slate-400 tabular-nums">
                          <MessageSquare className="h-3 w-3" aria-hidden="true" />
                          {c.messageCount}
                        </span>
                        {stage && (
                          <span className="inline-flex items-center gap-1 rounded border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 text-[11px] font-medium text-emerald-800 dark:text-emerald-300">
                            <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                            {stage}
                          </span>
                        )}
                        <span className="ml-auto shrink-0 text-[11px] text-gray-400 dark:text-slate-500 tabular-nums">
                          {formatWhen(c.lastMessageAt)}
                        </span>
                      </div>
                      {c.lastMessage && (
                        <p className="mt-0.5 truncate text-xs text-gray-600 dark:text-slate-300">
                          {c.lastMessage}
                        </p>
                      )}
                    </div>
                  </label>
                </li>
              );
            })}
          </ul>

          {atLimit && (
            <p className="mt-2 text-[11px] text-gray-500 dark:text-slate-400">
              That&apos;s the maximum of {MAX_SAMPLES}. Untick one to swap it.
            </p>
          )}

          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => onScan([...selected])}
              disabled={isScanning || selected.size === 0}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 dark:disabled:bg-slate-600"
            >
              {isScanning && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
              Read {selected.size || ''} {selected.size === 1 ? 'chat' : 'chats'}
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isScanning}
              className="text-sm text-gray-600 dark:text-slate-300 hover:text-gray-900 dark:hover:text-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}
