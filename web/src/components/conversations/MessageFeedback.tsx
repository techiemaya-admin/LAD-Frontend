'use client';

/**
 * Agent-response feedback - thumbs up/down on an AI reply, and on a
 * thumbs-down, a short form capturing what it should have said.
 *
 * The correction is appended to the tenant's WABA system prompt on the next
 * turn, so this is the fastest path from "the bot said something wrong" to
 * "the bot stops saying it" - no prompt editing, no deploy.
 *
 * Only rendered for AI messages. A human agent's own reply has nothing to
 * learn from, and the backend rejects rating anything but an assistant
 * message anyway.
 */
import { useState } from 'react';
import { ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  submitMessageFeedback,
  type FeedbackRating,
} from '@lad/frontend-features/conversations';

interface MessageFeedbackProps {
  /** Which agent to teach. Defaults to WhatsApp; 'linkedin' hits the LI endpoint. */
  channel?: 'waba' | 'linkedin';
  conversationId: string;
  messageId: string;
  /** The reply being rated - prefilled as "what it said" in the form. */
  content: string;
  /** Existing verdict, so a reload doesn't reset the thumbs. */
  initialRating?: FeedbackRating | null;
}

export function MessageFeedback({
  channel,
  conversationId,
  messageId,
  content,
  initialRating = null,
}: MessageFeedbackProps) {
  const [rating, setRating] = useState<FeedbackRating | null>(initialRating);
  const [showForm, setShowForm] = useState(false);
  const [expected, setExpected] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (next: FeedbackRating, expectedResponse?: string) => {
    setSaving(true);
    setError(null);
    // Optimistic: the thumb responds immediately. Reverted on failure so the
    // reviewer is never left believing a correction was saved when it wasn't.
    const previous = rating;
    setRating(next);
    try {
      await submitMessageFeedback({
        channel,
        conversationId,
        messageId,
        rating: next,
        expectedResponse,
        actualResponse: expectedResponse ? content : undefined,
      });
      setShowForm(false);
      setExpected('');
    } catch {
      setRating(previous);
      setError('Could not save - try again');
    } finally {
      setSaving(false);
    }
  };

  const onDislike = () => {
    // Open the form rather than saving straight away: a bare dislike records
    // that something was wrong but teaches the agent nothing, so the correction
    // is the point of the interaction, not an optional extra.
    setShowForm(true);
    setError(null);
  };

  return (
    <div className="mt-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          aria-label="Good response"
          aria-pressed={rating === 'like'}
          disabled={saving}
          onClick={() => send('like')}
          className={cn(
            'rounded p-1 transition-colors disabled:opacity-50',
            rating === 'like'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-[#667781] hover:text-emerald-600 dark:text-white/50 dark:hover:text-emerald-400'
          )}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          aria-label="Bad response"
          aria-pressed={rating === 'dislike'}
          disabled={saving}
          onClick={onDislike}
          className={cn(
            'rounded p-1 transition-colors disabled:opacity-50',
            rating === 'dislike'
              ? 'text-red-600 dark:text-red-400'
              : 'text-[#667781] hover:text-red-600 dark:text-white/50 dark:hover:text-red-400'
          )}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </button>
        {saving && <Loader2 className="h-3 w-3 animate-spin text-[#667781]" />}
        {error && <span className="text-[11px] text-red-500">{error}</span>}
      </div>

      {showForm && (
        <div className="mt-2 w-full max-w-md rounded-lg border border-black/10 bg-white p-3 text-xs dark:border-white/10 dark:bg-[#202c33]">
          <div className="mb-2">
            <div className="mb-1 font-medium text-[#667781] dark:text-white/60">
              What it said
            </div>
            {/* Read-only: the reviewer is correcting this text, not editing
                history. Showing it keeps the correction anchored to a real
                reply rather than a remembered one. */}
            <div className="max-h-20 overflow-y-auto rounded bg-black/5 p-2 text-[#111b21] dark:bg-white/5 dark:text-white/80">
              {content}
            </div>
          </div>
          <label className="mb-1 block font-medium text-[#667781] dark:text-white/60">
            What it should have said
          </label>
          <textarea
            autoFocus
            rows={3}
            value={expected}
            onChange={(e) => setExpected(e.target.value)}
            placeholder="e.g. We don't run kids classes on Thursdays - the next one is Saturday at 10am."
            className="w-full rounded border border-black/10 bg-white p-2 text-[#111b21] outline-none focus:border-emerald-500 dark:border-white/10 dark:bg-[#2a3942] dark:text-white/90"
          />
          <p className="mt-1 text-[11px] text-[#667781] dark:text-white/50">
            This is added to the agent&apos;s instructions and shapes similar
            replies from the next message onward.
          </p>
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setExpected('');
              }}
              className="rounded px-2 py-1 text-[#667781] hover:bg-black/5 dark:text-white/60 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            {/* Saving without a correction is allowed but labelled honestly  - 
                it records the verdict and teaches nothing. */}
            <button
              type="button"
              disabled={saving}
              onClick={() => send('dislike', expected.trim() || undefined)}
              className="rounded bg-emerald-600 px-3 py-1 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {expected.trim() ? 'Save & teach' : 'Just mark as bad'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
