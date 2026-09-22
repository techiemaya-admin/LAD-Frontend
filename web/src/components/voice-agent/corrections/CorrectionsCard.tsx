'use client';

import React from 'react';
import { GraduationCap, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/components/ui/app-toaster';
import { type CorrectionKind, CORRECTION_KIND_LABELS, PICKABLE_KINDS } from './api';
import { useAgentCorrections } from './useAgentCorrections';
import { CorrectionsList } from './CorrectionsList';

interface CorrectionsCardProps {
  /** Null while the agent is not saved yet — the card then explains why it is inert. */
  agentId: number | string | null;
  className?: string;
}

/**
 * Agent-form card listing everything the team has taught this agent, with a
 * manual "add" row for corrections that did not come from a transcript.
 */
export function CorrectionsCard({ agentId, className }: CorrectionsCardProps) {
  const { push: notify } = useToast();
  const corrections = useAgentCorrections(agentId);
  const [wrong, setWrong] = React.useState('');
  const [right, setRight] = React.useState('');
  const [kind, setKind] = React.useState<CorrectionKind>('vocab');
  const [saving, setSaving] = React.useState(false);

  const canAdd = agentId !== null && agentId !== '' && wrong.trim().length > 0 && (kind === 'style' || right.trim().length > 0);

  const add = async () => {
    if (!canAdd) return;
    setSaving(true);
    try {
      const row = await corrections.save({ wrong: wrong.trim(), right: right.trim(), kind, source: 'manual' });
      setWrong('');
      setRight('');
      notify({
        title: 'Agent taught',
        description: row.kind === 'style' ? `Rule saved: ${row.wrong}` : `"${row.wrong}" → "${row.right}" from the next call.`,
        variant: 'success',
      });
    } catch (e) {
      notify({ title: 'Could not save correction', description: e instanceof Error ? e.message : undefined, variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="icon-container">
            <GraduationCap className="h-5 w-5 text-blue" />
          </div>
          <div>
            <CardTitle className="text-lg">Corrections</CardTitle>
            <CardDescription>
              Words and phrasings the team has taught this agent. Applied on the next call — in the prompt and again
              right before speech, so a slip is never heard.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {agentId === null || agentId === '' ? (
          <p className="text-xs text-muted-foreground">Save the agent first, then teach corrections here or from any call transcript.</p>
        ) : (
          <>
            <CorrectionsList
              items={corrections.items}
              loading={corrections.loading}
              error={corrections.error}
              onDelete={async (id) => {
                try {
                  await corrections.remove(id);
                } catch (e) {
                  notify({ title: 'Could not delete correction', description: e instanceof Error ? e.message : undefined, variant: 'error' });
                }
              }}
            />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_160px_auto] md:items-end">
              <div className="space-y-1.5">
                <Label htmlFor="corr-wrong" className="text-xs">
                  Don&apos;t say
                </Label>
                <Input id="corr-wrong" value={wrong} onChange={(e) => setWrong(e.target.value)} placeholder="e.g. థాంక్యూ" className="h-9" maxLength={200} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="corr-right" className="text-xs">
                  {kind === 'pronunciation' ? 'Read it as' : kind === 'style' ? 'Detail (optional)' : 'Say instead'}
                </Label>
                <Input
                  id="corr-right"
                  value={right}
                  onChange={(e) => setRight(e.target.value)}
                  placeholder={kind === 'pronunciation' ? 'e.g. Mister Lads' : 'e.g. thanks'}
                  className="h-9"
                  maxLength={400}
                  onKeyDown={(e) => {
                    // Enter while an IME is composing (Telugu, Hindi, …) commits the text, not the form.
                    if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      void add();
                    }
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Kind</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as CorrectionKind)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PICKABLE_KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {CORRECTION_KIND_LABELS[k].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" size="sm" className="h-9" onClick={() => void add()} disabled={!canAdd || saving}>
                <Plus className="mr-1 h-4 w-4" />
                {saving ? 'Saving…' : 'Add'}
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">{CORRECTION_KIND_LABELS[kind].hint}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
