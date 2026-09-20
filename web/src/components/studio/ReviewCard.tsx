'use client';

/**
 * ReviewCard — what a Tailor proposal would change, as the tenant reads it.
 *
 * Rows come from the backend's effective-pack diff (packReview): added /
 * removed / reworded, grouped by surface. The surface label is the backend's
 * ("LinkedIn agent", "Support agent (WhatsApp)", …) and is shown verbatim —
 * there is no surface list on this side, so a new surface needs no FE
 * change. The card never shows overlay JSON.
 * Applying is admin-only on the backend, so the button is hidden for other
 * roles rather than shown and refused.
 */
import { useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Check, Loader2, Minus, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { useApplyAndUpdate, useApplyOverlay, type Proposal, type ReviewChange, type ReviewRow } from '@lad/frontend-features/tenant-studio';
import { publishSummary } from './publish-copy';
import { BORDER, CARD, CTA_PRIMARY, DIVIDE, LINK, STATUS, TINT } from './studio-theme';

const ICON: Record<ReviewChange, typeof Plus> = { added: Plus, removed: Minus, reworded: Pencil };
const TONE: Record<ReviewChange, string> = {
  added: STATUS.ready,
  removed: STATUS.needed,
  reworded: STATUS.warn,
};

function text(v: unknown): string {
  if (v === null || v === undefined) return '';
  return typeof v === 'string' ? v : JSON.stringify(v);
}

function Row({ row }: { row: ReviewRow }) {
  const Icon = ICON[row.change];
  const [open, setOpen] = useState(false);
  const before = text(row.before);
  const after = text(row.after);
  const long = before.length + after.length > 160;
  return (
    <li className="flex gap-2 py-1.5 text-sm">
      <span className={`mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border ${TONE[row.change]}`}>
        <Icon className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className={`font-medium ${row.change === 'removed' ? 'text-muted-foreground line-through decoration-rose-300' : ''}`}>{row.key}</span>
          {row.field && <span className="text-xs text-muted-foreground">{row.field}</span>}
          {long && (
            <button type="button" onClick={() => setOpen(o => !o)} className={`text-xs ${LINK}`}>
              {open ? 'less' : 'more'}
            </button>
          )}
        </div>
        {row.change === 'reworded' ? (
          <div className={`grid gap-1 ${open ? '' : 'line-clamp-2'} whitespace-pre-wrap`}>
            {before && <span className="text-muted-foreground line-through decoration-rose-300">{open || !long ? before : `${before.slice(0, 80)}…`}</span>}
            <span>{open || !long ? after : `${after.slice(0, 80)}…`}</span>
          </div>
        ) : (after || before) !== row.key && (
          <div className={`whitespace-pre-wrap ${row.change === 'removed' ? 'text-muted-foreground line-through decoration-rose-300' : ''}`}>
            {open || !long ? (after || before) : `${(after || before).slice(0, 160)}…`}
          </div>
        )}
      </div>
    </li>
  );
}

export interface ReviewCardProps {
  proposal: Proposal;
  reply?: string;
  /** Shown under the card when the change only reaches the agent on the next prompt generation. */
  appliesOnNextGenerate?: boolean;
  /** Curated: the WhatsApp support agent reads the applied pack on its own — say so instead of asking for a regenerate. */
  appliesOnNextConversation?: boolean;
  /**
   * Apply through POST /studio/apply-and-update instead of the plain overlay
   * PUT: one press applies the change AND regenerates every ready channel's
   * agent, so nothing waits for a manual regenerate.
   */
  applyAndUpdate?: boolean;
  onApplied?: () => void;
  onDiscard?: () => void;
  noteDefault?: string;
}

export default function ReviewCard({ proposal, reply, appliesOnNextGenerate, appliesOnNextConversation, applyAndUpdate, onApplied, onDiscard, noteDefault }: ReviewCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const applyPlain = useApplyOverlay();
  const applyFull = useApplyAndUpdate();
  const apply = applyAndUpdate ? applyFull : applyPlain;
  const canApply = user?.role === 'admin' || user?.role === 'owner';
  const [applied, setApplied] = useState(false);

  const groups = useMemo(() => {
    const m = new Map<string, ReviewRow[]>();
    for (const r of proposal.review?.rows ?? []) {
      if (!m.has(r.surface)) m.set(r.surface, []);
      m.get(r.surface)!.push(r);
    }
    return [...m.entries()];
  }, [proposal.review]);

  const summary = proposal.review?.summary;

  const doApply = async () => {
    try {
      if (applyAndUpdate) {
        const r = await applyFull.mutateAsync({ overlay: proposal.overlay, note: noteDefault });
        setApplied(true);
        const failed = r.published.some((p) => !p.ok);
        toast({
          title: failed ? `Applied as version ${r.overlayVersion}, with one thing to check` : `Applied as version ${r.overlayVersion}`,
          description: publishSummary(r.published) || undefined,
          variant: failed ? 'destructive' : undefined,
        });
      } else {
        const v = await applyPlain.mutateAsync({ overlay: proposal.overlay, note: noteDefault });
        setApplied(true);
        toast({
          title: `Applied as version ${v.version}`,
          description: appliesOnNextConversation
            ? 'Your WhatsApp support agent picks this up on its next conversation.'
            : appliesOnNextGenerate ? 'Regenerate your agent prompt for the change to reach conversations.' : undefined,
        });
      }
      onApplied?.();
    } catch (e: unknown) {
      toast({ title: 'Could not apply', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  return (
    <div className={CARD}>
      {reply && <p className={`border-b ${BORDER} px-4 py-3 text-sm`}>{reply}</p>}

      {!proposal.ok ? (
        <div className="px-4 py-3">
          <div className={`mb-2 flex items-center gap-2 text-sm font-medium ${TINT.warnText}`}>
            <AlertTriangle className="h-4 w-4" /> The proposal does not fit the rules
          </div>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {proposal.errors.map((e, i) => (
              <li key={i}><code className="rounded bg-muted px-1 text-xs">{e.path}</code> {e.message}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-muted-foreground">Rephrase the request, or ask for something the pack allows. Nothing was changed.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 px-4 py-2 text-xs text-muted-foreground">
            {summary && (
              <>
                <span className={`rounded-full border px-2 py-0.5 ${STATUS.ready}`}>+{summary.added} added</span>
                <span className={`rounded-full border px-2 py-0.5 ${STATUS.warn}`}>~{summary.reworded} reworded</span>
                <span className={`rounded-full border px-2 py-0.5 ${STATUS.needed}`}>−{summary.removed} removed</span>
              </>
            )}
            {groups.length === 0 && <span>No effective change — the proposal matches what you already run.</span>}
          </div>
          {groups.map(([surface, rows]) => (
            <div key={surface} className={`border-t ${BORDER} px-4 py-2`}>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{surface}</div>
              <ul className={`divide-y ${DIVIDE}`}>{rows.map((r, i) => <Row key={`${r.key}-${r.field ?? ''}-${i}`} row={r} />)}</ul>
            </div>
          ))}
          <div className={`flex flex-wrap items-center gap-2 border-t ${BORDER} px-4 py-3`}>
            {applied ? (
              <span className={`inline-flex items-center gap-1 text-sm ${TINT.readyText}`}><Check className="h-4 w-4" /> Applied</span>
            ) : canApply ? (
              <Button size="sm" onClick={doApply} disabled={apply.isPending || groups.length === 0} className={CTA_PRIMARY}>
                {apply.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />} Apply this change
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Only a workspace admin can apply changes. Share this with one.</span>
            )}
            {!applied && onDiscard && (
              <Button size="sm" variant="ghost" onClick={onDiscard} disabled={apply.isPending}>Discard</Button>
            )}
            {appliesOnNextConversation ? (
              <span className="ml-auto text-xs text-muted-foreground" data-testid="applies-next-conversation">
                Reaches your WhatsApp support agent on its next conversation.
              </span>
            ) : appliesOnNextGenerate && (
              <span className="ml-auto text-xs text-muted-foreground">
                Reaches the agent after you{' '}
                <Link href="/settings?tab=chat" className={LINK}>regenerate the LinkedIn prompt</Link>.
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
