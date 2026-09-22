'use client';

/**
 * ResultBlock — what an action did (or why it did not), as a titled list:
 * "Applied as version 4", the published channels, a member's "only an owner
 * can". Tone colours the rail; `error` is also how a failed send shows.
 */
import { AlertTriangle, CheckCircle2, CircleAlert } from 'lucide-react';
import type { ChatResultBlock } from '@lad/frontend-features/tenant-studio';
import { STATUS, TINT } from '../../studio-theme';

const TONE = {
  ok: { box: STATUS.ready, icon: CheckCircle2, tint: TINT.ready },
  warn: { box: STATUS.warn, icon: CircleAlert, tint: TINT.warn },
  error: { box: STATUS.needed, icon: AlertTriangle, tint: TINT.needed },
} as const;

export default function ResultBlock({ block }: { block: ChatResultBlock }) {
  const tone = TONE[block.tone ?? 'ok'] ?? TONE.ok;
  const Icon = tone.icon;
  const lines = Array.isArray(block.lines) ? block.lines.filter((l) => typeof l === 'string' && l.trim()) : [];
  return (
    <div className={`rounded-2xl border px-3.5 py-2.5 text-sm ${tone.box}`} role={block.tone === 'error' ? 'alert' : 'status'} data-testid={`chat-result-${block.tone ?? 'ok'}`}>
      <div className="flex items-start gap-2">
        <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${tone.tint}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="font-medium">{block.title}</p>
          {lines.length > 0 && (
            <ul className="mt-1 space-y-0.5 text-[13px] opacity-90">
              {lines.map((l, i) => <li key={i} className="whitespace-pre-wrap">{l}</li>)}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
