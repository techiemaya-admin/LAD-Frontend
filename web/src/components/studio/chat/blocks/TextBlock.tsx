'use client';

/** The bot's prose: plain text, line breaks kept, links left as text (nothing is rendered as HTML). */
import type { ChatTextBlock } from '@lad/frontend-features/tenant-studio';

export default function TextBlock({ block }: { block: ChatTextBlock }) {
  if (!block.text?.trim()) return null;
  return <p className="whitespace-pre-wrap text-sm leading-relaxed">{block.text}</p>;
}
