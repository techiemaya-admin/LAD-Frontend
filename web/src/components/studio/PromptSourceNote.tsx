'use client';

/**
 * PromptSourceNote — a curated workspace whose WhatsApp agent still runs its
 * ORIGINAL stored instructions (`state.workspace.promptSource === 'stored'`).
 * Studio changes (Tailor, rehearsal feedback, test-run feedback, answered
 * questions) land in the pack, which that agent does not read until support
 * switches it to the template prompt. Say so where the tenant would expect
 * the change to show — the Pipelines room and Step 9. No action button: the
 * switch is support's, not the tenant's.
 *
 * Renders nothing for `'template'` and for backends that do not report a
 * source (absent ≠ stored).
 */
import { AlertTriangle } from 'lucide-react';
import type { StudioWorkspace } from '@lad/frontend-features/tenant-studio';
import { STATUS } from './studio-theme';

export default function PromptSourceNote({ workspace, className = '' }: { workspace: StudioWorkspace | undefined; className?: string }) {
  if (!workspace?.curated || workspace.promptSource !== 'stored') return null;
  return (
    <p role="note" className={`flex items-start gap-2 rounded-xl border px-3 py-2 text-sm ${STATUS.warn} ${className}`} data-testid="prompt-source-note">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>Your WhatsApp agent still runs its original instructions. Changes you make here apply once it is switched to the template prompt — ask support.</span>
    </p>
  );
}
