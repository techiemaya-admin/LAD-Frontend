'use client';

/**
 * Bubble — one turn. Owner turns sit right in the AI gradient; lad turns sit
 * left under the Mr LAD avatar, prose first and the blocks (pickers, cards,
 * reviews, chips) stacked beneath at card width. A pending owner turn is
 * dimmed until the server has it.
 */
import { Sparkles } from 'lucide-react';
import type { ChatBlock, ChatMessage } from '@lad/frontend-features/tenant-studio';
import ActionsBlock from './blocks/ActionsBlock';
import CardBlock from './blocks/CardBlock';
import PickerBlock from './blocks/PickerBlock';
import ResultBlock from './blocks/ResultBlock';
import ReviewBlock from './blocks/ReviewBlock';
import TextBlock from './blocks/TextBlock';
import { AI_GRADIENT, BUBBLE_AGENT, BUBBLE_ME } from '../studio-theme';

/** The Mr LAD avatar: a gradient tile, the same accent as the rest of the Studio. */
export function LadAvatar({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <span className={`${AI_GRADIENT} inline-flex shrink-0 items-center justify-center rounded-xl text-white shadow-[0_4px_12px_-4px_rgba(124,92,255,.6)] ${className}`} aria-hidden>
      <Sparkles className="h-[55%] w-[55%]" />
    </span>
  );
}

/** Words for an owner turn the server stored without any (an intent chip, a pick). */
const INTENT_LABEL: Record<string, string> = {
  apply_review: 'Apply this change', apply_plan: 'Apply this setup', go_live: 'Go live', undo: 'Undo the last change', status: "What's my status?",
  launch: "What's blocking go-live?", questions: 'Answer my open questions', first_campaign: 'Draft my first campaign', help: 'What can I ask you?',
  history: 'What changed recently?', pipeline: 'Switch a pipeline', tailor: 'Change how an agent talks', rewrite: 'Rewrite a message', brief: 'About my business',
  plan_answer: 'My answer', answer_question: 'My answer', open: 'Open it',
};
function ownerWords(m: ChatMessage): string {
  if (m.text?.trim()) return m.text;
  if (m.intent && INTENT_LABEL[m.intent]) return INTENT_LABEL[m.intent];
  return m.intent ? m.intent.replace(/_/g, ' ') : '';
}

function timeLabel(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function Block({ block, message }: { block: ChatBlock; message: ChatMessage }) {
  const settled = message.status === 'done' || message.status === 'dismissed';
  const hasReview = message.blocks.some((b) => b.type === 'review');
  switch (block.type) {
    case 'text': return <TextBlock block={block} />;
    case 'picker': return <PickerBlock block={block} messageId={message.id} answered={settled} />;
    case 'review': return <ReviewBlock block={block} messageId={message.id} settled={settled} />;
    case 'card': return <CardBlock block={block} />;
    case 'actions': {
      // A review turn also carries an "Apply this change" chip; the card's own button is that press, so the chip would be a duplicate.
      const items = hasReview ? block.items.filter((i) => i.intent !== 'apply_review') : block.items;
      return items.length ? <ActionsBlock block={{ ...block, items }} disabled={message.status === 'dismissed'} /> : null;
    }
    case 'result': return <ResultBlock block={block} />;
    default: return null;
  }
}

export default function Bubble({ message, showAvatar = true }: { message: ChatMessage; showAvatar?: boolean }) {
  const blocks = Array.isArray(message.blocks) ? message.blocks : [];
  if (message.role === 'owner') {
    const pending = message.status === 'pending' && message.id.startsWith('optimistic-');
    return (
      <div className="flex justify-end" data-testid="chat-owner-turn" data-status={message.status}>
        <div className={`max-w-[85%] sm:max-w-[70%] ${pending ? 'opacity-70' : ''}`}>
          {ownerWords(message) && (
            <div className={`whitespace-pre-wrap rounded-2xl rounded-br-md px-3.5 py-2 text-sm ${BUBBLE_ME}`}>{ownerWords(message)}</div>
          )}
          {blocks.length > 0 && <div className="mt-1.5 space-y-1.5">{blocks.map((b, i) => <Block key={i} block={b} message={message} />)}</div>}
          <p className="mt-0.5 text-right text-[10px] text-muted-foreground" aria-hidden>{pending ? 'Sending…' : timeLabel(message.createdAt)}</p>
        </div>
      </div>
    );
  }
  // Prose first (its own bubble), then the blocks — pickers, cards, reviews,
  // chips — at card width so a launch checklist is not squeezed into a bubble.
  const textBlocks = blocks.filter((b) => b.type === 'text');
  const richBlocks = blocks.filter((b) => b.type !== 'text');
  // The backend mirrors a turn's prose into its text block(s); render those and
  // fall back to `text` only when there is none — never both (it read doubled).
  const fromBlocks = textBlocks.map((b) => (b.type === 'text' ? b.text : '')).filter((t) => t && t.trim());
  const prose = (fromBlocks.length ? fromBlocks : [message.text ?? '']).filter((t, i, arr) => t.trim() && arr.indexOf(t) === i);
  return (
    <div className="flex items-end gap-2" data-testid="chat-lad-turn" data-status={message.status}>
      <div className="w-8 shrink-0 self-start">{showAvatar && <LadAvatar />}</div>
      <div className="min-w-0 max-w-[92%] flex-1 sm:max-w-[80%]">
        {prose.length > 0 && (
          <div className={`inline-block max-w-full whitespace-pre-wrap rounded-2xl rounded-bl-md px-3.5 py-2 text-sm leading-relaxed ${BUBBLE_AGENT}`}>
            {prose.map((t, i) => <p key={i} className={i > 0 ? 'mt-2' : ''}>{t}</p>)}
          </div>
        )}
        {richBlocks.length > 0 && <div className={`${prose.length > 0 ? 'mt-2' : ''} space-y-2`}>{richBlocks.map((b, i) => <Block key={i} block={b} message={message} />)}</div>}
        <p className="mt-0.5 text-[10px] text-muted-foreground" aria-hidden>{timeLabel(message.createdAt)}</p>
      </div>
    </div>
  );
}
