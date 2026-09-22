/**
 * publish-copy — one reading of an apply-and-update / undo `published[]`
 * list, shared by the review card toast, the Step 9 result list and the
 * history drawer so they never disagree.
 *
 * A curated workspace's WhatsApp agent reads the pack itself: its entry
 * comes back `readBy: 'snapshot-prompt'` with a `note` saying when the
 * change reaches the next conversation. That note is shown verbatim — the
 * backend owns the timing, the UI only carries it.
 */
import { SNAPSHOT_PROMPT_READ_BY, type PublishOutcome } from '@lad/frontend-features/tenant-studio';

export const CHANNEL_LABEL: Record<string, string> = { linkedin: 'LinkedIn', email: 'Email', whatsapp: 'WhatsApp', instagram: 'Instagram', voice: 'Voice' };

export function channelLabel(channel: string): string {
  return CHANNEL_LABEL[channel] ?? channel;
}

/** The entry a curated workspace's WhatsApp agent gets: nothing was generated; the agent reads the applied pack on its own. */
export function readsSnapshotPrompt(p: PublishOutcome): boolean {
  return p.ok && p.readBy === SNAPSHOT_PROMPT_READ_BY;
}

/** "WhatsApp agent: Applies on the next WhatsApp conversation (within about 2 minutes)." */
export function snapshotPromptLine(p: PublishOutcome): string {
  const note = p.note?.trim();
  return `${channelLabel(p.channel)} agent: ${note || 'reads the change on its next conversation.'}`;
}

/** One line per entry, for a per-channel result list. */
export function publishLine(p: PublishOutcome): string {
  const label = channelLabel(p.channel);
  if (!p.ok) return `${label} agent could not be updated${p.error ? ` — ${p.error}` : ''}. The change is saved; try again from the Tailor.`;
  if (readsSnapshotPrompt(p)) return snapshotPromptLine(p);
  if (p.readBy === 'stored-only') return `${label} agent updated — it reads this once the channel is connected.`;
  return `${label} agent updated.`;
}

/**
 * "LinkedIn, Email agents updated. WhatsApp agent: Applies on the next
 * WhatsApp conversation (within about 2 minutes). Could not update Voice (…)
 * — try again from the Tailor." Empty when nothing was published.
 */
export function publishSummary(published: PublishOutcome[] | undefined): string {
  const list = published ?? [];
  const ok = list.filter((p) => p.ok && !readsSnapshotPrompt(p)).map((p) => channelLabel(p.channel));
  const viaSnapshot = list.filter(readsSnapshotPrompt).map(snapshotPromptLine);
  const failed = list.filter((p) => !p.ok).map((p) => `${channelLabel(p.channel)}${p.error ? ` (${p.error})` : ''}`);
  const parts: string[] = [];
  if (ok.length) parts.push(`${ok.join(', ')} agent${ok.length === 1 ? '' : 's'} updated.`);
  parts.push(...viaSnapshot);
  if (failed.length) parts.push(`Could not update ${failed.join(', ')} — try again from the Tailor.`);
  return parts.join(' ');
}
