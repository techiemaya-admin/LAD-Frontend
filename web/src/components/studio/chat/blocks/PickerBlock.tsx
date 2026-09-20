'use client';

/**
 * PickerBlock — the bot's question with 2–5 tappable rows. A tap posts
 * `{ pick: { messageId, key } }` (no model call; the server runs the option's
 * intent). Once answered the chosen row keeps a tick and every row disables
 * — the thread is a record, not a form. `multi` pickers collect keys and
 * post them together.
 */
import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ChatPickerBlock } from '@lad/frontend-features/tenant-studio';
import { useStudioChatContext } from '../chat-context';
import { BORDER, CTA_PRIMARY, DIVIDE } from '../../studio-theme';

export interface PickerBlockProps {
  block: ChatPickerBlock;
  messageId: string;
  /** The message is no longer pending (answered, or archived) even if `chosen` did not come through. */
  answered: boolean;
}

export default function PickerBlock({ block, messageId, answered }: PickerBlockProps) {
  const { send, sending } = useStudioChatContext();
  const chosen = new Set<string>(Array.isArray(block.chosen) ? block.chosen : block.chosen ? [block.chosen] : []);
  const done = answered || chosen.size > 0;
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [inFlight, setInFlight] = useState<string | null>(null);
  const options = Array.isArray(block.options) ? block.options.filter((o) => o && o.key && o.label) : [];
  if (options.length === 0) return null;

  const pickOne = (key: string, label: string) => {
    if (done || sending) return;
    setInFlight(key);
    send({ pick: { messageId, key }, optimisticText: label });
  };
  const toggle = (key: string) => {
    if (done || sending) return;
    setPicked((s) => { const n = new Set(s); if (n.has(key)) n.delete(key); else n.add(key); return n; });
  };
  const submitMulti = () => {
    if (done || sending || picked.size === 0) return;
    const keys = options.filter((o) => picked.has(o.key)).map((o) => o.key);
    const label = options.filter((o) => picked.has(o.key)).map((o) => o.label).join(', ');
    send({ pick: { messageId, keys }, optimisticText: label });
  };

  return (
    <div className={`overflow-hidden rounded-2xl border ${BORDER} bg-white/80 dark:bg-white/[.04]`} role="group" aria-label={block.prompt} data-testid={`chat-picker-${block.id}`}>
      {block.prompt && <p className={`border-b ${BORDER} px-3.5 py-2 text-sm font-medium`}>{block.prompt}</p>}
      <ul className={`divide-y ${DIVIDE}`}>
        {options.map((o) => {
          const isChosen = chosen.has(o.key) || (block.multi ? picked.has(o.key) : false);
          const busy = inFlight === o.key && sending;
          return (
            <li key={o.key}>
              <button
                type="button"
                onClick={() => (block.multi ? toggle(o.key) : pickOne(o.key, o.label))}
                disabled={done || sending}
                aria-pressed={isChosen}
                className={`flex w-full items-start gap-3 px-3.5 py-2.5 text-left text-sm transition-colors duration-150 ${done ? 'cursor-default' : 'hover:bg-[#7C5CFF]/[.06] dark:hover:bg-[#7C5CFF]/[.12]'} ${isChosen && done ? 'bg-[#7C5CFF]/[.06] dark:bg-[#7C5CFF]/[.12]' : ''} disabled:opacity-100 ${done && !isChosen ? 'text-muted-foreground' : ''}`}
                data-testid={`chat-pick-${o.key}`}
              >
                <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${isChosen ? 'border-transparent bg-gradient-to-r from-[#2B7CFF] to-[#C049FF] text-white' : 'border-slate-300 dark:border-white/20'}`} aria-hidden>
                  {busy ? <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" /> : isChosen ? <Check className="h-3 w-3" /> : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className={`block ${isChosen ? 'font-medium' : ''}`}>{o.label}</span>
                  {o.detail && <span className="block text-xs text-muted-foreground">{o.detail}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {block.multi && !done && (
        <div className={`border-t ${BORDER} px-3.5 py-2`}>
          <Button type="button" size="sm" onClick={submitMulti} disabled={sending || picked.size === 0} className={CTA_PRIMARY}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {picked.size === 0 ? 'Pick one or more' : `Done (${picked.size})`}
          </Button>
        </div>
      )}
    </div>
  );
}
