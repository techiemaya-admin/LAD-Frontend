'use client';

import React from 'react';
import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { type AgentCorrection, CORRECTION_KIND_LABELS } from './api';

interface CorrectionsListProps {
  items: AgentCorrection[];
  loading?: boolean;
  /** Set when the list could not be loaded — rendered instead of "none yet". */
  error?: string | null;
  onDelete?: (id: string) => Promise<void> | void;
  compact?: boolean;
  className?: string;
}

/**
 * Read-only list of an agent's corrections with a delete affordance. Shared by
 * the transcript modal (compact) and the agent form (full).
 */
export function CorrectionsList({ items, loading, error, onDelete, compact, className }: CorrectionsListProps) {
  const [busyId, setBusyId] = React.useState<string | null>(null);

  if (error) {
    return (
      <p className={cn('text-xs text-destructive', className)} role="alert">
        Corrections could not be loaded: {error}
      </p>
    );
  }
  if (loading && items.length === 0) {
    return <p className={cn('text-xs text-muted-foreground', className)}>Loading corrections…</p>;
  }
  if (items.length === 0) {
    return (
      <p className={cn('text-xs text-muted-foreground', className)}>
        No corrections yet. Select a word in an agent line of a transcript to teach a replacement.
      </p>
    );
  }

  return (
    <ul className={cn('divide-y divide-border rounded-lg border border-border', className)} aria-label="Agent corrections">
      {items.map((c) => (
        <li key={c.id} className={cn('flex items-center gap-3', compact ? 'px-2 py-1.5' : 'px-3 py-2')}>
          <div className="min-w-0 flex-1 text-sm">
            <span
              className={cn(
                'break-words',
                c.kind === 'liked' ? 'text-foreground' : 'line-through decoration-destructive/70 text-muted-foreground',
              )}
            >
              {c.wrong}
            </span>
            {c.kind === 'disliked' && c.right && (
              <>
                <span className="mx-2 text-muted-foreground">→</span>
                <span className="font-medium break-words">{c.right}</span>
              </>
            )}
            {c.kind !== 'style' && c.kind !== 'liked' && c.kind !== 'disliked' && (
              <>
                <span className="mx-2 text-muted-foreground">→</span>
                <span className="font-medium break-words">{c.right || <em className="text-muted-foreground">never say it</em>}</span>
              </>
            )}
            {c.kind === 'style' && c.right && (
              <span className="ml-2 text-muted-foreground break-words">— {c.right}</span>
            )}
          </div>
          <Badge variant="outline" className="shrink-0 text-[10px] font-normal">
            {CORRECTION_KIND_LABELS[c.kind]?.label ?? c.kind}
          </Badge>
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
              aria-label={`Delete correction for "${c.wrong}"`}
              disabled={busyId === c.id}
              onClick={async () => {
                setBusyId(c.id);
                try {
                  await onDelete(c.id);
                } finally {
                  setBusyId(null);
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
