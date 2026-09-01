'use client';

/**
 * Keep a colleague's takeover reply as a lesson for the agent.
 *
 * When someone takes over a thread they demonstrate the right answer — the
 * pricing breakdown, the policy caveat the agent had been hedging about. That
 * is the best training material the product produces, and it used to be
 * discarded: the reply lived in the thread and nothing carried it forward. The
 * only route into the agent's instructions was to find an OLD agent message,
 * thumbs-down it, and retype the answer by hand.
 *
 * This is the counterpart to MessageFeedback: that one corrects what the agent
 * said, this one keeps what a human said instead. Rendered only on human-agent
 * messages; the backend refuses anything else, so the agent can never be taught
 * its own output back to itself.
 *
 * Deliberately a two-step (open, then confirm) rather than one click. The raw
 * reply usually needs trimming — "Hi Gus, Maggie here" names a specific person
 * — and only 15 corrections reach the prompt at a time, so a mis-click costs a
 * slot that something better could have used.
 */
import { useState } from 'react';
import { GraduationCap, Loader2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { teachFromHumanReply } from '@lad/frontend-features/conversations';

interface TeachFromReplyProps {
  conversationId: string;
  messageId: string;
  /** The colleague's reply — prefilled as the lesson, editable before saving. */
  content: string;
  /** Set once this message has already been taught, so a reload doesn't invite
   *  teaching it twice. The save is an upsert, so a repeat is harmless — this
   *  is about not making the reviewer wonder whether it worked. */
  initiallyTaught?: boolean;
}

export function TeachFromReply({
  conversationId,
  messageId,
  content,
  initiallyTaught = false,
}: TeachFromReplyProps) {
  const [open, setOpen] = useState(false);
  const [taught, setTaught] = useState(initiallyTaught);
  const [text, setText] = useState(content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [insteadOf, setInsteadOf] = useState<string | null>(null);

  const save = async () => {
    const lesson = text.trim();
    if (!lesson) {
      setError('Nothing to teach — add some text first');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await teachFromHumanReply({
        conversationId,
        messageId,
        // Only send an override when it actually differs, so the server keeps
        // using the stored message as the source of truth when untouched.
        expectedResponse: lesson === content.trim() ? undefined : lesson,
      });
      setInsteadOf(res.instead_of);
      setTaught(true);
      setOpen(false);
    } catch (e: unknown) {
      // No optimistic success here: claiming the agent learned something when
      // it did not is the one failure that would quietly erode trust in the
      // whole feature.
      setError(e instanceof Error ? e.message : 'Could not save — try again');
    } finally {
      setSaving(false);
    }
  };

  if (taught && !open) {
    return (
      <div className="mt-1 flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
        <Check className="h-3 w-3" />
        <span>Agent learned this</span>
        {insteadOf && (
          <span className="text-[#667781] dark:text-white/50">
            · instead of its earlier reply
          </span>
        )}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="ml-1 underline hover:no-underline"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="mt-1">
      {!open && (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setError(null);
          }}
          className={cn(
            'flex items-center gap-1 rounded p-1 text-[11px] transition-colors',
            'text-[#667781] hover:text-emerald-600',
            'dark:text-white/50 dark:hover:text-emerald-400'
          )}
        >
          <GraduationCap className="h-3.5 w-3.5" />
          Teach the agent this
        </button>
      )}

      {open && (
        <div className="mt-2 w-full max-w-md rounded-lg border border-black/10 bg-white p-3 text-xs dark:border-white/10 dark:bg-[#202c33]">
          <label className="mb-1 block font-medium text-[#667781] dark:text-white/60">
            Teach the agent to answer like this
          </label>
          <textarea
            autoFocus
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded border border-black/10 bg-white p-2 text-[#111b21] outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#2a3942] dark:text-white/90"
          />
          <p className="mt-1 text-[11px] text-[#667781] dark:text-white/50">
            Trim anything specific to this customer — greetings, names, or a
            date that won&apos;t apply next time. It shapes similar replies from
            the next message onward.
          </p>
          {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setText(content);
                setError(null);
              }}
              className="rounded px-2 py-1 text-[#667781] hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={saving || !text.trim()}
              onClick={save}
              className="flex items-center gap-1 rounded bg-emerald-600 px-3 py-1 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-3 w-3 animate-spin" />}
              Teach the agent
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
