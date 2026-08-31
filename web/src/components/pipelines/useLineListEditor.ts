'use client';

/**
 * Editing an array of strings as one-entry-per-line text.
 *
 * THE BUG THIS EXISTS TO PREVENT
 * Both knob editors did the round-trip inline:
 *
 *     value={toLines(value)}
 *     onChange={(e) => set(fromLines(e.target.value))}
 *
 * `fromLines` trims each line and drops the empty ones, which is right for
 * storage and fatal for typing. The array is re-joined and pushed straight back
 * into the textarea on every keystroke, so:
 *
 *     press Enter   "Mix and Match\n"  → ["Mix and Match"] → "Mix and Match"
 *     press Space   "Mix and Match "   → ["Mix and Match"] → "Mix and Match"
 *
 * React re-rendered with the normalised string and the character vanished as it
 * was typed. Reported as "enter and space are not working" — no key handler was
 * involved at all. Every other key survived, because it changes a line that is
 * neither empty nor trailing whitespace, which is why the field looked mostly
 * fine.
 *
 * HOW THIS FIXES IT WITHOUT LOSING THE NORMALISATION
 * The raw text is held while the user is mid-edit, and the parent still gets the
 * normalised array on every keystroke — so dirty-tracking and saving are
 * unchanged. The draft is honoured only while it still normalises to what the
 * parent holds; if the parent replaces the value (a Reset, a reload), that
 * equality breaks and the canonical text wins. No effect, no sync, nothing to
 * get out of order.
 */

import * as React from 'react';

export const toLines = (value: unknown): string =>
  Array.isArray(value) ? (value as string[]).join('\n') : '';

/** Storage shape: trimmed, no blank entries. Matches the backend's asList(). */
export const fromLines = (text: string): string[] =>
  text.split('\n').map((line) => line.trim()).filter(Boolean);

export interface LineListEditor {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onBlur: () => void;
}

export function useLineListEditor(
  value: unknown,
  commit: (lines: string[]) => void,
): LineListEditor {
  const canonical = toLines(value);
  const [draft, setDraft] = React.useState<string | null>(null);

  // Honour the draft only while it still describes what the parent holds.
  const live = draft !== null && toLines(fromLines(draft)) === canonical;

  return {
    value: live ? (draft as string) : canonical,
    onChange: (event) => {
      const next = event.target.value;
      setDraft(next);
      commit(fromLines(next));
    },
    // Editing over: let the canonical value show, so trailing blank lines the
    // user left behind tidy themselves rather than lingering as phantom rows.
    onBlur: () => setDraft(null),
  };
}
