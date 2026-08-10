'use client';

/**
 * InjuryReviewCard — staff control for the injury-screening booking gate.
 *
 * Background: when a customer tells the WhatsApp agent they have an injury or
 * medical condition, the bot keeps chatting normally but will NOT show class
 * times, pick a class level, or book anything until a human reviews the case.
 * Until this card existed the only way to clear that gate was a raw API call.
 *
 * The backend owns the decision. `gate_reason` comes straight from the same
 * function the bot enforces (WhatsAppService._compute_injury_gate_reason), so
 * this component never re-derives "is it cleared?" from the raw fields — that
 * would be a second source of truth free to drift from what actually blocks
 * the bot.
 *
 * Renders nothing at all when the tenant doesn't screen for injuries, or when
 * there's simply nothing to say (no injury reported and no gate active).
 */

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/app-toaster';
import { useAuth } from '@/contexts/AuthContext';
import { fetchWithTenant } from '@/lib/fetch-with-tenant';

/** Mirrors the GET/PATCH payload from LAD-WABA-Comms. */
export interface InjuryReviewState {
  contact_id: string;
  conversation_id: string;
  /** False when this tenant's fact schema doesn't track injuries at all. */
  tracked: boolean;
  /** Authoritative. null = nothing blocking the bot. */
  gate_reason: 'unanswered' | 'needs_review' | null;
  has_injuries: boolean | null;
  injuries_note: string;
  reviewed: boolean;
  reviewed_by: string;
  review_notes: string;
  reviewed_note_snapshot: string;
  /** True when a cleared customer has since added new injury detail. */
  note_changed_since_review: boolean;
}

interface InjuryReviewCardProps {
  conversationId: string;
  backendChannel?: 'personal' | 'waba';
}

const CONV_API = '/api/whatsapp-conversations/conversations';

export function InjuryReviewCard({ conversationId, backendChannel = 'waba' }: InjuryReviewCardProps) {
  const [state, setState] = useState<InjuryReviewState | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState('');
  const { push } = useToast();
  const { user } = useAuth();

  const load = useCallback(async () => {
    if (!conversationId) return;
    setLoading(true);
    try {
      const res = await fetchWithTenant(
        `${CONV_API}/${conversationId}/injury-review?channel=${backendChannel}`
      );
      if (!res.ok) throw new Error(String(res.status));
      setState(await res.json());
    } catch {
      // Fail quiet: this is a supplementary panel card, not the main content.
      // A broken fetch must not blank out the whole context panel.
      setState(null);
    } finally {
      setLoading(false);
    }
  }, [conversationId, backendChannel]);

  useEffect(() => {
    load();
  }, [load]);

  const submitReview = useCallback(
    async (reviewed: boolean) => {
      setSaving(true);
      try {
        const res = await fetchWithTenant(
          `${CONV_API}/${conversationId}/injury-review?channel=${backendChannel}`,
          {
            method: 'PATCH',
            body: JSON.stringify({
              reviewed,
              reviewed_by: user?.name || user?.email || '',
              notes: reviewed ? reviewNotes.trim() : '',
            }),
          }
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.detail || `Request failed (${res.status})`);
        }
        // PATCH returns the same shape as GET with a recomputed gate_reason,
        // so we can adopt it directly instead of re-fetching.
        setState(await res.json());
        setDialogOpen(false);
        setReviewNotes('');
        push({
          variant: 'success',
          title: reviewed ? 'Cleared for booking' : 'Flagged again',
          description: reviewed
            ? 'The agent can now show class times and book for this customer.'
            : 'The agent will hold off on times and bookings again.',
        });
      } catch (e: unknown) {
        push({
          variant: 'error',
          title: 'Could not update',
          description: e instanceof Error ? e.message : 'Please try again.',
        });
      } finally {
        setSaving(false);
      }
    },
    [conversationId, backendChannel, reviewNotes, user, push]
  );

  // No loading skeleton on purpose: for most customers this card resolves to
  // nothing, so a spinner would flash on every conversation open and then
  // vanish. Staying blank until we know there's something to say is calmer.
  if (loading) return null;

  // Nothing to show: tenant doesn't screen for injuries, or the fetch failed.
  if (!state || !state.tracked) return null;

  // Deliberately SILENT on gate_reason === 'unanswered'. That's the default
  // state for every customer who hasn't answered yet, so surfacing it would
  // put a card on virtually every conversation — training staff to tune the
  // card out, which would cost us the 'needs_review' case that actually needs
  // action. We render only when something is genuinely notable: an injury
  // awaiting review, or one already reviewed.
  if (state.has_injuries !== true) return null;

  const blocked = state.gate_reason === 'needs_review';

  return (
    <div className="mb-6">
      <h5 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Injury screening</h5>

      {blocked ? (
        <div className="p-3 rounded-lg border border-warning/30 bg-warning/10">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-warning flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Reported an injury — booking on hold</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {state.note_changed_since_review
                  ? 'Previously cleared, but they have since shared new detail. Please review again.'
                  : 'The agent will keep chatting but won’t show class times or book until you clear this.'}
              </p>

              {state.injuries_note && (
                <p className="mt-2 text-sm rounded bg-background/60 dark:bg-black/20 p-2 break-words">
                  “{state.injuries_note}”
                </p>
              )}

              {state.note_changed_since_review && state.reviewed_note_snapshot && (
                <p className="mt-1.5 text-xs text-muted-foreground break-words">
                  Previously cleared for: “{state.reviewed_note_snapshot}”
                </p>
              )}

              <Button
                size="sm"
                className="mt-3"
                disabled={saving}
                onClick={() => setDialogOpen(true)}
              >
                <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                Clear for booking
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* has_injuries === true and the gate is clear → staff already reviewed. */
        <div className="p-3 rounded-lg bg-muted/30 dark:bg-[#1e2a30]">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Injury reviewed — cleared for booking</p>
              {state.injuries_note && (
                <p className="text-xs text-muted-foreground mt-0.5 break-words">
                  “{state.injuries_note}”
                </p>
              )}
              {state.reviewed_by && (
                <p className="text-xs text-muted-foreground mt-1">Cleared by {state.reviewed_by}</p>
              )}
              {state.review_notes && (
                <p className="mt-1.5 text-xs rounded bg-background/60 dark:bg-black/20 p-2 break-words">
                  {state.review_notes}
                </p>
              )}
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                disabled={saving}
                onClick={() => submitReview(false)}
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : null}
                Flag again
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(o: boolean) => !saving && setDialogOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear this customer for booking?</DialogTitle>
            <DialogDescription>
              Confirm you’ve reviewed their injury and decided which classes are safe. The
              agent will then be able to show class times and book for them.
            </DialogDescription>
          </DialogHeader>

          {state.injuries_note && (
            <p className="text-sm rounded bg-muted/50 dark:bg-[#1e2a30] p-3 break-words">
              “{state.injuries_note}”
            </p>
          )}

          <div className="space-y-1.5">
            <label htmlFor="injury-review-notes" className="text-sm font-medium">
              Notes for the team <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <Textarea
              id="injury-review-notes"
              placeholder="e.g. Reformer Basics only — avoid Intermediate and Advanced"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              Saved to the customer’s record for the team. Not sent to the customer.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => submitReview(true)} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Clear for booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
