'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type CorrectionInput, type CorrectionKind, CORRECTION_KIND_LABELS } from './api';

interface CorrectionPopoverProps {
  /** The text the user struck out in the transcript. */
  wrong: string;
  /** Viewport-relative anchor (bottom-left of the selection). */
  anchor: { x: number; y: number };
  onSave: (input: CorrectionInput) => Promise<void>;
  onClose: () => void;
}

/**
 * Inline "Replace with…" editor shown under a text selection in an agent
 * transcript line. Kept as a positioned card (not a portal dialog) so the struck
 * text stays visible right above it while the user types the replacement.
 */
export function CorrectionPopover({ wrong, anchor, onSave, onClose }: CorrectionPopoverProps) {
  const [right, setRight] = React.useState('');
  const [kind, setKind] = React.useState<CorrectionKind>('vocab');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Escape closes; clicking outside closes. Selecting inside must not.
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const onDown = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onDown);
    };
  }, [onClose]);

  const submit = async () => {
    const trimmed = right.trim();
    if (kind !== 'style' && trimmed.toLowerCase() === wrong.trim().toLowerCase()) {
      setError('Replacement is the same as the original.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await onSave({ wrong: wrong.trim(), right: trimmed, kind });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  // Keep the card on-screen: flip above the anchor if there is no room below.
  const style: React.CSSProperties = React.useMemo(() => {
    const width = 320;
    const height = 220;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const left = Math.min(Math.max(8, anchor.x), vw - width - 8);
    const top = anchor.y + height + 8 > vh ? Math.max(8, anchor.y - height - 28) : anchor.y + 6;
    return { position: 'fixed', left, top, width, zIndex: 60 };
  }, [anchor]);

  return (
    <div
      ref={cardRef}
      style={style}
      role="dialog"
      aria-label="Teach a correction"
      className="rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-3 space-y-3"
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div className="text-xs text-muted-foreground">
        Don&apos;t say{' '}
        <span className="line-through decoration-destructive/70 text-foreground font-medium break-words">{wrong}</span>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="correction-right" className="text-xs">
          {kind === 'pronunciation' ? 'Read it as' : kind === 'style' ? 'Rule (optional detail)' : 'Say instead'}
        </Label>
        <Input
          id="correction-right"
          ref={inputRef}
          value={right}
          onChange={(e) => setRight(e.target.value)}
          onKeyDown={(e) => {
            // Enter while an IME is composing (Telugu, Hindi, …) commits the text, not the form.
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={kind === 'pronunciation' ? 'e.g. Mister Lads' : kind === 'style' ? 'e.g. one question per turn' : 'e.g. one minute'}
          className="h-8 text-sm"
          maxLength={400}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Kind</Label>
        <Select value={kind} onValueChange={(v) => setKind(v as CorrectionKind)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CORRECTION_KIND_LABELS) as CorrectionKind[]).map((k) => (
              <SelectItem key={k} value={k} className="text-sm">
                {CORRECTION_KIND_LABELS[k].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-[11px] leading-snug text-muted-foreground">{CORRECTION_KIND_LABELS[kind].hint}</p>
      </div>

      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" size="sm" onClick={() => void submit()} disabled={saving || (kind !== 'style' && !right.trim())}>
          {saving ? 'Saving…' : 'Teach agent'}
        </Button>
      </div>
    </div>
  );
}
