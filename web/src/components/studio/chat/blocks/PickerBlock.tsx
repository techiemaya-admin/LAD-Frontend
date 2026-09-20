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
import { LAD_TEXT, OPT_BTN, OPT_IDLE, OPT_MUTED, OPT_PRIMARY } from '../chat-theme';

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
    <div role="group" aria-label={block.prompt} data-testid={`chat-picker-${block.id}`}>
      {block.prompt && <p className={`mb-2 font-medium ${LAD_TEXT}`}>{block.prompt}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const isChosen = chosen.has(o.key) || (block.multi ? picked.has(o.key) : false);
          const busy = inFlight === o.key && sending;
          return (
            <button
              key={o.key}
              type="button"
              onClick={() => (block.multi ? toggle(o.key) : pickOne(o.key, o.label))}
              disabled={done || sending}
              aria-pressed={isChosen}
              title={o.detail || undefined}
              className={`inline-flex items-center gap-1.5 text-left ${OPT_BTN} ${isChosen ? OPT_PRIMARY : done ? OPT_MUTED : OPT_IDLE}`}
              data-testid={`chat-pick-${o.key}`}
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : isChosen ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
              <span>{o.label}</span>
              {o.detail && !done && <span className="hidden text-[12px] font-normal opacity-70 sm:inline">· {o.detail}</span>}
            </button>
          );
        })}
        {block.multi && !done && (
          <Button type="button" size="sm" onClick={submitMulti} disabled={sending || picked.size === 0} className={`${OPT_BTN} ${OPT_PRIMARY} h-auto`}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            {picked.size === 0 ? 'Pick one or more' : `Done (${picked.size})`}
          </Button>
        )}
      </div>
    </div>
  );
}
