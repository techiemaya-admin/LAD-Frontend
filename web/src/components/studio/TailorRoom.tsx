'use client';

/**
 * TailorRoom — free-form: describe any change to how the workspace speaks,
 * scores and asks, and review the proposal before applying it.
 *
 * A proposal that is not applied stays as a DRAFT the next message builds
 * on, so "also add…" refines rather than restarts. Apply or discard clears it.
 */
import { useState } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import { useTailorChat, type ChatTurn, type Overlay, type TailorTurn } from '@lad/frontend-features/tenant-studio';
import ReviewCard from './ReviewCard';

const EXAMPLES = [
  'Treat "bill rate" and "markup" as pricing questions worth handing to a human.',
  'When a prospect says they already use two agencies, offer to take one hard-to-fill role rather than backing off.',
  'Add a pipeline stage called "Intake scheduled" after "Req received".',
  'Boost hiring signals to the maximum and add a signal for companies opening a new site.',
];

export default function TailorRoom({ draft, onDraft }: { draft?: Overlay; onDraft: (o?: Overlay) => void }) {
  const { toast } = useToast();
  const [history, setHistory] = useState<ChatTurn[]>([]);
  const [message, setMessage] = useState('');
  const [last, setLast] = useState<TailorTurn | null>(null);
  // The most recent proposal that passed validation — kept when a later turn
  // is rejected, so the tenant can still apply what already worked.
  const [lastValid, setLastValid] = useState<TailorTurn | null>(null);
  const chat = useTailorChat();

  const send = async (text = message.trim()) => {
    if (!text || chat.isPending) return;
    try {
      const r = await chat.mutateAsync({ message: text, history, draft });
      setHistory(h => [...h, { role: 'user', content: text }, { role: 'assistant', content: r.reply }]);
      setLast(r);
      setMessage('');
      if (r.proposal?.ok) { onDraft(r.proposal.overlay); setLastValid(r); }
    } catch (e: unknown) {
      toast({ title: 'The Tailor could not answer', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' });
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="rounded-lg border bg-card">
        <div className="border-b px-4 py-2">
          <h3 className="text-sm font-semibold">Tell the Tailor what to change</h3>
          <p className="text-xs text-muted-foreground">Handoff phrases, pipeline stages, signals, research, the agent&apos;s instructions, the profile questions — in your words.</p>
        </div>
        <div className="max-h-[420px] min-h-[160px] space-y-2 overflow-y-auto px-4 py-3" aria-live="polite">
          {history.length === 0 && (
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Try one of these:</p>
              {EXAMPLES.map(ex => (
                <button key={ex} type="button" onClick={() => void send(ex)} className="block w-full rounded-md bg-muted px-3 py-2 text-left text-sm hover:bg-muted/70">{ex}</button>
              ))}
            </div>
          )}
          {history.map((t, i) => (
            <div key={i} className={`flex ${t.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm ${t.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>{t.content}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 border-t p-3">
          <Textarea rows={2} value={message} onChange={e => setMessage(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder={draft ? 'Refine the proposal on the right, or ask for something else…' : 'What should change?'} disabled={chat.isPending} />
          <Button onClick={() => void send()} disabled={chat.isPending || !message.trim()} aria-label="Send">
            {chat.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        {last?.proposal ? (
          <>
            <ReviewCard proposal={last.proposal} noteDefault="Tailor chat"
              onApplied={() => { onDraft(undefined); setLast(null); setLastValid(null); }}
              onDiscard={() => { onDraft(undefined); setLast(null); setLastValid(null); }} />
            {!last.proposal.ok && lastValid?.proposal && (
              <>
                <p className="text-xs text-muted-foreground">Your earlier proposal is still here:</p>
                <ReviewCard proposal={lastValid.proposal} noteDefault="Tailor chat"
                  onApplied={() => { onDraft(undefined); setLast(null); setLastValid(null); }}
                  onDiscard={() => { onDraft(undefined); setLast(null); setLastValid(null); }} />
              </>
            )}
          </>
        ) : (
          <p className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
            {last ? 'No change proposed yet — answer the Tailor\'s question on the left.' : 'A proposal appears here with every change spelled out. Nothing is applied until you say so.'}
          </p>
        )}
      </section>
    </div>
  );
}
