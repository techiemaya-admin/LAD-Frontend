'use client';

/**
 * ActionsBlock — chips under a lad turn. An `intent` chip posts an owner turn
 * with that intent (the chip's label is what the owner bubble shows); a
 * `route` chip navigates — `/studio?room=…` and `/studio?step=N` open inside
 * the Studio and come back to the thread, anything else is a page.
 */
import { ArrowUpRight } from 'lucide-react';
import type { ChatActionsBlock } from '@lad/frontend-features/tenant-studio';
import { useStudioChatContext } from '../chat-context';
import { CHIP_BASE, CHIP_IDLE } from '../../studio-theme';

export default function ActionsBlock({ block, disabled = false }: { block: ChatActionsBlock; disabled?: boolean }) {
  const { send, sending, navigate } = useStudioChatContext();
  const items = Array.isArray(block.items) ? block.items.filter((i) => i && i.label) : [];
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1.5" data-testid="chat-actions">
      {items.map((item, i) => {
        const isRoute = Boolean(item.route) && !item.intent;
        const onClick = () => {
          if (item.intent) send({ intent: item.intent, args: item.args, optimisticText: item.label });
          else if (item.route) navigate(item.route);
        };
        return (
          <button
            key={`${item.label}-${i}`}
            type="button"
            onClick={onClick}
            disabled={disabled || (sending && !isRoute) || (!item.intent && !item.route)}
            className={`${CHIP_BASE} ${CHIP_IDLE} gap-1 px-3 py-1.5 text-xs`}
            data-testid={item.intent ? `chat-action-${item.intent}` : 'chat-action-route'}
          >
            {item.label}
            {isRoute && <ArrowUpRight className="h-3 w-3 text-muted-foreground" aria-hidden />}
          </button>
        );
      })}
    </div>
  );
}
