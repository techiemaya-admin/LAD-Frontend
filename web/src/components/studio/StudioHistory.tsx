'use client';

/**
 * StudioHistory — the change timeline as a side drawer on the rooms view.
 *
 * Entries come merged and ordered from GET /studio/history (Tailor changes,
 * agent updates, the first campaign, the brief, going live). An entry the
 * backend marks undoable gets an Undo button; undoing puts the previous
 * version back AND republishes the agents, so it asks first — inline, under
 * the entry, because a dialog would stack under the drawer and a second
 * layer is one too many at phone width. Nothing here is computed
 * client-side — the backend decides what can be undone.
 */
import { useState } from 'react';
import { Clock, FileText, History, Loader2, MessagesSquare, Rocket, Send, Undo2, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { isApiError } from '@lad/shared/apiError';
import { useStudioHistory, useUndoHistory, type HistoryEntry, type HistoryKind, type UndoResult } from '@lad/frontend-features/tenant-studio';

const ICON: Record<HistoryKind, typeof Wand2> = { overlay: Wand2, prompt: MessagesSquare, first_campaign: Send, brief: FileText, go_live: Rocket };
const CHANNEL_LABEL: Record<string, string> = { linkedin: 'LinkedIn', email: 'Email', whatsapp: 'WhatsApp', instagram: 'Instagram', voice: 'Voice' };

/** "LinkedIn agent updated. Could not update Email (…)." from an undo's per-channel results. */
function publishSummary(r: UndoResult): string {
  const ok = (r.published ?? []).filter((p) => p.ok).map((p) => CHANNEL_LABEL[p.channel] ?? p.channel);
  const failed = (r.published ?? []).filter((p) => !p.ok).map((p) => `${CHANNEL_LABEL[p.channel] ?? p.channel}${p.error ? ` (${p.error})` : ''}`);
  const parts: string[] = [];
  if (ok.length) parts.push(`${ok.join(', ')} agent${ok.length === 1 ? '' : 's'} updated.`);
  if (failed.length) parts.push(`Could not update ${failed.join(', ')} — try again from the Tailor.`);
  return parts.join(' ');
}

/** "2 hours ago" for a timeline; falls back to the date when it is older than a week. */
export function timeAgo(iso: string | null | undefined, now: number = Date.now()): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} day${d === 1 ? '' : 's'} ago`;
  try {
    return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(t));
  } catch {
    return iso.slice(0, 10);
  }
}

function describeError(err: unknown): string {
  if (isApiError(err)) {
    const body = err.body as { error?: string; message?: string } | undefined;
    if (body?.error === 'nothing_to_undo') return 'There is no earlier version to put back.';
    if (body?.error === 'not_found') return 'That change is no longer there. Refresh and try again.';
    if (body?.error === 'bad_action' || body?.error === 'invalid') return 'That change cannot be undone from here.';
    if (err.status === 403) return 'Only a workspace owner or admin can undo a change.';
    if (body?.message) return body.message;
  }
  return err instanceof Error ? err.message : 'Try again in a moment.';
}

function Entry({ entry, canUndo, confirming, onAsk, onConfirm, onCancel, undoing }: {
  entry: HistoryEntry; canUndo: boolean; confirming: boolean; onAsk: () => void; onConfirm: () => void; onCancel: () => void; undoing: boolean;
}) {
  const Icon = ICON[entry.kind] ?? Clock;
  return (
    <li className="flex gap-3 py-3" data-testid={`history-${entry.kind}`}>
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-3.5 w-3.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-2">
          <span className="font-medium">{entry.title}</span>
          <span className="text-xs text-muted-foreground" title={entry.at}>{timeAgo(entry.at)}</span>
        </div>
        {entry.detail && <p className="mt-0.5 text-sm text-muted-foreground">{entry.detail}</p>}
        {entry.by && <p className="mt-0.5 text-xs text-muted-foreground">by {entry.by}</p>}
        {entry.undo && canUndo && !confirming && (
          <Button type="button" size="sm" variant="outline" className="mt-2" onClick={onAsk} disabled={undoing} data-testid="history-undo">
            {undoing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}Undo
          </Button>
        )}
        {entry.undo && canUndo && confirming && (
          <div className="mt-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" role="alertdialog" aria-label={`Undo ${entry.title}?`} data-testid="history-undo-confirm">
            <p>This puts back the previous version and updates your agents.</p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <Button type="button" size="sm" onClick={onConfirm} disabled={undoing} data-testid="history-undo-yes">
                {undoing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}Undo
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={onCancel} disabled={undoing}>Keep it</Button>
            </div>
          </div>
        )}
      </div>
    </li>
  );
}

export interface StudioHistoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function StudioHistory({ open, onOpenChange }: StudioHistoryProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const canUndo = user?.role === 'admin' || user?.role === 'owner';
  const history = useStudioHistory(open);
  const undo = useUndoHistory();
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const doUndo = async (entry: HistoryEntry) => {
    if (!entry.undo) return;
    try {
      const r = await undo.mutateAsync(entry.undo);
      setConfirmId(null);
      const channels = publishSummary(r);
      const failed = (r.published ?? []).some((p) => !p.ok);
      toast({
        title: failed ? 'Put back, with one thing to check' : 'Put back',
        description: channels || (r.entry?.title ? `${r.entry.title}.` : 'The previous version is back.'),
        variant: failed ? 'destructive' : undefined,
      });
    } catch (e: unknown) {
      toast({ title: 'Could not undo', description: describeError(e), variant: 'destructive' });
    }
  };

  const entries = history.data ?? [];
  return (
      <Sheet open={open} onOpenChange={(o) => { if (!o) setConfirmId(null); onOpenChange(o); }}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-md" data-testid="studio-history">
          <SheetHeader className="text-left">
            <SheetTitle className="flex items-center gap-2"><History className="h-4 w-4" aria-hidden />Setup history</SheetTitle>
            <SheetDescription>Every change to how your agents work, newest first. Undo puts the previous version back.</SheetDescription>
          </SheetHeader>
          <div className="-mx-1 mt-2 flex-1 overflow-y-auto px-1">
            {history.isLoading && <p className="flex items-center gap-2 py-4 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>}
            {history.data === undefined && !history.isLoading && (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                Could not load the history right now.{' '}
                <button type="button" onClick={() => { void history.refetch(); }} className="font-medium underline-offset-2 hover:underline">Try again</button>
              </p>
            )}
            {history.data && entries.length === 0 && <p className="py-4 text-sm text-muted-foreground">Nothing has changed yet.</p>}
            {entries.length > 0 && (
              <ul className="divide-y">
                {entries.map((e) => (
                  <Entry
                    key={e.id}
                    entry={e}
                    canUndo={canUndo}
                    confirming={confirmId === e.id}
                    undoing={undo.isPending && confirmId === e.id}
                    onAsk={() => setConfirmId(e.id)}
                    onConfirm={() => { void doUndo(e); }}
                    onCancel={() => setConfirmId(null)}
                  />
                ))}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
  );
}
