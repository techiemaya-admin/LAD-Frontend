'use client';
/**
 * Strategy publish confirmation.
 *
 * Publishing sends a copy of a workflow to a gallery every other tenant can
 * browse - outward-facing and awkward to walk back once someone has imported
 * it. So this dialog is deliberately a *review* step, not a yes/no prompt: it
 * shows the exact sanitized payload that would leave the account and an
 * itemised list of everything stripped out, before any submit happens.
 *
 * The preview is computed server-side by the same sanitizer that runs on
 * publish, so what's shown here is what actually gets stored - not a
 * client-side approximation of it.
 */
import { useState } from 'react';
import { AlertTriangle, Loader2, ShieldCheck, X } from 'lucide-react';

import {
  usePublishPreview, usePublishStrategy, type StrategyRemoval,
} from '@lad/frontend-features/campaigns';
import { Button } from '@/components/ui/button';

interface Props {
  strategyId: string;
  strategyName?: string;
  onClose: () => void;
  onPublished?: () => void;
}

export function StrategyPublishDialog({ strategyId, strategyName, onClose, onPublished }: Props) {
  const { data: preview, isLoading, error } = usePublishPreview(strategyId);
  const publish = usePublishStrategy();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const sharingUnavailable = (error as any)?.response?.status === 404;

  const submit = async () => {
    setSubmitError(null);
    try {
      await publish.mutateAsync(strategyId);
      onPublished?.();
      onClose();
    } catch (e: any) {
      setSubmitError(e?.response?.data?.error || e?.message || 'Failed to submit for review.');
    }
  };

  // Group removals by node path so the list reads as "this step lost X, Y".
  const removalsByPath = (preview?.removed || []).reduce<Record<string, StrategyRemoval[]>>(
    (acc, r) => {
      (acc[r.path] ||= []).push(r);
      return acc;
    },
    {},
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-card border border-border shadow-2xl">
        {/* Header */}
        <div className="flex items-start gap-3 p-4 border-b border-border">
          <span className="h-10 w-10 rounded-xl bg-violet-100 dark:bg-violet-950/40 flex items-center justify-center flex-shrink-0">
            <ShieldCheck className="h-5 w-5 text-violet-600 dark:text-violet-300" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[15px] font-bold text-foreground truncate">
              Share {strategyName ? `“${strategyName}”` : 'this strategy'}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              Reviewed by an admin before anyone can see it
            </div>
          </div>
          <button onClick={onClose} aria-label="Close"
            className="h-8 w-8 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" /> Checking what would be shared…
            </div>
          )}

          {sharingUnavailable && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3 text-sm text-amber-900 dark:text-amber-200">
              Sharing isn’t enabled on this environment yet. Your strategy is still saved and reusable by your own team.
            </div>
          )}

          {error && !sharingUnavailable && (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-300">
              Couldn’t build the preview: {(error as any)?.response?.data?.error || (error as Error)?.message}
            </div>
          )}

          {preview && (
            <>
              <div className="rounded-xl border border-border bg-muted/40 p-3">
                <div className="text-[13px] font-semibold text-foreground mb-1">What gets shared</div>
                <p className="text-[12.5px] text-muted-foreground leading-relaxed">
                  The pipeline structure and your message copy, subjects, AI instructions, targeting
                  and timing - {preview.shared_definition?.nodes?.length ?? 0} steps in total. Anyone
                  who imports it gets their own editable copy.
                </p>
              </div>

              {/* Removals - the reassurance that matters most. */}
              <div>
                <div className="text-[13px] font-semibold text-foreground mb-2">
                  Stays private ({preview.removed.length} {preview.removed.length === 1 ? 'field' : 'fields'} removed)
                </div>
                {preview.removed.length === 0 ? (
                  <p className="text-[12.5px] text-muted-foreground">
                    Nothing account-specific was found in this strategy.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {Object.entries(removalsByPath).map(([path, items]) => (
                      <div key={path} className="rounded-xl border border-border p-2.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                          {path}
                        </div>
                        <ul className="space-y-1">
                          {items.map((r, i) => (
                            <li key={`${r.key}-${i}`} className="flex items-baseline gap-2 text-[12.5px]">
                              <code className="font-mono text-[11.5px] px-1.5 py-0.5 rounded bg-muted text-foreground flex-shrink-0">
                                {r.key}
                              </code>
                              <span className="text-muted-foreground">{r.reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {preview.warnings.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-900 p-3">
                  <div className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-900 dark:text-amber-200 mb-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" /> Heads up
                  </div>
                  <ul className="space-y-1">
                    {preview.warnings.map((w, i) => (
                      <li key={i} className="text-[12.5px] text-amber-900/90 dark:text-amber-200/90">
                        <strong className="font-semibold">{w.type}</strong>: {w.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {preview.shared_definition?.requiresFile && (
                <p className="text-[12.5px] text-muted-foreground">
                  This strategy starts from a file import. Your uploaded contacts are never included -
                  whoever imports it supplies their own list.
                </p>
              )}
            </>
          )}

          {submitError && (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/30 dark:border-red-900 p-3 text-sm text-red-700 dark:text-red-300">
              {submitError}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={!preview || publish.isPending || sharingUnavailable}>
            {publish.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Submit for review
          </Button>
        </div>
      </div>
    </div>
  );
}

export default StrategyPublishDialog;
