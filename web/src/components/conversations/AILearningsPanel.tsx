'use client';

/**
 * AI Learnings - what the agent has been taught from human review, and the
 * switch to undo any of it.
 *
 * Corrections auto-apply: a thumbs-down with a correction reaches the system
 * prompt on the very next message, with no approval step. This panel is the
 * counterweight - the only place someone can see what was taught and revoke
 * something that made replies worse. Without it the learning is invisible and
 * the only way to inspect it is a SQL query.
 */
import { useEffect, useState } from 'react';
import { GraduationCap, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  listLearnedCorrections,
  setCorrectionActive,
  type LearnedCorrection,
} from '@lad/frontend-features/conversations';

interface AILearningsPanelProps {
  open: boolean;
  onClose: () => void;
}

export function AILearningsPanel({ open, onClose }: AILearningsPanelProps) {
  const [rows, setRows] = useState<LearnedCorrection[]>([]);
  const [maxInPrompt, setMaxInPrompt] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    listLearnedCorrections()
      .then(({ corrections, maxInPrompt: cap }) => {
        if (cancelled) return;
        setRows(corrections);
        setMaxInPrompt(cap);
      })
      .catch(() => !cancelled && setError('Could not load learnings'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [open]);

  const toggle = async (row: LearnedCorrection) => {
    setBusyId(row.id);
    const next = !row.is_active;
    // Optimistic, then re-derive in_prompt: switching one off promotes the
    // next active correction into the prompt, so neighbouring rows change too.
    const previous = rows;
    setRows((cur) => recomputeInPrompt(
      cur.map((r) => (r.id === row.id ? { ...r, is_active: next } : r)),
      maxInPrompt,
    ));
    try {
      await setCorrectionActive(row.id, next);
    } catch {
      setRows(previous);
      setError('Could not update - try again');
    } finally {
      setBusyId(null);
    }
  };

  if (!open) return null;

  const activeCount = rows.filter((r) => r.is_active).length;

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-[#111b21]">
      <div className="flex items-center justify-between border-b border-black/10 px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-primary" />
          <div>
            <h2 className="text-sm font-semibold">AI Learnings</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Corrections from thumbs-down feedback, applied to every new reply
            </p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-black/5 dark:hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
          </div>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}

        {!loading && !error && rows.length === 0 && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Nothing learned yet. Give a reply a thumbs-down in the inbox and say
            what it should have said - that correction will appear here.
          </p>
        )}

        {rows.length > 0 && (
          <p className="mb-3 text-xs text-gray-500 dark:text-gray-400">
            {activeCount} active · the newest {maxInPrompt} reach the prompt
          </p>
        )}

        <ul className="space-y-3">
          {rows.map((r) => (
            <li
              key={r.id}
              className={cn(
                'rounded-lg border p-3 text-xs',
                r.is_active
                  ? 'border-black/10 dark:border-white/10'
                  : 'border-dashed border-black/10 opacity-60 dark:border-white/10'
              )}
            >
              <div className="mb-2 flex items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {/* in_prompt is shown separately from is_active on purpose:
                      an ACTIVE correction past the cap has no effect, and
                      looks identical to a working one otherwise. */}
                  {r.is_active && r.in_prompt && (
                    <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                      Applied
                    </span>
                  )}
                  {r.is_active && !r.in_prompt && (
                    <span
                      className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                      title={`Only the newest ${maxInPrompt} active corrections are sent to the agent`}
                    >
                      Not applied - over the {maxInPrompt} limit
                    </span>
                  )}
                  {!r.is_active && (
                    <span className="rounded bg-black/5 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-white/10 dark:text-gray-400">
                      Off
                    </span>
                  )}
                  {r.created_at && (
                    <span className="text-[10px] text-gray-400">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  disabled={busyId === r.id}
                  onClick={() => toggle(r)}
                  className="shrink-0 rounded border border-black/10 px-2 py-0.5 text-[11px] hover:bg-black/5 disabled:opacity-50 dark:border-white/15 dark:hover:bg-white/10"
                >
                  {busyId === r.id ? '…' : r.is_active ? 'Turn off' : 'Turn on'}
                </button>
              </div>

              {r.actual_response && (
                <div className="mb-1">
                  <span className="text-gray-400">Instead of:</span>{' '}
                  <span className="text-gray-600 line-through dark:text-gray-400">
                    {r.actual_response}
                  </span>
                </div>
              )}
              <div>
                <span className="text-gray-400">Say:</span>{' '}
                <span className="text-[#111b21] dark:text-white/90">
                  {r.expected_response}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

/**
 * Re-derive which rows reach the prompt after a toggle.
 *
 * Mirrors the backend rule (newest N ACTIVE ones win) so the UI doesn't need a
 * refetch to stay truthful - turning one off must visibly promote the next.
 */
function recomputeInPrompt(
  rows: LearnedCorrection[],
  cap: number
): LearnedCorrection[] {
  let live = 0;
  return rows.map((r) => {
    if (!r.is_active) return { ...r, in_prompt: false };
    live += 1;
    return { ...r, in_prompt: live <= cap };
  });
}
