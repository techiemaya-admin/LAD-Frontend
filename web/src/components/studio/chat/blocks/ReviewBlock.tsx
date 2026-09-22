'use client';

/**
 * ReviewBlock — a Tailor proposal inline in the thread, rendered with the
 * same ReviewCard the rooms use. Applying goes through the thread's
 * `apply_review` turn (the server applies with the block's `apply` mode and
 * records the result as the next lad turn), never the card's own PUT, so
 * every change stays in the record.
 */
import { useEffect, useState } from 'react';
import type { ChatReviewBlock, Proposal } from '@lad/frontend-features/tenant-studio';
import ReviewCard from '../../ReviewCard';
import { useStudioChatContext } from '../chat-context';

export interface ReviewBlockProps {
  block: ChatReviewBlock;
  messageId: string;
  /** The message is no longer pending — the review was applied or the thread archived. */
  settled: boolean;
}

export default function ReviewBlock({ block, messageId, settled }: ReviewBlockProps) {
  const { send, sending } = useStudioChatContext();
  const [pressed, setPressed] = useState(false);
  // The press is "applying" only while its own turn is in flight; a later
  // refetch brings `applied` from the server, which wins.
  useEffect(() => { if (!sending) setPressed(false); }, [sending]);
  const p = block.proposal;
  const proposal: Proposal = { ok: p.ok, overlay: p.overlay ?? {}, review: p.review ?? null, errors: p.errors ?? [] };
  const appliedVersion = block.applied ? block.applied.version : settled ? null : undefined;
  return (
    <ReviewCard
      proposal={proposal}
      applyAndUpdate={block.apply === 'apply-and-update'}
      noteDefault={block.note}
      onApply={() => {
        setPressed(true);
        send({ intent: 'apply_review', args: { messageId, note: block.note }, optimisticText: 'Apply this change' });
      }}
      applying={pressed && sending}
      appliedVersion={appliedVersion}
    />
  );
}
