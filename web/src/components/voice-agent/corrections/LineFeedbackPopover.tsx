'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { type CorrectionInput } from './api';

interface LineFeedbackPopoverProps {
  /** The agent line that got a 👎. */
  line: string;
  anchor: { x: number; y: number };
  onSave: (input: CorrectionInput) => Promise<void>;
  onClose: () => void;
}

/**
 * Shown after a 👎 on an agent line: "what should it have said?" The suggestion
 * is optional — a bare dislike is still useful, it tells the agent never to say
 * that line. Saved as kind='disliked' (prompt-only; never a TTS substitution).
 */
export function LineFeedbackPopover({ line, anchor, onSave, onClose }: LineFeedbackPopoverProps) {
  const [right, setRight] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const cardRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
    setSaving(true);
    setError(null);
    try {
      await onSave({ wrong: line.trim(), right: right.trim(), kind: 'disliked' });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const style: React.CSSProperties = React.useMemo(() => {
    const width = 360;
    const height = 240;
    const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
    const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
    const left = Math.min(Math.max(8, anchor.x), vw - width - 8);
    const top = anchor.y + height + 8 > vh ? Math.max(8, anchor.y - height - 12) : anchor.y + 6;
    return { position: 'fixed', left, top, width, zIndex: 60 };
  }, [anchor]);

  return (
    <div
      ref={cardRef}
      style={style}
      role="dialog"
      aria-label="What should the agent have said?"
      className="rounded-xl border border-border bg-popover text-popover-foreground shadow-xl p-3 space-y-3"
      onMouseUp={(e) => e.stopPropagation()}
    >
      <div className="text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Don&apos;t say this:</span>{' '}
        <span className="line-through decoration-destructive/70 break-words">{line}</span>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="line-feedback-right" className="text-xs">
          What should it have said? <span className="text-muted-foreground">(optional)</span>
        </Label>
        <Textarea
          id="line-feedback-right"
          ref={inputRef}
          value={right}
          onChange={(e) => setRight(e.target.value)}
          rows={3}
          maxLength={600}
          placeholder="e.g. ఆదివారం కూడా demo పెడతాం sir, ఏ time convenient గా ఉంటుంది?"
          className="text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
        />
        <p className="text-[11px] text-muted-foreground">Goes into the agent&apos;s prompt as a &quot;never say this&quot; example. ⌘/Ctrl+Enter saves.</p>
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
        <Button type="button" size="sm" onClick={() => void submit()} disabled={saving}>
          {saving ? 'Saving…' : right.trim() ? 'Teach replacement' : 'Save dislike'}
        </Button>
      </div>
    </div>
  );
}
